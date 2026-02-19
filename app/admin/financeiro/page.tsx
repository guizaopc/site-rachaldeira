import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';

import { PiggyBank, ArrowUpCircle, ArrowDownCircle, Plus, Wallet } from 'lucide-react';

import FinancialTransactionsList from './financial-transactions';
import MonthlyFeesList from './monthly-fees';

export const dynamic = 'force-dynamic';

export default async function FinancialPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Director restriction: cannot access financial page
    if (profile?.role === 'director' || (profile?.role !== 'admin' && profile?.role !== 'director')) {
        // Assuming default user also shouldn't see this, but specifically for director as requested:
        if (profile?.role === 'director') {
            redirect('/admin');
        }
    }

    // Buscar transações
    const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

    // Buscar integrantes
    const { data: members } = await supabase
        .from('members')
        .select('*')
        .order('name');

    // Calcular totais
    const totalIncome = transactions?.reduce((acc, curr) => {
        return curr.type === 'income' ? acc + curr.amount : acc;
    }, 0) || 0;

    const totalExpense = transactions?.reduce((acc, curr) => {
        return curr.type === 'expense' ? acc + curr.amount : acc;
    }, 0) || 0;

    const balance = totalIncome - totalExpense;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestão Financeira</h1>
                    <p className="text-gray-500">Controle de caixa, mensalidades e despesas do Rachaldeira</p>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 text-white border-0 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400">Saldo Total</CardTitle>
                        <PiggyBank className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Caixa disponível
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Receitas</CardTitle>
                        <div className="p-2 bg-emerald-100 rounded-full">
                            <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Entradas no período
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Despesas</CardTitle>
                        <div className="p-2 bg-red-100 rounded-full">
                            <ArrowDownCircle className="h-4 w-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Saídas no período
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Abas de Gerenciamento */}
            <Tabs defaultValue={tab || "transactions"} className="space-y-6">
                <TabsList className="bg-white p-1 rounded-xl border shadow-sm w-full md:w-auto grid grid-cols-2 md:inline-flex h-auto">
                    <TabsTrigger
                        value="transactions"
                        className="rounded-lg px-6 py-3 data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all"
                    >
                        Transações
                    </TabsTrigger>
                    <TabsTrigger
                        value="monthly-fees"
                        className="rounded-lg px-6 py-3 data-[state=active]:bg-gray-900 data-[state=active]:text-white transition-all"
                    >
                        Mensalidades
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="transactions" className="space-y-4">
                    <FinancialTransactionsList initialTransactions={transactions || []} members={members || []} />
                </TabsContent>
                <TabsContent value="monthly-fees">
                    <MonthlyFeesList members={members || []} transactions={transactions || []} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
