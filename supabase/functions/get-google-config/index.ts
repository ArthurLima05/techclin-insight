import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    
    if (!clientId) {
      throw new Error('Google Client ID não configurado');
    }

    return new Response(
      JSON.stringify({ 
        clientId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

} catch (error: unknown) {
  console.error('Erro ao buscar configuração Google:', error);
  let errorMessage = 'Erro interno do servidor';
  
  // Verifique se o erro é uma instância de Error antes de acessar a propriedade message
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