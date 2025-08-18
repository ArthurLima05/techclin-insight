import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";

interface GoogleCalendarIntegrationProps {
  selectedCalendarId?: string;
}

export const GoogleCalendarIntegration = ({ selectedCalendarId = 'primary' }: GoogleCalendarIntegrationProps) => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [clinic]);

  const checkConnection = async () => {
    if (!clinic) return;
    
    try {
      const { data, error } = await supabase
        .from('google_oauth_tokens')
        .select('id, expires_at')
        .eq('clinica_id', clinic.id)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao verificar conexão:', error);
        setIsConnected(false);
        return;
      }
      
      // Verificar se o token existe e não está expirado
      const isConnected = data && new Date(data.expires_at) > new Date();
      setIsConnected(!!isConnected);
    } catch (error) {
      console.error('Erro na verificação de conexão:', error);
      setIsConnected(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!clinic) {
      toast({
        title: "Erro",
        description: "Nenhuma clínica selecionada",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Buscar o Client ID via Edge Function
      const { data: configData } = await supabase.functions.invoke('get-google-config');
      const clientId = configData?.clientId;
      const redirectUri = `https://scacnshkxfrahxarjrwb.supabase.co/functions/v1/google-oauth`;
      const scope = "https://www.googleapis.com/auth/calendar";
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `state=${clinic.id}&` +
        `access_type=offline&` +
        `prompt=consent`;

      const authWindow = window.open(authUrl, '_blank', 'width=500,height=600');
      
      // Monitorar quando a janela de autenticação é fechada
      const checkAuthWindow = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkAuthWindow);
          // Aguardar um pouco e verificar a conexão
          setTimeout(() => {
            checkConnection();
          }, 2000);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao iniciar autenticação:', error);
      toast({
        title: "Erro",
        description: "Falha ao conectar com Google Calendar",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!clinic) {
      toast({
        title: "Erro",
        description: "Nenhuma clínica selecionada",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsSyncing(true);
    try {
      // Usar a nova edge function com correção de data
      const { data, error } = await supabase.functions.invoke('sync-google-calendar-advanced', {
        body: { 
          clinicaId: clinic.id,
          calendarId: selectedCalendarId
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: data.message || "Agendamentos sincronizados com sucesso!",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar agendamentos",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Integração Google Calendar
        </CardTitle>
        <CardDescription>
          Conecte sua clínica ao Google Calendar para sincronizar agendamentos automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-600">Conectado ao Google Calendar</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-600">Não conectado</span>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={handleGoogleAuth}
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Conectar com Google
            </Button>
          ) : (
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Sincronizar Agendamentos
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Após a conexão, todos os agendamentos manuais serão sincronizados automaticamente com seu Google Calendar.
        </p>
      </CardContent>
    </Card>
  );
};