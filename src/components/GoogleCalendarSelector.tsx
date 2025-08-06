import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';

interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
}

interface GoogleCalendarSelectorProps {
  selectedCalendarId: string;
  onCalendarChange: (calendarId: string) => void;
}

const GoogleCalendarSelector: React.FC<GoogleCalendarSelectorProps> = ({
  selectedCalendarId,
  onCalendarChange,
}) => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCalendars = async () => {
    if (!clinic) return;

    setLoading(true);
    try {
      // Buscar token de acesso válido
      const { data: tokenData, error: tokenError } = await supabase
        .from('google_oauth_tokens')
        .select('access_token, expires_at')
        .eq('clinica_id', clinic.id)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('Token de autenticação não encontrado');
      }

      // Verificar se o token ainda é válido
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now >= expiresAt) {
        throw new Error('Token expirado. Reconecte com o Google Calendar.');
      }

      // Buscar calendários disponíveis
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar calendários');
      }

      const data = await response.json();
      setCalendars(data.items || []);

      // Se nenhum calendário estiver selecionado, selecionar o primário por padrão
      if (!selectedCalendarId && data.items?.length > 0) {
        const primaryCalendar = data.items.find((cal: Calendar) => cal.primary);
        if (primaryCalendar) {
          onCalendarChange(primaryCalendar.id);
        }
      }

    } catch (error: any) {
      console.error('Erro ao buscar calendários:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar calendários disponíveis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, [clinic]);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Agenda Google Calendar
      </Label>
      <Select 
        value={selectedCalendarId} 
        onValueChange={onCalendarChange}
        disabled={loading || calendars.length === 0}
      >
        <SelectTrigger>
          <SelectValue 
            placeholder={
              loading ? "Carregando calendários..." : 
              calendars.length === 0 ? "Nenhum calendário disponível" :
              "Selecione um calendário"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {calendars.map((calendar) => (
            <SelectItem key={calendar.id} value={calendar.id}>
              <div className="flex items-center gap-2">
                <span>{calendar.summary}</span>
                {calendar.primary && (
                  <span className="text-xs bg-primary/10 text-primary px-1 rounded">
                    Principal
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando calendários...
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarSelector;