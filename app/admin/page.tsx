import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarDays, Trophy, PiggyBank, ArrowRight, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    // 1. Fetch Next Racha
    // 1. Fetch Next Racha
    const { data: nextRacha } = await supabase
        .from('rachas')
        .select('*')
        .eq('status', 'open')
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
        .limit(1)
        .single();

    // 2. Fetch Members Count
    const { count: membersCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    // 3. Fetch Financial Balance (Income - Expense)
    const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('type, amount');

    const balance = transactions?.reduce((acc, curr) => {
        return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
    }, 0) || 0;

    // 4. Fetch Recent Activity (Last 3 transactions)
    const { data: recentActivity } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(3);

    // Fetch user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

    const role = profile?.role || 'user';
    const showFinance = role === 'admin'; // Only admin sees finance on dashboard

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="pl-12 lg:pl-0">
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">Painel Administrativo</h1>
                    <p className="text-gray-500">Visão geral do sistema Rachaldeira</p>
                </div>
                <div className="text-sm text-gray-400 bg-white/50 backdrop-blur-sm p-2 rounded-lg border border-gray-100 md:bg-transparent md:border-0 md:p-0">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Sao_Paulo' })}
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Próximo Racha</CardTitle>
                        <CalendarDays className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        {nextRacha ? (
                            <>
                                <div className="text-2xl font-bold">
                                    {new Date(nextRacha.date_time).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })}
                                </div>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {new Date(nextRacha.date_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} • {nextRacha.location}
                                </p>
                            </>
                        ) : (
                            <div className="text-lg font-medium text-gray-500">Nenhum racha agendado</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Integrantes Ativos</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{membersCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Total cadastrado
                        </p>
                    </CardContent>
                </Card>
                {showFinance ? (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Caixa Atual</CardTitle>
                            <PiggyBank className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Balanço geral
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-gray-50 border-dashed">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-400">Caixa Atual</CardTitle>
                            <PiggyBank className="h-4 w-4 text-gray-300" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-medium text-gray-400">Acesso Restrito</div>
                            <p className="text-xs text-gray-400">
                                Disponível apenas para administradores
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {showFinance ? (
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle>Atividades Recentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivity && recentActivity.length > 0 ? (
                                    recentActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-center gap-4 py-2 border-b last:border-0 border-gray-100">
                                            <div className={`w-2 h-2 rounded-full ${activity.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{activity.description || activity.category}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activity.amount)}
                                                </p>
                                            </div>
                                            <span className="ml-auto text-xs text-gray-400">
                                                {new Date(activity.transaction_date).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">Nenhuma atividade recente.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="col-span-1 bg-gray-50 border-dashed">
                        <CardHeader>
                            <CardTitle className="text-gray-400">Atividades Recentes</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-48">
                            <div className="text-center text-gray-400">
                                <PiggyBank className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Visualização restrita</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Link href="/admin/rachas" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                            <CalendarDays className="w-6 h-6 mx-auto mb-2 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">Novo Racha</span>
                        </Link>
                        {showFinance && (
                            <Link href="/admin/financeiro" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                                <PiggyBank className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                                <span className="text-sm font-medium text-gray-700">Registrar Pagamento</span>
                            </Link>
                        )}
                        <Link href="/admin/integrantes" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                            <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Novo Integrante</span>
                        </Link>
                        <Link href="/admin/campeonatos" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                            <span className="text-sm font-medium text-gray-700">Gerenciar Torneio</span>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
