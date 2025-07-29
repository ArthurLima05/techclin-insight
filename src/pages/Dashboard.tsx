import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MetricCard from '@/components/dashboard/MetricCard';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [period, setPeriod] = useState('month');
  const [metrics, setMetrics] = useState({
    totalAppointments: 0,
    noShows: 0,
    returnRate: 0,
    avgWaitTime: 0,
    cancelledAppointments: 0,
    origins: {} as Record<string, number>,
    professionalVolume: {} as Record<string, number>,
  });

  useEffect(() => {
    if (clinic) {
      fetchMetrics();
    }
  }, [clinic, period]);

  const fetchMetrics = async () => {
    try {
      // Buscar agendamentos
      const { data: appointments, error: appointmentsError } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('clinica_id', clinic?.id);

      if (appointmentsError) throw appointmentsError;

      // Calcular métricas
      const totalAppointments = appointments?.length || 0;
      const noShows = appointments?.filter(apt => apt.status === 'falta').length || 0;
      const cancelledAppointments = appointments?.filter(apt => apt.status === 'cancelado').length || 0;
      const completedAppointments = appointments?.filter(apt => apt.status === 'realizado').length || 0;
      
      // Taxa de retorno (simplificada)
      const returnRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

      // Origem dos pacientes
      const origins = appointments?.reduce((acc, apt) => {
        acc[apt.origem] = (acc[apt.origem] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Volume por profissional
      const professionalVolume = appointments?.reduce((acc, apt) => {
        acc[apt.profissional] = (acc[apt.profissional] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setMetrics({
        totalAppointments,
        noShows,
        returnRate: Math.round(returnRate),
        avgWaitTime: 48, // Tempo médio simulado
        cancelledAppointments,
        origins,
        professionalVolume,
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
        <MetricCard
          title="Total de Atendimentos"
          value={metrics.totalAppointments}
          icon={Users}
          description="Agendamentos no período"
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
          value={`${metrics.avgWaitTime}h`}
          icon={Clock}
          description="Entre agendamento e consulta"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Volume por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(metrics.professionalVolume).map(([professional, count]) => (
              <div key={professional} className="flex justify-between items-center">
                <span className="text-sm font-medium">{professional}</span>
                <span className="text-sm font-bold text-primary">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Origem dos Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(metrics.origins).map(([origin, count]) => (
              <div key={origin} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">{count}</div>
                <div className="text-sm text-muted-foreground">{origin}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;