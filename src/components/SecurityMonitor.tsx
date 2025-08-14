import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Eye, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  created_at: string;
  user_id?: string;
}

export const SecurityMonitor: React.FC = () => {
  const { clinic } = useClinic();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);

  useEffect(() => {
    if (!clinic) return;

    const fetchAuditLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('id, action, table_name, created_at, user_id')
          .eq('clinica_id', clinic.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching audit logs:', error);
          return;
        }

        setAuditLogs(data || []);
        if (data && data.length > 0) {
          setLastActivity(new Date(data[0].created_at));
        }
      } catch (error) {
        console.error('Error in fetchAuditLogs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();

    // Set up real-time subscription for audit logs
    const channel = supabase
      .channel('audit_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `clinica_id=eq.${clinic.id}`,
        },
        (payload) => {
          const newLog = payload.new as AuditLog;
          setAuditLogs(prev => [newLog, ...prev.slice(0, 9)]);
          setLastActivity(new Date(newLog.created_at));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinic]);

  if (!clinic) return null;

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const tableNames: Record<string, string> = {
      agendamentos: 'Agendamentos',
      medicos: 'Médicos',
      feedbacks: 'Feedbacks',
      clinicas: 'Clínicas',
      google_oauth_tokens: 'Tokens OAuth',
    };
    return tableNames[tableName] || tableName;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Monitor de Segurança</CardTitle>
        </div>
        <CardDescription>
          Atividades recentes e logs de auditoria da clínica
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Security Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <Shield className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Segurança Ativa
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                RLS e auditoria ativados
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Eye className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Monitoramento
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Logs em tempo real
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
            <Clock className="h-4 w-4 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Última Atividade
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {lastActivity 
                  ? lastActivity.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                  : 'Nenhuma'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Logs de Auditoria Recentes
          </h4>
          
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando logs...</p>
          ) : auditLogs.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma atividade registrada recentemente.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                    <span className="text-sm font-medium">
                      {getTableDisplayName(log.table_name)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Tips */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Dica de Segurança:</strong> Todos os acessos e modificações são registrados. 
            Mantenha suas credenciais seguras e reporte atividades suspeitas.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};