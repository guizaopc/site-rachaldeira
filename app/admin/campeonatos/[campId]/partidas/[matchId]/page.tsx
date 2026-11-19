'use client';

import { useState, useEffect, useMemo, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Check, CheckCircle, Loader2, Minus, Plus, Save, Shield, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/scouts';

type StatField = 'goals' | 'assists' | 'difficult_saves' | 'yellow_cards' | 'red_cards';

const STATS: { field: StatField; emoji: string; label: string; active: string }[] = [
    { field: 'goals', emoji: '⚽', label: 'Gols', active: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    { field: 'assists', emoji: '🎯', label: 'Assist.', active: 'bg-sky-50 text-sky-700 ring-sky-200' },
    { field: 'difficult_saves', emoji: '🧤', label: 'Defesas', active: 'bg-violet-50 text-violet-700 ring-violet-200' },
    { field: 'yellow_cards', emoji: '🟨', label: 'Amarelo', active: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { field: 'red_cards', emoji: '🟥', label: 'Vermelho', active: 'bg-red-50 text-red-700 ring-red-200' },
];

// Mesma ligação de chaves usada na criação do mata-mata (admin/campeonatos/[campId])
const NEXT_BRACKET: Record<string, { pos: string; slot: 'team_a_id' | 'team_b_id' }> = {
    'qf-1': { pos: 'semi-2', slot: 'team_b_id' },
    'qf-2': { pos: 'semi-1', slot: 'team_b_id' },
    'semi-1': { pos: 'final-1', slot: 'team_a_id' },
    'semi-2': { pos: 'final-1', slot: 'team_b_id' },
};

const PHASE_LABEL = (pos?: string | null) =>
    pos === 'final-1' ? 'Final' : pos?.startsWith('semi') ? 'Semifinal' : pos?.startsWith('qf') ? 'Quartas de final' : 'Fase de grupos';

type PlayerStat = {
    id: string | null;
    member_id: string;
    team_id: string;
    name: string;
    position: string | null;
    photo_url: string | null;
    warnings: number;
} & Record<StatField, number>;

type MatchForm = { scoreA: number; scoreB: number; penA: number; penB: number; penWinner: string | null };

const statKey = (s: PlayerStat) => STATS.map(f => s[f.field] || 0).join('|');
const formKey = (f: MatchForm) => [f.scoreA, f.scoreB, f.penA, f.penB, f.penWinner].join('|');

export default function RegistrarResultadoPage({ params }: { params: Promise<{ campId: string; matchId: string }> }) {
    const { campId, matchId } = use(params);
    const router = useRouter();

    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<null | 'draft' | 'final'>(null);
    const [form, setForm] = useState<MatchForm>({ scoreA: 0, scoreB: 0, penA: 0, penB: 0, penWinner: null });
    const [savedForm, setSavedForm] = useState('');
    const [players, setPlayers] = useState<PlayerStat[]>([]);
    const [savedStats, setSavedStats] = useState<Record<string, string>>({});
    const [activeTeam, setActiveTeam] = useState<'A' | 'B'>('A');

    const loadData = useCallback(async () => {
        const supabase = createClient();
        const memberCols = 'id, name, position, photo_url';
        const { data: m, error } = await supabase
            .from('championship_matches')
            .select(`*,
                team_a:team_a_id(id, name, logo_url, team_members(members(${memberCols}))),
                team_b:team_b_id(id, name, logo_url, team_members(members(${memberCols}))),
                championship:championship_id(id, name, format)`)
            .eq('id', matchId)
            .single();

        if (error || !m) {
            setMatch(null);
            setLoading(false);
            return;
        }

        const { data: statsData } = await supabase.from('match_player_stats').select('*').eq('match_id', matchId);
        const statsByMember = new Map((statsData || []).map((s: any) => [s.member_id, s]));

        // Sempre monta a linha a partir do integrante do time (nome/posição/foto)
        // e só depois aplica os números salvos — antes as linhas salvas ficavam sem nome.
        const build = (team: any): PlayerStat[] => (team?.team_members || [])
            .map((tm: any) => tm.members)
            .filter(Boolean)
            .map((mem: any) => {
                const s: any = statsByMember.get(mem.id) || {};
                return {
                    id: s.id || null,
                    member_id: mem.id,
                    team_id: team.id,
                    name: mem.name || 'Sem nome',
                    position: mem.position || null,
                    photo_url: mem.photo_url || null,
                    goals: s.goals || 0,
                    assists: s.assists || 0,
                    difficult_saves: s.difficult_saves || 0,
                    yellow_cards: s.yellow_cards || 0,
                    red_cards: s.red_cards || 0,
                    warnings: s.warnings || 0,
                };
            })
            .sort((a: PlayerStat, b: PlayerStat) => a.name.localeCompare(b.name));

        const list = [...build(m.team_a), ...build(m.team_b)];
        const f: MatchForm = {
            scoreA: m.score_a || 0,
            scoreB: m.score_b || 0,
            penA: m.penalties_score_a || 0,
            penB: m.penalties_score_b || 0,
            penWinner: m.penalty_winner_id || null,
        };

        setMatch(m);
        setForm(f);
        setSavedForm(formKey(f));
        setPlayers(list);
        setSavedStats(Object.fromEntries(list.map(p => [p.member_id, statKey(p)])));
        setLoading(false);
    }, [matchId]);

    useEffect(() => { loadData(); }, [loadData]);

    // ---------- derivados ----------
    const teamA = match?.team_a;
    const teamB = match?.team_b;
    const playersA = useMemo(() => players.filter(p => p.team_id === match?.team_a_id), [players, match]);
    const playersB = useMemo(() => players.filter(p => p.team_id === match?.team_b_id), [players, match]);
    const goalsA = playersA.reduce((a, p) => a + p.goals, 0);
    const goalsB = playersB.reduce((a, p) => a + p.goals, 0);

    const isBracket = !!match?.bracket_position;
    const isDraw = form.scoreA === form.scoreB;
    const drawAdvantage = !!match?.has_draw_advantage;
    const showPenalties = isBracket && isDraw && !drawAdvantage;
    const isCompleted = match?.status === 'completed';

    const winnerId: string | null = !match ? null
        : form.scoreA > form.scoreB ? match.team_a_id
            : form.scoreB > form.scoreA ? match.team_b_id
                : isBracket && drawAdvantage ? match.team_a_id
                    : showPenalties ? form.penWinner
                        : null;

    const dirtyIds = useMemo(
        () => new Set(players.filter(p => savedStats[p.member_id] !== statKey(p)).map(p => p.member_id)),
        [players, savedStats],
    );
    const isDirty = dirtyIds.size > 0 || formKey(form) !== savedForm;

    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    // ---------- edição ----------
    const setScore = (side: 'A' | 'B', delta: number) =>
        setForm(f => side === 'A' ? { ...f, scoreA: Math.max(0, f.scoreA + delta) } : { ...f, scoreB: Math.max(0, f.scoreB + delta) });

    const updateStat = (memberId: string, field: StatField, delta: number) => {
        const p = players.find(x => x.member_id === memberId);
        if (!p) return;
        if (delta < 0 && p[field] <= 0) return;
        setPlayers(prev => prev.map(x => x.member_id === memberId ? { ...x, [field]: x[field] + delta } : x));
        // Gol de jogador acompanha o placar do time
        if (field === 'goals') setScore(p.team_id === match.team_a_id ? 'A' : 'B', delta);
    };

    // ---------- salvar ----------
    const persist = async (finalize: boolean) => {
        if (finalize && showPenalties && !form.penWinner) {
            toast.error('Empate no mata-mata: marque quem venceu nos pênaltis antes de finalizar.');
            return;
        }
        setSaving(finalize ? 'final' : 'draft');
        const supabase = createClient();
        try {
            const status = finalize ? 'completed' : match.status;
            const { error: mErr } = await supabase.from('championship_matches').update({
                score_a: form.scoreA,
                score_b: form.scoreB,
                penalties_score_a: showPenalties ? form.penA : 0,
                penalties_score_b: showPenalties ? form.penB : 0,
                penalty_winner_id: showPenalties ? form.penWinner : null,
                status,
                ...(status === 'completed' && !match.played_at ? { played_at: new Date().toISOString() } : {}),
            }).eq('id', matchId);
            if (mErr) throw new Error('partida: ' + mErr.message);

            const payload = (p: PlayerStat) => ({
                goals: p.goals, assists: p.assists, difficult_saves: p.difficult_saves,
                yellow_cards: p.yellow_cards, red_cards: p.red_cards, warnings: p.warnings,
            });
            const hasData = (p: PlayerStat) => STATS.some(s => p[s.field] > 0);

            const toUpdate = players.filter(p => p.id && dirtyIds.has(p.member_id));
            const toInsert = players.filter(p => !p.id && hasData(p));

            const results = await Promise.all(toUpdate.map(p =>
                supabase.from('match_player_stats').update(payload(p)).eq('id', p.id!)));
            const upErr = results.find(r => r.error)?.error;
            if (upErr) throw new Error('scouts: ' + upErr.message);

            let inserted: any[] = [];
            if (toInsert.length > 0) {
                const { data, error } = await supabase.from('match_player_stats')
                    .insert(toInsert.map(p => ({ match_id: matchId, member_id: p.member_id, team_id: p.team_id, ...payload(p) })))
                    .select('id, member_id');
                if (error) throw new Error('scouts: ' + error.message);
                inserted = data || [];
            }

            // Leva o vencedor para a próxima fase do mata-mata
            const next = NEXT_BRACKET[match.bracket_position];
            if (status === 'completed' && next && winnerId) {
                const { error } = await supabase.from('championship_matches')
                    .update({ [next.slot]: winnerId })
                    .eq('championship_id', campId)
                    .eq('bracket_position', next.pos);
                if (error) throw new Error('próxima fase: ' + error.message);
            }

            const idByMember = new Map(inserted.map(r => [r.member_id, r.id]));
            const updatedPlayers = players.map(p => idByMember.has(p.member_id) ? { ...p, id: idByMember.get(p.member_id) } : p);
            setPlayers(updatedPlayers);
            setSavedStats(Object.fromEntries(updatedPlayers.map(p => [p.member_id, statKey(p)])));
            setSavedForm(formKey(form));
            setMatch((m: any) => ({ ...m, status, played_at: m.played_at || (status === 'completed' ? new Date().toISOString() : null) }));

            if (finalize && !isCompleted) {
                toast.success('Partida finalizada!' + (next && winnerId ? ' Vencedor enviado para a próxima fase.' : ''));
                router.push(`/admin/campeonatos/${campId}`);
            } else {
                toast.success('Alterações salvas');
            }
        } catch (err: any) {
            toast.error('Erro ao salvar ' + err.message);
        } finally {
            setSaving(null);
        }
    };

    const goBack = () => {
        if (isDirty && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
        router.push(`/admin/campeonatos/${campId}`);
    };

    // ---------- render ----------
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
                <Loader2 className="animate-spin text-[#af1c15]" size={30} /> Carregando partida...
            </div>
        );
    }
    if (!match) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-600">
                Partida não encontrada.
                <Button variant="outline" onClick={() => router.push(`/admin/campeonatos/${campId}`)}>Voltar</Button>
            </div>
        );
    }

    const statusPill = isCompleted
        ? { label: 'Encerrada', cls: 'bg-slate-500/20 text-slate-300 ring-slate-400/30' }
        : match.status === 'in_progress'
            ? { label: '● Em andamento', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' }
            : { label: 'Agendada', cls: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' };

    return (
        <div className="space-y-5 pb-28 mt-10 lg:mt-0 max-w-5xl mx-auto">
            {/* Placar */}
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white">
                <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#af1c15]/25 blur-3xl" />
                <div className="absolute -right-20 -bottom-24 h-60 w-60 rounded-full bg-sky-500/15 blur-3xl" />
                <div className="relative p-4 md:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors min-w-0">
                            <ArrowLeft size={16} className="shrink-0" />
                            <span className="truncate">{match.championship?.name || 'Campeonato'}</span>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-yellow-300 ring-1 ring-yellow-400/30">
                                <Trophy size={12} /> {PHASE_LABEL(match.bracket_position)}
                            </span>
                            <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold ring-1', statusPill.cls)}>{statusPill.label}</span>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-6">
                        <TeamSide team={teamA} winner={winnerId === match.team_a_id} loser={!!winnerId && winnerId !== match.team_a_id} />
                        <div className="flex items-center gap-2 md:gap-4">
                            <ScoreControl value={form.scoreA} onChange={d => setScore('A', d)} />
                            <span className="text-2xl font-black text-slate-600">×</span>
                            <ScoreControl value={form.scoreB} onChange={d => setScore('B', d)} />
                        </div>
                        <TeamSide team={teamB} winner={winnerId === match.team_b_id} loser={!!winnerId && winnerId !== match.team_b_id} />
                    </div>

                    {(goalsA !== form.scoreA || goalsB !== form.scoreB) && (players.some(p => p.goals > 0)) && (
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-amber-300">
                            <AlertTriangle size={14} />
                            Gols dos jogadores somam {goalsA} × {goalsB}, diferente do placar.
                            <button
                                onClick={() => setForm(f => ({ ...f, scoreA: goalsA, scoreB: goalsB }))}
                                className="rounded-full bg-amber-400/15 px-2.5 py-1 font-bold ring-1 ring-amber-400/30 hover:bg-amber-400/25"
                            >
                                Usar {goalsA} × {goalsB}
                            </button>
                        </div>
                    )}

                    {isBracket && isDraw && drawAdvantage && (
                        <p className="mt-5 text-center text-xs text-sky-300">
                            <b>{teamA?.name}</b> avança pelo empate nesta fase.
                        </p>
                    )}
                </div>

                {showPenalties && (
                    <div className="relative border-t border-white/10 bg-white/[0.03] p-4 md:p-5">
                        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">Disputa de pênaltis</p>
                        <div className="grid grid-cols-2 gap-3 md:gap-6 max-w-lg mx-auto">
                            {([
                                { team: teamA, value: form.penA, key: 'penA' as const, id: match.team_a_id },
                                { team: teamB, value: form.penB, key: 'penB' as const, id: match.team_b_id },
                            ]).map(({ team, value, key, id }) => (
                                <div key={id} className="flex flex-col items-center gap-2">
                                    <p className="text-xs font-semibold text-slate-300 truncate max-w-full">{team?.name}</p>
                                    <div className="flex items-center gap-2">
                                        <RoundBtn onClick={() => setForm(f => ({ ...f, [key]: Math.max(0, f[key] - 1) }))} disabled={value <= 0}><Minus size={14} /></RoundBtn>
                                        <span className="w-8 text-center text-3xl font-black tabular-nums">{value}</span>
                                        <RoundBtn primary onClick={() => setForm(f => ({ ...f, [key]: f[key] + 1 }))}><Plus size={14} /></RoundBtn>
                                    </div>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, penWinner: id }))}
                                        className={cn(
                                            'w-full rounded-xl py-2 text-xs font-bold ring-1 transition',
                                            form.penWinner === id ? 'bg-emerald-500 text-white ring-emerald-500' : 'text-slate-300 ring-white/15 hover:ring-emerald-400/60',
                                        )}
                                    >
                                        {form.penWinner === id ? '✓ Venceu nos pênaltis' : 'Marcar vencedor'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Abas no celular */}
            <div className="lg:hidden grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
                {(['A', 'B'] as const).map(side => {
                    const team = side === 'A' ? teamA : teamB;
                    const list = side === 'A' ? playersA : playersB;
                    const pending = list.some(p => dirtyIds.has(p.member_id));
                    return (
                        <button
                            key={side}
                            onClick={() => setActiveTeam(side)}
                            className={cn(
                                'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition',
                                activeTeam === side ? 'bg-slate-950 text-white' : 'text-slate-500',
                            )}
                        >
                            <TeamLogo url={team?.logo_url} size={20} />
                            <span className="truncate">{team?.name}</span>
                            {pending && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                        </button>
                    );
                })}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <div className={cn(activeTeam !== 'A' && 'hidden lg:block')}>
                    <TeamScouts team={teamA} players={playersA} dirtyIds={dirtyIds} onUpdate={updateStat} />
                </div>
                <div className={cn(activeTeam !== 'B' && 'hidden lg:block')}>
                    <TeamScouts team={teamB} players={playersB} dirtyIds={dirtyIds} onUpdate={updateStat} />
                </div>
            </div>

            {/* Barra de salvar */}
            <div className="sticky bottom-4 z-30">
                <div className={cn(
                    'mx-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-xl ring-1 max-w-3xl transition-colors',
                    isDirty ? 'bg-slate-950 text-white ring-slate-800' : 'bg-white/90 backdrop-blur text-slate-500 ring-slate-200',
                )}>
                    <p className="text-sm min-w-0 truncate">
                        {isDirty
                            ? <span className="font-bold text-amber-400">Alterações não salvas</span>
                            : <span className="inline-flex items-center gap-1.5"><Check size={16} className="text-emerald-600" /> Tudo salvo</span>}
                    </p>
                    <div className="flex gap-2 shrink-0">
                        {isCompleted ? (
                            <Button onClick={() => persist(false)} disabled={!!saving || !isDirty}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Salvar
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => persist(false)}
                                    disabled={!!saving || !isDirty}
                                    className={cn(isDirty && 'text-slate-200 hover:bg-white/10 hover:text-white')}
                                >
                                    {saving === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span className="hidden sm:inline">Salvar parcial</span>
                                </Button>
                                <Button onClick={() => persist(true)} disabled={!!saving}>
                                    {saving === 'final' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    Finalizar partida
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------- componentes ----------

function TeamLogo({ url, size = 48 }: { url?: string | null; size?: number }) {
    return url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: size, height: size }} className="object-contain shrink-0" />
    ) : (
        <span style={{ width: size, height: size }} className="grid place-items-center rounded-full bg-white/10 shrink-0">
            <Shield size={size * 0.45} className="text-slate-400" />
        </span>
    );
}

function TeamSide({ team, winner, loser }: { team: any; winner: boolean; loser: boolean }) {
    return (
        <div className={cn('flex flex-col items-center gap-2 text-center min-w-0 transition-opacity', loser && 'opacity-50')}>
            <TeamLogo url={team?.logo_url} size={56} />
            <p className="font-black text-sm md:text-lg leading-tight break-words">{team?.name || 'A definir'}</p>
            <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1',
                winner ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' : 'invisible',
            )}>
                Vencedor
            </span>
        </div>
    );
}

function RoundBtn({ children, onClick, disabled, primary }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'h-9 w-9 grid place-items-center rounded-full transition active:scale-95 touch-manipulation disabled:opacity-30',
                primary ? 'bg-white text-slate-950 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20',
            )}
        >
            {children}
        </button>
    );
}

function ScoreControl({ value, onChange }: { value: number; onChange: (delta: number) => void }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <RoundBtn primary onClick={() => onChange(1)}><Plus size={16} /></RoundBtn>
            <span className="text-5xl md:text-7xl font-black tabular-nums leading-none w-12 md:w-20 text-center">{value}</span>
            <RoundBtn onClick={() => onChange(-1)} disabled={value <= 0}><Minus size={16} /></RoundBtn>
        </div>
    );
}

function TeamScouts({ team, players, dirtyIds, onUpdate }: {
    team: any; players: PlayerStat[]; dirtyIds: Set<string>; onUpdate: (id: string, field: StatField, delta: number) => void;
}) {
    const totals = Object.fromEntries(STATS.map(s => [s.field, players.reduce((a, p) => a + p[s.field], 0)])) as Record<StatField, number>;

    return (
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                <span className="h-9 w-9 grid place-items-center rounded-xl bg-slate-950 shrink-0">
                    <TeamLogo url={team?.logo_url} size={24} />
                </span>
                <div className="min-w-0">
                    <h2 className="font-black text-slate-900 truncate">{team?.name || 'A definir'}</h2>
                    <p className="text-xs text-slate-500">{players.length} jogadores</p>
                </div>
                <div className="ml-auto flex gap-2 text-xs font-bold text-slate-500 tabular-nums">
                    {STATS.slice(0, 3).map(s => <span key={s.field}>{s.emoji} {totals[s.field]}</span>)}
                </div>
            </header>

            {players.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">Nenhum jogador cadastrado neste time.</p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {players.map(p => {
                        const dirty = dirtyIds.has(p.member_id);
                        return (
                            <li key={p.member_id} className={cn('px-4 py-3 space-y-2.5 transition-colors', dirty && 'bg-amber-50/60')}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {p.photo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.photo_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <span className="h-8 w-8 shrink-0 rounded-full bg-slate-900 text-white grid place-items-center text-[10px] font-bold">{initials(p.name)}</span>
                                    )}
                                    <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                                    {p.position && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">{p.position}</span>}
                                    {dirty && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Não salvo" />}
                                </div>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {STATS.map(s => {
                                        const val = p[s.field];
                                        return (
                                            <div key={s.field} className={cn(
                                                'flex flex-col items-stretch rounded-xl ring-1 overflow-hidden transition-colors',
                                                val > 0 ? s.active : 'bg-slate-50 text-slate-400 ring-slate-200/70',
                                            )}>
                                                <button
                                                    onClick={() => onUpdate(p.member_id, s.field, 1)}
                                                    aria-label={`Adicionar ${s.label} para ${p.name}`}
                                                    className="flex flex-col items-center py-1.5 active:scale-95 transition touch-manipulation"
                                                >
                                                    <span className="text-[13px] leading-none">{s.emoji}</span>
                                                    <span className={cn('text-lg font-black tabular-nums leading-tight', val > 0 ? '' : 'text-slate-300')}>{val}</span>
                                                    <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">{s.label}</span>
                                                </button>
                                                <button
                                                    onClick={() => onUpdate(p.member_id, s.field, -1)}
                                                    disabled={val <= 0}
                                                    aria-label={`Remover ${s.label} de ${p.name}`}
                                                    className="h-7 grid place-items-center border-t border-black/5 bg-white/60 hover:bg-white disabled:opacity-0 transition touch-manipulation"
                                                >
                                                    <Minus size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
