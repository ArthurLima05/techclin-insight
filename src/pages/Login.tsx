import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Login = () => {
  const [accessKey, setAccessKey] = useState('');
  const navigate = useNavigate();
  const { setClinic } = useClinic();
  const { toast } = useToast();
  const { 
    authenticate, 
    isLoading, 
    isLockedOut, 
    remainingLockoutTime, 
    attemptsRemaining 
  } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLockedOut) {
      toast({
        title: "Acesso Bloqueado",
        description: `Tente novamente em ${remainingLockoutTime} minutos`,
        variant: "destructive",
      });
      return;
    }

    const result = await authenticate(accessKey);
    
    if (!result.success) {
      toast({
        title: "Erro de Autenticação",
        description: result.error,
        variant: "destructive",
      });
      
      if (attemptsRemaining <= 1) {
        toast({
          title: "Atenção",
          description: "Próxima tentativa falhada resultará em bloqueio temporário",
          variant: "destructive",
        });
      }
      return;
    }

    const clinic = result.clinic;
    setClinic(clinic);
    
    toast({
      title: "Acesso Autorizado",
      description: `Bem-vindo à ${clinic.nome}!`,
    });
    
    // Enhanced routing logic
    if (clinic.dashboard_ativo) {
      navigate('/dashboard');
    } else if (clinic.agenda_ativa) {
      navigate('/agenda');
    } else if (clinic.feedbacks_ativos) {
      navigate('/feedbacks');
    } else {
      navigate('/medicos');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-20 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-24 h-24 bg-accent/30 rounded-full blur-lg animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-accent/10 rounded-full blur-md animate-pulse delay-500" />
      
      <Card className="relative w-full max-w-md backdrop-blur-sm bg-card/95 border-0 shadow-2xl">
        <CardHeader className="space-y-6 text-center pb-4">
          {/* Logo container with glow effect */}
          <div className="mx-auto w-48 h-24 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-accent/20 rounded-xl blur-xl" />
            <img 
              src="/src/assets/logo-login.png" 
              alt="TechClin Logo" 
              className="relative z-10 w-full h-full object-contain drop-shadow-lg"
            />
          </div>
          
          {/* Welcome text */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao TechClin</h1>
            <p className="text-muted-foreground">Acesse o sistema com sua chave de acesso</p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Security status indicators */}
          {isLockedOut && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Acesso temporariamente bloqueado. Tente novamente em {remainingLockoutTime} minutos.
              </AlertDescription>
            </Alert>
          )}

          {!isLockedOut && attemptsRemaining < 3 && (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {attemptsRemaining} tentativa(s) restante(s) antes do bloqueio temporário.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label 
                htmlFor="accessKey" 
                className="text-foreground font-medium"
              >
                Chave de Acesso
              </Label>
              <Input
                id="accessKey"
                type="text"
                placeholder="Digite sua chave de acesso"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                disabled={isLoading || isLockedOut}
                className="h-12 text-base transition-all duration-200 focus:scale-[1.02] focus:shadow-lg"
                maxLength={50}
                autoComplete="off"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg bg-primary hover:bg-primary/90" 
              disabled={isLoading || isLockedOut}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando acesso...
                </>
              ) : isLockedOut ? (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Acesso Bloqueado
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </Button>
          </form>
          
          {/* Test keys section with better styling */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-sm font-medium text-foreground mb-2 text-center">Chaves de teste disponíveis:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between items-center py-1">
                <span className="font-mono bg-background/50 px-2 py-1 rounded">CLINICA_A_2024</span>
                <span>Dashboard</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-mono bg-background/50 px-2 py-1 rounded">CLINICA_B_2024</span>
                <span>Dashboard + Feedbacks</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-mono bg-background/50 px-2 py-1 rounded">CLINICA_C_2024</span>
                <span>Todas as funcionalidades</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;