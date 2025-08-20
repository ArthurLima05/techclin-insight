import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const clinicaId = url.searchParams.get('state');
    
    console.log('URL da requisição:', req.url);
    console.log('Código OAuth extraído:', code ? 'presente' : 'ausente');
    console.log('ID da clínica extraído:', clinicaId);
    
    if (!code || !clinicaId) {
      console.error('Código ou ID da clínica ausentes');
      throw new Error('Código de autorização e ID da clínica são obrigatórios');
    }

    console.log('Recebido código OAuth para clínica:', clinicaId);

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('Client ID:', clientId ? 'configurado' : 'não configurado');
    console.log('Client Secret:', clientSecret ? 'configurado' : 'não configurado');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Redirect URI:', `${supabaseUrl}/functions/v1/google-oauth`);

    // Trocar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId ?? '',
        client_secret: clientSecret ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${supabaseUrl}/functions/v1/google-oauth`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Erro ao trocar código por tokens:', error);
      throw new Error('Falha na autenticação com Google');
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens recebidos do Google');

    // Calcular data de expiração
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Salvar tokens no banco
    const { error: dbError } = await supabaseClient
      .from('google_oauth_tokens')
      .upsert({
        clinica_id: clinicaId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope || 'https://www.googleapis.com/auth/calendar',
      }, {
        onConflict: 'clinica_id'
      });

    if (dbError) {
      console.error('Erro ao salvar tokens:', dbError);
      throw new Error('Erro ao salvar tokens de autenticação');
    }

    console.log('Tokens salvos com sucesso para clínica:', clinicaId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Autenticação com Google realizada com sucesso' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

} catch (error: unknown) {
  console.error('Erro na autenticação OAuth:', error);
  let errorMessage = 'Erro interno do servidor';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  return new Response(
    JSON.stringify({ 
      error: errorMessage 
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    }
  );
}
});