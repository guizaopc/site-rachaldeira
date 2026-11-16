// Define o time campeão de um campeonato.
// Regra: se existe uma FINAL (bracket_position = 'final-1') concluída, o campeão
// é o vencedor dela (placar, vantagem do empate ou pênaltis). Só quando não há
// final decidida é que se usa a tabela de pontos (pontos corridos).

export type ChampMatch = {
    team_a_id: string | null;
    team_b_id: string | null;
    score_a: number | null;
    score_b: number | null;
    status?: string | null;
    bracket_position?: string | null;
    has_draw_advantage?: boolean | null;
    penalty_winner_id?: string | null;
};

export function getMatchWinnerId(m: ChampMatch): string | null {
    if (m.score_a === null || m.score_b === null) return null;
    if (m.score_a > m.score_b) return m.team_a_id;
    if (m.score_b > m.score_a) return m.team_b_id;
    if (m.has_draw_advantage) return m.team_a_id;
    if (m.penalty_winner_id && (m.penalty_winner_id === m.team_a_id || m.penalty_winner_id === m.team_b_id)) {
        return m.penalty_winner_id;
    }
    return null;
}

export function getChampionTeamId(matches: ChampMatch[], teamIds: string[]): string | null {
    const completed = matches.filter(m => !m.status || m.status === 'completed');

    const final = completed.find(m => m.bracket_position === 'final-1');
    if (final) {
        const winner = getMatchWinnerId(final);
        if (winner) return winner;
    }

    // Sem final decidida: tabela de pontos
    const standings = teamIds.map(id => {
        let points = 0, wins = 0, goalDiff = 0;
        for (const m of completed) {
            const isA = m.team_a_id === id;
            const isB = m.team_b_id === id;
            if (!isA && !isB) continue;
            const mine = (isA ? m.score_a : m.score_b) ?? 0;
            const theirs = (isA ? m.score_b : m.score_a) ?? 0;
            goalDiff += mine - theirs;
            if (mine > theirs) { points += 3; wins++; }
            else if (mine === theirs) points += 1;
        }
        return { id, points, wins, goalDiff };
    });

    standings.sort((a, b) => b.points - a.points || b.wins - a.wins || b.goalDiff - a.goalDiff);
    return standings[0]?.id ?? null;
}
