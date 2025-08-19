import React, { useState, useEffect } from 'react';
import { Star, AlertTriangle, User, MessageSquare, Heart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MetricCard from '@/components/dashboard/MetricCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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
  sentimento: number | null;
  palavras_chave: string[] | null;
}

const Feedbacks = () => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentimentMetrics, setSentimentMetrics] = useState({
    avgSentiment: 0,
    totalAnalyzed: 0,
    topKeywords: [] as { palavra: string; freq: number }[],
  });

  useEffect(() => {
    if (clinic) {
      fetchFeedbacks();
    }
  }, [clinic]);

  const fetchFeedbacks = async () => {
    console.log('Feedbacks - Clinica contexto:', clinic);
    console.log('Feedbacks - Clinica ID:', clinic?.id);
    try {
      console.log('Feedbacks - Buscando feedbacks para clinica:', clinic?.id);
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('clinica_id', clinic?.id)
        .order('criado_em', { ascending: false });

      console.log('Feedbacks - Data encontrada:', data);
      console.log('Feedbacks - Error:', error);

      if (error) throw error;
      setFeedbacks(data || []);

      // Calcular métricas de sentimento
      if (data?.length) {
        const sentiments = data.map(f => f.sentimento).filter(s => s !== null);
        const avgSentiment = sentiments.length > 0 ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0;

        // Contar palavras-chave
        const keywordCount = data.reduce((acc, feedback) => {
          if (feedback.palavras_chave && Array.isArray(feedback.palavras_chave)) {
            feedback.palavras_chave.forEach((palavra: string) => {
              acc[palavra] = (acc[palavra] || 0) + 1;
            });
          }
          return acc;
        }, {} as Record<string, number>);

        // Top 5 palavras-chave
        const topKeywords = Object.entries(keywordCount)
          .map(([palavra, freq]) => ({ palavra, freq }))
          .sort((a, b) => b.freq - a.freq)
          .slice(0, 5);

        setSentimentMetrics({
          avgSentiment: Math.round(avgSentiment * 10) / 10,
          totalAnalyzed: data.filter(f => f.comentario).length,
          topKeywords,
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar feedbacks",
        variant: "destructive",
      });
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

  // Cores para o gráfico de pizza
  const COLORS = ['#1d4640', '#2d7360', '#4a9b7d', '#6bb899', '#8dd4b6'];

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

      {/* Métricas de Sentimento */}
      {clinic?.feedbacks_ativos && (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Sentimento Médio"
            value={sentimentMetrics.avgSentiment > 0 ? `+${sentimentMetrics.avgSentiment}` : sentimentMetrics.avgSentiment}
            icon={Heart}
            description="Análise dos feedbacks"
          />
          <MetricCard
            title="Feedbacks Analisados"
            value={sentimentMetrics.totalAnalyzed}
            icon={MessageSquare}
            description="Total de comentários processados"
          />
          
          {/* Card de Palavras-Chave */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Top 5 Palavras-Chave</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {sentimentMetrics.topKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sentimentMetrics.topKeywords.slice(0, 5).map((keyword, index) => (
                    <Badge key={keyword.palavra} variant="secondary" className="text-xs">
                      {keyword.palavra} ({keyword.freq}x)
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma palavra-chave encontrada</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico de Palavras-Chave */}
      {clinic?.feedbacks_ativos && sentimentMetrics.topKeywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Palavras-Chave Mais Mencionadas</CardTitle>
            <CardDescription>Termos mais frequentes nos feedbacks dos pacientes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentMetrics.topKeywords}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="freq"
                  nameKey="palavra"
                >
                  {sentimentMetrics.topKeywords.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} menções`, name]}
                />
                <Legend 
                  formatter={(value) => value}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
              Satisfação por Profissionais
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