import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function renovarTokenSeNecessario(integracao: any) {
  const agora = new Date();
  const expiracao = new Date(integracao.token_expires_at);
  
  // Se token expira em menos de 5 minutos, renovar
  if (expiracao.getTime() - agora.getTime() < 5 * 60 * 1000) {
    console.log('Renovando token expirado...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: integracao.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await response.json();
    
    if (tokens.error) {
      throw new Error(`Erro ao renovar token: ${tokens.error}`);
    }

    // Atualizar tokens no banco
    const { error } = await supabase
      .from('google_calendar_integracao')
      .update({
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })
      .eq('id', integracao.id);

    if (error) {
      throw new Error('Erro ao atualizar token no banco');
    }

    return tokens.access_token;
  }
  
  return integracao.access_token;
}

function calcularHorarioFim(data: string, horarioInicio: string) {
  const inicio = new Date(`${data}T${horarioInicio}`);
  inicio.setMinutes(inicio.getMinutes() + 30); // 30 min de consulta
  return inicio.toISOString();
}

async function criarEventoNoGoogleCalendar(agendamento: any, accessToken: string, calendarId: string) {
  const evento = {
    summary: `Consulta - ${agendamento.paciente}`,
    description: `Profissional: ${agendamento.profissional}\nStatus: ${agendamento.status}`,
    start: {
      dateTime: `${agendamento.data}T${agendamento.horario}`,
      timeZone: 'America/Sao_Paulo'
    },
    end: {
      dateTime: calcularHorarioFim(agendamento.data, agendamento.horario),
      timeZone: 'America/Sao_Paulo'
    }
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(evento)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao criar evento: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agendamento_id } = await req.json();

    // Buscar agendamento
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', agendamento_id)
      .single();

    if (agendamentoError || !agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    // Se já tem event_google_id, não criar novamente
    if (agendamento.event_google_id) {
      return new Response(JSON.stringify({ 
        message: 'Agendamento já sincronizado com Google Calendar',
        event_id: agendamento.event_google_id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar integração do Google Calendar da clínica
    const { data: integracao, error: integracaoError } = await supabase
      .from('google_calendar_integracao')
      .select('*')
      .eq('clinica_id', agendamento.clinica_id)
      .eq('ativo', true)
      .single();

    if (integracaoError || !integracao) {
      throw new Error('Clínica não tem integração com Google Calendar configurada');
    }

    // Renovar token se necessário
    const accessToken = await renovarTokenSeNecessario(integracao);

    // Criar evento no Google Calendar
    const eventoGoogle = await criarEventoNoGoogleCalendar(
      agendamento, 
      accessToken, 
      integracao.google_calendar_id
    );

    // Atualizar agendamento com ID do evento do Google
    const { error: updateError } = await supabase
      .from('agendamentos')
      .update({ event_google_id: eventoGoogle.id })
      .eq('id', agendamento_id);

    if (updateError) {
      console.error('Erro ao atualizar agendamento:', updateError);
      // Event foi criado no Google, mas não conseguimos salvar o ID
      // Não é um erro fatal, mas devemos logar
    }

    console.log(`Evento criado no Google Calendar: ${eventoGoogle.id} para agendamento ${agendamento_id}`);

    return new Response(JSON.stringify({ 
      success: true,
      event_id: eventoGoogle.id,
      event_url: eventoGoogle.htmlLink 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro em sync-to-google-calendar:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});