import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Doutor {
  id: string;
  nome: string;
  especialidade: string;
  telefone: string;
  email: string;
  ativo: boolean;
}

const Doutores = () => {
  const [doutores, setDoutores] = useState<Doutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoutor, setEditingDoutor] = useState<Doutor | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    especialidade: '',
    telefone: '',
    email: '',
    ativo: true
  });
  const { clinic } = useClinic();
  const { toast } = useToast();

  const fetchDoutores = async () => {
    console.log('Medicos - Clinica contexto:', clinic);
    console.log('Medicos - Clinica ID:', clinic?.id);
    try {
      console.log('Medicos - Buscando medicos para clinica:', clinic?.id);
      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .eq('clinica_id', clinic?.id)
        .order('nome');

      console.log('Medicos - Data encontrada:', data);
      console.log('Medicos - Error:', error);

      if (error) throw error;
      setDoutores(data || []);
    } catch (error) {
      console.error('Erro ao buscar doutores:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar doutores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinic) {
      fetchDoutores();
    }
  }, [clinic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoutor) {
        // Atualizar doutor existente
        const { error } = await supabase
          .from('medicos')
          .update({
            nome: formData.nome,
            especialidade: formData.especialidade,
            telefone: formData.telefone,
            email: formData.email,
            ativo: formData.ativo
          })
          .eq('id', editingDoutor.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Doutor atualizado com sucesso!",
        });
      } else {
        // Criar novo doutor
        const { error } = await supabase
          .from('medicos')
          .insert([{
            nome: formData.nome,
            especialidade: formData.especialidade,
            crm: '', // Campo obrigatório mas vazio para doutores
            telefone: formData.telefone,
            email: formData.email,
            ativo: formData.ativo,
            clinica_id: clinic?.id
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Doutor criado com sucesso!",
        });
      }

      setDialogOpen(false);
      setEditingDoutor(null);
      setFormData({
        nome: '',
        especialidade: '',
        telefone: '',
        email: '',
        ativo: true
      });
      fetchDoutores();
    } catch (error) {
      console.error('Erro ao salvar doutor:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar doutor",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (doutor: Doutor) => {
    setEditingDoutor(doutor);
    setFormData({
      nome: doutor.nome,
      especialidade: doutor.especialidade,
      telefone: doutor.telefone,
      email: doutor.email,
      ativo: doutor.ativo
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este doutor?')) {
      try {
        const { error } = await supabase
          .from('medicos')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Doutor excluído com sucesso!",
        });
        fetchDoutores();
      } catch (error) {
        console.error('Erro ao excluir doutor:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir doutor",
          variant: "destructive",
        });
      }
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('medicos')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Doutor ${ativo ? 'ativado' : 'desativado'} com sucesso!`,
      });
      fetchDoutores();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Doutores</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingDoutor(null);
                setFormData({
                  nome: '',
                  especialidade: '',
                  telefone: '',
                  email: '',
                  ativo: true
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Doutor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingDoutor ? 'Editar Doutor' : 'Adicionar Doutor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="especialidade">Especialidade</Label>
                <Input
                  id="especialidade"
                  value={formData.especialidade}
                  onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({...formData, ativo: checked})}
                />
                <Label htmlFor="ativo">Ativo</Label>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  {editingDoutor ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Lista de Doutores</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-4">
            {doutores.map((doutor) => (
              <Card key={doutor.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-sm">{doutor.nome}</h3>
                      <p className="text-xs text-muted-foreground">{doutor.especialidade}</p>
                    </div>
                    <Badge variant={doutor.ativo ? "default" : "secondary"} className="text-xs">
                      {doutor.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    {doutor.telefone && <p><span className="font-medium">Tel:</span> {doutor.telefone}</p>}
                    {doutor.email && <p><span className="font-medium">Email:</span> {doutor.email}</p>}
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={doutor.ativo}
                        onCheckedChange={(checked) => toggleAtivo(doutor.id, checked)}
                        className="scale-75"
                      />
                      <span className="text-xs">Ativo</span>
                    </div>
                    
                    <div className="flex justify-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(doutor)}
                        className="h-8 w-8 p-0 flex items-center justify-center"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(doutor.id)}
                        className="h-8 w-8 p-0 flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Especialidade</th>
                  <th className="text-left p-3">Telefone</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {doutores.map((doutor) => (
                  <tr key={doutor.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{doutor.nome}</td>
                    <td className="p-3">{doutor.especialidade}</td>
                    <td className="p-3">{doutor.telefone}</td>
                    <td className="p-3">{doutor.email}</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={doutor.ativo}
                          onCheckedChange={(checked) => toggleAtivo(doutor.id, checked)}
                        />
                        <Badge variant={doutor.ativo ? "default" : "secondary"}>
                          {doutor.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(doutor)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(doutor.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {doutores.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum doutor cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Doutores;