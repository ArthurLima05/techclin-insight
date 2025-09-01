import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppMessage {
  from: string; // Número do WhatsApp
  body: string; // Texto da mensagem
  timestamp?: string;
}

interface FinanceData {
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { from, body, timestamp }: WhatsAppMessage = await req.json()
    
    console.log('Received WhatsApp message:', { from, body, timestamp })

    // Normalizar número do WhatsApp (remover caracteres especiais)
    const normalizedPhone = from.replace(/\D/g, '')
    
    // Buscar clínica pelo número do WhatsApp
    const { data: whatsappClinica, error: whatsappError } = await supabase
      .from('whatsapp_clinicas')
      .select('clinica_id, clinicas(nome)')
      .eq('numero_whatsapp', normalizedPhone)
      .eq('ativo', true)
      .single()

    if (whatsappError || !whatsappClinica) {
      console.log('Clínica não encontrada para o número:', normalizedPhone)
      return new Response(
        JSON.stringify({ 
          error: 'Clínica não encontrada',
          reply: 'Desculpe, seu número não está registrado em nosso sistema.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Extrair dados financeiros da mensagem
    const financeData = parseFinanceMessage(body)
    
    if (!financeData) {
      return new Response(
        JSON.stringify({ 
          error: 'Formato inválido',
          reply: `Formato incorreto. Use:\n\n*ENTRADA* R$ 100,00 Consulta Dr. João\n*SAÍDA* R$ 50,00 Material de limpeza\n\nPalavras-chave: ENTRADA, SAÍDA, RECEITA, DESPESA`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Inserir registro financeiro
    const { data: financeRecord, error: financeError } = await supabase
      .from('financeiro')
      .insert({
        clinica_id: whatsappClinica.clinica_id,
        tipo: financeData.tipo,
        valor: financeData.valor,
        descricao: financeData.descricao,
        data: new Date().toISOString()
      })
      .select()
      .single()

    if (financeError) {
      console.error('Erro ao inserir registro financeiro:', financeError)
      return new Response(
        JSON.stringify({ 
          error: 'Erro interno',
          reply: 'Erro ao registrar movimentação. Tente novamente.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const tipoTexto = financeData.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA'
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(financeData.valor)

    const replyMessage = `✅ *Registrado com sucesso!*\n\n` +
      `📊 *Tipo:* ${tipoTexto}\n` +
      `💰 *Valor:* ${valorFormatado}\n` +
      `📝 *Descrição:* ${financeData.descricao}\n` +
      `🏥 *Clínica:* ${whatsappClinica.clinicas?.nome}\n` +
      `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}`

    return new Response(
      JSON.stringify({
        success: true,
        reply: replyMessage,
        data: financeRecord
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    let errorMessage = 'Erro desconhecido'
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        reply: 'Ocorreu um erro inesperado. Tente novamente mais tarde.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function parseFinanceMessage(message: string): FinanceData | null {
  // Remover quebras de linha e normalizar espaços
  const normalizedMessage = message.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  
  // Padrões para identificar tipo
  const entradaPatterns = /\b(entrada|receita|recebimento|credito|crédito)\b/i
  const saidaPatterns = /\b(saida|saída|despesa|gasto|pagamento|debito|débito)\b/i
  
  // Extrair valor (procura por R$ seguido de números)
  const valorMatch = normalizedMessage.match(/R\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i)
  
  if (!valorMatch) {
    return null
  }
  
  // Converter valor para número
  const valorString = valorMatch[1].replace(/\./g, '').replace(',', '.')
  const valor = parseFloat(valorString)
  
  if (isNaN(valor) || valor <= 0) {
    return null
  }
  
  // Determinar tipo
  let tipo: 'entrada' | 'saida'
  
  if (entradaPatterns.test(normalizedMessage)) {
    tipo = 'entrada'
  } else if (saidaPatterns.test(normalizedMessage)) {
    tipo = 'saida'
  } else {
    return null
  }
  
  // Extrair descrição (texto após o valor)
  const valorIndex = normalizedMessage.indexOf(valorMatch[0])
  const afterValue = normalizedMessage.substring(valorIndex + valorMatch[0].length).trim()
  
  // Se não há descrição após o valor, pegar texto antes do valor
  let descricao = afterValue
  if (!descricao || descricao.length < 3) {
    const beforeValue = normalizedMessage.substring(0, valorIndex).trim()
    // Remover palavras-chave do tipo
    descricao = beforeValue
      .replace(entradaPatterns, '')
      .replace(saidaPatterns, '')
      .trim()
  }
  
  // Descrição mínima
  if (!descricao || descricao.length < 3) {
    descricao = tipo === 'entrada' ? 'Entrada registrada via WhatsApp' : 'Saída registrada via WhatsApp'
  }
  
  return {
    tipo,
    valor,
    descricao: descricao.substring(0, 255) // Limitar tamanho
  }
}