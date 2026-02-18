'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    transaction_date: string;
    status: string;
    payment_method: string;
}

export default function FinancialTransactions({ initialTransactions, members }: { initialTransactions: any[], members?: any[] }) {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient();
        const { data, error } = await supabase
            .from('financial_transactions')
            .insert([
                {
                    type,
                    category,
                    amount: parseFloat(amount),
                    description,
                    transaction_date: date,
                    status: 'completed', // Default auto-complete for now
                }
            ])
            .select()
            .single();

        if (error) {
            alert('Erro ao adicionar transação');
            console.error(error);
        } else {
            setTransactions([data, ...transactions]);
            setIsOpen(false);
            // Reset form
            setAmount('');
            setDescription('');
            setCategory('');
        }
        setLoading(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Histórico de Transações</CardTitle>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="w-4 h-4 mr-2" /> Nova Transação
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Nova Transação</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select value={type} onValueChange={(val: 'income' | 'expense') => setType(val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Receita (Entrada)</SelectItem>
                                            <SelectItem value="expense">Despesa (Saída)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoria</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {type === 'income' ? (
                                                <>
                                                    <SelectItem value="monthly_fee">Mensalidade</SelectItem>
                                                    <SelectItem value="game_fee">Avulso / Diária</SelectItem>
                                                    <SelectItem value="other">Outros</SelectItem>
                                                </>
                                            ) : (
                                                <>
                                                    <SelectItem value="field_rental">Aluguel Quadra</SelectItem>
                                                    <SelectItem value="equipment">Equipamento</SelectItem>
                                                    <SelectItem value="prize">Premiação</SelectItem>
                                                    <SelectItem value="other">Outros</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalhes da transação..."
                                />
                            </div>
                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                                {loading ? 'Salvando...' : 'Salvar Transação'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {transactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{t.description || t.category}</p>
                                    <p className="text-sm text-gray-500">{new Date(t.transaction_date).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {t.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                            </div>
                        </div>
                    ))}
                    {transactions.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Nenhuma transação registrada.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
