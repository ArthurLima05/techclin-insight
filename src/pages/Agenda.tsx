import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Stethoscope, Plus, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { GoogleCalendarIntegration } from '@/components/GoogleCalendarIntegration';
import GoogleCalendarSelector from '@/components/GoogleCalendarSelector';

interface Appointment {
  id: string;
  paciente: string;
  profissional: string;
  data: string;
  horario: string;
  status: string;
}

interface Medico {
  id: string;
  nome: string;
  especialidade: string;
}

const appointmentSchema = z.object({
  paciente: z.string().min(1, 'Nome do paciente é obrigatório'),
  profissional: z.string().min(1, 'Profissional é obrigatório'),
  data: z.string().min(1, 'Data é obrigatória'),
  horario: z.string().min(1, 'Horário é obrigatório'),
  status: z.string().min(1, 'Status é obrigatório'),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

const Agenda = () => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      paciente: '',
      profissional: '',
      data: '',
      horario: '',
      status: 'agendado',
    },
  });

  useEffect(() => {
    if (clinic) {
      fetchAppointments();
      fetchMedicos();
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
        duration: 3000,
      });
    }
  };

  const fetchMedicos = async () => {
    try {
      const { data, error } = await supabase
        .from('medicos')
        .select('id, nome, especialidade')
        .eq('clinica_id', clinic?.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setMedicos(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar profissionais",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const onSubmit = async (data: AppointmentForm) => {
    try {
      if (editingAppointment) {
        const { error } = await supabase
          .from('agendamentos')
          .update(data)
          .eq('id', editingAppointment.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Agendamento atualizado com sucesso",
          duration: 3000,
        });
      } else {
        const appointmentData = {
          paciente: data.paciente,
          profissional: data.profissional,
          data: data.data,
          horario: data.horario,
          status: data.status,
          clinica_id: clinic?.id!
        };
        
        const { error } = await supabase
          .from('agendamentos')
          .insert(appointmentData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Agendamento criado com sucesso",
          duration: 3000,
        });
      }

      fetchAppointments();
      setIsAddDialogOpen(false);
      setEditingAppointment(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar agendamento",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    form.reset({
      paciente: appointment.paciente,
      profissional: appointment.profissional,
      data: appointment.data,
      horario: appointment.horario,
      status: appointment.status,
    });
    setIsAddDialogOpen(true);
  };

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    form.reset({
      paciente: '',
      profissional: '',
      data: '',
      horario: '',
      status: 'agendado',
    });
    setIsAddDialogOpen(true);
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
        duration: 3000,
      });

      fetchAppointments();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
        duration: 3000,
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
              <Stethoscope className="h-5 w-5 text-primary" />
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

      {/* Integração Google Calendar */}
      <GoogleCalendarIntegration selectedCalendarId={selectedCalendarId} />

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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Clock className="h-5 w-5" />
                  Agendamentos
                  {selectedDate && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      - {viewMode === 'week' ? 'Esta semana' : selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleNewAppointment} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Agendamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="paciente"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Paciente</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do paciente" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="profissional"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Profissional</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o profissional" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {medicos.map((medico) => (
                                    <SelectItem key={medico.id} value={medico.nome}>
                                      {medico.nome} - {medico.especialidade}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="data"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="horario"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o horário" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, hour) => 
                                    [0, 30].map(minutes => {
                                      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                      return (
                                        <SelectItem key={timeString} value={timeString}>
                                          {timeString}
                                        </SelectItem>
                                      );
                                    })
                                  ).flat()}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="agendado">Agendado</SelectItem>
                                  <SelectItem value="confirmado">Confirmado</SelectItem>
                                  <SelectItem value="cancelado">Cancelado</SelectItem>
                                  <SelectItem value="realizado">Realizado</SelectItem>
                                  <SelectItem value="falta">Falta</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Seletor de Calendário Google */}
                        <GoogleCalendarSelector 
                          selectedCalendarId={selectedCalendarId}
                          onCalendarChange={setSelectedCalendarId}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit">
                            {editingAppointment ? 'Atualizar' : 'Criar'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
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
                                  <Stethoscope className="h-4 w-4" />
                                  <span>{appointment.profissional}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={appointment.status}
                                  onValueChange={(value) => updateAppointmentStatus(appointment.id, value)}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="agendado">Agendado</SelectItem>
                                    <SelectItem value="confirmado">Confirmado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                    <SelectItem value="realizado">Realizado</SelectItem>
                                    <SelectItem value="falta">Falta</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(appointment)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </div>
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