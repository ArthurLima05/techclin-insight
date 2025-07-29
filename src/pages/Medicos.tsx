import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

interface Medico {
  id: string;
  nome: string;
  especialidade: string;
  crm: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  created_at: string;
}

const Medicos = () => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMedico, setEditingMedico] = useState<Medico | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    especialidade: '',
    crm: '',
    telefone: '',
    email: '',
    ativo: true,
  });
  const { clinic } = useClinic();
  const { toast } = useToast();

  const fetchMedicos = async () => {
    if (!clinic) return;

    try {
      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .eq('clinica_id', clinic.id)
        .order('nome');

      if (error) throw error;
      setMedicos(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar médicos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicos();
  }, [clinic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;

    try {
      if (editingMedico) {
        const { error } = await supabase
          .from('medicos')
          .update({
            nome: formData.nome,
            especialidade: formData.especialidade,
            crm: formData.crm,
            telefone: formData.telefone || null,
            email: formData.email || null,
            ativo: formData.ativo,
          })
          .eq('id', editingMedico.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Médico atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('medicos')
          .insert({
            clinica_id: clinic.id,
            nome: formData.nome,
            especialidade: formData.especialidade,
            crm: formData.crm,
            telefone: formData.telefone || null,
            email: formData.email || null,
            ativo: formData.ativo,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Médico cadastrado com sucesso",
        });
      }

      setDialogOpen(false);
      setEditingMedico(null);
      setFormData({
        nome: '',
        especialidade: '',
        crm: '',
        telefone: '',
        email: '',
        ativo: true,
      });
      fetchMedicos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar médico",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (medico: Medico) => {
    setEditingMedico(medico);
    setFormData({
      nome: medico.nome,
      especialidade: medico.especialidade,
      crm: medico.crm,
      telefone: medico.telefone || '',
      email: medico.email || '',
      ativo: medico.ativo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este médico?')) return;

    try {
      const { error } = await supabase
        .from('medicos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Médico removido com sucesso",
      });
      
      fetchMedicos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover médico",
        variant: "destructive",
      });
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
        description: `Médico ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      });
      
      fetchMedicos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do médico",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Médicos</h1>
          <p className="text-muted-foreground">Gerencie os profissionais da clínica</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingMedico(null);
              setFormData({
                nome: '',
                especialidade: '',
                crm: '',
                telefone: '',
                email: '',
                ativo: true,
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Médico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMedico ? 'Editar Médico' : 'Novo Médico'}
              </DialogTitle>
              <DialogDescription>
                {editingMedico ? 'Atualize as informações do médico' : 'Cadastre um novo médico na clínica'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome*</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="especialidade">Especialidade*</Label>
                  <Input
                    id="especialidade"
                    value={formData.especialidade}
                    onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crm">CRM*</Label>
                  <Input
                    id="crm"
                    value={formData.crm}
                    onChange={(e) => setFormData({...formData, crm: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
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
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMedico ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Médicos</CardTitle>
          <CardDescription>
            Total de {medicos.length} médicos cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>CRM</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicos.map((medico) => (
                <TableRow key={medico.id}>
                  <TableCell className="font-medium">{medico.nome}</TableCell>
                  <TableCell>{medico.especialidade}</TableCell>
                  <TableCell>{medico.crm}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {medico.telefone && <div>{medico.telefone}</div>}
                      {medico.email && <div>{medico.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={medico.ativo ? "default" : "secondary"}>
                      {medico.ativo ? (
                        <><UserCheck className="w-3 h-3 mr-1" /> Ativo</>
                      ) : (
                        <><UserX className="w-3 h-3 mr-1" /> Inativo</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(medico)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={medico.ativo ? "outline" : "default"}
                        onClick={() => toggleAtivo(medico.id, !medico.ativo)}
                      >
                        {medico.ativo ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(medico.id)}
                      >
                        <Trash2 className="w-3 h-3" />
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

export default Medicos;