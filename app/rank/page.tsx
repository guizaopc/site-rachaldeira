import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trophy, Medal } from 'lucide-react';
import VotingForm from '@/components/voting-form';
import HighlightsGrid from './highlights-grid';

export const revalidate = 0;

interface WeeklyMember {
    id: string;
    name: string;
    position?: string;
    photo_url?: string;
}

function WeeklyCard({ emoji, label, entries, bgGradient, accentColor, border }: {
    emoji: string;
    label: string;
    entries: WeeklyMember[];
    bgGradient: string;
    accentColor: string;
    border: string;
}) {
    const firstName = (name: string) => name.trim().split(' ')[0];
    const single = entries.length === 1;
    return (
        <div className={`rounded-3xl ${border} border bg-white overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
            {/* Colored gradient header */}
            <div className={`bg-gradient-to-br ${bgGradient} px-4 pt-5 pb-10 text-center`}>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white drop-shadow-sm">{emoji} {label}</p>
            </div>

            {/* Players overlapping the gradient boundary */}
            <div className="-mt-8 px-3 pb-5 flex flex-col items-center">
                {entries.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-3">
                        {entries.map((m) => (
                            <div key={m.id} className="flex flex-col items-center gap-1.5">
                                <div
                                    className={`${single ? 'w-20 h-20' : 'w-14 h-14'} rounded-full overflow-hidden bg-white shadow-lg flex-shrink-0`}
                                    style={{ outline: `3px solid ${accentColor}`, outlineOffset: 2 }}
                                >
                                    {m.photo_url
                                        ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover object-center" />
                                        : <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 text-2xl">👤</div>
                                    }
                                </div>
                                <div className="text-center">
                                    <p className={`${single ? 'text-sm' : 'text-xs'} font-black text-gray-900 leading-tight`}>{firstName(m.name)}</p>
                                    {m.position && <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{m.position}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 mt-2">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-300 text-2xl">?</span>
                        </div>
                        <p className="text-gray-300 text-sm font-bold mt-1">—</p>
                    </div>
                )}
            </div>
        </div>
    );
}

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

    // Buscar último racha fechado REAL (ignorar Sistema/Manual) para destaques semanais
    const { data: lastRacha } = await supabase
        .from('rachas')
        .select('*')
        .eq('status', 'closed')
        .neq('location', 'Sistema (Manual)')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    let weeklyHighlights: {
        rachaLabel: string;
        craque: WeeklyMember[];
        top2: WeeklyMember[];
        top3: WeeklyMember[];
        xerife: WeeklyMember[];
    } | null = null;

    if (lastRacha) {
        const findMembers = (...ids: (string | null)[]) =>
            ids.map(id => members?.find(m => m.id === id)).filter(Boolean).map(m => ({
                id: m!.id, name: m!.name, position: m!.position, photo_url: m!.photo_url,
            })) as WeeklyMember[];

        weeklyHighlights = {
            rachaLabel: new Date(lastRacha.date_time).toLocaleDateString('pt-BR'),
            craque: findMembers(lastRacha.top1_id, lastRacha.top1_extra_id, lastRacha.top1_extra2_id),
            top2: findMembers(lastRacha.top2_id, lastRacha.top2_extra_id, lastRacha.top2_extra2_id),
            top3: findMembers(lastRacha.top3_id, lastRacha.top3_extra_id, lastRacha.top3_extra2_id),
            xerife: findMembers(lastRacha.sheriff_id, lastRacha.sheriff_extra_id, lastRacha.sheriff_extra2_id),
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
    // Obter IDs dos rachas de ajustes (pode haver mais de um legado)
    const adjustmentRachaIds = allRachas?.filter(r => r.location === 'Sistema (Manual)' || r.name === 'Ajustes Globais Manuais').map(r => r.id) || [];

    // Calcular rankings para cada membro (APENAS RACHAS ENCERRADOS + AJUSTES)
    const rankings = members?.map(member => {
        const memberRachaScouts = rachaScouts?.filter(s => s.member_id === member.id) || [];

        // Estatísticas Básicas (Apenas Rachas)
        const goalsRacha = memberRachaScouts.reduce((sum, s) => sum + (s.goals || 0), 0);
        const goals = goalsRacha;

        const assistsRacha = memberRachaScouts.reduce((sum, s) => sum + (s.assists || 0), 0);
        const assists = assistsRacha;

        const savesRacha = memberRachaScouts.reduce((sum, s) => sum + (s.difficult_saves || 0), 0);
        const saves = savesRacha;

        // Participações: Apenas Rachas ENCERRADOS (reais) que o jogador tem presença "in" + Soma de Ajustes Manuais
        const closedRealRachaIds = allRachas?.filter(r => r.status === 'closed' && !adjustmentRachaIds.includes(r.id)).map(r => r.id) || [];
        const memberAttendanceCount = attendance?.filter(a => a.member_id === member.id && closedRealRachaIds.includes(a.racha_id)).length || 0;

        // Buscar TODOS os ajustes manuais deste membro em rachas de sistema
        const manualAdjustments = memberRachaScouts.filter(s => adjustmentRachaIds.includes(s.racha_id));
        const manualGames = manualAdjustments.reduce((sum, s) => sum + ((s as any).attendance_count || 0), 0);
        const participations = memberAttendanceCount + manualGames;

        // Calcular Pontos (Highlights) baseados nas marcações em rachas FECHADOS + Ajustes Manuais da Planilha Geral
        const manualTop1 = manualAdjustments.reduce((sum, s) => sum + ((s as any).top1_count || 0), 0);
        const manualTop2 = manualAdjustments.reduce((sum, s) => sum + ((s as any).top2_count || 0), 0);
        const manualTop3 = manualAdjustments.reduce((sum, s) => sum + ((s as any).top3_count || 0), 0);
        const manualSheriff = manualAdjustments.reduce((sum, s) => sum + ((s as any).sheriff_count || 0), 0);

        const top1Count = (allRachas?.filter((r: any) => r.status === 'closed' && !adjustmentRachaIds.includes(r.id) && (r.top1_id === member.id || r.top1_extra_id === member.id || r.top1_extra2_id === member.id)).length || 0) + manualTop1;

        const top2Count = (allRachas?.filter((r: any) => r.status === 'closed' && !adjustmentRachaIds.includes(r.id) && (r.top2_id === member.id || r.top2_extra_id === member.id || r.top2_extra2_id === member.id)).length || 0) + manualTop2;

        const top3Count = (allRachas?.filter((r: any) => r.status === 'closed' && !adjustmentRachaIds.includes(r.id) && (r.top3_id === member.id || r.top3_extra_id === member.id || r.top3_extra2_id === member.id)).length || 0) + manualTop3;

        const sheriffCount = (allRachas?.filter((r: any) => r.status === 'closed' && !adjustmentRachaIds.includes(r.id) && (r.sheriff_id === member.id || r.sheriff_extra_id === member.id || r.sheriff_extra2_id === member.id)).length || 0) + manualSheriff;

        // Adicionar destaques de CAMPEONATOS (Removido a pedido)
        const totalTop1 = top1Count;
        const totalSheriff = sheriffCount;

        const points = (totalTop1 * 3) + (top2Count * 2) + top3Count + totalSheriff;

        const craqueVotes = votes.filter(v => v.craque_member_id === member.id).length;
        const xerifeVotes = votes.filter(v => v.xerife_member_id === member.id).length;

        const totalClosedRachas = allRachas?.filter(r => r.status === 'closed' && !adjustmentRachaIds.includes(r.id)).length || 0;

        return {
            ...member,
            goals,
            assists,
            saves,
            participations,
            fominhaPct: totalClosedRachas > 0 ? Math.round((memberAttendanceCount / totalClosedRachas) * 100) : 0,
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

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Header editorial esquerdo */}
            <div className="bg-white rounded-b-3xl">
                <div className="max-w-6xl mx-auto px-4 pt-12 pb-10">
                    <div className="flex items-center gap-6">
                        <img
                            src="https://pqroxmeyuicutatbessb.supabase.co/storage/v1/object/public/Fotos/logo%20premiacao%20rachaldeira.png"
                            alt="Logo Premiação"
                            className="h-36 md:h-44 object-contain flex-shrink-0"
                        />
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-3">
                                Ranking 2026
                            </h1>
                            <p className="text-gray-500 text-base md:text-lg max-w-xl">
                                Os melhores jogadores do Rachaldeira
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-10">
                {/* Período de Votação */}
                {activePeriod && (
                    <Card className="mb-10 border border-yellow-200 bg-yellow-50 rounded-2xl shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-900">
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
                                <div className="bg-white border border-green-200 rounded-xl p-4">
                                    <p className="text-green-800 font-semibold mb-2">✅ Você já votou neste período!</p>
                                    <p className="text-sm text-gray-700">
                                        Seus votos foram registrados com sucesso. Aguarde o resultado final.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white border border-gray-200 rounded-xl p-4">
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
                    <section className="mb-12">
                        <div className="flex items-end justify-between gap-4 mb-5">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                    Destaques da Semana
                                </h2>
                            </div>
                            <span className="text-sm font-bold text-gray-400 whitespace-nowrap pb-1">
                                {weeklyHighlights.rachaLabel}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                            <WeeklyCard emoji="👑" label="Craque"  entries={weeklyHighlights.craque}  bgGradient="from-yellow-400 to-amber-300"   accentColor="#eab308" border="border-yellow-200" />
                            <WeeklyCard emoji="🥈" label="Top 2"   entries={weeklyHighlights.top2}    bgGradient="from-slate-500 to-gray-400"     accentColor="#9ca3af" border="border-gray-200" />
                            <WeeklyCard emoji="🥉" label="Top 3"   entries={weeklyHighlights.top3}    bgGradient="from-orange-500 to-amber-400"   accentColor="#f97316" border="border-orange-200" />
                            <WeeklyCard emoji="👮" label="Xerife"  entries={weeklyHighlights.xerife}  bgGradient="from-[#093a9f] to-blue-500"     accentColor="#093a9f" border="border-blue-200" />
                        </div>
                    </section>
                )}

                {/* Highlights Grid (Cumulative) */}
                <HighlightsGrid players={rankings} weekly={weeklyHighlights} />

                {/* Tabela de Pontuação por Destaques */}
                <Card className="mt-8 border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-white border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Medal className="h-6 w-6 text-[#093a9f]" />
                            Pontuação do Dia - Tabela de Destaques
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Mobile View - Cards List */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {rankings
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
                                            <div className="text-xl font-black text-[#093a9f]">{player.points}</div>
                                            <div className="text-[9px] font-bold uppercase text-gray-400">Pontos</div>
                                        </div>
                                    </div>
                                ))}
                            {rankings.filter(p => p.points > 0).length === 0 && (
                                <div className="p-8 text-center text-gray-500 italic">
                                    Nenhum ponto registrado ainda.
                                </div>
                            )}
                        </div>

                        {/* Desktop View - Table */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader className="bg-[#093a9f]">
                                    <TableRow className="border-none hover:bg-transparent">
                                        <TableHead className="font-bold text-white">Nome</TableHead>
                                        <TableHead className="text-center font-bold text-white">Top 1 (3pts)</TableHead>
                                        <TableHead className="text-center font-bold text-white">Top 2 (2pts)</TableHead>
                                        <TableHead className="text-center font-bold text-white">Top 3 (1pt)</TableHead>
                                        <TableHead className="text-center font-bold text-white">Xerife (1pt)</TableHead>
                                        <TableHead className="text-center font-bold text-white bg-[#072e7d]">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rankings
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
                                    {rankings.filter(p => p.points > 0).length === 0 && (
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
