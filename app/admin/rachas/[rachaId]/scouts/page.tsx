'use client';

import { useState, useEffect, useMemo, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    ArrowLeft, Camera, Check, ChevronDown, Loader2, Lock, MapPin, Minus, Plus, RotateCcw,
    Search, Trophy, UserPlus, X, CalendarDays, AlertTriangle, Users, Save,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SCOUT_FIELDS, ScoutField, initials, matchMemberByName, normalizeName } from '@/lib/scouts';

type Member = { id: string; name: string; position: string | null; photo_url: string | null; is_active?: boolean };
type ScoutRow = Member & { member_id: string } & Record<ScoutField, number>;
type HighlightKey = 'top1' | 'top2' | 'top3' | 'sheriff';
type Highlights = Record<HighlightKey, string[]>;
type ParsedRow = { photoName: string; member_id: string | null; include: boolean } & Record<ScoutField, number>;

const HIGHLIGHTS: { key: HighlightKey; label: string; emoji: string; cols: [string, string, string]; ring: string }[] = [
    { key: 'top1', label: 'Craque · Top 1', emoji: '🥇', cols: ['top1_id', 'top1_extra_id', 'top1_extra2_id'], ring: 'bg-yellow-400 text-yellow-950 border-yellow-400' },
    { key: 'top2', label: 'Top 2', emoji: '🥈', cols: ['top2_id', 'top2_extra_id', 'top2_extra2_id'], ring: 'bg-slate-300 text-slate-900 border-slate-300' },
    { key: 'top3', label: 'Top 3', emoji: '🥉', cols: ['top3_id', 'top3_extra_id', 'top3_extra2_id'], ring: 'bg-orange-300 text-orange-950 border-orange-300' },
    { key: 'sheriff', label: 'Xerife', emoji: '🤠', cols: ['sheriff_id', 'sheriff_extra_id', 'sheriff_extra2_id'], ring: 'bg-[#af1c15] text-white border-[#af1c15]' },
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    open: { label: 'Confirmações abertas', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
    locked: { label: 'Lista travada', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
    in_progress: { label: 'Em andamento', cls: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
    closed: { label: 'Encerrado', cls: 'bg-slate-500/20 text-slate-300 ring-slate-400/30' },
};

const statsKey = (s: Record<ScoutField, number>) => SCOUT_FIELDS.map(f => s[f.key] || 0).join('|');
const highlightsKey = (h: Highlights) => HIGHLIGHTS.map(c => h[c.key].join(',')).join('|');

// Reduz fotos grandes do celular antes de enviar (limite da API é ~5 MB)
async function imageToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Não foi possível ler a imagem'));
        reader.readAsDataURL(file);
    });
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('Formato de imagem não suportado'));
            el.src = dataUrl;
        });
        const MAX = 2000;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL('image/jpeg', 0.85);
        return { base64: out.split(',')[1], mediaType: 'image/jpeg' };
    } catch {
        return { base64: dataUrl.split(',')[1], mediaType: file.type || 'image/jpeg' };
    }
}

export default function ScoutsPage({ params }: { params: Promise<{ rachaId: string }> }) {
    const { rachaId } = use(params);
    const router = useRouter();

    const [racha, setRacha] = useState<any>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [scouts, setScouts] = useState<ScoutRow[]>([]);
    const [savedStats, setSavedStats] = useState<Record<string, string>>({});
    const [highlights, setHighlights] = useState<Highlights>({ top1: [], top2: [], top3: [], sheriff: [] });
    const [savedHighlights, setSavedHighlights] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<null | 'save' | 'close' | 'status' | 'roster'>(null);
    const [search, setSearch] = useState('');
    const [closeOpen, setCloseOpen] = useState(false);

    const [parsing, setParsing] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);

    // ---------- carregamento ----------
    const loadData = useCallback(async () => {
        const supabase = createClient();
        const [rachaRes, membersRes, attRes, scoutsRes] = await Promise.all([
            supabase.from('rachas').select('*').eq('id', rachaId).single(),
            supabase.from('members').select('id, name, position, photo_url, is_active').order('name'),
            supabase.from('racha_attendance')
                .select('member_id, members:member_id (id, name, position, photo_url)')
                .eq('racha_id', rachaId).eq('status', 'in'),
            supabase.from('racha_scouts').select('*').eq('racha_id', rachaId),
        ]);

        if (rachaRes.error || !rachaRes.data) {
            setRacha(null);
            setLoading(false);
            return;
        }
        const r = rachaRes.data;
        setRacha(r);
        setMembers((membersRes.data || []) as Member[]);

        const dbScouts = scoutsRes.data || [];
        const rows: ScoutRow[] = (attRes.data || []).map((att: any) => {
            const s = dbScouts.find((x: any) => x.member_id === att.member_id);
            const m = att.members || {};
            return {
                id: att.member_id,
                member_id: att.member_id,
                name: m.name || 'Membro desconhecido',
                position: m.position || null,
                photo_url: m.photo_url || null,
                goals: s?.goals || 0,
                assists: s?.assists || 0,
                difficult_saves: s?.difficult_saves || 0,
                warnings: s?.warnings || 0,
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        setScouts(rows);
        setSavedStats(Object.fromEntries(rows.map(s => [s.member_id, statsKey(s)])));

        const h = Object.fromEntries(HIGHLIGHTS.map(c => [
            c.key,
            Array.from(new Set(c.cols.map(col => r[col]).filter(Boolean))),
        ])) as Highlights;
        setHighlights(h);
        setSavedHighlights(highlightsKey(h));
        setLoading(false);
    }, [rachaId]);

    useEffect(() => { loadData(); }, [loadData]);

    // ---------- estado derivado ----------
    const dirtyIds = useMemo(
        () => new Set(scouts.filter(s => savedStats[s.member_id] !== statsKey(s)).map(s => s.member_id)),
        [scouts, savedStats],
    );
    const highlightsDirty = highlightsKey(highlights) !== savedHighlights;
    const isDirty = dirtyIds.size > 0 || highlightsDirty;

    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const totals = useMemo(() => Object.fromEntries(SCOUT_FIELDS.map(f => [
        f.key, scouts.reduce((acc, s) => acc + (s[f.key] || 0), 0),
    ])) as Record<ScoutField, number>, [scouts]);

    const visibleScouts = useMemo(() => {
        const q = normalizeName(search);
        return q ? scouts.filter(s => normalizeName(s.name).includes(q)) : scouts;
    }, [scouts, search]);

    const memberById = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);

    // ---------- scouts ----------
    const bump = (memberId: string, field: ScoutField, delta: number) => {
        setScouts(prev => prev.map(s => s.member_id === memberId
            ? { ...s, [field]: Math.max(0, (s[field] || 0) + delta) }
            : s));
    };

    const addPlayers = async (ids: string[]) => {
        const newIds = ids.filter(id => !scouts.some(s => s.member_id === id));
        if (newIds.length === 0) return true;
        const supabase = createClient();
        const { error } = await supabase
            .from('racha_attendance')
            .upsert(newIds.map(id => ({ racha_id: rachaId, member_id: id, status: 'in' })), { onConflict: 'racha_id,member_id' });
        if (error) {
            toast.error('Erro ao adicionar jogador: ' + error.message);
            return false;
        }
        const zero = { goals: 0, assists: 0, difficult_saves: 0, warnings: 0 };
        setScouts(prev => [...prev, ...newIds.map(id => {
            const m = memberById.get(id)!;
            return { ...m, member_id: id, ...zero };
        })].sort((a, b) => a.name.localeCompare(b.name)));
        setSavedStats(prev => ({ ...prev, ...Object.fromEntries(newIds.map(id => [id, statsKey(zero)])) }));
        return true;
    };

    const handleAdd = async (id: string) => {
        setBusy('roster');
        const ok = await addPlayers([id]);
        setBusy(null);
        if (ok) toast.success(`${memberById.get(id)?.name} adicionado à lista`);
    };

    const handleRemove = async (row: ScoutRow) => {
        if (!confirm(`Remover ${row.name} deste racha? Os scouts dele neste racha serão apagados.`)) return;
        setBusy('roster');
        const supabase = createClient();
        const [att, sc] = await Promise.all([
            supabase.from('racha_attendance').update({ status: 'out' }).eq('racha_id', rachaId).eq('member_id', row.member_id),
            supabase.from('racha_scouts').delete().eq('racha_id', rachaId).eq('member_id', row.member_id),
        ]);
        setBusy(null);
        const error = att.error || sc.error;
        if (error) {
            toast.error('Erro ao remover jogador: ' + error.message);
            return;
        }
        setScouts(prev => prev.filter(s => s.member_id !== row.member_id));
        setHighlights(prev => Object.fromEntries(HIGHLIGHTS.map(c => [c.key, prev[c.key].filter(id => id !== row.member_id)])) as Highlights);
        toast.success(`${row.name} removido`);
    };

    // ---------- destaques ----------
    // Cada destaque tem 3 vagas (principal, extra, extra 2). 'none' limpa a vaga.
    const setHighlightSlot = (cat: HighlightKey, slot: number, memberId: string) => {
        setHighlights(prev => {
            const slots = [0, 1, 2].map(i => prev[cat][i] || '');
            slots[slot] = memberId === 'none' ? '' : memberId;
            return { ...prev, [cat]: slots.filter(Boolean) };
        });
    };

    const highlightPayload = () => {
        const out: Record<string, string | null> = {};
        for (const c of HIGHLIGHTS) c.cols.forEach((col, i) => { out[col] = highlights[c.key][i] || null; });
        return out;
    };

    // ---------- salvar / encerrar ----------
    const persist = async (close: boolean) => {
        setBusy(close ? 'close' : 'save');
        const supabase = createClient();
        try {
            if (scouts.length > 0) {
                const { error } = await supabase.from('racha_scouts').upsert(
                    scouts.map(s => ({
                        racha_id: rachaId,
                        member_id: s.member_id,
                        goals: s.goals,
                        assists: s.assists,
                        difficult_saves: s.difficult_saves,
                        warnings: s.warnings,
                    })),
                    { onConflict: 'racha_id,member_id' },
                );
                if (error) throw new Error('scouts: ' + error.message);
            }

            const update: Record<string, any> = highlightPayload();
            let createdNext = false;

            if (close) {
                update.status = 'closed';
                if (racha.periodicity === 'weekly' || racha.periodicity === 'monthly') {
                    const next = new Date(racha.date_time);
                    if (racha.periodicity === 'weekly') next.setDate(next.getDate() + 7);
                    else next.setMonth(next.getMonth() + 1);

                    // Evita duplicar o próximo racha se este já foi encerrado antes
                    const { data: existing } = await supabase
                        .from('rachas').select('id').eq('date_time', next.toISOString()).limit(1);
                    if (!existing || existing.length === 0) {
                        const { error } = await supabase.from('rachas').insert({
                            name: racha.name,
                            date_time: next.toISOString(),
                            location: racha.location,
                            periodicity: racha.periodicity,
                            status: 'open',
                            is_next: !!racha.is_next,
                        });
                        if (error) throw new Error('próximo racha: ' + error.message);
                        createdNext = true;
                        if (racha.is_next) update.is_next = false;
                    }
                }
            }

            const { error: rErr } = await supabase.from('rachas').update(update).eq('id', rachaId);
            if (rErr) throw new Error('racha: ' + rErr.message);

            setSavedStats(Object.fromEntries(scouts.map(s => [s.member_id, statsKey(s)])));
            setSavedHighlights(highlightsKey(highlights));

            if (close) {
                toast.success('Racha encerrado e scouts oficializados!' + (createdNext ? ' Próximo racha criado.' : ''));
                setCloseOpen(false);
                router.push('/admin/rachas');
            } else {
                setRacha((r: any) => ({ ...r, ...update }));
                toast.success('Scouts e destaques salvos');
            }
        } catch (err: any) {
            toast.error('Erro ao salvar ' + err.message);
        } finally {
            setBusy(null);
        }
    };

    const changeStatus = async (status: string, msg: string) => {
        if (isDirty && !confirm('Há alterações não salvas que serão mantidas na tela. Continuar?')) return;
        setBusy('status');
        const supabase = createClient();
        const { error } = await supabase.from('rachas').update({ status }).eq('id', rachaId);
        setBusy(null);
        if (error) return toast.error('Erro: ' + error.message);
        setRacha((r: any) => ({ ...r, status }));
        toast.success(msg);
    };

    // ---------- importação por foto ----------
    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setParsing(true);
        try {
            const { base64, mediaType } = await imageToBase64(file);
            const res = await fetch('/api/admin/parse-scouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, mediaType }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Erro ao processar imagem');

            const players: any[] = Array.isArray(data.players) ? data.players : [];
            if (players.length === 0) throw new Error('Nenhum jogador encontrado na foto');

            const present = scouts.map(s => ({ id: s.member_id, name: s.name }));
            setParsedRows(players.map(p => {
                const match = matchMemberByName(String(p.name || ''), present, members);
                const n = (v: any) => Math.max(0, parseInt(v) || 0);
                return {
                    photoName: String(p.name || '?'),
                    member_id: match?.id || null,
                    include: !!match,
                    goals: n(p.goals),
                    assists: n(p.assists),
                    difficult_saves: n(p.difficult_saves),
                    warnings: n(p.warnings),
                };
            }));
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar imagem');
        } finally {
            setParsing(false);
        }
    };

    const applyParsed = async () => {
        if (!parsedRows) return;
        const rows = parsedRows.filter(r => r.include && r.member_id);
        const byMember = new Map(rows.map(r => [r.member_id!, r]));
        setBusy('roster');
        const ok = await addPlayers(Array.from(byMember.keys()));
        setBusy(null);
        if (!ok) return;
        setScouts(prev => prev.map(s => {
            const r = byMember.get(s.member_id);
            return r ? { ...s, goals: r.goals, assists: r.assists, difficult_saves: r.difficult_saves, warnings: r.warnings } : s;
        }));
        setParsedRows(null);
        toast.success(`${byMember.size} jogadores preenchidos — revise e clique em Salvar`);
    };

    // ---------- render ----------
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 gap-3">
                <Loader2 className="animate-spin text-[#af1c15]" size={32} />
                Carregando scouts...
            </div>
        );
    }
    if (!racha) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-600">
                Racha não encontrado.
                <Button variant="outline" onClick={() => router.push('/admin/rachas')}>Voltar</Button>
            </div>
        );
    }

    const status = STATUS_LABEL[racha.status] || STATUS_LABEL.open;
    const date = new Date(racha.date_time);
    const candidates = members.filter(m => m.is_active !== false && !scouts.some(s => s.member_id === m.id));

    return (
        <div className="space-y-6 pb-28">
            {/* Cabeçalho */}
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-5 md:p-8 mt-10 lg:mt-0">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#af1c15]/30 blur-3xl" />
                <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="space-y-3">
                        <button
                            onClick={() => router.push('/admin/rachas')}
                            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={16} /> Rachas
                        </button>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl md:text-4xl font-black tracking-tight">Scouts do Racha</h1>
                            <span className={cn('rounded-full px-3 py-1 text-xs font-bold ring-1', status.cls)}>{status.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarDays size={15} />
                                {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {racha.location && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{racha.location}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 md:gap-3">
                        <SummaryStat icon={<Users size={14} />} label="Jogadores" value={scouts.length} />
                        {SCOUT_FIELDS.map(f => (
                            <SummaryStat key={f.key} icon={<span>{f.emoji}</span>} label={f.label} value={totals[f.key]} />
                        ))}
                    </div>
                </div>

                <div className="relative mt-6 flex flex-wrap gap-2">
                    <label className={cn(
                        'inline-flex items-center gap-2 rounded-xl px-4 min-h-[40px] text-sm font-semibold cursor-pointer transition-colors',
                        parsing ? 'bg-white/10 text-slate-400 cursor-wait' : 'bg-white text-slate-900 hover:bg-slate-100',
                    )}>
                        {parsing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        {parsing ? 'Lendo a súmula...' : 'Importar foto da súmula'}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} disabled={parsing} />
                    </label>
                    {racha.status === 'closed' ? (
                        <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:border-white/30 min-h-[40px]"
                            onClick={() => changeStatus('in_progress', 'Racha reaberto')} disabled={!!busy}>
                            <RotateCcw size={15} /> Reabrir racha
                        </Button>
                    ) : (
                        <Button variant="danger" size="sm" className="min-h-[40px]" onClick={() => setCloseOpen(true)} disabled={!!busy}>
                            <Lock size={15} /> Encerrar racha
                        </Button>
                    )}
                    {racha.status !== 'open' && (
                        <Button variant="ghost" size="sm" className="text-slate-300 hover:bg-white/10 hover:text-white min-h-[40px]"
                            onClick={() => changeStatus('open', 'Confirmações reabertas')} disabled={!!busy}>
                            Reabrir confirmações
                        </Button>
                    )}
                </div>
            </section>

            {racha.status === 'closed' && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    Este racha já está encerrado. Alterações salvas aqui mudam o ranking oficial imediatamente.
                </div>
            )}

            {/* Jogadores */}
            <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:p-5 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Jogadores presentes</h2>
                        <p className="text-xs text-slate-500">Adicionar/remover salva na hora. Os números só valem depois de <b>Salvar</b>.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 md:w-auto">
                        <div className="relative sm:w-56">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar na lista"
                                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </div>
                        <MemberPicker members={candidates} onPick={handleAdd} disabled={busy === 'roster'} />
                    </div>
                </div>

                {scouts.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 space-y-1">
                        <Users className="mx-auto text-slate-300" size={40} />
                        <p className="font-semibold text-slate-700">Ninguém na lista ainda</p>
                        <p className="text-sm">Adicione jogadores ou importe a foto da súmula.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_repeat(4,9.5rem)_2.5rem] gap-3 px-5 py-2.5 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <span>Jogador</span>
                            {SCOUT_FIELDS.map(f => <span key={f.key} className="text-center">{f.emoji} {f.label}</span>)}
                            <span />
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {visibleScouts.map(s => (
                                <li key={s.member_id} className={cn(
                                    'grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_repeat(4,9.5rem)_2.5rem] items-center gap-x-3 gap-y-3 px-4 md:px-5 py-3 transition-colors',
                                    dirtyIds.has(s.member_id) && 'bg-amber-50/60',
                                )}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar member={s} />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                                                {s.name}
                                                {dirtyIds.has(s.member_id) && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Não salvo" />}
                                            </p>
                                            {s.position && <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.position}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(s)}
                                        disabled={busy === 'roster'}
                                        title="Remover do racha"
                                        className="lg:order-last justify-self-end h-9 w-9 grid place-items-center rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                    <div className="col-span-2 lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 lg:contents gap-2">
                                        {SCOUT_FIELDS.map(f => (
                                            <Stepper
                                                key={f.key}
                                                emoji={f.emoji}
                                                label={f.label}
                                                short={f.short}
                                                tone={f.tone}
                                                value={s[f.key]}
                                                onMinus={() => bump(s.member_id, f.key, -1)}
                                                onPlus={() => bump(s.member_id, f.key, 1)}
                                            />
                                        ))}
                                    </div>
                                </li>
                            ))}
                            {visibleScouts.length === 0 && (
                                <li className="py-10 text-center text-sm text-slate-500">Nenhum jogador encontrado para “{search}”.</li>
                            )}
                        </ul>
                    </>
                )}
            </section>

            {/* Destaques */}
            <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 p-4 md:p-6 space-y-5">
                <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={22} />
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Destaques da partida</h2>
                        <p className="text-xs text-slate-500">Escolha o destaque principal e, se houver empate, até 2 extras.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {HIGHLIGHTS.map(cat => {
                        const selected = highlights[cat.key];
                        const presentIds = new Set(scouts.map(s => s.member_id));
                        const others = members.filter(m => !presentIds.has(m.id));
                        return (
                            <div key={cat.key} className="space-y-4">
                                {[0, 1, 2].map(slot => (
                                    <div key={slot} className="space-y-2">
                                        <label className={cn('text-sm leading-none', slot === 0 ? 'font-semibold text-slate-800' : 'font-medium italic text-slate-400')}>
                                            {slot === 0 ? `${cat.emoji} ${cat.label}` : `+ ${cat.label} Extra${slot === 2 ? ' 2' : ''}`}
                                        </label>
                                        <Select
                                            value={selected[slot] || 'none'}
                                            onValueChange={v => setHighlightSlot(cat.key, slot, v)}
                                            disabled={slot > selected.length}
                                        >
                                            <SelectTrigger className={slot > 0 ? 'border-dashed' : undefined}>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {scouts.length > 0 && (
                                                    <SelectGroup>
                                                        <SelectLabel>Presentes</SelectLabel>
                                                        {scouts.map(s => (
                                                            <SelectItem key={s.member_id} value={s.member_id}>
                                                                {s.name}{(s.goals || s.assists) ? ` · ${s.goals || 0}G ${s.assists || 0}A` : ''}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                )}
                                                {others.length > 0 && (
                                                    <SelectGroup>
                                                        <SelectLabel>Outros integrantes</SelectLabel>
                                                        {others.map(m => (
                                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Barra de salvar */}
            <div className="sticky bottom-4 z-30">
                <div className={cn(
                    'mx-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-xl ring-1 transition-colors max-w-3xl',
                    isDirty ? 'bg-slate-950 text-white ring-slate-800' : 'bg-white/90 backdrop-blur text-slate-500 ring-slate-200',
                )}>
                    <p className="text-sm">
                        {isDirty ? (
                            <>
                                <span className="font-bold text-amber-400">Alterações não salvas</span>
                                <span className="hidden sm:inline text-slate-400">
                                    {' · '}{dirtyIds.size > 0 && `${dirtyIds.size} jogador${dirtyIds.size > 1 ? 'es' : ''}`}
                                    {dirtyIds.size > 0 && highlightsDirty && ' + '}
                                    {highlightsDirty && 'destaques'}
                                </span>
                            </>
                        ) : (
                            <span className="inline-flex items-center gap-1.5"><Check size={16} className="text-emerald-600" /> Tudo salvo</span>
                        )}
                    </p>
                    <Button onClick={() => persist(false)} disabled={!!busy || !isDirty} className="shrink-0">
                        {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar
                    </Button>
                </div>
            </div>

            {/* Confirmar encerramento */}
            <Dialog open={closeOpen} onOpenChange={o => busy !== 'close' && setCloseOpen(o)}>
                <DialogContent className="bg-white rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle>Encerrar o racha?</DialogTitle>
                        <DialogDescription>
                            Os scouts e destaques serão salvos e o racha passa a contar no ranking oficial.
                            {(racha.periodicity === 'weekly' || racha.periodicity === 'monthly') && ' O próximo racha será criado automaticamente.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-5 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                        <div><p className="text-lg font-black text-slate-900">{scouts.length}</p><p className="text-[10px] uppercase text-slate-500">Jogadores</p></div>
                        {SCOUT_FIELDS.map(f => (
                            <div key={f.key}><p className="text-lg font-black text-slate-900">{totals[f.key]}</p><p className="text-[10px] uppercase text-slate-500">{f.emoji}</p></div>
                        ))}
                    </div>
                    {HIGHLIGHTS.some(c => highlights[c.key].length === 0) && (
                        <p className="flex items-center gap-2 text-sm text-amber-700">
                            <AlertTriangle size={16} /> Algum destaque ainda não foi escolhido.
                        </p>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={busy === 'close'}>Cancelar</Button>
                        <Button variant="danger" onClick={() => persist(true)} disabled={busy === 'close'}>
                            {busy === 'close' ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                            Salvar e encerrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Revisão da foto */}
            <Dialog open={!!parsedRows} onOpenChange={o => !o && setParsedRows(null)}>
                <DialogContent className="bg-white rounded-2xl max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-5 border-b">
                        <DialogTitle>Revisar leitura da súmula</DialogTitle>
                        <DialogDescription>
                            Confira os números e vincule cada nome a um integrante. Quem não estiver na lista será adicionado ao racha.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 p-3 md:p-5 space-y-2">
                        {parsedRows?.map((row, i) => {
                            const setRow = (patch: Partial<ParsedRow>) =>
                                setParsedRows(prev => prev!.map((r, j) => j === i ? { ...r, ...patch } : r));
                            const notPresent = row.member_id && !scouts.some(s => s.member_id === row.member_id);
                            return (
                                <div key={i} className={cn(
                                    'rounded-xl border p-3 space-y-3',
                                    !row.include ? 'border-slate-200 bg-slate-50 opacity-60' : row.member_id ? 'border-emerald-200' : 'border-red-200 bg-red-50/40',
                                )}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={row.include}
                                            onChange={e => setRow({ include: e.target.checked })}
                                            className="h-4 w-4 accent-emerald-600"
                                        />
                                        <span className="text-sm text-slate-500">Na foto:</span>
                                        <span className="font-semibold text-slate-900">“{row.photoName}”</span>
                                        <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                                        <select
                                            value={row.member_id || ''}
                                            onChange={e => setRow({ member_id: e.target.value || null, include: !!e.target.value })}
                                            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm flex-1 min-w-[10rem]"
                                        >
                                            <option value="">— escolher integrante —</option>
                                            <optgroup label="Presentes">
                                                {scouts.map(s => <option key={s.member_id} value={s.member_id}>{s.name}</option>)}
                                            </optgroup>
                                            <optgroup label="Outros integrantes">
                                                {candidates.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </optgroup>
                                        </select>
                                        {notPresent && <span className="text-[11px] font-bold uppercase text-sky-700 bg-sky-50 rounded px-1.5 py-0.5">será adicionado</span>}
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {SCOUT_FIELDS.map(f => (
                                            <label key={f.key} className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
                                                <span>{f.emoji} {f.label}</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    inputMode="numeric"
                                                    value={row[f.key]}
                                                    onChange={e => setRow({ [f.key]: Math.max(0, parseInt(e.target.value) || 0) } as any)}
                                                    className="h-9 rounded-lg border border-slate-200 px-2 text-center text-base font-bold text-slate-900"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-4 border-t flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                            Os valores substituem os atuais desses jogadores. Nada é salvo até você clicar em Salvar.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setParsedRows(null)}>Cancelar</Button>
                            <Button onClick={applyParsed} disabled={busy === 'roster' || !parsedRows?.some(r => r.include && r.member_id)}>
                                <Check size={16} />
                                Aplicar {parsedRows?.filter(r => r.include && r.member_id).length || 0}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ---------- componentes ----------

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 px-2 py-2.5 md:px-4 md:py-3 text-center min-w-0">
            <p className="text-xl md:text-3xl font-black tabular-nums">{value}</p>
            <p className="flex items-center justify-center gap-1 text-[10px] md:text-[11px] uppercase tracking-wide text-slate-400 truncate">
                {icon}<span className="hidden sm:inline truncate">{label}</span>
            </p>
        </div>
    );
}

function Avatar({ member }: { member: { name: string; photo_url: string | null } }) {
    return member.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white shadow" />
    ) : (
        <div className="h-10 w-10 shrink-0 rounded-full bg-slate-900 text-white grid place-items-center text-xs font-bold">
            {initials(member.name)}
        </div>
    );
}

function Stepper({ emoji, label, short, tone, value, onMinus, onPlus }: {
    emoji: string; label: string; short: string; tone: string; value: number; onMinus: () => void; onPlus: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-1 rounded-xl bg-slate-50 p-1 lg:bg-transparent lg:justify-center">
            <span className="lg:hidden pl-1.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{emoji} <span className="sr-only sm:not-sr-only">{short}</span></span>
            <div className="flex items-center gap-1">
                <button
                    onClick={onMinus}
                    disabled={value <= 0}
                    aria-label={`Remover ${label}`}
                    className="h-9 w-9 grid place-items-center rounded-lg bg-white ring-1 ring-slate-200 text-slate-500 hover:text-red-600 hover:ring-red-200 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                    <Minus size={16} />
                </button>
                <span className={cn('w-8 text-center text-lg font-black tabular-nums', value > 0 ? 'text-slate-900' : 'text-slate-300')}>{value}</span>
                <button
                    onClick={onPlus}
                    aria-label={`Adicionar ${label}`}
                    className={cn('h-9 w-9 grid place-items-center rounded-lg shadow-sm active:scale-95 transition', tone)}
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
}

function MemberPicker({ members, onPick, disabled }: { members: Member[]; onPick: (id: string) => void; disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const list = useMemo(() => {
        const n = normalizeName(q);
        return (n ? members.filter(m => normalizeName(m.name).includes(n)) : members).slice(0, 50);
    }, [members, q]);

    return (
        <div ref={ref} className="relative">
            <Button onClick={() => setOpen(o => !o)} disabled={disabled} variant="black" size="sm" className="w-full sm:w-auto min-h-[40px]">
                {disabled ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Adicionar jogador
            </Button>
            {open && (
                <div className="absolute right-0 z-40 mt-2 w-full sm:w-72 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <input
                            autoFocus
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Digite o nome..."
                            className="w-full h-9 rounded-lg bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>
                    <ul className="max-h-72 overflow-y-auto py-1">
                        {list.map(m => (
                            <li key={m.id}>
                                <button
                                    onClick={() => { onPick(m.id); setOpen(false); setQ(''); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                >
                                    <span className="h-7 w-7 shrink-0 rounded-full bg-slate-100 text-slate-600 grid place-items-center text-[10px] font-bold">{initials(m.name)}</span>
                                    <span className="truncate font-medium text-slate-800">{m.name}</span>
                                    {m.position && <span className="ml-auto text-[10px] uppercase text-slate-400">{m.position}</span>}
                                </button>
                            </li>
                        ))}
                        {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-400">Ninguém encontrado</li>}
                    </ul>
                </div>
            )}
        </div>
    );
}
