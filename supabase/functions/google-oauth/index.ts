import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
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

    const { code, state: clinicaId } = await req.json();
    
    if (!code || !clinicaId) {
      throw new Error('Código de autorização e ID da clínica são obrigatórios');
    }

    console.log('Recebido código OAuth para clínica:', clinicaId);

    // Trocar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth`,
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

  } catch (error) {
    console.error('Erro na autenticação OAuth:', error);
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