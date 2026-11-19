// Regra única para descobrir o time campeão de um campeonato concluído.
// 1. Campeão definido manualmente (championships.champion_team_id)
// 2. Vencedor da final ('final-1'): placar, vantagem do empate ou pênaltis
// 3. Sem final decidida (pontos corridos): líder da classificação
import type { SupabaseClient } from '@supabase/supabase-js';
import { getChampionTeamId } from './championship-champion';

export interface ChampionMatch {
    championship_id: string;
    bracket_position: string | null;
    team_a_id: string | null;
    team_b_id: string | null;
    score_a: number | null;
    score_b: number | null;
    penalties_score_a?: number | null;
    penalties_score_b?: number | null;
    penalty_winner_id?: string | null;
    has_draw_advantage?: boolean | null;
}

export const CHAMPION_MATCH_COLUMNS =
    'championship_id, bracket_position, team_a_id, team_b_id, score_a, score_b, penalties_score_a, penalties_score_b, penalty_winner_id, has_draw_advantage';

/** `matches` devem ser só as partidas concluídas desse campeonato. */
export function pickChampionTeamId(
    teamIds: string[],
    matches: ChampionMatch[],
    manualChampionId?: string | null,
): string | null {
    if (manualChampionId) return manualChampionId;

    // Final empatada sem penalty_winner_id salvo: decide pelo placar dos pênaltis
    const final = matches.find(m => m.bracket_position === 'final-1');
    if (final && !final.penalty_winner_id && !final.has_draw_advantage && (final.score_a ?? 0) === (final.score_b ?? 0)) {
        const pa = final.penalties_score_a ?? 0, pb = final.penalties_score_b ?? 0;
        if (pa !== pb) return pa > pb ? final.team_a_id : final.team_b_id;
    }

    if (matches.length === 0 || teamIds.length === 0) return null;
    return getChampionTeamId(matches, teamIds);
}

export interface ChampionTeamInfo {
    id: string;
    name: string;
    logo_url: string | null;
    memberIds: string[];
}

/** Campeão de cada campeonato concluído, indexado pelo id do campeonato. */
export async function loadChampionTeams(supabase: SupabaseClient): Promise<Record<string, ChampionTeamInfo>> {
    const result: Record<string, ChampionTeamInfo> = {};
    const { data: champs } = await supabase
        .from('championships')
        .select('id, champion_team_id')
        .eq('status', 'completed');
    if (!champs || champs.length === 0) return result;
    const ids = champs.map(c => c.id);

    const [{ data: matches }, { data: teams }] = await Promise.all([
        supabase.from('championship_matches')
            .select(CHAMPION_MATCH_COLUMNS)
            .in('championship_id', ids)
            .eq('status', 'completed'),
        supabase.from('teams')
            .select('id, name, logo_url, championship_id, team_members(member_id)')
            .in('championship_id', ids),
    ]);

    for (const champ of champs) {
        const champTeams = (teams || []).filter((t: any) => t.championship_id === champ.id);
        const champMatches = ((matches || []) as ChampionMatch[]).filter(m => m.championship_id === champ.id);
        const winnerId = pickChampionTeamId(champTeams.map((t: any) => t.id), champMatches, champ.champion_team_id);
        const winner: any = champTeams.find((t: any) => t.id === winnerId);
        if (!winner) continue;
        result[champ.id] = {
            id: winner.id,
            name: winner.name,
            logo_url: winner.logo_url,
            memberIds: (winner.team_members || []).map((tm: any) => tm.member_id),
        };
    }
    return result;
}

/** Quantos títulos cada integrante tem (member_id → títulos). */
export function countTitlesByMember(champions: Record<string, ChampionTeamInfo>): Record<string, number> {
    const wins: Record<string, number> = {};
    for (const c of Object.values(champions)) {
        for (const id of c.memberIds) wins[id] = (wins[id] || 0) + 1;
    }
    return wins;
}
