import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trophy, Target, Shield, Users, Star, AlertTriangle, Medal } from 'lucide-react';
import VotingForm from '@/components/voting-form';
import { redirect } from 'next/navigation';
import RankingTable from './ranking-table';
import HighlightsGrid from './highlights-grid';

export const revalidate = 0;

export default async function RankingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Buscar período de votação ativo
    const { data: activePeriod } = await supabase
        .from('voting_periods')
        .select('*')
        .eq('is_open', true)
        .single();

    // Verificar se usuário já votou neste período
    let userVote: any = null;
    let canVote = false;
    let userMemberId = '';
    if (activePeriod && user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('member_id')
            .eq('id', user.id)
            .single();

        if (profile?.member_id) {
            userMemberId = profile.member_id;

            const { data: existingVote } = await supabase
                .from('votes')
                .select('*')
                .eq('voting_period_id', activePeriod.id)
                .eq('voter_member_id', profile.member_id)
                .single();

            userVote = existingVote;
            canVote = !existingVote;
        }
    }

    // Buscar todos os membros ativos
    const { data: members } = await supabase
        .from('members')
        .select('*')
        .eq('is_active', true)
        .order('name');

    // Buscar TODOS os rachas (para ser em tempo real)
    const { data: allRachas } = await supabase
        .from('rachas')
        .select('*');

    const allRachaIds = allRachas?.map(r => r.id) || [];

    // Buscar scouts de rachas (todos)
    const { data: rachaScouts } = await supabase
        .from('racha_scouts')
        .select('*')
        .in('racha_id', allRachaIds);

    const { data: attendance } = await supabase
        .from('racha_attendance')
        .select('*')
        .eq('status', 'in')
        .in('racha_id', allRachaIds);

    // Buscar último racha fechado para destaques semanais
    const { data: lastRacha } = await supabase
        .from('rachas')
        .select('*')
        .eq('status', 'closed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    let weeklyHighlights = null;
    if (lastRacha) {
        // Buscar scouts deste racha para conferência interna (opcional, já temos no rachaScouts se for o mesmo id)
        const weekScouts = rachaScouts?.filter(s => s.racha_id === lastRacha.id) || [];

        // Buscar nomes dos destaques manuais
        const top1 = members?.find(m => m.id === lastRacha.top1_id);
        const top1_extra = members?.find(m => m.id === lastRacha.top1_extra_id);
        const top2 = members?.find(m => m.id === lastRacha.top2_id);
        const top2_extra = members?.find(m => m.id === lastRacha.top2_extra_id);
        const top3 = members?.find(m => m.id === lastRacha.top3_id);
        const top3_extra = members?.find(m => m.id === lastRacha.top3_extra_id);
        const sheriff = members?.find(m => m.id === lastRacha.sheriff_id);
        const sheriff_extra = members?.find(m => m.id === lastRacha.sheriff_extra_id);

        weeklyHighlights = {
            rachaLabel: new Date(lastRacha.date_time).toLocaleDateString('pt-BR'),
            top1,
            top1_extra,
            top2,
            top2_extra,
            top3,
            top3_extra,
            sheriff,
            sheriff_extra
        };
    }

    // Buscar votos se houver período ativo
    let votes: any[] = [];
    if (activePeriod) {
        const { data: votesData } = await supabase
            .from('votes')
            .select('*')
            .eq('voting_period_id', activePeriod.id);
        votes = votesData || [];
    }
    // Buscar estatísticas de campeonatos para unificar o ranking
    const { data: championshipStats } = await supabase
        .from('match_player_stats')
        .select('*');

    // Calcular rankings para cada membro (APENAS RACHAS ENCERRADOS + CAMPEONATOS)
    const rankings = members?.map(member => {
        const memberRachaScouts = rachaScouts?.filter(s => s.member_id === member.id) || [];
        const memberChampStats = championshipStats?.filter(s => s.member_id === member.id) || [];
        const memberAttendance = attendance?.filter(a => a.member_id === member.id) || [];

        const goals = memberRachaScouts.reduce((sum, s) => sum + (s.goals || 0), 0) +
            memberChampStats.reduce((sum, s) => sum + (s.goals || 0), 0);

        const assists = memberRachaScouts.reduce((sum, s) => sum + (s.assists || 0), 0) +
            memberChampStats.reduce((sum, s) => sum + (s.assists || 0), 0);

        const saves = memberRachaScouts.reduce((sum, s) => sum + (s.difficult_saves || 0), 0) +
            memberChampStats.reduce((sum, s) => sum + (s.difficult_saves || 0), 0);

        const participations = memberAttendance.length +
            memberRachaScouts.reduce((sum, s) => sum + ((s as any).attendance_count || 0), 0);

        // Calcular Pontos (Highlights) baseados nas marcações manuais + Ajustes Manuais do painel admin
        const top1Count = (allRachas?.filter((r: any) => r.top1_id === member.id || r.top1_extra_id === member.id).length || 0) +
            memberRachaScouts.reduce((sum, s) => sum + ((s as any).top1_count || 0), 0);

        const top2Count = (allRachas?.filter((r: any) => r.top2_id === member.id || r.top2_extra_id === member.id).length || 0) +
            memberRachaScouts.reduce((sum, s) => sum + ((s as any).top2_count || 0), 0);

        const top3Count = (allRachas?.filter((r: any) => r.top3_id === member.id || r.top3_extra_id === member.id).length || 0) +
            memberRachaScouts.reduce((sum, s) => sum + ((s as any).top3_count || 0), 0);

        const sheriffCount = (allRachas?.filter((r: any) => r.sheriff_id === member.id || r.sheriff_extra_id === member.id).length || 0) +
            memberRachaScouts.reduce((sum, s) => sum + ((s as any).sheriff_count || 0), 0);

        const points = (top1Count * 3) + (top2Count * 2) + top3Count + sheriffCount;

        const craqueVotes = votes.filter(v => v.craque_member_id === member.id).length;
        const xerifeVotes = votes.filter(v => v.xerife_member_id === member.id).length;

        return {
            ...member,
            goals,
            assists,
            saves,
            participations,
            fominhaPct: allRachas && allRachas.length > 0 ? Math.round((memberAttendance.length / allRachas.length) * 100) : 0,
            top1Count,
            top2Count,
            top3Count,
            sheriffCount,
            craquePoints: (top1Count * 3) + (top2Count * 2) + top3Count,
            sheriffPoints: sheriffCount * 1,
            craqueVotes,
            xerifeVotes,
            points
        };
    }) || [];


    // Determinar badges (top 1 de cada categoria)
    const maxGoals = Math.max(...rankings.map(r => r.goals), 0);
    const maxAssists = Math.max(...rankings.map(r => r.assists), 0);
    const maxSaves = Math.max(...rankings.map(r => r.saves), 0);
    const maxParticipations = Math.max(...rankings.map(r => r.participations), 0);
    const maxCraqueVotes = Math.max(...rankings.map(r => r.craqueVotes), 0);
    const maxXerifeVotes = Math.max(...rankings.map(r => r.xerifeVotes), 0);

    const rankingsWithBadges = rankings.map(r => ({
        ...r,
        badges: [
            r.goals === maxGoals && maxGoals > 0 ? { icon: '🎯', label: 'Artilheiro' } : null,
            r.assists === maxAssists && maxAssists > 0 ? { icon: '🍽️', label: 'Garçom' } : null,
            r.saves === maxSaves && maxSaves > 0 ? { icon: '🧱', label: 'Paredão' } : null,
            r.participations === maxParticipations && maxParticipations > 0 ? { icon: '🏃', label: 'Fominha' } : null,
            r.craqueVotes === maxCraqueVotes && maxCraqueVotes > 0 ? { icon: '⭐', label: 'Craque' } : null,
            r.xerifeVotes === maxXerifeVotes && maxXerifeVotes > 0 ? { icon: '👮', label: 'Xerife' } : null,
        ].filter(Boolean),
    }));

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-6xl mx-auto px-4 pt-0 pb-8">
                <div className="text-center mb-6">
                    <img
                        src="https://pqroxmeyuicutatbessb.supabase.co/storage/v1/object/public/Fotos/logo%20premiacao%20rachaldeira.png"
                        alt="Logo Premiação"
                        className="h-[360px] mx-auto -mt-12 -mb-12 object-contain"
                    />
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                        Premiação Anual 2026 - Rachaldeira
                    </h1>
                    <p className="text-xl text-gray-600">
                        Os melhores jogadores do Rachaldeira
                    </p>
                </div>

                {/* Período de Votação */}
                {activePeriod && (
                    <Card className="mb-8 border-2 border-yellow-400 bg-yellow-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="text-yellow-600" />
                                Votação Aberta: {activePeriod.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 mb-3">
                                Período: {new Date(activePeriod.start_date).toLocaleDateString('pt-BR')} até{' '}
                                {new Date(activePeriod.end_date).toLocaleDateString('pt-BR')}
                            </p>
                            {canVote ? (
                                <>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Vote em quem você acha que merece as badges de Craque ⭐ e Xerife 👮 deste período!
                                    </p>
                                    <VotingForm
                                        activePeriod={activePeriod}
                                        members={members || []}
                                        userMemberId={userMemberId}
                                    />
                                </>
                            ) : userVote ? (
                                <div className="bg-green-50 border border-green-200 rounded p-4">
                                    <p className="text-green-800 font-semibold mb-2">✅ Você já votou neste período!</p>
                                    <p className="text-sm text-gray-700">
                                        Seus votos foram registrados com sucesso. Aguarde o resultado final.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-gray-50 border border-gray-200 rounded p-4">
                                    <p className="text-gray-700 text-sm">
                                        Você precisa estar cadastrado como membro para votar.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Destaques da Semana (Último Racha) */}
                {weeklyHighlights && (
                    <Card className="mb-8 border-none bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-xl overflow-hidden relative">
                        {/* Background pattern */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

                        <CardHeader className="relative z-10 border-b border-blue-700/50 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-2xl text-white">
                                    <Star className="text-yellow-400 fill-yellow-400" />
                                    Destaques da Semana
                                </CardTitle>
                                <span className="bg-blue-950/50 px-3 py-1 rounded-full text-sm font-medium border border-blue-700/50">
                                    {weeklyHighlights.rachaLabel}
                                </span>
                            </div>
                            <p className="text-blue-200 text-sm">Os melhores do último racha realizado</p>
                        </CardHeader>
                        <CardContent className="relative z-10 pt-4 pb-6 px-0 md:px-6">
                            {/* Mobile View - Cards Grid */}
                            <div className="grid grid-cols-2 gap-3 md:hidden px-4">
                                {/* Top 1 */}
                                <div className="bg-white/10 rounded-lg p-3 text-center border border-white/10 flex flex-col justify-center min-h-[120px]">
                                    <div className="text-2xl mb-1">👑</div>
                                    <div className="font-bold text-yellow-300 text-[10px] uppercase mb-1">Craque</div>
                                    <div className="font-bold text-white text-base leading-tight">
                                        {weeklyHighlights.top1?.name || '-'}
                                    </div>
                                    {weeklyHighlights.top1_extra && (
                                        <div className="mt-2 pt-2 border-t border-white/10 font-bold text-white text-base leading-tight">
                                            {weeklyHighlights.top1_extra.name}
                                        </div>
                                    )}
                                </div>

                                {/* Top 2 */}
                                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5 flex flex-col justify-center min-h-[120px]">
                                    <div className="text-2xl mb-1">🥈</div>
                                    <div className="font-bold text-gray-300 text-[10px] uppercase mb-1">Top 2</div>
                                    <div className="font-bold text-white text-base leading-tight">
                                        {weeklyHighlights.top2?.name || '-'}
                                    </div>
                                    {weeklyHighlights.top2_extra && (
                                        <div className="mt-2 pt-2 border-t border-white/10 font-bold text-white text-base leading-tight">
                                            {weeklyHighlights.top2_extra.name}
                                        </div>
                                    )}
                                </div>

                                {/* Top 3 */}
                                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5 flex flex-col justify-center min-h-[120px]">
                                    <div className="text-2xl mb-1">🥉</div>
                                    <div className="font-bold text-orange-300 text-[10px] uppercase mb-1">Top 3</div>
                                    <div className="font-bold text-white text-base leading-tight">
                                        {weeklyHighlights.top3?.name || '-'}
                                    </div>
                                    {weeklyHighlights.top3_extra && (
                                        <div className="mt-2 pt-2 border-t border-white/10 font-bold text-white text-base leading-tight">
                                            {weeklyHighlights.top3_extra.name}
                                        </div>
                                    )}
                                </div>

                                {/* Xerife */}
                                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5 flex flex-col justify-center min-h-[120px]">
                                    <div className="text-2xl mb-1">👮</div>
                                    <div className="font-bold text-blue-300 text-[10px] uppercase mb-1">Xerife</div>
                                    <div className="font-bold text-white text-base leading-tight">
                                        {weeklyHighlights.sheriff?.name || '-'}
                                    </div>
                                    {weeklyHighlights.sheriff_extra && (
                                        <div className="mt-2 pt-2 border-t border-white/10 font-bold text-white text-base leading-tight">
                                            {weeklyHighlights.sheriff_extra.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Desktop View - Table */}
                            <div className="hidden md:block overflow-x-auto rounded-lg border border-white/10">
                                <Table>
                                    <TableHeader className="bg-blue-950/50">
                                        <TableRow className="hover:bg-transparent border-white/10">
                                            <TableHead className="text-center font-bold text-white h-12 text-lg w-1/4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>👑</span> Craque
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-center font-bold text-white h-12 text-lg w-1/4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>🥈</span> Top 2
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-center font-bold text-orange-300 h-12 text-lg w-1/4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>🥉</span> Top 3
                                                </div>
                                            </TableHead>
                                            <TableHead className="text-center font-bold text-white h-12 text-lg w-1/4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>👮</span> Xerife
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="hover:bg-white/5 border-none">
                                            <TableCell className="text-center py-6">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-2xl font-black text-white tracking-wide drop-shadow-md">
                                                            {weeklyHighlights.top1?.name || '-'}
                                                        </span>
                                                        {weeklyHighlights.top1?.position && (
                                                            <span className="text-xs text-yellow-200/70 mt-1 uppercase tracking-wider font-semibold">
                                                                {weeklyHighlights.top1.position}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {weeklyHighlights.top1_extra && (
                                                        <div className="flex flex-col items-center pt-2 border-t border-white/10 w-full">
                                                            <span className="text-2xl font-black text-white tracking-wide drop-shadow-md">
                                                                {weeklyHighlights.top1_extra.name}
                                                            </span>
                                                            {weeklyHighlights.top1_extra.position && (
                                                                <span className="text-xs text-yellow-200/70 mt-1 uppercase tracking-wider font-semibold">
                                                                    {weeklyHighlights.top1_extra.position}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-6">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xl font-bold text-gray-100">
                                                            {weeklyHighlights.top2?.name || '-'}
                                                        </span>
                                                        {weeklyHighlights.top2?.position && (
                                                            <span className="text-xs text-blue-200/50 mt-1">
                                                                {weeklyHighlights.top2.position}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {weeklyHighlights.top2_extra && (
                                                        <div className="flex flex-col items-center pt-2 border-t border-white/10 w-full">
                                                            <span className="text-xl font-bold text-gray-100">
                                                                {weeklyHighlights.top2_extra.name}
                                                            </span>
                                                            {weeklyHighlights.top2_extra.position && (
                                                                <span className="text-xs text-blue-200/50 mt-1">
                                                                    {weeklyHighlights.top2_extra.position}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-6">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xl font-bold text-orange-50">
                                                            {weeklyHighlights.top3?.name || '-'}
                                                        </span>
                                                        {weeklyHighlights.top3?.position && (
                                                            <span className="text-xs text-blue-200/50 mt-1">
                                                                {weeklyHighlights.top3.position}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {weeklyHighlights.top3_extra && (
                                                        <div className="flex flex-col items-center pt-2 border-t border-white/10 w-full">
                                                            <span className="text-xl font-bold text-orange-50">
                                                                {weeklyHighlights.top3_extra.name}
                                                            </span>
                                                            {weeklyHighlights.top3_extra.position && (
                                                                <span className="text-xs text-blue-200/50 mt-1">
                                                                    {weeklyHighlights.top3_extra.position}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-6">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xl font-bold text-blue-50">
                                                            {weeklyHighlights.sheriff?.name || '-'}
                                                        </span>
                                                        {weeklyHighlights.sheriff?.position && (
                                                            <span className="text-xs text-blue-200/50 mt-1">
                                                                {weeklyHighlights.sheriff.position}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {weeklyHighlights.sheriff_extra && (
                                                        <div className="flex flex-col items-center pt-2 border-t border-white/10 w-full">
                                                            <span className="text-xl font-bold text-blue-50">
                                                                {weeklyHighlights.sheriff_extra.name}
                                                            </span>
                                                            {weeklyHighlights.sheriff_extra.position && (
                                                                <span className="text-xs text-blue-200/50 mt-1">
                                                                    {weeklyHighlights.sheriff_extra.position}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}





                {/* Highlights Grid (Cumulative) */}
                <HighlightsGrid players={rankings} />

                {/* Tabela de Pontuação por Destaques */}
                <Card className="mt-12 border-none shadow-lg overflow-hidden">
                    <CardHeader className="bg-gray-100 border-b">
                        <CardTitle className="flex items-center gap-2 text-gray-800">
                            <Medal className="h-6 w-6 text-blue-600" />
                            Pontuação do Dia - Tabela de Destaques
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Mobile View - Cards List */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {rankingsWithBadges
                                .filter(p => p.points > 0)
                                .sort((a, b) => b.points - a.points)
                                .map((player, idx) => (
                                    <div key={player.id} className="p-4 flex items-center justify-between bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{player.name}</div>
                                                <div className="text-[10px] text-gray-500 flex gap-2 mt-1">
                                                    {player.top1Count > 0 && <span className="bg-yellow-50 px-1 rounded">Top 1: {player.top1Count}</span>}
                                                    {player.top2Count > 0 && <span className="bg-gray-50 px-1 rounded">Top 2: {player.top2Count}</span>}
                                                    {player.top3Count > 0 && <span className="bg-orange-50 px-1 rounded">Top 3: {player.top3Count}</span>}
                                                    {player.sheriffCount > 0 && <span className="bg-blue-50 px-1 rounded">Xerife: {player.sheriffCount}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-blue-600">{player.points}</div>
                                            <div className="text-[9px] font-bold uppercase text-gray-400">Pontos</div>
                                        </div>
                                    </div>
                                ))}
                            {rankingsWithBadges.filter(p => p.points > 0).length === 0 && (
                                <div className="p-8 text-center text-gray-500 italic">
                                    Nenhum ponto registrado ainda.
                                </div>
                            )}
                        </div>

                        {/* Desktop View - Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader className="bg-blue-600">
                                    <TableRow className="border-none">
                                        <TableHead className="font-bold text-white">Nome</TableHead>
                                        <TableHead className="text-center font-bold text-white">Top 1 (3pts)</TableHead>
                                        <TableHead className="text-center font-bold text-white">Top 2 (2pts)</TableHead>
                                        <TableHead className="text-center font-bold text-white">Top 3 (1pt)</TableHead>
                                        <TableHead className="text-center font-bold text-white">Xerife (1pt)</TableHead>
                                        <TableHead className="text-center font-bold text-white bg-blue-700">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rankingsWithBadges
                                        .filter(p => p.points > 0)
                                        .sort((a, b) => b.points - a.points)
                                        .map((player) => (
                                            <TableRow key={player.id} className="border-gray-100">
                                                <TableCell className="font-medium text-gray-900">
                                                    {player.name}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {player.top1Count > 0 ? player.top1Count : ''}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {player.top2Count > 0 ? player.top2Count : ''}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {player.top3Count > 0 ? player.top3Count : ''}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {player.sheriffCount > 0 ? player.sheriffCount : ''}
                                                </TableCell>
                                                <TableCell className="text-center font-black text-gray-900 bg-gray-50/50">
                                                    {player.points}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    {rankingsWithBadges.filter(p => p.points > 0).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500 italic">
                                                Nenhum ponto registrado ainda.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
