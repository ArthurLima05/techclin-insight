import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, AlertTriangle, Shield } from 'lucide-react';
import { SecurityMonitor } from '@/components/SecurityMonitor';

// SECURITY WARNING: This should be replaced with proper authentication
const ADMIN_KEY = 'admin123'; // TODO: Replace with proper authentication system

interface Clinica {
  id: string;
  nome: string;
  chave_acesso: string;
  dashboard_ativo: boolean;
  feedbacks_ativos: boolean;
  agenda_ativa: boolean;
}

interface WhatsappClinica {
  id: string;
  numero_whatsapp: string;
  clinica_id: string;
  ativo: boolean;
  clinicas?: { nome: string };
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [whatsappClinicas, setWhatsappClinicas] = useState<WhatsappClinica[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Clinica | WhatsappClinica | null>(null);

  const clinicaForm = useForm({
    defaultValues: {
      nome: '',
      chave_acesso: '',
      dashboard_ativo: true,
      feedbacks_ativos: false,
      agenda_ativa: false
    }
  });

  const whatsappForm = useForm({
    defaultValues: {
      numero_whatsapp: '',
      clinica_id: '',
      ativo: true
    }
  });

  const authenticate = () => {
    if (adminKey === ADMIN_KEY) {
      setIsAuthenticated(true);
      loadData();
    } else {
      toast.error('Chave de acesso inválida');
    }
  };

  const loadData = async () => {
    try {
      const { data: clinicasData } = await supabase
        .from('clinicas')
        .select('*')
        .order('nome');
      
      const { data: whatsappDataRaw } = await supabase
        .from('whatsapp_clinicas')
        .select('*')
        .order('numero_whatsapp');
      
      // Buscar nomes das clínicas separadamente
      const whatsappData = await Promise.all(
        (whatsappDataRaw || []).map(async (item) => {
          const { data: clinicaData } = await supabase
            .from('clinicas')
            .select('nome')
            .eq('id', item.clinica_id)
            .single();
          
          return {
            ...item,
            clinicas: clinicaData
          };
        })
      );

      setClinicas(clinicasData || []);
      setWhatsappClinicas(whatsappData || []);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const onSubmitClinica = async (data: any) => {
    try {
      if (editingItem && 'chave_acesso' in editingItem) {
        await supabase
          .from('clinicas')
          .update(data)
          .eq('id', editingItem.id);
        toast.success('Clínica atualizada');
      } else {
        await supabase
          .from('clinicas')
          .insert(data);
        toast.success('Clínica criada');
      }
      
      setDialogOpen(false);
      setEditingItem(null);
      clinicaForm.reset();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar clínica');
    }
  };

  const onSubmitWhatsapp = async (data: any) => {
    try {
      if (editingItem && 'numero_whatsapp' in editingItem) {
        await supabase
          .from('whatsapp_clinicas')
          .update(data)
          .eq('id', editingItem.id);
        toast.success('WhatsApp atualizado');
      } else {
        await supabase
          .from('whatsapp_clinicas')
          .insert(data);
        toast.success('WhatsApp criado');
      }
      
      setWhatsappDialogOpen(false);
      setEditingItem(null);
      whatsappForm.reset();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar WhatsApp');
    }
  };

  const deleteClinica = async (id: string) => {
    try {
      await supabase.from('clinicas').delete().eq('id', id);
      toast.success('Clínica excluída');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir clínica');
    }
  };

  const deleteWhatsapp = async (id: string) => {
    try {
      await supabase.from('whatsapp_clinicas').delete().eq('id', id);
      toast.success('WhatsApp excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir WhatsApp');
    }
  };

  const editClinica = (clinica: Clinica) => {
    setEditingItem(clinica);
    clinicaForm.reset(clinica);
    setDialogOpen(true);
  };

  const editWhatsapp = (whatsapp: WhatsappClinica) => {
    setEditingItem(whatsapp);
    whatsappForm.reset({
      numero_whatsapp: whatsapp.numero_whatsapp,
      clinica_id: whatsapp.clinica_id,
      ativo: whatsapp.ativo
    });
    setWhatsappDialogOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Administrativo</CardTitle>
            <CardDescription>Digite a chave de acesso para continuar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminKey">Chave de Acesso</Label>
              <Input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Digite a chave de acesso"
              />
            </div>
            <Button onClick={authenticate} className="w-full">
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <Button 
          variant="outline" 
          onClick={() => setIsAuthenticated(false)}
        >
          Sair
        </Button>
      </div>

      {/* Security Warning */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Aviso de Segurança:</strong> Esta página utiliza autenticação hardcodada. 
          Em produção, implemente um sistema de autenticação adequado com hash de senhas e JWT.
        </AlertDescription>
      </Alert>

      {/* Security Monitor */}
      <SecurityMonitor />

      {/* Seção Clínicas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerenciar Clínicas</CardTitle>
              <CardDescription>Adicionar, editar e excluir clínicas</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  clinicaForm.reset();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Clínica
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar Clínica' : 'Nova Clínica'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...clinicaForm}>
                  <form onSubmit={clinicaForm.handleSubmit(onSubmitClinica)} className="space-y-4">
                    <FormField
                      control={clinicaForm.control}
                      name="nome"
                      rules={{ required: 'Nome é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Clínica</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clinicaForm.control}
                      name="chave_acesso"
                      rules={{ required: 'Chave de acesso é obrigatória' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chave de Acesso</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clinicaForm.control}
                      name="dashboard_ativo"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Dashboard Ativo</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clinicaForm.control}
                      name="feedbacks_ativos"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Feedbacks Ativos</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clinicaForm.control}
                      name="agenda_ativa"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Agenda Ativa</FormLabel>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit">
                        {editingItem ? 'Atualizar' : 'Criar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Chave de Acesso</TableHead>
                <TableHead>Dashboard</TableHead>
                <TableHead>Feedbacks</TableHead>
                <TableHead>Agenda</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinicas.map((clinica) => (
                <TableRow key={clinica.id}>
                  <TableCell>{clinica.nome}</TableCell>
                  <TableCell>{clinica.chave_acesso}</TableCell>
                  <TableCell>{clinica.dashboard_ativo ? 'Ativo' : 'Inativo'}</TableCell>
                  <TableCell>{clinica.feedbacks_ativos ? 'Ativo' : 'Inativo'}</TableCell>
                  <TableCell>{clinica.agenda_ativa ? 'Ativo' : 'Inativo'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editClinica(clinica)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteClinica(clinica.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Seção WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerenciar WhatsApp</CardTitle>
              <CardDescription>Mapear números de WhatsApp para clínicas</CardDescription>
            </div>
            <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  whatsappForm.reset();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo WhatsApp
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar WhatsApp' : 'Novo WhatsApp'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...whatsappForm}>
                  <form onSubmit={whatsappForm.handleSubmit(onSubmitWhatsapp)} className="space-y-4">
                    <FormField
                      control={whatsappForm.control}
                      name="numero_whatsapp"
                      rules={{ required: 'Número é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número WhatsApp</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="5511999999999" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={whatsappForm.control}
                      name="clinica_id"
                      rules={{ required: 'Clínica é obrigatória' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clínica</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full rounded-md border border-input bg-background px-3 py-2">
                              <option value="">Selecione uma clínica</option>
                              {clinicas.map((clinica) => (
                                <option key={clinica.id} value={clinica.id}>
                                  {clinica.nome}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={whatsappForm.control}
                      name="ativo"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Ativo</FormLabel>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit">
                        {editingItem ? 'Atualizar' : 'Criar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número WhatsApp</TableHead>
                <TableHead>Clínica</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {whatsappClinicas.map((whatsapp) => (
                <TableRow key={whatsapp.id}>
                  <TableCell>{whatsapp.numero_whatsapp}</TableCell>
                  <TableCell>{whatsapp.clinicas?.nome}</TableCell>
                  <TableCell>{whatsapp.ativo ? 'Ativo' : 'Inativo'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editWhatsapp(whatsapp)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteWhatsapp(whatsapp.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;