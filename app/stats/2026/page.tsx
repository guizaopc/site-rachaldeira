import { createClient } from '@/lib/supabase/server';
import StatsTable from './stats-table';

export const revalidate = 0;

export default async function Stats2026Page() {
    const supabase = await createClient();

    const year = 2026;

    // Buscar todos os membros
    const { data: members } = await supabase
        .from('members')
        .select('*')
        .order('name');

    // Buscar TODOS os rachas de 2026 (para ser em tempo real) + Ajustes Globais
    const { data: allRachas } = await supabase
        .from('rachas')
        .select('id, date_time, location')
        .or(`and(date_time.gte.${year}-01-01,date_time.lt.${year + 1}-01-01),location.eq.Sistema (Manual)`);

    const allRachaIds = allRachas?.map(r => r.id) || [];

    // Buscar scouts de todos os rachas encontrados
    const { data: rachaScouts } = await supabase
        .from('racha_scouts')
        .select('*')
        .in('racha_id', allRachaIds);

    // Buscar estatísticas de campeonatos
    const { data: championshipStats } = await supabase
        .from('match_player_stats')
        .select('*');

    // Buscar confirmações de presença (apenas de rachas normais do ano)
    const normalRachaIds = allRachas?.filter(r => r.location !== 'Sistema (Manual)').map(r => r.id) || [];
    const { data: attendance } = await supabase
        .from('racha_attendance')
        .select('*')
        .eq('status', 'in')
        .in('racha_id', normalRachaIds);

    // Agregar estatísticas
    const stats = members?.map(member => {
        const memberRachaScouts = rachaScouts?.filter(s => s.member_id === member.id) || [];
        const memberChampStats = championshipStats?.filter(s => s.member_id === member.id) || [];
        const memberAttendance = attendance?.filter(a => a.member_id === member.id) || [];

        const goals = memberRachaScouts.reduce((sum, s) => sum + (s.goals || 0), 0) +
            memberChampStats.reduce((sum, s) => sum + (s.goals || 0), 0);

        const assists = memberRachaScouts.reduce((sum, s) => sum + (s.assists || 0), 0) +
            memberChampStats.reduce((sum, s) => sum + (s.assists || 0), 0);

        const saves = memberRachaScouts.reduce((sum, s) => sum + (s.difficult_saves || 0), 0) +
            memberChampStats.reduce((sum, s) => sum + (s.difficult_saves || 0), 0);

        const warnings = memberRachaScouts.reduce((sum, s) => sum + (s.warnings || 0), 0) +
            memberChampStats.reduce((sum, s) => sum + (s.warnings || 0), 0);

        const participations = memberAttendance.length +
            memberRachaScouts.reduce((sum, s) => sum + ((s as any).attendance_count || 0), 0);

        return {
            ...member,
            goals,
            assists,
            saves,
            warnings,
            participations,
        };
    }) || [];


    // Top 3 por categoria
    const topScorers = [...stats].sort((a, b) => b.goals - a.goals).slice(0, 3);
    const topAssisters = [...stats].sort((a, b) => b.assists - a.assists).slice(0, 3);
    const topSavers = [...stats].sort((a, b) => b.saves - a.saves).slice(0, 3);
    const topParticipants = [...stats].sort((a, b) => b.participations - a.participations).slice(0, 3);

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    📊 Estatísticas {year}
                </h1>
                <p className="text-gray-600 mb-8">
                    Desempenho de todos os jogadores durante o ano
                </p>

                {/* Tabela Interativa */}
                <StatsTable stats={stats} year={year} />
            </div>
        </main>
    );
}
