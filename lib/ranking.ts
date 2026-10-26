import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { PUBLIC_MEMBER_COLUMNS } from '@/lib/utils';

export interface RankingPlayer {
    id: string;
    name: string;
    position?: string;
    photo_url?: string;
    goals: number;
    assists: number;
    saves: number;
    participations: number;
    fominhaPct: number;
    top1Count: number;
    top2Count: number;
    top3Count: number;
    sheriffCount: number;
    craquePoints: number;
    sheriffPoints: number;
    points: number;
    [key: string]: any;
}

// Calcula o ranking geral (apenas rachas encerrados + ajustes manuais da planilha geral).
// Usado pela página /rank e pelo email semanal, para os dois mostrarem os mesmos números.
export async function computeRankings(supabase: any): Promise<{ members: any[]; rankings: RankingPlayer[]; totalClosedRachas: number }> {
    // Buscar todos os membros ativos
    const { data: members } = await supabase
        .from('members')
        .select(PUBLIC_MEMBER_COLUMNS)
        .eq('is_active', true)
        .order('name');

    // Buscar TODOS os rachas (para ser em tempo real)
    const { data: allRachas } = await supabase
        .from('rachas')
        .select('*');

    const allRachaIds = allRachas?.map((r: any) => r.id) || [];

    // Buscar scouts de rachas (todos)
    const { data: rachaScouts } = await fetchAllRows(() => supabase
        .from('racha_scouts')
        .select('*')
        .in('racha_id', allRachaIds));

    const { data: attendance } = await fetchAllRows(() => supabase
        .from('racha_attendance')
        .select('*')
        .eq('status', 'in')
        .in('racha_id', allRachaIds));

    // Obter IDs dos rachas de ajustes (pode haver mais de um legado)
    const adjustmentRachaIds = allRachas?.filter((r: any) => r.location === 'Sistema (Manual)' || r.name === 'Ajustes Globais Manuais').map((r: any) => r.id) || [];
    const closedRealRachas = allRachas?.filter((r: any) => r.status === 'closed' && !adjustmentRachaIds.includes(r.id)) || [];
    const closedRealRachaIds = closedRealRachas.map((r: any) => r.id);
    const totalClosedRachas = closedRealRachas.length;

    const rankings: RankingPlayer[] = (members || []).map((member: any) => {
        const memberRachaScouts = rachaScouts.filter((s: any) => s.member_id === member.id);

        const goals = memberRachaScouts.reduce((sum: number, s: any) => sum + (s.goals || 0), 0);
        const assists = memberRachaScouts.reduce((sum: number, s: any) => sum + (s.assists || 0), 0);
        const saves = memberRachaScouts.reduce((sum: number, s: any) => sum + (s.difficult_saves || 0), 0);

        // Participações: Apenas Rachas ENCERRADOS (reais) que o jogador tem presença "in" + Soma de Ajustes Manuais
        const memberAttendanceCount = attendance.filter((a: any) => a.member_id === member.id && closedRealRachaIds.includes(a.racha_id)).length;

        // Buscar TODOS os ajustes manuais deste membro em rachas de sistema
        const manualAdjustments = memberRachaScouts.filter((s: any) => adjustmentRachaIds.includes(s.racha_id));
        const sumManual = (field: string) => manualAdjustments.reduce((sum: number, s: any) => sum + (s[field] || 0), 0);
        const participations = memberAttendanceCount + sumManual('attendance_count');

        // Destaques marcados em rachas FECHADOS + Ajustes Manuais da Planilha Geral
        const countHighlight = (prefix: string) => closedRealRachas.filter((r: any) =>
            r[`${prefix}_id`] === member.id || r[`${prefix}_extra_id`] === member.id || r[`${prefix}_extra2_id`] === member.id
        ).length;

        const top1Count = countHighlight('top1') + sumManual('top1_count');
        const top2Count = countHighlight('top2') + sumManual('top2_count');
        const top3Count = countHighlight('top3') + sumManual('top3_count');
        const sheriffCount = countHighlight('sheriff') + sumManual('sheriff_count');

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
            sheriffPoints: sheriffCount,
            points: (top1Count * 3) + (top2Count * 2) + top3Count + sheriffCount,
        };
    });

    return { members: members || [], rankings, totalClosedRachas };
}

export type RankingCategoryKey = 'craquePoints' | 'sheriffPoints' | 'goals' | 'assists' | 'saves' | 'participations';

// As 6 listas do ranking geral, na mesma ordem e critério de desempate da página /rank
export const RANKING_CATEGORIES: {
    title: string;
    valueLabel: string;
    valueKey: RankingCategoryKey;
    sort: (a: RankingPlayer, b: RankingPlayer) => number;
}[] = [
    { title: 'Craque', valueLabel: 'Pts', valueKey: 'craquePoints', sort: (a, b) => b.craquePoints - a.craquePoints || b.points - a.points },
    { title: 'Xerife', valueLabel: 'Pts', valueKey: 'sheriffPoints', sort: (a, b) => b.sheriffPoints - a.sheriffPoints || b.points - a.points },
    { title: 'Artilheiro', valueLabel: 'Gols', valueKey: 'goals', sort: (a, b) => b.goals - a.goals || b.points - a.points },
    { title: 'Garçom', valueLabel: 'Assis', valueKey: 'assists', sort: (a, b) => b.assists - a.assists || b.points - a.points },
    { title: 'Paredão', valueLabel: 'Defesas', valueKey: 'saves', sort: (a, b) => b.saves - a.saves || b.points - a.points },
    { title: 'Fominha', valueLabel: 'Jogos', valueKey: 'participations', sort: (a, b) => b.participations - a.participations || b.fominhaPct - a.fominhaPct },
];
