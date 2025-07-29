import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  paciente: string;
  profissional: string;
  data: string;
  horario: string;
  origem: string;
  status: string;
}

const Agenda = () => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');

  useEffect(() => {
    if (clinic) {
      fetchAppointments();
    }
  }, [clinic]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('clinica_id', clinic?.id)
        .order('data', { ascending: true })
        .order('horario', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar agendamentos",
        variant: "destructive",
      });
    }
  };

  const professionals = Array.from(new Set(appointments.map(apt => apt.profissional)));

  const filteredAppointments = appointments.filter(apt => {
    if (selectedProfessional !== 'all' && apt.profissional !== selectedProfessional) {
      return false;
    }
    if (selectedDate) {
      const aptDate = new Date(apt.data);
      if (viewMode === 'week') {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return aptDate >= startOfWeek && aptDate <= endOfWeek;
      } else {
        return aptDate.getMonth() === selectedDate.getMonth() && 
               aptDate.getFullYear() === selectedDate.getFullYear();
      }
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'default';
      case 'realizado':
        return 'secondary';
      case 'cancelado':
        return 'destructive';
      case 'falta':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confirmado: 'Confirmado',
      realizado: 'Realizado',
      cancelado: 'Cancelado',
      falta: 'Falta'
    };
    return labels[status] || status;
  };

  const appointmentsByDate = filteredAppointments.reduce((acc, apt) => {
    const date = apt.data;
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Agenda</h1>
        <p className="text-muted-foreground">Gestão de agendamentos e calendário</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Select value={viewMode} onValueChange={(value: 'week' | 'month') => setViewMode(value)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {professionals.map(prof => (
              <SelectItem key={prof} value={prof}>{prof}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 max-w-full overflow-hidden">
        {/* Calendário */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarIcon className="h-5 w-5" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border w-full"
            />
            
            {/* Integração Google Calendar */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Integração Google Agenda</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Conecte com sua agenda do Google para sincronização automática.
              </p>
              <button className="text-xs text-primary hover:underline">
                Configurar integração →
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Agendamentos */}
        <Card className="xl:col-span-2 min-w-0">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Agendamentos
              </div>
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {viewMode === 'week' ? 'Esta semana' : selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto min-w-0">
            {Object.entries(appointmentsByDate).map(([date, dayAppointments]) => (
              <div key={date} className="space-y-2 min-w-0">
                <h4 className="font-medium text-sm text-primary">
                  {new Date(date).toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </h4>
                {dayAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-3 border rounded-lg space-y-2 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{appointment.paciente}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{appointment.horario}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{appointment.profissional}</span>
                        </div>
                      </div>
                      <div className="space-y-2 flex-shrink-0">
                        <Badge variant={getStatusColor(appointment.status)}>
                          {getStatusLabel(appointment.status)}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          via {appointment.origem}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            
            {Object.keys(appointmentsByDate).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Nenhum agendamento encontrado para o período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Agenda;