import React, { useState, useEffect } from 'react';
import { Star, AlertTriangle, User, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';

interface Feedback {
  id: string;
  paciente: string;
  nota: number;
  comentario: string;
  profissional: string;
  criado_em: string;
}

const Feedbacks = () => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clinic) {
      fetchFeedbacks();
    }
  }, [clinic]);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('clinica_id', clinic?.id)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar feedbacks",
        variant: "destructive",
      });
    }
  };

  const handleZapierWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "Erro",
        description: "Por favor, insira a URL do webhook Zapier",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          triggered_from: "TechClin_Feedbacks",
          clinic_id: clinic?.id,
        }),
      });

      toast({
        title: "Webhook enviado",
        description: "Solicitação enviada para o Zapier. Verifique o histórico do seu Zap.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar webhook para o Zapier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const negativeFeedbacks = feedbacks.filter(f => f.nota <= 2);
  const professionalRatings = feedbacks.reduce((acc, feedback) => {
    if (!acc[feedback.profissional]) {
      acc[feedback.profissional] = { total: 0, count: 0 };
    }
    acc[feedback.profissional].total += feedback.nota;
    acc[feedback.profissional].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Feedbacks</h1>
        <p className="text-muted-foreground">Avaliações e comentários dos pacientes</p>
      </div>

      {/* Integração Zapier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Integração WhatsApp (Zapier)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook">URL do Webhook Zapier</Label>
            <Input
              id="webhook"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          <Button onClick={handleZapierWebhook} disabled={loading}>
            {loading ? 'Enviando...' : 'Testar Integração'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Configure um Zap para coletar feedbacks via WhatsApp e armazená-los automaticamente.
          </p>
        </CardContent>
      </Card>

      {/* Alertas de Feedbacks Negativos */}
      {negativeFeedbacks.length > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Feedbacks Negativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {negativeFeedbacks.map((feedback) => (
              <div key={feedback.id} className="p-3 bg-warning/10 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{feedback.paciente}</p>
                    <p className="text-sm text-muted-foreground">
                      Atendido por: {feedback.profissional}
                    </p>
                  </div>
                  <div className="flex">
                    {renderStars(feedback.nota)}
                  </div>
                </div>
                {feedback.comentario && (
                  <p className="text-sm italic">"{feedback.comentario}"</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Relatório de Satisfação por Profissional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Satisfação por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(professionalRatings).map(([professional, data]) => {
              const average = data.total / data.count;
              return (
                <div key={professional} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{professional}</span>
                    <Badge variant={average >= 4 ? "default" : average >= 3 ? "secondary" : "destructive"}>
                      {average.toFixed(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(average))}
                    <span className="text-sm text-muted-foreground">
                      ({data.count} avaliações)
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Histórico de Feedbacks */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico Recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {feedbacks.slice(0, 10).map((feedback) => (
              <div key={feedback.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{feedback.paciente}</p>
                    <p className="text-sm text-muted-foreground">
                      {feedback.profissional}
                    </p>
                  </div>
                  <div className="flex">
                    {renderStars(feedback.nota)}
                  </div>
                </div>
                {feedback.comentario && (
                  <p className="text-sm text-muted-foreground">
                    "{feedback.comentario}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(feedback.criado_em).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Feedbacks;