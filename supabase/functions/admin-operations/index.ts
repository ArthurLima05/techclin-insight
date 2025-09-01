import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { table, operation, data } = await req.json()
    
    // Verify admin access
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')
    const { password } = data
    
    if (password !== adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    let result
    switch (operation) {
      case 'select':
        if (table === 'whatsapp_clinicas') {
          result = await supabaseServiceRole.from(table).select('*').order('numero_whatsapp')
        } else {
          result = await supabaseServiceRole.from(table).select('*').order('nome')
        }
        break
      case 'insert':
        const { password: _, ...insertData } = data
        result = await supabaseServiceRole.from(table).insert(insertData).select()
        break
      case 'update':
        const { password: __, id, ...updateData } = data
        result = await supabaseServiceRole.from(table).update(updateData).eq('id', id).select()
        break
      case 'delete':
        result = await supabaseServiceRole.from(table).delete().eq('id', data.id)
        break
      default:
        throw new Error('Invalid operation')
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

 } catch (error: unknown) {
  let errorMessage = 'Um erro desconhecido ocorreu';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  console.error('Error:', error);
  return new Response(
    JSON.stringify({ error: errorMessage }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
  );
}
})