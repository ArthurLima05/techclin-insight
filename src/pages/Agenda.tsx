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
      case 'agendado':
        return 'secondary';
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
      agendado: 'Agendado',
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
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">Agenda</h1>
        <p className="text-muted-foreground text-lg">Gestão de agendamentos e calendário</p>
      </div>

      {/* Filtros */}
      <Card className="bg-gradient-to-r from-card to-muted/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span className="font-medium">Visualização:</span>
            </div>
            <Select value={viewMode} onValueChange={(value: 'week' | 'month') => setViewMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semanal</SelectItem>
                <SelectItem value="month">Mensal</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span className="font-medium">Profissional:</span>
            </div>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-56">
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
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Calendário */}
        <div className="lg:col-span-4">
          <Card className="h-fit shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CalendarIcon className="h-5 w-5" />
                Calendário
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="w-full overflow-hidden">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border w-full max-w-full [&>div]:w-full [&_table]:w-full [&_table]:table-fixed"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Agendamentos */}
        <div className="lg:col-span-8">
          <Card className="shadow-lg">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                Agendamentos
                {selectedDate && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - {viewMode === 'week' ? 'Esta semana' : selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {Object.entries(appointmentsByDate).map(([date, dayAppointments]) => (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <h4 className="font-semibold text-lg text-primary">
                        {new Date(date).toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </h4>
                    </div>
                    <div className="grid gap-3">
                      {dayAppointments.map((appointment) => (
                        <Card key={appointment.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-3">
                                  <User className="h-5 w-5 text-primary" />
                                  <span className="font-semibold text-lg">{appointment.paciente}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">{appointment.horario}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>{appointment.profissional}</span>
                                </div>
                              </div>
                              <Badge variant={getStatusColor(appointment.status)} className="text-sm px-3 py-1">
                                {getStatusLabel(appointment.status)}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
                
                {Object.keys(appointmentsByDate).length === 0 && (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">Nenhum agendamento encontrado</h3>
                    <p className="text-muted-foreground">Não há agendamentos para o período selecionado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Agenda;