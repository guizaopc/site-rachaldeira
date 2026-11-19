import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CHAMPION_MATCH_COLUMNS, pickChampionTeamId, type ChampionMatch } from '@/lib/championship-winner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import ChampionshipRankingTable, { type ChampionshipRankingRow, type ChampionTeam } from './ranking-table';

export const metadata = {
    title: 'Ranking Geral dos Campeonatos | Rachaldeira',
};

export const dynamic = 'force-dynamic';

export default async function ChampionshipRankingPage() {
    const supabase = await createClient();

    const [
        { data: members },
        { data: matchStats },
        { data: championships },
        { data: completedMatches },
        { data: teams },
        { data: manualWins },
        { data: awards },
    ] = await Promise.all([
        supabase
            .from('members')
            .select('id, name, photo_url, position')
            .order('name'),
        supabase
            .from('match_player_stats')
            .select('member_id, goals, assists, difficult_saves'),
        supabase
            .from('championships')
            .select('id, name, start_date, logo_url, status, champion_team_id')
            .order('start_date', { ascending: false }),
        supabase
            .from('championship_matches')
            .select(CHAMPION_MATCH_COLUMNS)
            .eq('status', 'completed'),
        supabase
            .from('teams')
            .select('id, name, logo_url, championship_id, team_members(member_id)'),
        // Ajuste manual de títulos (coluna só visível para usuários logados)
        supabase
            .from('members')
            .select('id, championship_wins'),
        supabase
            .from('championship_awards')
            .select('award, member_id'),
    ]);

    type Row = Omit<ChampionshipRankingRow, 'id' | 'name' | 'photo_url' | 'position' | 'championTeams'>;
    const empty = (): Row => ({ goals: 0, assists: 0, saves: 0, trophies: 0, craque: 0, paredao: 0, xerifao: 0, garcom: 0 });
    const stats: Record<string, Row> = {};
    const get = (id: string) => (stats[id] ??= empty());

    // Gols, assistências e defesas nas partidas de campeonato
    for (const s of matchStats || []) {
        const row = get(s.member_id);
        row.goals += s.goals || 0;
        row.assists += s.assists || 0;
        row.saves += s.difficult_saves || 0;
    }

    // Prêmios individuais
    // (cada prêmio pode ter mais de um vencedor por campeonato)
    for (const a of (awards || []) as { award: string; member_id: string }[]) {
        if (a.award === 'craque' || a.award === 'paredao' || a.award === 'xerifao' || a.award === 'garcom') {
            get(a.member_id)[a.award] += 1;
        }
    }

    // Troféus: integrantes do time campeão de cada campeonato concluído
    type TeamInfo = { id: string; name: string; logo_url: string | null; members: string[] };
    const teamsByChamp: Record<string, TeamInfo[]> = {};
    for (const t of (teams || []) as any[]) {
        (teamsByChamp[t.championship_id] ??= []).push({
            id: t.id,
            name: t.name,
            logo_url: t.logo_url,
            members: (t.team_members || []).map((tm: any) => tm.member_id),
        });
    }

    // Times campeões de cada jogador (mais recente primeiro)
    const championTeamsByMember: Record<string, ChampionTeam[]> = {};

    for (const camp of championships || []) {
        if (camp.status !== 'completed') continue;
        const champTeams = teamsByChamp[camp.id] || [];
        const matches = ((completedMatches || []) as ChampionMatch[]).filter(m => m.championship_id === camp.id);
        const winnerId = pickChampionTeamId(champTeams.map(t => t.id), matches, camp.champion_team_id);

        const winner = champTeams.find(t => t.id === winnerId);
        for (const memberId of winner?.members || []) {
            get(memberId).trophies += 1;
            (championTeamsByMember[memberId] ??= []).push({
                teamName: winner!.name,
                logo_url: winner!.logo_url,
                championship: camp.name,
                year: new Date(camp.start_date).getFullYear(),
            });
        }
    }

    for (const m of (manualWins || []) as { id: string; championship_wins: number | null }[]) {
        if (m.championship_wins) get(m.id).trophies += m.championship_wins;
    }

    const rows: ChampionshipRankingRow[] = (members || [])
        .filter(m => stats[m.id])
        .map(m => ({
            id: m.id,
            name: m.name,
            photo_url: m.photo_url,
            position: m.position,
            championTeams: championTeamsByMember[m.id] || [],
            ...stats[m.id],
        }))
        .filter(r => r.goals + r.assists + r.saves + r.trophies + r.craque + r.paredao + r.xerifao + r.garcom > 0);

    const totals = rows.reduce(
        (acc, r) => ({ goals: acc.goals + r.goals, assists: acc.assists + r.assists, saves: acc.saves + r.saves }),
        { goals: 0, assists: 0, saves: 0 },
    );
    const completedCount = (championships || []).filter(c => c.status === 'completed').length;

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 pt-12 pb-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                        <div>
                            <div className="inline-flex items-center gap-2 text-[#093a9f] bg-blue-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                <BarChart3 size={14} /> Todos os campeonatos
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-3">
                                Ranking Geral
                            </h1>
                            <p className="text-gray-500 text-base md:text-lg max-w-xl">
                                Gols, assistências, defesas, títulos e prêmios individuais somados de todos os campeonatos.
                            </p>
                        </div>
                        <div className="flex gap-8 md:pb-1">
                            <div>
                                <p className="text-3xl font-black text-[#093a9f]">{completedCount}</p>
                                <p className="text-gray-400 text-sm font-medium">Campeonatos</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black text-[#093a9f]">{totals.goals}</p>
                                <p className="text-gray-400 text-sm font-medium">Gols</p>
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-3xl font-black text-[#093a9f]">{totals.saves}</p>
                                <p className="text-gray-400 text-sm font-medium">Defesas</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-10">
                <Link href="/campeonatos">
                    <Button variant="ghost" className="text-gray-600 hover:text-gray-900 gap-2 -ml-2 mb-6">
                        <ArrowLeft size={16} />
                        Voltar para Campeonatos
                    </Button>
                </Link>

                <ChampionshipRankingTable rows={rows} />
            </div>
        </main>
    );
}
