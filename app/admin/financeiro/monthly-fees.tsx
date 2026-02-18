'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, XCircle, Search, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Member {
    id: string;
    name: string;
    photo_url?: string;
}

interface Transaction {
    id: string;
    member_id?: string;
    category: string;
    transaction_date: string;
    type: string;
}

interface MonthlyFeesProps {
    members: Member[];
    transactions: Transaction[];
}

export default function MonthlyFees({ members, transactions }: MonthlyFeesProps) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [amount, setAmount] = useState('50'); // Default fee amount

    // Filter transactions for selected period and category 'monthly_fee'
    const periodTransactions = transactions.filter(t => {
        if (!t.transaction_date || t.category !== 'monthly_fee') return false;

        // Parse date manually to avoid timezone issues
        // format: YYYY-MM-DD
        const [year, month, day] = t.transaction_date.split('-').map(Number);

        console.log('Checking transaction:', {
            t_date: t.transaction_date,
            parsed: { year, month, day },
            target: { selectedMonth, selectedYear },
            match: (month - 1).toString() === selectedMonth && year.toString() === selectedYear
        });

        // Month in Date object is 0-indexed, but in DB it's 1-indexed (from the split)
        // However, the selectedMonth is 0-indexed (from getMonth())
        // So we need to subtract 1 from the split month to match selectedMonth
        return (month - 1).toString() === selectedMonth &&
            year.toString() === selectedYear;
    });

    const getPaymentStatus = (memberId: string) => {
        return periodTransactions.some(t => t.member_id === memberId);
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMarkAsPaid = async () => {
        if (!selectedMember) return;

        const supabase = createClient();
        // Create date for the 1st of selected month/year manually to avoid timezone issues
        const monthStr = (parseInt(selectedMonth) + 1).toString().padStart(2, '0');
        const transactionDate = `${selectedYear}-${monthStr}-01`;

        const { error } = await supabase
            .from('financial_transactions')
            .insert({
                type: 'income',
                category: 'monthly_fee',
                amount: parseFloat(amount),
                description: `Mensalidade - ${selectedMember.name} - ${parseInt(selectedMonth) + 1}/${selectedYear}`,
                transaction_date: transactionDate,
                member_id: selectedMember.id,
                status: 'completed'
            });

        if (error) {
            alert('Erro ao registrar pagamento: ' + (error.message || JSON.stringify(error)));
            console.error(error);
        } else {
            setPaymentModalOpen(false);
            window.location.reload(); // Refresh to show new status
        }
    };

    const openPaymentModal = (member: Member) => {
        setSelectedMember(member);
        setPaymentModalOpen(true);
    };

    const periodName = new Date(parseInt(selectedYear), parseInt(selectedMonth)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Controle de Mensalidades</CardTitle>
                        <CardDescription>
                            Gerenciamento de pagamentos para {periodName}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                        {new Date(0, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2024, 2025, 2026, 2027].map(year => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar integrante..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Integrante</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMembers.length > 0 ? (
                                filteredMembers.map((member) => {
                                    const isPaid = getPaymentStatus(member.id);
                                    return (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">{member.name}</TableCell>
                                            <TableCell className="text-center">
                                                {isPaid ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle2 size={14} /> Pago
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <XCircle size={14} /> Pendente
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isPaid ? (
                                                    <Button variant="ghost" size="sm" disabled className="opacity-50">
                                                        Registrado
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        onClick={() => openPaymentModal(member)}
                                                    >
                                                        <DollarSign size={14} className="mr-1" />
                                                        Receber
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                        Nenhum integrante encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Pagamento</DialogTitle>
                    </DialogHeader>
                    {selectedMember && (
                        <div className="py-4 space-y-4">
                            <p className="text-sm text-gray-500">
                                Registrando pagamento de mensalidade para: <span className="font-bold text-gray-900">{selectedMember.name}</span>
                            </p>
                            <div className="space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Referência: {periodName}
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancelar</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleMarkAsPaid}>
                            Confirmar Recebimento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
