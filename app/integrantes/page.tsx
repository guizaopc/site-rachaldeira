import { createClient } from '@/lib/supabase/server';
import MembersList from './members-list';

export default async function IntegrantesPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    let currentUserRole = null;
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        currentUserRole = profile?.role || null;
    }

    const { data: members } = await supabase
        .from('members')
        .select('*')
        .or('is_active.eq.true,is_active.is.null')
        .order('name', { ascending: true });

    // Stats de rachas
    const { data: rachaScouts } = await supabase
        .from('racha_scouts')
        .select('member_id, goals, assists, difficult_saves, warnings, attendance_count, top1_count, top2_count, top3_count, sheriff_count, racha_id');

    // Stats de campeonatos
    const { data: matchStats } = await supabase
        .from('match_player_stats')
        .select('member_id, goals, assists, difficult_saves, warnings');

    // Presenças em rachas fechados
    const { data: attendance } = await supabase
        .from('racha_attendance')
        .select('member_id, racha_id, rachas!inner(status, id)')
        .eq('status', 'in')
        .eq('rachas.status', 'closed');

    // Destaques dos rachas fechados
    const { data: closedRachas } = await supabase
        .from('rachas')
        .select('id, top1_id, top1_extra_id, top1_extra2_id, top2_id, top2_extra_id, top2_extra2_id, top3_id, top3_extra_id, top3_extra2_id, sheriff_id, sheriff_extra_id, sheriff_extra2_id')
        .eq('status', 'closed');

    // IDs de rachas de ajuste manual
    const { data: allManualRachas } = await supabase
        .from('rachas')
        .select('id')
        .or('name.eq.Ajustes Globais Manuais,location.eq.Sistema (Manual)');
    const adjustmentIds = new Set((allManualRachas || []).map(r => r.id));

    // Campeonatos concluídos com membros do time campeão
    const { data: completedChamps } = await supabase
        .from('championships')
        .select('id')
        .eq('status', 'completed');

    // Mapa de vitórias de campeonato por member_id
    const champWinsMap: Record<string, number> = {};

    if (completedChamps && completedChamps.length > 0) {
        for (const champ of completedChamps) {
            // Buscar times e partidas para calcular standings
            const [{ data: champMatches }, { data: teams }] = await Promise.all([
                supabase.from('championship_matches')
                    .select('team_a_id, team_b_id, score_a, score_b')
                    .eq('championship_id', champ.id)
                    .eq('status', 'completed'),
                supabase.from('teams')
                    .select('id, team_members(member_id)')
                    .eq('championship_id', champ.id),
            ]);

            if (!champMatches || !teams || teams.length === 0) continue;

            // Calcular pontuação por time
            const standings = teams.map((team: any) => {
                let pts = 0;
                for (const m of champMatches) {
                    const isA = m.team_a_id === team.id;
                    const isB = m.team_b_id === team.id;
                    if (!isA && !isB) continue;
                    const mine = isA ? m.score_a : m.score_b;
                    const theirs = isA ? m.score_b : m.score_a;
                    if (mine > theirs) pts += 3;
                    else if (mine === theirs) pts += 1;
                }
                return { id: team.id, pts, members: (team.team_members || []).map((tm: any) => tm.member_id) };
            });

            standings.sort((a: any, b: any) => b.pts - a.pts);
            const winner = standings[0];
            if (winner) {
                for (const memberId of winner.members) {
                    champWinsMap[memberId] = (champWinsMap[memberId] || 0) + 1;
                }
            }
        }
    }

    // Montar mapa de stats
    const statsMap: Record<string, {
        goals: number; assists: number; saves: number; warnings: number; rachas: number;
        top1: number; top2: number; top3: number; sheriff: number; championships: number;
    }> = {};

    const ensureMember = (id: string) => {
        if (!statsMap[id]) statsMap[id] = { goals: 0, assists: 0, saves: 0, warnings: 0, rachas: 0, top1: 0, top2: 0, top3: 0, sheriff: 0, championships: 0 };
    };

    // Stats de rachas (excluindo ajustes manuais dos gols/assistências mas incluindo adjustments de contagem)
    for (const r of rachaScouts || []) {
        ensureMember(r.member_id);
        statsMap[r.member_id].goals += r.goals || 0;
        statsMap[r.member_id].assists += r.assists || 0;
        statsMap[r.member_id].saves += r.difficult_saves || 0;
        statsMap[r.member_id].warnings += r.warnings || 0;
        // Ajustes manuais de destaques
        if (adjustmentIds.has(r.racha_id)) {
            statsMap[r.member_id].top1 += (r as any).top1_count || 0;
            statsMap[r.member_id].top2 += (r as any).top2_count || 0;
            statsMap[r.member_id].top3 += (r as any).top3_count || 0;
            statsMap[r.member_id].sheriff += (r as any).sheriff_count || 0;
            statsMap[r.member_id].rachas += (r as any).attendance_count || 0;
        }
    }

    // Stats de campeonatos
    for (const r of matchStats || []) {
        ensureMember(r.member_id);
        statsMap[r.member_id].goals += r.goals || 0;
        statsMap[r.member_id].assists += r.assists || 0;
        statsMap[r.member_id].saves += r.difficult_saves || 0;
        statsMap[r.member_id].warnings += r.warnings || 0;
    }

    // Presenças reais (rachas fechados, excluindo ajustes)
    for (const a of attendance || []) {
        if (!adjustmentIds.has(a.racha_id)) {
            ensureMember(a.member_id);
            statsMap[a.member_id].rachas += 1;
        }
    }

    // Destaques dos rachas fechados
    for (const r of closedRachas || []) {
        if (adjustmentIds.has(r.id)) continue;
        for (const id of [r.top1_id, r.top1_extra_id, r.top1_extra2_id].filter(Boolean)) {
            ensureMember(id); statsMap[id].top1 += 1;
        }
        for (const id of [r.top2_id, r.top2_extra_id, r.top2_extra2_id].filter(Boolean)) {
            ensureMember(id); statsMap[id].top2 += 1;
        }
        for (const id of [r.top3_id, r.top3_extra_id, r.top3_extra2_id].filter(Boolean)) {
            ensureMember(id); statsMap[id].top3 += 1;
        }
        for (const id of [r.sheriff_id, r.sheriff_extra_id, r.sheriff_extra2_id].filter(Boolean)) {
            ensureMember(id); statsMap[id].sheriff += 1;
        }
    }

    // Vitórias de campeonato (automático via standings)
    for (const [memberId, wins] of Object.entries(champWinsMap)) {
        ensureMember(memberId);
        statsMap[memberId].championships = wins;
    }

    const membersWithStats = (members || []).map(m => {
        const stats = statsMap[m.id] || { goals: 0, assists: 0, saves: 0, warnings: 0, rachas: 0, top1: 0, top2: 0, top3: 0, sheriff: 0, championships: 0 };
        // Somar ajuste manual de títulos ao calculado automaticamente
        stats.championships += (m as any).championship_wins || 0;
        return { ...m, stats };
    });

    return (
        <main className="min-h-screen bg-gray-900">
            {/* Header editorial */}
            <div className="bg-white rounded-b-3xl">
                <div className="max-w-7xl mx-auto px-4 pt-12 pb-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-3">
                                Integrantes
                            </h1>
                            <p className="text-gray-500 text-base md:text-lg max-w-xl">
                                Conheça o elenco estelar (e nem tanto) do Rachaldeira
                            </p>
                        </div>
                        <div className="flex gap-10 md:pb-1">
                            <div>
                                <p className="text-3xl font-black text-[#093a9f]">{(membersWithStats || []).length}</p>
                                <p className="text-gray-400 text-sm font-medium">Jogadores</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-10">
                <MembersList initialMembers={membersWithStats} currentUserRole={currentUserRole} />
            </div>
        </main>
    );
}
