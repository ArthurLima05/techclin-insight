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
    if (!clinic) {
      console.log('Nenhuma clínica selecionada');
      return;
    }
    
    console.log('Verificando conexão para clínica:', clinic.id);
    
    try {
      const { data, error } = await supabase
        .from('google_oauth_tokens')
        .select('id, expires_at, clinica_id')
        .eq('clinica_id', clinic.id)
        .single();
      
      console.log('Resultado da query:', { data, error, clinicaId: clinic.id });
      
      if (error) {
        console.log('Erro ao buscar tokens:', error);
        setIsConnected(false);
        return;
      }
      
      if (!data) {
        console.log('Nenhum token encontrado para esta clínica');
        setIsConnected(false);
        return;
      }
      
      const tokenValid = new Date(data.expires_at) > new Date();
      console.log('Token encontrado:', data, 'Válido:', tokenValid);
      setIsConnected(tokenValid);
      
      if (tokenValid) {
        toast({
          title: "Conectado!",
          description: "Google Calendar conectado com sucesso",
          duration: 3000,
        });
      }
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
      const { data: configData, error: configError } = await supabase.functions.invoke('get-google-config');
      
      if (configError || !configData?.clientId) {
        throw new Error('Falha ao obter configuração do Google');
      }
      
      const clientId = configData.clientId;
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

      // Abrir janela popup para autenticação
      const authWindow = window.open(
        authUrl, 
        'google-auth', 
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes'
      );
      
      if (!authWindow) {
        throw new Error('Não foi possível abrir a janela de autenticação. Verifique se o bloqueador de pop-ups está desabilitado.');
      }
      
      // Monitorar quando a janela de autenticação é fechada
      const checkAuthWindow = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkAuthWindow);
          
          toast({
            title: "Processando...",
            description: "Verificando conexão com Google Calendar",
            duration: 2000,
          });
          
          // Aguardar e verificar a conexão
          setTimeout(async () => {
            setIsConnecting(false);
            await checkConnection();
          }, 3000);
        }
      }, 1000);
      
      // Timeout de segurança (5 minutos)
      setTimeout(() => {
        if (!authWindow.closed) {
          clearInterval(checkAuthWindow);
          authWindow.close();
          setIsConnecting(false);
          toast({
            title: "Timeout",
            description: "Autenticação cancelada por timeout",
            variant: "destructive",
            duration: 3000,
          });
        }
      }, 300000);
      
    } catch (error: any) {
      console.error('Erro ao iniciar autenticação:', error);
      setIsConnecting(false);
      toast({
        title: "Erro",
        description: error.message || "Falha ao conectar com Google Calendar",
        variant: "destructive",
        duration: 5000,
      });
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
              disabled={isConnecting || !clinic}
              className="flex items-center gap-2"
              variant={isConnecting ? "secondary" : "default"}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Conectar com Google
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing || !clinic}
                className="flex items-center gap-2"
                variant={isSyncing ? "secondary" : "default"}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    Sincronizar Agendamentos
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsConnected(false);
                  toast({
                    title: "Desconectado",
                    description: "Conecte novamente para sincronizar",
                    duration: 3000,
                  });
                }}
                variant="outline"
                size="sm"
              >
                Desconectar
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Após a conexão, todos os agendamentos manuais serão sincronizados automaticamente com seu Google Calendar.
        </p>
      </CardContent>
    </Card>
  );
};