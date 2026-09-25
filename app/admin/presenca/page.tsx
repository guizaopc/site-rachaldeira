import { createClient } from '@/lib/supabase/server';
import { PresencaFilters } from './presenca-filters';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const metadata = {
    title: 'Presença dos Jogadores | Rachaldeira',
};

const PERIOD_LABELS: Record<string, string> = {
    '1': 'último mês',
    '2': 'últimos 2 meses',
    '3': 'últimos 3 meses',
    '6': 'último semestre',
    '12': 'último ano',
};

export default async function PresencaPage({
    searchParams,
}: {
    searchParams: Promise<{ periodo?: string }>;
}) {
    const { periodo } = await searchParams;
    const months = parseInt(periodo || '3', 10);
    const validMonths = [1, 2, 3, 6, 12].includes(months) ? months : 3;

    const supabase = await createClient();

    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - validMonths);
    periodStart.setHours(0, 0, 0, 0);

    // Rachas fechados no período
    const { data: rachas } = await supabase
        .from('rachas')
        .select('id, date_time')
        .eq('status', 'closed')
        .gte('date_time', periodStart.toISOString())
        .order('date_time', { ascending: false });

    const rachaIds = rachas?.map((r) => r.id) ?? [];

    // Membros ativos
    const { data: members } = await supabase
        .from('members')
        .select('id, name, photo_url, position')
        .eq('is_active', true)
        .order('name');

    // Presenças confirmadas
    const { data: attendances } = rachaIds.length > 0
        ? await supabase
            .from('racha_attendance')
            .select('member_id, racha_id')
            .in('racha_id', rachaIds)
            .eq('status', 'in')
        : { data: [] };

    const totalRachas = rachaIds.length;

    // Calcular presença por membro
    const attendanceMap = new Map<string, number>();
    (attendances ?? []).forEach((a) => {
        attendanceMap.set(a.member_id, (attendanceMap.get(a.member_id) ?? 0) + 1);
    });

    const stats = (members ?? []).map((m) => {
        const attended = attendanceMap.get(m.id) ?? 0;
        const pct = totalRachas > 0 ? Math.round((attended / totalRachas) * 100) : 0;
        return { ...m, attended, pct };
    }).sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));

    const avgPct = stats.length > 0
        ? Math.round(stats.reduce((s, m) => s + m.pct, 0) / stats.length)
        : 0;

    const periodLabel = PERIOD_LABELS[String(validMonths)] ?? `últimos ${validMonths} meses`;

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-4 pt-12 pb-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-3">
                                Presença dos Jogadores
                            </h1>
                            <p className="text-gray-500 text-base">
                                Frequência de cada integrante nos rachas — {periodLabel}
                            </p>
                        </div>

                        {totalRachas > 0 && (
                            <div className="flex gap-10 md:pb-1">
                                <div>
                                    <p className="text-3xl font-black text-[#093a9f]">{totalRachas}</p>
                                    <p className="text-gray-400 text-sm font-medium">Rachas no período</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-[#093a9f]">{avgPct}%</p>
                                    <p className="text-gray-400 text-sm font-medium">Média de presença</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-[#093a9f]">{stats.length}</p>
                                    <p className="text-gray-400 text-sm font-medium">Integrantes ativos</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Filtros */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">Filtrar por período:</span>
                    <PresencaFilters current={String(validMonths)} />
                </div>

                {totalRachas === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Users size={56} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-semibold">Nenhum racha encontrado nesse período.</p>
                        <p className="text-sm mt-1">Tente ampliar o filtro de tempo.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Cabeçalho */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <span>Jogador</span>
                            <span className="text-right">Presenças</span>
                            <span className="text-right w-16">%</span>
                            <span className="w-5" />
                        </div>

                        <div className="divide-y divide-gray-50">
                            {stats.map((m, i) => {
                                const isHigh = m.pct >= 75;
                                const isMid = m.pct >= 50 && m.pct < 75;
                                const isLow = m.pct < 50;

                                const barColor = isHigh
                                    ? 'bg-emerald-500'
                                    : isMid
                                    ? 'bg-yellow-400'
                                    : 'bg-red-400';

                                const pctColor = isHigh
                                    ? 'text-emerald-600'
                                    : isMid
                                    ? 'text-yellow-600'
                                    : 'text-red-500';

                                const TrendIcon = isHigh
                                    ? TrendingUp
                                    : isLow
                                    ? TrendingDown
                                    : Minus;

                                const trendColor = isHigh
                                    ? 'text-emerald-400'
                                    : isLow
                                    ? 'text-red-400'
                                    : 'text-gray-300';

                                return (
                                    <div key={m.id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                                            {/* Jogador */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xs font-bold text-gray-300 w-5 text-right flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-gray-100">
                                                    {m.photo_url ? (
                                                        <img
                                                            src={m.photo_url}
                                                            alt={m.name}
                                                            className="w-full h-full object-cover object-top"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-bold">
                                                            {m.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{m.name}</p>
                                                    {m.position && (
                                                        <p className="text-xs text-gray-400 capitalize">{m.position}</p>
                                                    )}
                                                    {/* Barra de progresso */}
                                                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full w-full max-w-[160px] overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${barColor} transition-all`}
                                                            style={{ width: `${m.pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Presenças */}
                                            <span className="text-sm text-gray-500 text-right whitespace-nowrap">
                                                {m.attended}/{totalRachas}
                                            </span>

                                            {/* % */}
                                            <span className={`text-sm font-bold text-right w-16 ${pctColor}`}>
                                                {m.pct}%
                                            </span>

                                            {/* Ícone tendência */}
                                            <TrendIcon size={16} className={trendColor} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <p className="text-xs text-gray-400 text-center">
                    Baseado em {totalRachas} {totalRachas === 1 ? 'racha realizado' : 'rachas realizados'} nos {periodLabel}.
                </p>
            </div>
        </main>
    );
}
