'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Check, Loader2, Minus, Plus, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
<<<<<<< HEAD
import { countTitlesByMember, loadChampionTeams } from '@/lib/championship-winner';
=======
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
>>>>>>> 35694bea2778a524cc98bc958465ec89b02ccd37
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ADJUSTMENT_RACHA_LOCATION, ADJUSTMENT_RACHA_NAME, initials, isAdjustmentRacha, normalizeName } from '@/lib/scouts';

type Field = 'presence' | 'goals' | 'assists' | 'saves' | 'top1' | 'top2' | 'top3' | 'sheriff';

const COLUMNS: { key: Field; label: string; db: string; emoji: string }[] = [
    { key: 'presence', label: 'Jogos', db: 'attendance_count', emoji: '📅' },
    { key: 'goals', label: 'Gols', db: 'goals', emoji: '⚽' },
    { key: 'assists', label: 'Assist.', db: 'assists', emoji: '🎯' },
    { key: 'saves', label: 'Defesas', db: 'difficult_saves', emoji: '🧤' },
    { key: 'top1', label: 'Top 1', db: 'top1_count', emoji: '🥇' },
    { key: 'top2', label: 'Top 2', db: 'top2_count', emoji: '🥈' },
    { key: 'top3', label: 'Top 3', db: 'top3_count', emoji: '🥉' },
    { key: 'sheriff', label: 'Xerife', db: 'sheriff_count', emoji: '🤠' },
];

type Row = {
    id: string;
    name: string;
    position: string | null;
    photo_url: string | null;
    championship_wins: number;
    total: Record<Field, number>;
    manual: Record<Field, number>;      // soma de todos os rachas de ajuste
    manualOther: Record<Field, number>; // parte que está em rachas de ajuste legados (não editáveis)
};

type SortKey = 'name' | Field | 'titles';

const zeroFields = () => Object.fromEntries(COLUMNS.map(c => [c.key, 0])) as Record<Field, number>;

// O Supabase devolve no máximo 1000 linhas por consulta: pagina até acabar
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>) {
    const out: T[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await build(from, from + PAGE - 1);
        if (error) throw error;
        out.push(...(data || []));
        if (!data || data.length < PAGE) break;
    }
    return out;
}

export default function PlanilhaScoutsPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const rowsRef = useRef<Row[]>([]);
    rowsRef.current = rows;
    const [masterId, setMasterId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [cellState, setCellState] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
    const [onlyAdjusted, setOnlyAdjusted] = useState(false);

    const loadData = useCallback(async () => {
        const supabase = createClient();
        setLoading(true);
        try {
            const allRachas = await fetchAll<any>((a, b) => supabase
                .from('rachas')
                .select('id, name, location, status, created_at, top1_id, top1_extra_id, top1_extra2_id, top2_id, top2_extra_id, top2_extra2_id, top3_id, top3_extra_id, top3_extra2_id, sheriff_id, sheriff_extra_id, sheriff_extra2_id')
                .order('created_at', { ascending: true })
                .range(a, b));

            // Racha "mestre" de ajustes: o mais antigo. Cria se não existir.
            const adjRachas = allRachas.filter(isAdjustmentRacha);
            let master = adjRachas[0];
            if (!master) {
                const { data, error } = await supabase.from('rachas').insert({
                    name: ADJUSTMENT_RACHA_NAME,
                    date_time: new Date().toISOString(),
                    location: ADJUSTMENT_RACHA_LOCATION,
                    status: 'closed',
                    periodicity: 'once',
                }).select('id, name, location').single();
                if (error) throw new Error('Não foi possível criar o registro de ajustes: ' + error.message);
                master = data;
                adjRachas.push(data);
            }
            setMasterId(master.id);
            const adjIds = new Set(adjRachas.map(r => r.id));
            const closedReal = allRachas.filter(r => r.status === 'closed' && !adjIds.has(r.id));
            const closedRealIds = new Set(closedReal.map(r => r.id));

            const [members, scouts, attendance, champWins] = await Promise.all([
                supabase.from('members').select('id, name, position, photo_url').eq('is_active', true).order('name')
                    .then(({ data, error }) => { if (error) throw error; return data || []; }),
                fetchAll<any>((a, b) => supabase.from('racha_scouts').select('*').range(a, b)),
                fetchAll<any>((a, b) => supabase.from('racha_attendance').select('member_id, racha_id').eq('status', 'in').range(a, b)),
                loadChampionshipWins(supabase),
            ]);

            const highlightCount = (memberId: string, prefix: string) => closedReal.filter(r =>
                r[`${prefix}_id`] === memberId || r[`${prefix}_extra_id`] === memberId || r[`${prefix}_extra2_id`] === memberId,
            ).length;

            const built: Row[] = members.map((m: any) => {
                const mine = scouts.filter(s => s.member_id === m.id);
                const adjScouts = mine.filter(s => adjIds.has(s.racha_id));
                const masterScout = adjScouts.find(s => s.racha_id === master.id);

<<<<<<< HEAD
                const manual = zeroFields();
                const manualOther = zeroFields();
                for (const c of COLUMNS) {
                    manual[c.key] = adjScouts.reduce((acc, s) => acc + (s[c.db] || 0), 0);
                    manualOther[c.key] = manual[c.key] - (masterScout?.[c.db] || 0);
=======
            const { data: allRachaScouts, error: scoutsError } = allRachaIds.length > 0
                ? await fetchAllRows(() => supabase.from('racha_scouts').select('*').in('racha_id', allRachaIds))
                : { data: [], error: null };
            if (scoutsError) console.error('Erro racha_scouts:', scoutsError);

            // match_player_stats pode não existir — ignorar silenciosamente
            let champScouts: any[] = [];
            try {
                const { data: champData, error: champError } = await fetchAllRows(() => supabase
                    .from('match_player_stats')
                    .select('member_id, goals, assists, difficult_saves'));
                if (!champError) champScouts = champData || [];
            } catch (_) { /* tabela não existe, ignorar */ }

            const { data: attendance, error: attendanceError } = closedRachaIds.length > 0
                ? await fetchAllRows(() => supabase.from('racha_attendance').select('member_id, racha_id').eq('status', 'in').in('racha_id', closedRachaIds))
                : { data: [], error: null };
            if (attendanceError) console.error('Erro attendance:', attendanceError);

            // 4. Calcular vitórias de campeonato (igual à página de integrantes)
            const champWinsMap: Record<string, number> = {};
            const { data: completedChamps } = await supabase
                .from('championships')
                .select('id')
                .eq('status', 'completed');

            if (completedChamps && completedChamps.length > 0) {
                for (const champ of completedChamps) {
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
                        return { pts, members: (team.team_members || []).map((tm: any) => tm.member_id) };
                    });
                    standings.sort((a: any, b: any) => b.pts - a.pts);
                    const winner = standings[0];
                    if (winner) {
                        for (const memberId of winner.members) {
                            champWinsMap[memberId] = (champWinsMap[memberId] || 0) + 1;
                        }
                    }
>>>>>>> 35694bea2778a524cc98bc958465ec89b02ccd37
                }

                const sum = (db: string) => mine.reduce((acc, s) => acc + (s[db] || 0), 0);
                const games = attendance.filter(a => a.member_id === m.id && closedRealIds.has(a.racha_id)).length;

                // Mesmas regras do ranking: gols/assist./defesas de todos os rachas; jogos e destaques só de rachas encerrados
                const total: Record<Field, number> = {
                    presence: games + manual.presence,
                    goals: sum('goals'),
                    assists: sum('assists'),
                    saves: sum('difficult_saves'),
                    top1: highlightCount(m.id, 'top1') + manual.top1,
                    top2: highlightCount(m.id, 'top2') + manual.top2,
                    top3: highlightCount(m.id, 'top3') + manual.top3,
                    sheriff: highlightCount(m.id, 'sheriff') + manual.sheriff,
                };

                return { ...m, championship_wins: champWins[m.id] || 0, total, manual, manualOther };
            });

            setRows(built);
        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao carregar planilha: ' + (error?.message || 'desconhecido'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Salva o total desejado ajustando o valor manual no racha mestre
    const setTotal = async (memberId: string, field: Field, target: number) => {
        const row = rowsRef.current.find(r => r.id === memberId);
        if (!row || !masterId) return;
        target = Math.max(0, Math.round(target));
        const diff = target - row.total[field];
        if (diff === 0) return;

        const col = COLUMNS.find(c => c.key === field)!;
        const newManual = row.manual[field] + diff;
        const newMaster = newManual - row.manualOther[field];
        const cellId = `${memberId}:${field}`;

        // otimista
        const apply = (total: number, manual: number) => setRows(prev => prev.map(r => r.id === memberId
            ? { ...r, total: { ...r.total, [field]: total }, manual: { ...r.manual, [field]: manual } }
            : r));
        const prevTotal = row.total[field];
        const prevManual = row.manual[field];
        apply(target, newManual);
        setCellState(s => ({ ...s, [cellId]: 'saving' }));

        const { error } = await createClient()
            .from('racha_scouts')
            .upsert({ racha_id: masterId, member_id: memberId, [col.db]: newMaster }, { onConflict: 'racha_id,member_id' });

        if (error) {
            apply(prevTotal, prevManual);
            setCellState(s => ({ ...s, [cellId]: 'error' }));
            toast.error(`Erro ao salvar ${col.label} de ${row.name}: ${error.message}`);
            return;
        }
        setCellState(s => ({ ...s, [cellId]: 'saved' }));
        setTimeout(() => setCellState(s => {
            if (s[cellId] !== 'saved') return s;
            const { [cellId]: _, ...rest } = s;
            return rest;
        }), 1200);
    };

    const visible = useMemo(() => {
        const q = normalizeName(search);
        let list = rows.filter(r => !q || normalizeName(r.name).includes(q));
        if (onlyAdjusted) list = list.filter(r => COLUMNS.some(c => r.manual[c.key] !== 0));
        const val = (r: Row) => sort.key === 'name' ? r.name : sort.key === 'titles' ? r.championship_wins : r.total[sort.key];
        return [...list].sort((a, b) => {
            const va = val(a), vb = val(b);
            const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
            return sort.dir === 'asc' ? cmp : -cmp;
        });
    }, [rows, search, sort, onlyAdjusted]);

    const toggleSort = (key: SortKey) => setSort(s => s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' });

    const adjustedCount = rows.filter(r => COLUMNS.some(c => r.manual[c.key] !== 0)).length;

    return (
        <div className="space-y-6 mt-10 lg:mt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Planilha de Scouts</h1>
                    <p className="text-slate-500 mt-1 max-w-2xl text-sm">
                        Totais oficiais de cada integrante, iguais aos do ranking. Ao editar um número, a diferença é
                        guardada como <b>ajuste manual</b> — os scouts dos rachas não são alterados.
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" disabled={loading}>
                    <RefreshCcw size={16} className={cn(loading && 'animate-spin')} /> Recarregar
                </Button>
            </div>

            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar integrante"
                            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>
                    <button
                        onClick={() => setOnlyAdjusted(v => !v)}
                        className={cn(
                            'inline-flex items-center gap-2 h-10 rounded-xl px-3 text-sm font-semibold ring-1 transition-colors',
                            onlyAdjusted ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'text-slate-600 ring-slate-200 hover:bg-slate-50',
                        )}
                    >
                        <SlidersHorizontal size={15} />
                        Só com ajustes manuais
                        <span className="rounded-full bg-white/80 px-1.5 text-xs ring-1 ring-current/10">{adjustedCount}</span>
                    </button>
                    <p className="sm:ml-auto text-xs text-slate-400">{visible.length} integrantes · salvamento automático</p>
                </div>

                {loading && rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
                        <Loader2 className="animate-spin text-[#af1c15]" size={28} />
                        Calculando totais...
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[calc(100vh-15rem)]">
                        <table className="w-full text-sm border-separate border-spacing-0">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                                    <Th sticky onClick={() => toggleSort('name')} active={sort.key === 'name'} dir={sort.dir} className="text-left pl-4 min-w-[11rem]">
                                        Integrante
                                    </Th>
                                    {COLUMNS.map(c => (
                                        <Th key={c.key} onClick={() => toggleSort(c.key)} active={sort.key === c.key} dir={sort.dir}>
                                            <span className="mr-1">{c.emoji}</span>{c.label}
                                        </Th>
                                    ))}
                                    <Th onClick={() => toggleSort('titles')} active={sort.key === 'titles'} dir={sort.dir}>🏆 Títulos</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map(r => (
                                    <tr key={r.id} className="group">
                                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-slate-100 pl-4 pr-3 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                {r.photo_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={r.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <span className="h-8 w-8 shrink-0 rounded-full bg-slate-900 text-white grid place-items-center text-[10px] font-bold">{initials(r.name)}</span>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 truncate max-w-[9rem]">{r.name}</p>
                                                    {r.position && <p className="text-[10px] uppercase tracking-wide text-slate-400">{r.position}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        {COLUMNS.map(c => (
                                            <td key={c.key} className="border-b border-slate-100 px-1.5 py-2 group-hover:bg-slate-50">
                                                <Cell
                                                    total={r.total[c.key]}
                                                    manual={r.manual[c.key]}
                                                    state={cellState[`${r.id}:${c.key}`]}
                                                    label={`${c.label} de ${r.name}`}
                                                    onCommit={v => setTotal(r.id, c.key, v)}
                                                />
                                            </td>
                                        ))}
                                        <td className="border-b border-slate-100 px-3 text-center group-hover:bg-slate-50">
                                            <span className={cn('font-black tabular-nums', r.championship_wins ? 'text-yellow-600' : 'text-slate-300')}>
                                                {r.championship_wins}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {visible.length === 0 && (
                                    <tr><td colSpan={COLUMNS.length + 2} className="py-14 text-center text-slate-500">Nenhum integrante encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-400">
                Títulos são calculados automaticamente pelos campeonatos concluídos e não podem ser editados aqui.
                O número pequeno abaixo de cada total indica quanto dele vem de ajuste manual.
            </p>
        </div>
    );
}

function Th({ children, onClick, active, dir, sticky, className }: {
    children: React.ReactNode; onClick: () => void; active: boolean; dir: 'asc' | 'desc'; sticky?: boolean; className?: string;
}) {
    return (
        <th className={cn(
            'border-b border-slate-200 bg-slate-50 px-2 py-3 font-bold text-center whitespace-nowrap',
            sticky && 'sticky left-0 z-30',
            className,
        )}>
            <button onClick={onClick} className={cn('inline-flex items-center gap-1 hover:text-slate-900', active && 'text-slate-900')}>
                {children}
                {active && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
            </button>
        </th>
    );
}

function Cell({ total, manual, state, label, onCommit }: {
    total: number; manual: number; state?: 'saving' | 'saved' | 'error'; label: string; onCommit: (v: number) => void;
}) {
    const [draft, setDraft] = useState(String(total));
    const [focused, setFocused] = useState(false);

    useEffect(() => { if (!focused) setDraft(String(total)); }, [total, focused]);

    const commit = () => {
        setFocused(false);
        const n = parseInt(draft, 10);
        if (Number.isNaN(n) || n < 0) { setDraft(String(total)); return; }
        if (n !== total) onCommit(n);
    };

    const busy = state === 'saving';

    return (
        <div className="flex flex-col items-center">
            <div className={cn(
                'flex items-center rounded-lg ring-1 transition-colors',
                state === 'error' ? 'ring-red-300 bg-red-50' : state === 'saved' ? 'ring-emerald-300 bg-emerald-50' : 'ring-transparent hover:ring-slate-200',
            )}>
                <button
                    onClick={() => onCommit(total - 1)}
                    disabled={busy || total <= 0}
                    aria-label={`Diminuir ${label}`}
                    className="h-7 w-6 grid place-items-center text-slate-300 hover:text-red-600 disabled:opacity-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                >
                    <Minus size={13} />
                </button>
                <div className="relative">
                    <input
                        value={draft}
                        inputMode="numeric"
                        aria-label={label}
                        onFocus={e => { setFocused(true); e.target.select(); }}
                        onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') { setDraft(String(total)); (e.target as HTMLInputElement).blur(); }
                        }}
                        className="w-11 h-8 rounded-md bg-transparent text-center font-black tabular-nums text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    {busy && <Loader2 size={11} className="absolute -right-1 -top-1 animate-spin text-slate-400" />}
                    {state === 'saved' && <Check size={11} className="absolute -right-1 -top-1 text-emerald-600" />}
                </div>
                <button
                    onClick={() => onCommit(total + 1)}
                    disabled={busy}
                    aria-label={`Aumentar ${label}`}
                    className="h-7 w-6 grid place-items-center text-slate-300 hover:text-emerald-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                >
                    <Plus size={13} />
                </button>
            </div>
            <span className={cn('h-3 text-[10px] font-bold tabular-nums leading-3', manual > 0 ? 'text-amber-600' : manual < 0 ? 'text-sky-600' : 'text-transparent')}>
                {manual !== 0 ? `${manual > 0 ? '+' : ''}${manual} manual` : '·'}
            </span>
        </div>
    );
}

// Títulos por integrante (manual > final > classificação)
async function loadChampionshipWins(supabase: ReturnType<typeof createClient>) {
    return countTitlesByMember(await loadChampionTeams(supabase));
}
