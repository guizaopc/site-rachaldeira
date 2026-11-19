'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    AlertTriangle, ArrowRight, CalendarClock, CalendarPlus, CheckCircle2, ClipboardList, Clock, Inbox, ListTodo,
    MapPin, Pencil, Plus, Search, Trash2, Video, Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
    ACTION_STATUS, ITEM_CATEGORY, ITEM_PRIORITY, ITEM_TYPE, MEETING_FORMAT, MEETING_STATUS,
    formatDateLong, formatDateShort, formatDueDate, formatDuration, formatTime, isOverdue,
    type ActionItem, type AgendaItem, type BoardMember, type ItemCategory, type Meeting,
} from '@/lib/reunioes';
import {
    ActionItemModal, AgendaItemModal, ConfirmModal, MeetingFormModal, Pill, inputCls,
    type ActionValues, type AgendaItemValues,
} from './components';

type MeetingRow = Meeting & { board_agenda_items: Pick<AgendaItem, 'id' | 'status' | 'duration_minutes'>[] };
type ActionRow = ActionItem & { board_meetings: Pick<Meeting, 'id' | 'title' | 'meeting_date'> | null };
type Tab = 'reunioes' | 'banco' | 'encaminhamentos';

const sortByPriority = (a: AgendaItem, b: AgendaItem) =>
    ITEM_PRIORITY[b.priority].weight - ITEM_PRIORITY[a.priority].weight || a.created_at.localeCompare(b.created_at);

export default function ReunioesClient({ members }: { members: BoardMember[] }) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const memberName = useCallback((id: string | null) => members.find(m => m.id === id)?.name ?? null, [members]);

    const [tab, setTab] = useState<Tab>('reunioes');
    const [loading, setLoading] = useState(true);
    const [meetings, setMeetings] = useState<MeetingRow[]>([]);
    const [backlog, setBacklog] = useState<AgendaItem[]>([]);
    const [actions, setActions] = useState<ActionRow[]>([]);
    const [loadError, setLoadError] = useState('');

    // filtros
    const [meetingFilter, setMeetingFilter] = useState<'proximas' | 'anteriores' | 'todas'>('proximas');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ItemCategory | ''>('');
    const [actionFilter, setActionFilter] = useState<'abertas' | 'atrasadas' | 'concluidas' | 'todas'>('abertas');
    const [responsibleFilter, setResponsibleFilter] = useState('');

    // modais
    const [meetingModal, setMeetingModal] = useState(false);
    const [inviteBoard, setInviteBoard] = useState(true);
    const [pickedBacklog, setPickedBacklog] = useState<Set<string>>(new Set());
    const [itemModal, setItemModal] = useState<{ open: boolean; item: AgendaItem | null }>({ open: false, item: null });
    const [actionModal, setActionModal] = useState<{ open: boolean; action: ActionItem | null }>({ open: false, action: null });
    const [moveItem, setMoveItem] = useState<AgendaItem | null>(null);
    const [moveTarget, setMoveTarget] = useState('');
    const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => Promise<void> } | null>(null);

    const load = useCallback(async () => {
        const [m, b, a] = await Promise.all([
            supabase.from('board_meetings').select('*, board_agenda_items(id, status, duration_minutes)').order('meeting_date', { ascending: false }),
            supabase.from('board_agenda_items').select('*').is('meeting_id', null),
            supabase.from('board_action_items').select('*, board_meetings(id, title, meeting_date)').order('due_date', { ascending: true, nullsFirst: false }),
        ]);
        const err = m.error || b.error || a.error;
        if (err) {
            setLoadError(err.message.includes('does not exist') || err.code === '42P01'
                ? 'As tabelas de reuniões ainda não existem no banco. Rode a migração supabase/migrations/009_board_meetings.sql no SQL Editor do Supabase.'
                : err.message);
        } else {
            setLoadError('');
        }
        setMeetings((m.data as MeetingRow[]) ?? []);
        setBacklog(((b.data as AgendaItem[]) ?? []).sort(sortByPriority));
        setActions((a.data as ActionRow[]) ?? []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => { load(); }, [load]);

    // ------------------------------------------------------------ derivados
    const now = Date.now();
    const upcoming = meetings
        .filter(m => new Date(m.meeting_date).getTime() >= now - 3 * 3600000 && m.status !== 'cancelada' && m.status !== 'realizada')
        .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
    const nextMeeting = upcoming[0] ?? null;
    const openActions = actions.filter(a => a.status === 'pendente' || a.status === 'em_andamento');
    const overdueActions = actions.filter(isOverdue);
    const year = new Date().getFullYear();
    const heldThisYear = meetings.filter(m => m.status === 'realizada' && new Date(m.meeting_date).getFullYear() === year).length;

    const visibleMeetings = meetings.filter(m => {
        const isUpcoming = upcoming.includes(m);
        if (meetingFilter === 'proximas' && !isUpcoming) return false;
        if (meetingFilter === 'anteriores' && isUpcoming) return false;
        if (search && !`${m.title} ${m.objective ?? ''} ${m.location ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });
    if (meetingFilter === 'proximas') visibleMeetings.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));

    const visibleBacklog = backlog.filter(i => !categoryFilter || i.category === categoryFilter);

    const visibleActions = actions.filter(a => {
        if (responsibleFilter && a.responsible_id !== responsibleFilter) return false;
        if (actionFilter === 'abertas') return a.status === 'pendente' || a.status === 'em_andamento';
        if (actionFilter === 'atrasadas') return isOverdue(a);
        if (actionFilter === 'concluidas') return a.status === 'concluida';
        return true;
    });

    // ------------------------------------------------------------ ações
    function fail(msg: string, e: { message: string } | null) {
        if (!e) return false;
        toast.error(`${msg}: ${e.message}`);
        return true;
    }

    async function createMeeting(values: Parameters<React.ComponentProps<typeof MeetingFormModal>['onSubmit']>[0]) {
        const { data, error } = await supabase.from('board_meetings').insert({
            ...values,
            location: values.location || null,
            meeting_link: values.meeting_link || null,
            objective: values.objective || null,
        }).select('id').single();
        if (fail('Erro ao criar reunião', error) || !data) return false;

        const board = members.filter(m => m.isBoard);
        if (inviteBoard && board.length) {
            const { error: e } = await supabase.from('board_meeting_attendees')
                .insert(board.map(m => ({ meeting_id: data.id, member_id: m.id })));
            fail('Reunião criada, mas houve erro ao convidar a diretoria', e);
        }
        const picked = backlog.filter(i => pickedBacklog.has(i.id)).sort(sortByPriority);
        for (let i = 0; i < picked.length; i++) {
            await supabase.from('board_agenda_items').update({ meeting_id: data.id, position: i + 1 }).eq('id', picked[i].id);
        }
        toast.success('Reunião criada');
        router.push(`/admin/reunioes/${data.id}`);
        return true;
    }

    async function saveBacklogItem(v: AgendaItemValues) {
        const payload = {
            title: v.title, description: v.description || null, category: v.category, priority: v.priority,
            item_type: v.item_type, presenter_id: v.presenter_id, duration_minutes: v.duration_minutes,
        };
        const { error } = itemModal.item
            ? await supabase.from('board_agenda_items').update(payload).eq('id', itemModal.item.id)
            : await supabase.from('board_agenda_items').insert({ ...payload, meeting_id: null });
        if (fail('Erro ao salvar pauta', error)) return false;
        toast.success(itemModal.item ? 'Pauta atualizada' : 'Pauta adicionada ao banco');
        load();
        return true;
    }

    async function moveToMeeting() {
        if (!moveItem || !moveTarget) return;
        const { data: last } = await supabase.from('board_agenda_items').select('position')
            .eq('meeting_id', moveTarget).order('position', { ascending: false }).limit(1).maybeSingle();
        const { error } = await supabase.from('board_agenda_items')
            .update({ meeting_id: moveTarget, position: (last?.position ?? 0) + 1, status: 'pendente' })
            .eq('id', moveItem.id);
        if (fail('Erro ao mover pauta', error)) return;
        toast.success('Pauta incluída na reunião');
        setMoveItem(null);
        load();
    }

    async function saveAction(v: ActionValues) {
        const payload = {
            description: v.description, responsible_id: v.responsible_id, due_date: v.due_date, status: v.status,
            completed_at: v.status === 'concluida' ? (actionModal.action?.completed_at ?? new Date().toISOString()) : null,
        };
        const { error } = actionModal.action
            ? await supabase.from('board_action_items').update(payload).eq('id', actionModal.action.id)
            : await supabase.from('board_action_items').insert({ ...payload, meeting_id: null });
        if (fail('Erro ao salvar encaminhamento', error)) return false;
        toast.success('Encaminhamento salvo');
        load();
        return true;
    }

    async function toggleAction(a: ActionItem) {
        const done = a.status !== 'concluida';
        const { error } = await supabase.from('board_action_items')
            .update({ status: done ? 'concluida' : 'pendente', completed_at: done ? new Date().toISOString() : null })
            .eq('id', a.id);
        if (fail('Erro ao atualizar', error)) return;
        load();
    }

    // ------------------------------------------------------------ UI
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pl-12 lg:pl-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="text-[#af1c15]" size={26} />
                        Pautas de Reunião
                    </h1>
                    <p className="text-gray-500 mt-1">Organize as reuniões da diretoria, as pautas, decisões e o que ficou de ser feito.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setTab('banco'); setItemModal({ open: true, item: null }); }}>
                        <Plus size={16} className="mr-1" /> Sugerir pauta
                    </Button>
                    <Button onClick={() => { setPickedBacklog(new Set()); setInviteBoard(true); setMeetingModal(true); }}>
                        <CalendarPlus size={16} className="mr-1" /> Nova reunião
                    </Button>
                </div>
            </div>

            {loadError && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-sm text-amber-900">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {loadError}
                </div>
            )}

            {/* Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><CalendarClock size={15} /> Próxima reunião</div>
                    {nextMeeting ? (
                        <Link href={`/admin/reunioes/${nextMeeting.id}`} className="block group">
                            <p className="text-lg font-bold text-gray-900 group-hover:text-[#af1c15] truncate">{nextMeeting.title}</p>
                            <p className="text-xs text-gray-500 capitalize">{formatDateLong(nextMeeting.meeting_date)} · {formatTime(nextMeeting.meeting_date)}</p>
                        </Link>
                    ) : <p className="text-lg font-semibold text-gray-400">Nenhuma agendada</p>}
                </div>
                <StatCard icon={<Inbox size={15} />} label="Pautas no banco" value={backlog.length}
                    hint={`${backlog.filter(b => b.priority === 'urgente' || b.priority === 'alta').length} alta prioridade`} />
                <StatCard icon={<ListTodo size={15} />} label="Encaminhamentos abertos" value={openActions.length}
                    hint={overdueActions.length ? `${overdueActions.length} atrasado(s)` : 'Nenhum atrasado'} danger={overdueActions.length > 0} />
                <StatCard icon={<CheckCircle2 size={15} />} label={`Reuniões em ${year}`} value={heldThisYear} hint="realizadas" />
            </div>

            {/* Abas */}
            <div className="border-b border-gray-200 flex gap-1 overflow-x-auto">
                {([
                    ['reunioes', 'Reuniões', meetings.length],
                    ['banco', 'Banco de pautas', backlog.length],
                    ['encaminhamentos', 'Encaminhamentos', openActions.length],
                ] as const).map(([k, l, n]) => (
                    <button key={k} onClick={() => setTab(k)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === k ? 'border-[#af1c15] text-[#af1c15]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        {l} <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{n}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-16 text-center text-gray-400">Carregando...</div>
            ) : tab === 'reunioes' ? (
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex rounded-lg border border-gray-300 bg-white p-1 text-sm">
                            {([['proximas', 'Próximas'], ['anteriores', 'Anteriores'], ['todas', 'Todas']] as const).map(([k, l]) => (
                                <button key={k} onClick={() => setMeetingFilter(k)}
                                    className={`px-3 py-1.5 rounded-md ${meetingFilter === k ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>
                            ))}
                        </div>
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input className={`${inputCls} pl-9`} placeholder="Buscar reunião..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>

                    {visibleMeetings.length === 0 ? (
                        <EmptyState icon={<CalendarClock size={28} />} title="Nenhuma reunião aqui"
                            text={meetingFilter === 'proximas' ? 'Agende a próxima reunião da diretoria.' : 'Nada encontrado com esse filtro.'} />
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {visibleMeetings.map(m => {
                                const items = m.board_agenda_items ?? [];
                                const decided = items.filter(i => i.status !== 'pendente').length;
                                const minutes = items.reduce((s, i) => s + (i.duration_minutes ?? 0), 0);
                                const mActions = actions.filter(a => a.meeting_id === m.id);
                                const mOpen = mActions.filter(a => a.status === 'pendente' || a.status === 'em_andamento').length;
                                return (
                                    <Link key={m.id} href={`/admin/reunioes/${m.id}`}
                                        className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-[#af1c15]/50 hover:shadow-md transition">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex gap-4 min-w-0">
                                                <div className="flex-shrink-0 w-14 text-center rounded-lg bg-slate-900 text-white py-1.5">
                                                    <div className="text-[10px] uppercase tracking-wide opacity-70">
                                                        {new Date(m.meeting_date).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}
                                                    </div>
                                                    <div className="text-xl font-bold leading-tight">
                                                        {new Date(m.meeting_date).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' })}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 group-hover:text-[#af1c15] truncate">{m.title}</p>
                                                    <p className="text-sm text-gray-500 flex items-center gap-3 flex-wrap mt-0.5">
                                                        <span className="flex items-center gap-1"><Clock size={13} />{formatTime(m.meeting_date)}</span>
                                                        <span className="flex items-center gap-1">
                                                            {m.format === 'online' ? <Video size={13} /> : <MapPin size={13} />}
                                                            {m.format === 'online' ? 'Online' : (m.location || MEETING_FORMAT[m.format])}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                            <Pill className={MEETING_STATUS[m.status].className}>{MEETING_STATUS[m.status].label}</Pill>
                                        </div>
                                        {m.objective && <p className="text-sm text-gray-600 mt-3 line-clamp-2">{m.objective}</p>}
                                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                            <span><strong className="text-gray-800">{items.length}</strong> pauta(s)</span>
                                            {items.length > 0 && <span><strong className="text-gray-800">{decided}</strong>/{items.length} tratadas</span>}
                                            {minutes > 0 && <span>~{formatDuration(minutes)}</span>}
                                            {mActions.length > 0 && <span><strong className="text-gray-800">{mOpen}</strong> encaminhamento(s) aberto(s)</span>}
                                            <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-[#af1c15]" />
                                        </div>
                                        {items.length > 0 && (
                                            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                <div className="h-full bg-green-500" style={{ width: `${(decided / items.length) * 100}%` }} />
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>
            ) : tab === 'banco' ? (
                <section className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                        O banco de pautas guarda assuntos que ainda não entraram em nenhuma reunião. Qualquer diretor pode sugerir;
                        na hora de montar a reunião, é só puxar daqui. Pautas adiadas voltam para cá.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <select className={`${inputCls} sm:w-56`} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as ItemCategory | '')}>
                            <option value="">Todas as categorias</option>
                            {Object.entries(ITEM_CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                        <Button onClick={() => setItemModal({ open: true, item: null })}><Plus size={16} className="mr-1" /> Nova pauta</Button>
                    </div>
                    {visibleBacklog.length === 0 ? (
                        <EmptyState icon={<Inbox size={28} />} title="Banco vazio" text="Nenhuma pauta aguardando reunião." />
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                            {visibleBacklog.map(i => (
                                <div key={i.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-gray-900">{i.title}</p>
                                            <Pill className={ITEM_PRIORITY[i.priority].className}>{ITEM_PRIORITY[i.priority].label}</Pill>
                                            <Pill className="bg-white text-gray-600 border-gray-200">{ITEM_CATEGORY[i.category]}</Pill>
                                            <Pill className="bg-white text-gray-500 border-gray-200">{ITEM_TYPE[i.item_type]}</Pill>
                                        </div>
                                        {i.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{i.description}</p>}
                                        <p className="text-xs text-gray-400 mt-1">
                                            Sugerida em {formatDateShort(i.created_at)}
                                            {memberName(i.presenter_id) && ` · apresenta: ${memberName(i.presenter_id)}`}
                                            {i.duration_minutes && ` · ${formatDuration(i.duration_minutes)}`}
                                            {i.decision && ' · tem histórico'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button size="sm" variant="outline" onClick={() => { setMoveItem(i); setMoveTarget(upcoming[0]?.id ?? ''); }}>
                                            <CalendarPlus size={14} className="mr-1" /> Levar p/ reunião
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setItemModal({ open: true, item: i })} aria-label="Editar"><Pencil size={15} /></Button>
                                        <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => setConfirm({
                                            title: 'Excluir pauta', message: `Excluir "${i.title}" do banco?`,
                                            run: async () => {
                                                const { error } = await supabase.from('board_agenda_items').delete().eq('id', i.id);
                                                if (!fail('Erro ao excluir', error)) { toast.success('Pauta excluída'); load(); }
                                            },
                                        })}><Trash2 size={15} className="text-red-600" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <section className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex rounded-lg border border-gray-300 bg-white p-1 text-sm overflow-x-auto">
                                {([['abertas', 'Abertas'], ['atrasadas', 'Atrasadas'], ['concluidas', 'Concluídas'], ['todas', 'Todas']] as const).map(([k, l]) => (
                                    <button key={k} onClick={() => setActionFilter(k)}
                                        className={`px-3 py-1.5 rounded-md whitespace-nowrap ${actionFilter === k ? 'bg-slate-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>
                                ))}
                            </div>
                            <select className={`${inputCls} sm:w-56`} value={responsibleFilter} onChange={e => setResponsibleFilter(e.target.value)}>
                                <option value="">Todos os responsáveis</option>
                                {members.filter(m => actions.some(a => a.responsible_id === m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <Button onClick={() => setActionModal({ open: true, action: null })}><Plus size={16} className="mr-1" /> Novo encaminhamento</Button>
                    </div>
                    {visibleActions.length === 0 ? (
                        <EmptyState icon={<ListTodo size={28} />} title="Nada por aqui" text="Nenhum encaminhamento com esse filtro." />
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                            {visibleActions.map(a => (
                                <ActionRowView key={a.id} action={a} responsible={memberName(a.responsible_id)}
                                    onToggle={() => toggleAction(a)}
                                    onEdit={() => setActionModal({ open: true, action: a })}
                                    onDelete={() => setConfirm({
                                        title: 'Excluir encaminhamento', message: 'Excluir este encaminhamento?',
                                        run: async () => {
                                            const { error } = await supabase.from('board_action_items').delete().eq('id', a.id);
                                            if (!fail('Erro ao excluir', error)) load();
                                        },
                                    })}
                                    meetingLink={a.board_meetings ? { href: `/admin/reunioes/${a.board_meetings.id}`, label: `${a.board_meetings.title} (${formatDateShort(a.board_meetings.meeting_date)})` } : null}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Modais */}
            <MeetingFormModal
                isOpen={meetingModal}
                onClose={() => setMeetingModal(false)}
                onSubmit={createMeeting}
                extra={<div className="space-y-3 border-t border-gray-100 pt-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={inviteBoard} onChange={e => setInviteBoard(e.target.checked)} className="accent-[#af1c15]" />
                        <Users size={15} /> Convidar a diretoria ({members.filter(m => m.isBoard).length})
                    </label>
                    {backlog.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Incluir pautas do banco</p>
                            <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-gray-200 p-2">
                                {backlog.map(i => (
                                    <label key={i.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-gray-50">
                                        <input type="checkbox" className="accent-[#af1c15]" checked={pickedBacklog.has(i.id)}
                                            onChange={e => {
                                                const s = new Set(pickedBacklog);
                                                if (e.target.checked) s.add(i.id); else s.delete(i.id);
                                                setPickedBacklog(s);
                                            }} />
                                        <span className="flex-1 truncate">{i.title}</span>
                                        <Pill className={ITEM_PRIORITY[i.priority].className}>{ITEM_PRIORITY[i.priority].label}</Pill>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>}
            />

            <AgendaItemModal isOpen={itemModal.open} item={itemModal.item} members={members} showOutcome={false}
                onClose={() => setItemModal({ open: false, item: null })} onSubmit={saveBacklogItem} />

            <ActionItemModal isOpen={actionModal.open} action={actionModal.action} members={members}
                onClose={() => setActionModal({ open: false, action: null })} onSubmit={saveAction} />

            <Modal isOpen={!!moveItem} onClose={() => setMoveItem(null)} title="Levar pauta para reunião" footer={<>
                <Button variant="outline" onClick={() => setMoveItem(null)}>Cancelar</Button>
                <Button onClick={moveToMeeting} disabled={!moveTarget}>Incluir</Button>
            </>}>
                {upcoming.length === 0 ? (
                    <p className="text-sm text-gray-600">Não há reunião futura agendada. Crie uma reunião primeiro.</p>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">&quot;{moveItem?.title}&quot; entra no fim da pauta da reunião escolhida.</p>
                        <select className={inputCls} value={moveTarget} onChange={e => setMoveTarget(e.target.value)}>
                            {upcoming.map(m => <option key={m.id} value={m.id}>{formatDateShort(m.meeting_date)} · {m.title}</option>)}
                        </select>
                    </div>
                )}
            </Modal>

            <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title ?? ''}
                message={confirm?.message ?? ''} onConfirm={async () => { await confirm?.run(); }} />
        </div>
    );
}

function StatCard({ icon, label, value, hint, danger }: { icon: React.ReactNode; label: string; value: number; hint: string; danger?: boolean }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">{icon} {label}</div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className={`text-xs mt-1 ${danger ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{hint}</p>
        </div>
    );
}

export function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">{icon}</div>
            <p className="font-semibold text-gray-700">{title}</p>
            <p className="text-sm text-gray-500 mt-1">{text}</p>
        </div>
    );
}

export function ActionRowView({ action: a, responsible, onToggle, onEdit, onDelete, meetingLink, note }: {
    action: ActionItem; responsible: string | null; onToggle: () => void; onEdit: () => void; onDelete: () => void;
    meetingLink?: { href: string; label: string } | null;
    note?: string | null;
}) {
    const overdue = isOverdue(a);
    const done = a.status === 'concluida';
    return (
        <div className="p-4 flex items-start gap-3">
            <input type="checkbox" checked={done} onChange={onToggle} className="mt-1 h-4 w-4 accent-green-600 cursor-pointer" aria-label="Concluir" />
            <div className="flex-1 min-w-0">
                <p className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{a.description}</p>
                <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-gray-500">
                    <Pill className={ACTION_STATUS[a.status].className}>{ACTION_STATUS[a.status].label}</Pill>
                    <span>{responsible ?? 'Sem responsável'}</span>
                    {a.due_date && (
                        <span className={overdue ? 'text-red-600 font-semibold' : ''}>
                            {overdue && '⚠ '}prazo {formatDueDate(a.due_date)}
                        </span>
                    )}
                    {meetingLink && <Link href={meetingLink.href} className="text-[#af1c15] hover:underline truncate">{meetingLink.label}</Link>}
                    {note && <span className="text-gray-400 truncate">{note}</span>}
                </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Editar"><Pencil size={15} /></Button>
                <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Excluir"><Trash2 size={15} className="text-red-600" /></Button>
            </div>
        </div>
    );
}
