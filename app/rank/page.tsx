import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trophy, Target, Shield, Users, Star, AlertTriangle } from 'lucide-react';
import VotingForm from '@/components/voting-form';
import { redirect } from 'next/navigation';
import RankingTable from './ranking-table';

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

    // Buscar todos os membros
    const { data: members } = await supabase
        .from('members')
        .select('*')
        .order('name');

    // Buscar rachas fechados para filtrar scouts e contar destaques
    const { data: closedRachas } = await supabase
        .from('rachas')
        .select('id, top1_id, top2_id, top3_id, sheriff_id')
        .eq('status', 'closed');

    const closedRachaIds = closedRachas?.map(r => r.id) || [];

    // Buscar scouts de rachas (apenas de rachas encerrados)
    const { data: rachaScouts } = await supabase
        .from('racha_scouts')
        .select('*')
        .in('racha_id', closedRachaIds);

    const { data: attendance } = await supabase
        .from('racha_attendance')
        .select('*')
        .eq('status', 'in')
        .in('racha_id', closedRachaIds);

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
        const top2 = members?.find(m => m.id === lastRacha.top2_id);
        const top3 = members?.find(m => m.id === lastRacha.top3_id);
        const sheriff = members?.find(m => m.id === lastRacha.sheriff_id);

        weeklyHighlights = {
            rachaLabel: new Date(lastRacha.date_time).toLocaleDateString('pt-BR'),
            top1,
            top2,
            top3,
            sheriff
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

    // Calcular rankings para cada membro (APENAS RACHAS ENCERRADOS)
    const rankings = members?.map(member => {
        const memberRachaScouts = rachaScouts?.filter(s => s.member_id === member.id) || [];
        const memberAttendance = attendance?.filter(a => a.member_id === member.id) || [];

        const goals = memberRachaScouts.reduce((sum, s) => sum + (s.goals || 0), 0);
        const assists = memberRachaScouts.reduce((sum, s) => sum + (s.assists || 0), 0);
        const saves = memberRachaScouts.reduce((sum, s) => sum + (s.difficult_saves || 0), 0);

        const participations = memberAttendance.length;

        // Calcular Pontos (Highlights) baseados nas marcações manuais nos rachas fechados
        const top1Count = closedRachas?.filter(r => r.top1_id === member.id).length || 0;
        const top2Count = closedRachas?.filter(r => r.top2_id === member.id).length || 0;
        const top3Count = closedRachas?.filter(r => r.top3_id === member.id).length || 0;
        const sheriffCount = closedRachas?.filter(r => r.sheriff_id === member.id).length || 0;

        const points = top1Count + top2Count + top3Count + sheriffCount;

        const craqueVotes = votes.filter(v => v.craque_member_id === member.id).length;
        const xerifeVotes = votes.filter(v => v.xerife_member_id === member.id).length;

        return {
            ...member,
            goals,
            assists,
            saves,
            participations,
            fominhaPct: closedRachas && closedRachas.length > 0 ? Math.round((memberAttendance.length / closedRachas.length) * 100) : 0,
            top1Count,
            sheriffCount,
            craqueVotes,
            xerifeVotes,
            points // Adicionado formalmente
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
                            <div className="overflow-x-auto rounded-lg border border-white/10">
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
                                            </TableCell>
                                            <TableCell className="text-center py-6">
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
                                            </TableCell>
                                            <TableCell className="text-center py-6">
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
                                            </TableCell>
                                            <TableCell className="text-center py-6">
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
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}



                {/* Ranking Table */}
                <RankingTable players={rankingsWithBadges} />
            </div>
        </main>
    );
}
