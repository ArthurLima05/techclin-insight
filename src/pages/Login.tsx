import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setClinic } = useClinic();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira a chave de acesso",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('clinicas')
        .select('*')
        .eq('chave_acesso', accessKey)
        .single();

      if (error || !data) {
        toast({
          title: "Erro",
          description: "Chave de acesso inválida",
          variant: "destructive",
        });
        return;
      }

      setClinic(data);
      toast({
        title: "Sucesso",
        description: `Bem-vindo à ${data.nome}!`,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-24 h-24 bg-primary rounded-lg flex items-center justify-center">
            {/* Espaço para sua logo */}
            <span className="text-primary-foreground font-bold text-lg">LOGO</span>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary">TechClin</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sistema de Gestão para Clínicas Médicas
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessKey">Chave de Acesso</Label>
              <Input
                id="accessKey"
                type="text"
                placeholder="Digite sua chave de acesso"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          <div className="mt-6 text-xs text-muted-foreground text-center">
            <p>Chaves de teste:</p>
            <p>CLINICA_A_2024 - Dashboard</p>
            <p>CLINICA_B_2024 - Dashboard + Feedbacks</p>
            <p>CLINICA_C_2024 - Todas as funcionalidades</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;