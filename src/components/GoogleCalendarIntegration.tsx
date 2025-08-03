import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarStatus {
  connected: boolean;
  calendar_id?: string;
}

const GoogleCalendarIntegration = () => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [status, setStatus] = useState<GoogleCalendarStatus>({ connected: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIntegrationStatus();
  }, [clinic]);

  const checkIntegrationStatus = async () => {
    if (!clinic) return;

    try {
      const { data } = await supabase.functions.invoke('google-calendar-auth', {
        body: { 
          action: 'status',
          clinica_id: clinic.id 
        }
      });

      if (data) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Erro ao verificar status do Google Calendar:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    if (!clinic) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { 
          action: 'get-auth-url',
          clinica_id: clinic.id 
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Abrir nova janela para autorização
        window.open(data.authUrl, '_blank', 'width=500,height=600');
        
        // Escutar por mudanças na URL (retorno da autorização)
        const checkConnection = setInterval(() => {
          checkIntegrationStatus();
        }, 2000);

        // Parar de verificar após 5 minutos
        setTimeout(() => {
          clearInterval(checkConnection);
        }, 300000);

        toast({
          title: "Autorização iniciada",
          description: "Complete a autorização na nova janela",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao conectar com Google Calendar",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Integração Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status.connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Google Calendar Conectado</span>
                <Badge variant="secondary" className="ml-2">
                  Ativo
                </Badge>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">Google Calendar Desconectado</span>
                <Badge variant="outline" className="ml-2">
                  Inativo
                </Badge>
              </>
            )}
          </div>
        </div>

        {status.connected && status.calendar_id && (
          <div className="text-sm text-muted-foreground">
            <p>Calendar ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{status.calendar_id}</code></p>
          </div>
        )}

        <div className="flex gap-2">
          {!status.connected ? (
            <Button 
              onClick={connectGoogleCalendar}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {loading ? 'Conectando...' : 'Conectar Google Calendar'}
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={checkIntegrationStatus}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Verificar Status
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {status.connected ? (
            <p>✅ Agendamentos manuais serão automaticamente sincronizados com seu Google Calendar</p>
          ) : (
            <p>⚠️ Conecte seu Google Calendar para sincronizar automaticamente os agendamentos</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarIntegration;