import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Trophy, Activity, AlertCircle, Shield, Star, Medal } from 'lucide-react';

export const revalidate = 0;

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Buscar dados do membro
    const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();

    if (memberError || !member) {
        notFound();
    }

    // 2. Buscar Racha de Ajustes para ignorar na contagem de jogos
    const { data: adjRacha } = await supabase
        .from('rachas')
        .select('id')
        .or('name.eq.Ajustes Globais Manuais,location.eq.Sistema (Manual)')
        .maybeSingle();

    // 3. Buscar estatísticas de scouts (Rachas Normais + Ajustes)
    const { data: rachaScouts } = await supabase
        .from('racha_scouts')
        .select('*')
        .eq('member_id', id);

    // 4. Buscar estatísticas de Campeonatos
    const { data: champScouts } = await supabase
        .from('match_player_stats')
        .select('*')
        .eq('member_id', id);

    // 5. Buscar Presenças (Jogos Reais)
    const { data: attendance } = await supabase
        .from('racha_attendance')
        .select('id')
        .eq('member_id', id)
        .eq('status', 'in');

    // 6. Buscar Destaques (Top 1, 2, 3 e Xerife) - Marcados na tabela rachas
    const { data: rachasAsTop1 } = await supabase.from('rachas').select('id').or(`top1_id.eq.${id},top1_extra_id.eq.${id},top1_extra2_id.eq.${id}`);
    const { data: rachasAsTop2 } = await supabase.from('rachas').select('id').or(`top2_id.eq.${id},top2_extra_id.eq.${id},top2_extra2_id.eq.${id}`);
    const { data: rachasAsTop3 } = await supabase.from('rachas').select('id').or(`top3_id.eq.${id},top3_extra_id.eq.${id},top3_extra2_id.eq.${id}`);
    const { data: rachasAsSheriff } = await supabase.from('rachas').select('id').or(`sheriff_id.eq.${id},sheriff_extra_id.eq.${id},sheriff_extra2_id.eq.${id}`);

    // Consolidação de Dados (Excluindo campeonatos conforme solicitado)
    const goals = (rachaScouts?.reduce((acc, s) => acc + (s.goals || 0), 0) || 0);
    const assists = (rachaScouts?.reduce((acc, s) => acc + (s.assists || 0), 0) || 0);
    const saves = (rachaScouts?.reduce((acc, s) => acc + (s.difficult_saves || 0), 0) || 0);
    const warnings = (rachaScouts?.reduce((acc, s) => acc + (s.warnings || 0), 0) || 0);

    // Jogos = Presenças Reais + Ajuste Manual de Fominha
    const manualAdjustment = rachaScouts?.find(s => s.racha_id === adjRacha?.id);
    const matches = (attendance?.length || 0) + ((manualAdjustment as any)?.attendance_count || 0);

    // Destaques (Soma das indicações nos rachas + Ajustes Manuais na racha_scouts)
    const top1Count = (rachasAsTop1?.filter(r => r.id !== adjRacha?.id).length || 0) + (rachaScouts?.reduce((acc, s) => acc + ((s as any).top1_count || 0), 0) || 0);
    const top2Count = (rachasAsTop2?.filter(r => r.id !== adjRacha?.id).length || 0) + (rachaScouts?.reduce((acc, s) => acc + ((s as any).top2_count || 0), 0) || 0);
    const top3Count = (rachasAsTop3?.filter(r => r.id !== adjRacha?.id).length || 0) + (rachaScouts?.reduce((acc, s) => acc + ((s as any).top3_count || 0), 0) || 0);
    const sheriffCount = (rachasAsSheriff?.filter(r => r.id !== adjRacha?.id).length || 0) + (rachaScouts?.reduce((acc, s) => acc + ((s as any).sheriff_count || 0), 0) || 0);

    const points = (top1Count * 3) + (top2Count * 2) + top3Count + sheriffCount;

    const stats = {
        goals,
        assists,
        saves,
        warnings,
        matches,
        top1Count,
        top2Count,
        top3Count,
        sheriffCount,
        points
    };

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <Link href="/integrantes" className="inline-flex items-center text-gray-500 hover:text-[#093a9f] mb-8 transition-colors group">
                    <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
                    Voltar para Perebas
                </Link>

                {/* Header do Perfil */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
                    <div className="h-48 bg-gradient-to-r from-[#093a9f] to-blue-600 relative">
                        <div className="absolute -bottom-16 left-8 md:left-12">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-md relative">
                                {member.photo_url ? (
                                    <Image
                                        src={member.photo_url}
                                        alt={member.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                                        <User size={64} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="pt-20 pb-8 px-8 md:px-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{member.name}</h1>
                                <div className="flex items-center gap-3 text-gray-600">
                                    {member.position && (
                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold uppercase tracking-wide">
                                            {member.position}
                                        </span>
                                    )}
                                    {member.age && (
                                        <span className="text-sm">
                                            {member.age} anos
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stats Resumo */}
                            <div className="flex gap-6 mt-4 md:mt-0 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{stats.matches}</p>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Jogos</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-green-600">{stats.goals}</p>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Gols</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-blue-600">{stats.assists}</p>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Assist.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Estatísticas Detalhadas */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Activity className="text-[#093a9f]" />
                                Produção Ofensiva
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600 font-medium">Gols Marcados</span>
                                    <span className="text-2xl font-bold text-green-600">{stats.goals}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600 font-medium">Assistências</span>
                                    <span className="text-2xl font-bold text-blue-600">{stats.assists}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-l-4 border-green-500">
                                    <span className="text-gray-700 font-bold">Média de Gols/Jogo</span>
                                    <span className="text-lg font-bold text-gray-900">
                                        {stats.matches > 0 ? (stats.goals / stats.matches).toFixed(2) : '0.00'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Shield className="text-gray-600" />
                                Defesa e Disciplina
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600 font-medium">Defesas Difíceis</span>
                                    <span className="text-2xl font-bold text-purple-600">{stats.saves}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600 font-medium">Cartões / Advertências</span>
                                    <span className="text-2xl font-bold text-yellow-600">{stats.warnings}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-l-4 border-purple-500">
                                    <span className="text-gray-700 font-bold">Média de Defesas/Jogo</span>
                                    <span className="text-lg font-bold text-gray-900">
                                        {stats.matches > 0 ? (stats.saves / stats.matches).toFixed(2) : '0.00'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Destaques e Premiações */}
                    <Card className="border-none shadow-md hover:shadow-lg transition-shadow md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                                <Trophy className="text-yellow-600" />
                                Histórico de Destaques
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-yellow-50 rounded-xl text-center border border-yellow-100">
                                    <div className="text-3xl mb-1">👑</div>
                                    <div className="text-2xl font-black text-yellow-700">{stats.top1Count}</div>
                                    <div className="text-[10px] font-bold uppercase text-yellow-600 tracking-wider">Craque</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-100">
                                    <div className="text-3xl mb-1">🥈</div>
                                    <div className="text-2xl font-black text-slate-700">{stats.top2Count}</div>
                                    <div className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">Top 2</div>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-xl text-center border border-orange-100">
                                    <div className="text-3xl mb-1">🥉</div>
                                    <div className="text-2xl font-black text-orange-700">{stats.top3Count}</div>
                                    <div className="text-[10px] font-bold uppercase text-orange-600 tracking-wider">Top 3</div>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                    <div className="text-3xl mb-1">👮</div>
                                    <div className="text-2xl font-black text-blue-700">{stats.sheriffCount}</div>
                                    <div className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Xerife</div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Medal size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Pontuação Total de Destaques</p>
                                        <p className="text-2xl font-black">{stats.points} pts</p>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] font-medium opacity-70">Cálculo: Craque(3), Top2(2), Top3(1), Xerife(1)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
