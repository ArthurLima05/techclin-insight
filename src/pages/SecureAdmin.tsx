import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
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
import { Trash2, Edit, Plus, Shield, CheckCircle } from 'lucide-react';
import { SecurityMonitor } from '@/components/SecurityMonitor';
import { useAuth } from '@/contexts/AuthContext';

interface Clinica {
  id: string;
  nome: string;
  chave_acesso: string;
  dashboard_ativo: boolean;
  feedbacks_ativos: boolean;
  agenda_ativa: boolean;
}

interface User {
  id: string;
  email: string;
  clinica_id: string;
  role: string;
  active: boolean;
  last_login: string;
  created_at: string;
}

const SecureAdmin = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Clinica | User | null>(null);

  const clinicaForm = useForm({
    defaultValues: {
      nome: '',
      chave_acesso: '',
      dashboard_ativo: true,
      feedbacks_ativos: false,
      agenda_ativa: false
    }
  });

  const userForm = useForm({
    defaultValues: {
      email: '',
      password: '',
      role: 'admin',
      active: true
    }
  });

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      loadData();
    }
  }, [isAuthenticated, user]);

  // Redirect if not authenticated or not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/auth" replace />;
  }

  const loadData = async () => {
    try {
      const { data: clinicasData } = await supabase
        .from('clinicas')
        .select('*')
        .order('nome');
      
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('email');

      setClinicas(clinicasData || []);
      setUsers(usersData || []);
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

  const onSubmitUser = async (data: any) => {
    try {
      if (editingItem && 'email' in editingItem) {
        // Update user (excluding password if not provided)
        const updateData = { ...data };
        delete updateData.password; // Don't update password in this simple implementation
        
        await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingItem.id);
        toast.success('Usuário atualizado');
      } else {
        // Create user with hashed password
        const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_password', {
          password: data.password
        });

        if (hashError || !hashedPassword) {
          toast.error('Erro ao processar senha');
          return;
        }

        await supabase
          .from('users')
          .insert({
            ...data,
            password_hash: hashedPassword,
            clinica_id: user?.clinica_id // Associate with current user's clinic
          });
        toast.success('Usuário criado');
      }
      
      setUserDialogOpen(false);
      setEditingItem(null);
      userForm.reset();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar usuário');
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

  const deleteUser = async (id: string) => {
    try {
      await supabase.from('users').delete().eq('id', id);
      toast.success('Usuário excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir usuário');
    }
  };

  const editClinica = (clinica: Clinica) => {
    setEditingItem(clinica);
    clinicaForm.reset(clinica);
    setDialogOpen(true);
  };

  const editUser = (userData: User) => {
    setEditingItem(userData);
    userForm.reset({
      email: userData.email,
      password: '', // Don't show password
      role: userData.role,
      active: userData.active
    });
    setUserDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="p-2 rounded-full bg-green-100">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo Seguro</h1>
            <p className="text-muted-foreground">Sistema protegido por autenticação adequada</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={signOut}
        >
          Sair
        </Button>
      </div>

      {/* Security Status */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema Seguro:</strong> Autenticação implementada com hash de senhas, 
          sessões seguras e RLS configurado adequadamente.
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
                          <FormLabel>Chave de Acesso (Legacy)</FormLabel>
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
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {clinica.chave_acesso}
                    </code>
                  </TableCell>
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

      {/* Seção Usuários */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerenciar Usuários</CardTitle>
              <CardDescription>Adicionar, editar e excluir usuários do sistema</CardDescription>
            </div>
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingItem(null);
                  userForm.reset();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar Usuário' : 'Novo Usuário'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="email"
                      rules={{ required: 'Email é obrigatório' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!editingItem && (
                      <FormField
                        control={userForm.control}
                        name="password"
                        rules={{ required: 'Senha é obrigatória' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={userForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Função</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full rounded-md border border-input bg-background px-3 py-2">
                              <option value="admin">Administrador</option>
                              <option value="user">Usuário</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="active"
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
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userData) => (
                <TableRow key={userData.id}>
                  <TableCell>{userData.email}</TableCell>
                  <TableCell>{userData.role}</TableCell>
                  <TableCell>{userData.active ? 'Ativo' : 'Inativo'}</TableCell>
                  <TableCell>
                    {userData.last_login 
                      ? new Date(userData.last_login).toLocaleString('pt-BR')
                      : 'Nunca'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editUser(userData)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteUser(userData.id)}
                        disabled={userData.id === user?.id} // Can't delete self
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

export default SecureAdmin;