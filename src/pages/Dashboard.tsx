import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, TrendingUp, Calendar, AlertTriangle, Heart, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MetricCard from '@/components/dashboard/MetricCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [period, setPeriod] = useState('month');
  const [metrics, setMetrics] = useState({
    completedAppointments: 0, // Atendimentos realizados
    noShows: 0,
    returnRate: 0,
    avgWaitTime: 0,
    avgSchedulingTime: 0, // Tempo médio entre agendamento e consulta
    cancelledAppointments: 0,
    origins: {} as Record<string, number>,
    professionalVolume: {} as Record<string, number>,
    avgSentiment: 0,
    topKeywords: [] as { palavra: string; freq: number }[],
  });

  const COLORS = ['#1d4640', '#fd9b64', '#e6e6d7', '#8884d8'];

  const chartData = [
    { name: 'Jan', agendamentos: 65, cancelamentos: 8 },
    { name: 'Fev', agendamentos: 85, cancelamentos: 12 },
    { name: 'Mar', agendamentos: 78, cancelamentos: 6 },
    { name: 'Abr', agendamentos: 92, cancelamentos: 14 },
    { name: 'Mai', agendamentos: 88, cancelamentos: 9 },
    { name: 'Jun', agendamentos: 95, cancelamentos: 11 },
  ];

  const getOriginChartData = () => {
    return Object.entries(metrics.origins).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  };

  const getProfessionalChartData = () => {
    return Object.entries(metrics.professionalVolume).map(([name, atendimentos]) => ({
      name,
      atendimentos
    }));
  };

  useEffect(() => {
    if (clinic) {
      fetchMetrics();
    }
  }, [clinic, period]);

  const fetchMetrics = async () => {
    try {
      let totalAppointments = 0;
      let completedAppointments = 0;
      let noShows = 0;
      let cancelledAppointments = 0;
      let returnRate = 0;
      let avgWaitTime = 0;
      let avgSchedulingTime = 0;
      let origins = {} as Record<string, number>;
      let professionalVolume = {} as Record<string, number>;
      

      // Buscar agendamentos apenas se a agenda estiver ativa
      if (clinic?.agenda_ativa) {
        const { data: appointments, error: appointmentsError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('clinica_id', clinic?.id);

        if (appointmentsError) throw appointmentsError;

        // Calcular métricas de agendamentos
        totalAppointments = appointments?.length || 0;
        
        // Contar atendimentos confirmados E realizados
        completedAppointments = appointments?.filter(apt => 
          apt.status === 'realizado' || apt.status === 'confirmado'
        ).length || 0;
        
        noShows = appointments?.filter(apt => apt.status === 'falta').length || 0;
        cancelledAppointments = appointments?.filter(apt => apt.status === 'cancelado').length || 0;
        
        // Taxa de retorno (simplificada)
        returnRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

        // Calcular tempo médio manualmente
        let totalDias = 0;
        let countAgendamentos = 0;
        
        appointments?.forEach(apt => {
          if (apt.created_at && apt.data) {
            const createdDate = new Date(apt.created_at);
            const appointmentDate = new Date(apt.data);
            const diffTime = appointmentDate.getTime() - createdDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0) { // Só contar agendamentos válidos
              totalDias += diffDays;
              countAgendamentos++;
            }
          }
        });
        
        avgSchedulingTime = countAgendamentos > 0 ? Math.round((totalDias / countAgendamentos) * 100) / 100 : 0;

        // Volume por profissional
        professionalVolume = appointments?.reduce((acc, apt) => {
          acc[apt.profissional] = (acc[apt.profissional] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

      }

      // Origem dos pacientes baseada nos feedbacks
      const { data: feedbackOrigins, error: originsError } = await supabase
        .from('feedbacks')
        .select('como_conheceu')
        .eq('clinica_id', clinic?.id)
        .not('como_conheceu', 'is', null);

      if (!originsError && feedbackOrigins) {
        origins = feedbackOrigins.reduce((acc, feedback) => {
          const origem = feedback.como_conheceu || 'Não informado';
          acc[origem] = (acc[origem] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      // Buscar feedbacks para análise de sentimento
      const { data: feedbacks, error: feedbacksError } = await supabase
        .from('feedbacks')
        .select('sentimento, palavras_chave')
        .eq('clinica_id', clinic?.id)
        .not('sentimento', 'is', null);

      let avgSentiment = 0;
      let topKeywords: { palavra: string; freq: number }[] = [];

      if (!feedbacksError && feedbacks?.length) {
        // Calcular sentimento médio
        const sentiments = feedbacks.map(f => f.sentimento).filter(s => s !== null);
        avgSentiment = sentiments.length > 0 ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0;

        // Contar palavras-chave
        const keywordCount = feedbacks.reduce((acc, feedback) => {
          if (feedback.palavras_chave && Array.isArray(feedback.palavras_chave)) {
            feedback.palavras_chave.forEach((palavra: string) => {
              acc[palavra] = (acc[palavra] || 0) + 1;
            });
          }
          return acc;
        }, {} as Record<string, number>);

        // Top 5 palavras-chave
        topKeywords = Object.entries(keywordCount)
          .map(([palavra, freq]) => ({ palavra, freq }))
          .sort((a, b) => b.freq - a.freq)
          .slice(0, 5);
      }

      setMetrics({
        completedAppointments,
        noShows,
        returnRate: Math.round(returnRate),
        avgWaitTime,
        avgSchedulingTime,
        cancelledAppointments,
        origins,
        professionalVolume,
        avgSentiment: Math.round(avgSentiment * 100) / 100, // 2 casas decimais
        topKeywords,
      });

    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar métricas",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das métricas da clínica</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {clinic?.agenda_ativa && (
          <>
            <MetricCard
              title="Total de Atendimentos"
              value={metrics.completedAppointments}
              icon={Users}
              description="Consultas realizadas"
            />
            <MetricCard
              title="Faltas de Pacientes"
              value={metrics.noShows}
              icon={AlertTriangle}
              description="Pacientes que não compareceram"
            />
            <MetricCard
              title="Taxa de Retorno"
              value={`${metrics.returnRate}%`}
              icon={TrendingUp}
              description="Pacientes que retornaram"
            />
            <MetricCard
              title="Tempo Médio"
              value={`${metrics.avgSchedulingTime} dias`}
              icon={Clock}
              description="Entre agendamento e consulta"
            />
          </>
        )}
        
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {clinic?.agenda_ativa && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Cancelamentos por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {metrics.cancelledAppointments}
              </div>
              <p className="text-sm text-muted-foreground">Agendamentos cancelados</p>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Agendamentos vs Cancelamentos - só para clínicas com agenda */}
        {clinic?.agenda_ativa && (
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos vs Cancelamentos</CardTitle>
              <CardDescription>Comparação mensal dos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="agendamentos" fill="#1d4640" />
                  <Bar dataKey="cancelamentos" fill="#fd9b64" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Origem dos Pacientes - para todas as clínicas */}
        <Card>
          <CardHeader>
            <CardTitle>Origem dos Pacientes</CardTitle>
            <CardDescription>Distribuição por canal de aquisição</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getOriginChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getOriginChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>


      </div>
    </div>
  );
};

export default Dashboard;