import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Falha ao renovar token de acesso');
  }

  return await response.json();
}

async function createCalendarEvent(accessToken: string, agendamento: any, calendarId: string = 'primary') {
  // Corrigir o bug de data - usar a data exata sem conversão de timezone
  const appointmentDate = new Date(agendamento.data + 'T00:00:00');
  const [hours, minutes] = agendamento.horario.split(':');
  appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Criar data de fim (1 hora depois)
  const endDate = new Date(appointmentDate);
  endDate.setHours(appointmentDate.getHours() + 1);
  
  const event = {
    summary: `Consulta - ${agendamento.paciente}`,
    description: `Paciente: ${agendamento.paciente}\nProfissional: ${agendamento.profissional}`,
    start: {
      dateTime: appointmentDate.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
  };

  console.log(`Criando evento no calendário ${calendarId}:`, event);

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Erro ao criar evento no Google Calendar:', error);
    throw new Error('Falha ao criar evento no Google Calendar');
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { clinicaId, calendarId = 'primary' } = await req.json();
    
    if (!clinicaId) {
      throw new Error('ID da clínica é obrigatório');
    }

    console.log('Iniciando sincronização para clínica:', clinicaId, 'no calendário:', calendarId);

    // Buscar tokens OAuth da clínica
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('google_oauth_tokens')
      .select('*')
      .eq('clinica_id', clinicaId)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Tokens de autenticação não encontrados. Realize a autenticação primeiro.');
    }

    let accessToken = tokenData.access_token;
    
    // Verificar se o token precisa ser renovado
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt && tokenData.refresh_token) {
      console.log('Token expirado, renovando...');
      const newTokens = await refreshAccessToken(tokenData.refresh_token);
      
      accessToken = newTokens.access_token;
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();
      
      // Atualizar tokens no banco
      await supabaseClient
        .from('google_oauth_tokens')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt,
        })
        .eq('clinica_id', clinicaId);
    }

    // Buscar agendamentos sem event_google_id (não sincronizados)
    const { data: agendamentos, error: agendamentosError } = await supabaseClient
      .from('agendamentos')
      .select('*')
      .eq('clinica_id', clinicaId)
      .is('event_google_id', null)
      .in('status', ['agendado', 'confirmado']);

    if (agendamentosError) {
      throw new Error('Erro ao buscar agendamentos');
    }

    console.log(`Encontrados ${agendamentos?.length || 0} agendamentos para sincronizar`);

    let sucessos = 0;
    let erros = 0;

    // Sincronizar cada agendamento
    for (const agendamento of agendamentos || []) {
      try {
        const googleEvent = await createCalendarEvent(accessToken, agendamento, calendarId);
        
        // Atualizar agendamento com ID do evento do Google
        await supabaseClient
          .from('agendamentos')
          .update({ event_google_id: googleEvent.id })
          .eq('id', agendamento.id);
        
        sucessos++;
        console.log(`Agendamento ${agendamento.id} sincronizado com sucesso`);
      } catch (error) {
        erros++;
        console.error(`Erro ao sincronizar agendamento ${agendamento.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Sincronização concluída: ${sucessos} sucessos, ${erros} erros`,
        sucessos,
        erros
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});