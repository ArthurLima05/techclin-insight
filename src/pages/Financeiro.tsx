import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/contexts/ClinicContext';
import { DollarSign, TrendingUp, TrendingDown, Plus, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinanceiroRecord {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  data: string;
  created_at: string;
}

interface FormData {
  descricao: string;
  valor: string;
  tipo: 'entrada' | 'saida';
}

const Financeiro: React.FC = () => {
  const { clinic } = useClinic();
  const { toast } = useToast();
  const [records, setRecords] = useState<FinanceiroRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    descricao: '',
    valor: '',
    tipo: 'entrada'
  });

  const loadFinanceiroData = async () => {
    if (!clinic?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('financeiro')
        .select('*')
        .eq('clinica_id', clinic.id)
        .order('data', { ascending: false });

      if (error) throw error;
      setRecords((data || []) as FinanceiroRecord[]);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados financeiros",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceiroData();
  }, [clinic?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clinic?.id || !formData.descricao || !formData.valor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('financeiro')
        .insert({
          clinica_id: clinic.id,
          descricao: formData.descricao,
          valor: parseFloat(formData.valor),
          tipo: formData.tipo
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro financeiro adicionado com sucesso"
      });

      setFormData({ descricao: '', valor: '', tipo: 'entrada' });
      setIsDialogOpen(false);
      loadFinanceiroData();
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar registro financeiro",
        variant: "destructive"
      });
    }
  };

  // Cálculos dos totais
  const totalEntradas = records
    .filter(r => r.tipo === 'entrada')
    .reduce((sum, r) => sum + r.valor, 0);

  const totalSaidas = records
    .filter(r => r.tipo === 'saida')
    .reduce((sum, r) => sum + r.valor, 0);

  const saldo = totalEntradas - totalSaidas;

  // Dados para gráficos
  const chartData = records.reduce((acc, record) => {
    const date = format(new Date(record.data), 'dd/MM', { locale: ptBR });
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      if (record.tipo === 'entrada') {
        existing.entradas += record.valor;
      } else {
        existing.saidas += record.valor;
      }
    } else {
      acc.push({
        date,
        entradas: record.tipo === 'entrada' ? record.valor : 0,
        saidas: record.tipo === 'saida' ? record.valor : 0
      });
    }
    
    return acc;
  }, [] as Array<{ date: string; entradas: number; saidas: number }>);

  // Dados para gráfico de pizza
  const pieData = [
    { name: 'Entradas', value: totalEntradas, color: 'hsl(var(--primary))' },
    { name: 'Saídas', value: totalSaidas, color: 'hsl(var(--accent))' }
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Financeiro</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={loadFinanceiroData} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 max-w-md sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Registro Financeiro</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Digite a descrição"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="valor">Valor</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    placeholder="0,00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value: 'entrada' | 'saida') => setFormData({...formData, tipo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button type="submit" className="w-full">
                  Salvar Registro
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalEntradas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalSaidas)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Entrada vs Saída</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [
                    formatCurrency(Number(value)), 
                    `${name} (${((Number(value) / (totalEntradas + totalSaidas)) * 100).toFixed(1)}%)`
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparativo: Entradas vs Saídas por Tempo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="entradas" fill="hsl(var(--primary))" name="Entradas" />
                <Bar dataKey="saidas" fill="hsl(var(--accent))" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de registros */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Últimos Registros</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro financeiro encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Descrição</TableHead>
                    <TableHead className="min-w-[80px]">Tipo</TableHead>
                    <TableHead className="min-w-[100px]">Valor</TableHead>
                    <TableHead className="min-w-[120px]">Data</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.descricao}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                          record.tipo === 'entrada' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {record.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </TableCell>
                      <TableCell className={`font-medium ${record.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(record.valor)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="hidden sm:inline">
                          {format(new Date(record.data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                        <span className="sm:hidden">
                          {format(new Date(record.data), 'dd/MM/yy', { locale: ptBR })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Financeiro;