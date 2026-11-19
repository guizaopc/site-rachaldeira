'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    ArrowDown, ArrowLeft, ArrowUp, CalendarCheck, Check, Clock, Copy, ExternalLink, FileText, Inbox, ListPlus,
    ListTodo, MapPin, MessageCircle, Pencil, Play, Plus, Printer, Save, Trash2, Undo2, UserPlus, Users, Video,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
    ATTENDANCE, ITEM_CATEGORY, ITEM_PRIORITY, ITEM_STATUS, ITEM_TYPE, MEETING_FORMAT, MEETING_STATUS,
    formatDateLong, formatDateShort, formatDueDate, formatDuration, formatTime,
    type ActionItem, type AgendaItem, type AttendanceStatus, type Attendee, type BoardMember, type ItemStatus, type Meeting,
} from '@/lib/reunioes';
import {
    ActionItemModal, AgendaItemModal, ConfirmModal, MeetingFormModal, Pill, inputCls,
    type ActionValues, type AgendaItemValues,
} from '../components';
import { ActionRowView, EmptyState } from '../reunioes-client';

type Tab = 'pauta' | 'participantes' | 'encaminhamentos' | 'ata';
type PrevAction = ActionItem & { board_meetings: Pick<Meeting, 'id' | 'title' | 'meeting_date'> | null };

export default function MeetingDetailClient({ meetingId, members }: { meetingId: string; members: BoardMember[] }) {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();
    const memberName = useCallback((id: string | null) => members.find(m => m.id === id)?.name ?? null, [members]);

    const [loading, setLoading] = useState(true);
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [items, setItems] = useState<AgendaItem[]>([]);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [backlog, setBacklog] = useState<AgendaItem[]>([]);
    const [prevActions, setPrevActions] = useState<PrevAction[]>([]);
    const [tab, setTab] = useState<Tab>('pauta');
    const [minutes, setMinutes] = useState('');
    const [minutesDirty, setMinutesDirty] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const [editMeeting, setEditMeeting] = useState(false);
    const [itemModal, setItemModal] = useState<{ open: boolean; item: AgendaItem | null }>({ open: false, item: null });
    const [actionModal, setActionModal] = useState<{ open: boolean; action: ActionItem | null; agendaItemId?: string | null }>({ open: false, action: null });
    const [backlogModal, setBacklogModal] = useState(false);
    const [pickedBacklog, setPickedBacklog] = useState<Set<string>>(new Set());
    const [closeModal, setCloseModal] = useState(false);
    const [returnUnresolved, setReturnUnresolved] = useState(true);
    const [markAbsent, setMarkAbsent] = useState(true);
    const [addMember, setAddMember] = useState('');
    const [confirm, setConfirm] = useState<{ title: string; message: string; label?: string; run: () => Promise<void> } | null>(null);

    const load = useCallback(async () => {
        const [m, i, at, ac, bl, pa] = await Promise.all([
            supabase.from('board_meetings').select('*').eq('id', meetingId).maybeSingle(),
            supabase.from('board_agenda_items').select('*').eq('meeting_id', meetingId).order('position').order('created_at'),
            supabase.from('board_meeting_attendees').select('*').eq('meeting_id', meetingId),
            supabase.from('board_action_items').select('*').eq('meeting_id', meetingId).order('created_at'),
            supabase.from('board_agenda_items').select('*').is('meeting_id', null),
            supabase.from('board_action_items').select('*, board_meetings(id, title, meeting_date)')
                .in('status', ['pendente', 'em_andamento']).or(`meeting_id.is.null,meeting_id.neq.${meetingId}`)
                .order('due_date', { ascending: true, nullsFirst: false }),
        ]);
        if (m.error) toast.error(m.error.message);
        setMeeting(m.data as Meeting | null);
        if (m.data && !minutesDirty) setMinutes((m.data as Meeting).minutes ?? '');
        setItems((i.data as AgendaItem[]) ?? []);
        setAttendees((at.data as Attendee[]) ?? []);
        setActions((ac.data as ActionItem[]) ?? []);
        setBacklog(((bl.data as AgendaItem[]) ?? []).sort((a, b) => ITEM_PRIORITY[b.priority].weight - ITEM_PRIORITY[a.priority].weight));
        setPrevActions((pa.data as PrevAction[]) ?? []);
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase, meetingId]);

    useEffect(() => { load(); }, [load]);

    // Avisa antes de sair com a ata sem salvar
    useEffect(() => {
        if (!minutesDirty) return;
        const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [minutesDirty]);

    function fail(msg: string, e: { message: string } | null) {
        if (!e) return false;
        toast.error(`${msg}: ${e.message}`);
        return true;
    }

    if (loading) return <div className="py-20 text-center text-gray-400">Carregando...</div>;
    if (!meeting) {
        return (
            <div className="py-20 text-center space-y-4">
                <p className="text-gray-600">Reunião não encontrada.</p>
                <Link href="/admin/reunioes" className="text-[#af1c15] hover:underline">Voltar para Pautas de Reunião</Link>
            </div>
        );
    }

    // ------------------------------------------------------------ derivados
    const totalMinutes = items.reduce((s, i) => s + (i.duration_minutes ?? 0), 0);
    const treated = items.filter(i => i.status !== 'pendente').length;
    const unresolved = items.filter(i => i.status === 'pendente' || i.status === 'adiado');
    const present = attendees.filter(a => a.attendance === 'presente').length;
    const live = meeting.status === 'em_andamento';
    const showOutcome = meeting.status === 'em_andamento' || meeting.status === 'realizada';
    const currentItemId = live ? items.find(i => i.status === 'pendente')?.id : undefined;
    const start = new Date(meeting.meeting_date).getTime();
    const endTime = totalMinutes ? formatTime(new Date(start + totalMinutes * 60000).toISOString()) : null;
    const sortedAttendees = [...attendees].sort((a, b) => (memberName(a.member_id) ?? '').localeCompare(memberName(b.member_id) ?? ''));

    // ------------------------------------------------------------ reunião
    async function saveMeeting(v: Parameters<React.ComponentProps<typeof MeetingFormModal>['onSubmit']>[0]) {
        const { error } = await supabase.from('board_meetings').update({
            ...v, location: v.location || null, meeting_link: v.meeting_link || null, objective: v.objective || null,
        }).eq('id', meetingId);
        if (fail('Erro ao salvar', error)) return false;
        toast.success('Reunião atualizada');
        load();
        return true;
    }

    async function setStatus(status: Meeting['status']) {
        const { error } = await supabase.from('board_meetings').update({ status }).eq('id', meetingId);
        if (fail('Erro ao atualizar status', error)) return;
        toast.success(`Reunião ${MEETING_STATUS[status].label.toLowerCase()}`);
        load();
    }

    async function closeMeeting() {
        if (returnUnresolved && unresolved.length) {
            const { error } = await supabase.from('board_agenda_items')
                .update({ meeting_id: null, status: 'pendente' })
                .in('id', unresolved.map(i => i.id));
            if (fail('Erro ao devolver pautas', error)) return;
        }
        if (markAbsent) {
            await supabase.from('board_meeting_attendees').update({ attendance: 'ausente' })
                .eq('meeting_id', meetingId).eq('attendance', 'convidado');
        }
        await saveMinutes(true);
        await setStatus('realizada');
        setCloseModal(false);
        setTab('ata');
    }

    async function saveMinutes(silent = false) {
        const { error } = await supabase.from('board_meetings').update({ minutes: minutes || null }).eq('id', meetingId);
        if (fail('Erro ao salvar ata', error)) return;
        setMinutesDirty(false);
        if (!silent) toast.success('Anotações salvas');
    }

    // ------------------------------------------------------------ pauta
    async function saveItem(v: AgendaItemValues) {
        const payload = {
            title: v.title, description: v.description || null, category: v.category, priority: v.priority,
            item_type: v.item_type, presenter_id: v.presenter_id, duration_minutes: v.duration_minutes,
            status: v.status, decision: v.decision || null,
            votes_for: v.votes_for, votes_against: v.votes_against, votes_abstain: v.votes_abstain,
        };
        const { error } = itemModal.item
            ? await supabase.from('board_agenda_items').update(payload).eq('id', itemModal.item.id)
            : await supabase.from('board_agenda_items').insert({
                ...payload, meeting_id: meetingId, position: (items.at(-1)?.position ?? items.length) + 1,
            });
        if (fail('Erro ao salvar pauta', error)) return false;
        toast.success('Pauta salva');
        load();
        return true;
    }

    async function quickStatus(item: AgendaItem, status: ItemStatus) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
        const { error } = await supabase.from('board_agenda_items').update({ status }).eq('id', item.id);
        if (fail('Erro ao atualizar', error)) load();
    }

    async function move(index: number, dir: -1 | 1) {
        const j = index + dir;
        if (j < 0 || j >= items.length) return;
        const next = [...items];
        [next[index], next[j]] = [next[j], next[index]];
        const renum = next.map((it, k) => ({ ...it, position: k + 1 }));
        setItems(renum);
        const changed = renum.filter((it, k) => items[k]?.id !== it.id || items[k]?.position !== it.position);
        const results = await Promise.all(changed.map(it =>
            supabase.from('board_agenda_items').update({ position: it.position }).eq('id', it.id)));
        const err = results.find(r => r.error)?.error ?? null;
        if (fail('Erro ao reordenar', err)) load();
    }

    async function sortByPriority() {
        const sorted = [...items].sort((a, b) =>
            ITEM_PRIORITY[b.priority].weight - ITEM_PRIORITY[a.priority].weight || a.position - b.position);
        const renum = sorted.map((it, k) => ({ ...it, position: k + 1 }));
        setItems(renum);
        await Promise.all(renum.map(it => supabase.from('board_agenda_items').update({ position: it.position }).eq('id', it.id)));
        toast.success('Pauta ordenada por prioridade');
    }

    async function addFromBacklog() {
        const picked = backlog.filter(b => pickedBacklog.has(b.id));
        const base = items.at(-1)?.position ?? items.length;
        const results = await Promise.all(picked.map((b, k) =>
            supabase.from('board_agenda_items').update({ meeting_id: meetingId, position: base + k + 1, status: 'pendente' }).eq('id', b.id)));
        const err = results.find(r => r.error)?.error ?? null;
        if (fail('Erro ao incluir pautas', err)) return;
        toast.success(`${picked.length} pauta(s) incluída(s)`);
        setBacklogModal(false);
        setPickedBacklog(new Set());
        load();
    }

    async function returnToBacklog(item: AgendaItem) {
        const { error } = await supabase.from('board_agenda_items').update({ meeting_id: null, status: 'pendente' }).eq('id', item.id);
        if (fail('Erro ao devolver', error)) return;
        toast.success('Pauta devolvida ao banco');
        load();
    }

    // ------------------------------------------------------------ participantes
    async function inviteBoard() {
        const missing = members.filter(m => m.isBoard && !attendees.some(a => a.member_id === m.id));
        if (!missing.length) return toast.info('Toda a diretoria já está na lista');
        const { error } = await supabase.from('board_meeting_attendees').insert(missing.map(m => ({ meeting_id: meetingId, member_id: m.id })));
        if (fail('Erro ao convidar', error)) return;
        toast.success(`${missing.length} diretor(es) adicionado(s)`);
        load();
    }

    async function addAttendee() {
        if (!addMember) return;
        const { error } = await supabase.from('board_meeting_attendees').insert({ meeting_id: meetingId, member_id: addMember });
        if (fail('Erro ao adicionar', error)) return;
        setAddMember('');
        load();
    }

    async function setAttendance(memberId: string, attendance: AttendanceStatus) {
        setAttendees(prev => prev.map(a => a.member_id === memberId ? { ...a, attendance } : a));
        const { error } = await supabase.from('board_meeting_attendees').update({ attendance })
            .eq('meeting_id', meetingId).eq('member_id', memberId);
        if (fail('Erro ao atualizar presença', error)) load();
    }

    async function removeAttendee(memberId: string) {
        const { error } = await supabase.from('board_meeting_attendees').delete().eq('meeting_id', meetingId).eq('member_id', memberId);
        if (!fail('Erro ao remover', error)) load();
    }

    // ------------------------------------------------------------ encaminhamentos
    async function saveAction(v: ActionValues) {
        const editing = actionModal.action;
        const payload = {
            description: v.description, responsible_id: v.responsible_id, due_date: v.due_date, status: v.status,
            agenda_item_id: v.agenda_item_id,
            completed_at: v.status === 'concluida' ? (editing?.completed_at ?? new Date().toISOString()) : null,
        };
        const { error } = editing
            ? await supabase.from('board_action_items').update(payload).eq('id', editing.id)
            : await supabase.from('board_action_items').insert({ ...payload, meeting_id: meetingId });
        if (fail('Erro ao salvar encaminhamento', error)) return false;
        toast.success('Encaminhamento salvo');
        load();
        return true;
    }

    async function toggleAction(a: ActionItem) {
        const done = a.status !== 'concluida';
        const { error } = await supabase.from('board_action_items')
            .update({ status: done ? 'concluida' : 'pendente', completed_at: done ? new Date().toISOString() : null }).eq('id', a.id);
        if (!fail('Erro ao atualizar', error)) load();
    }

    // ------------------------------------------------------------ textos
    function placeText() {
        if (meeting!.format === 'online') return meeting!.meeting_link ? `Online: ${meeting!.meeting_link}` : 'Online';
        const parts = [meeting!.location, meeting!.format === 'hibrida' && meeting!.meeting_link ? `ou online: ${meeting!.meeting_link}` : null];
        return parts.filter(Boolean).join(' ') || MEETING_FORMAT[meeting!.format];
    }

    function inviteText() {
        const lines = [
            `*REUNIÃO DA DIRETORIA*`,
            `*${meeting!.title}*`,
            '',
            `📅 ${formatDateLong(meeting!.meeting_date)}`,
            `🕐 ${formatTime(meeting!.meeting_date)}${endTime ? ` às ${endTime} (previsão)` : ''}`,
            `📍 ${placeText()}`,
        ];
        if (meeting!.objective) lines.push('', `🎯 *Objetivo:* ${meeting!.objective}`);
        if (items.length) {
            lines.push('', '*PAUTA*');
            items.forEach((it, k) => {
                const extra = [memberName(it.presenter_id), it.duration_minutes ? formatDuration(it.duration_minutes) : null].filter(Boolean).join(', ');
                lines.push(`${k + 1}. ${it.title}${extra ? ` _(${extra})_` : ''}`);
            });
        }
        lines.push('', 'Confirme sua presença! ⚽');
        return lines.join('\n');
    }

    function ataText() {
        const by = (s: AttendanceStatus) => sortedAttendees.filter(a => a.attendance === s).map(a => memberName(a.member_id)).filter(Boolean).join(', ');
        const lines = [
            `ATA DA REUNIÃO DA DIRETORIA`,
            meeting!.title,
            `${formatDateLong(meeting!.meeting_date)}, ${formatTime(meeting!.meeting_date)} · ${placeText()}`,
            '',
            `PRESENTES: ${by('presente') || '—'}`,
        ];
        if (by('justificado')) lines.push(`AUSÊNCIAS JUSTIFICADAS: ${by('justificado')}`);
        if (by('ausente')) lines.push(`AUSENTES: ${by('ausente')}`);
        if (meeting!.objective) lines.push('', `OBJETIVO: ${meeting!.objective}`);
        lines.push('', 'PAUTAS E DELIBERAÇÕES');
        items.forEach((it, k) => {
            lines.push('', `${k + 1}. ${it.title} [${ITEM_STATUS[it.status].label}]`);
            if (it.description) lines.push(`   Contexto: ${it.description}`);
            if (it.decision) lines.push(`   Decisão: ${it.decision}`);
            if (it.votes_for != null || it.votes_against != null || it.votes_abstain != null) {
                lines.push(`   Votação: ${it.votes_for ?? 0} a favor, ${it.votes_against ?? 0} contra, ${it.votes_abstain ?? 0} abstenção(ões)`);
            }
        });
        if (actions.length) {
            lines.push('', 'ENCAMINHAMENTOS');
            actions.forEach(a => {
                lines.push(`- ${a.description} — ${memberName(a.responsible_id) ?? 'a definir'}${a.due_date ? `, até ${formatDueDate(a.due_date)}` : ''}`);
            });
        }
        if (minutes.trim()) lines.push('', 'OBSERVAÇÕES', minutes.trim());
        return lines.join('\n');
    }

    async function copy(text: string, what: string) {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${what} copiado`);
        } catch {
            toast.error('Não foi possível copiar');
        }
    }

    function printAta() {
        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const w = window.open('', '_blank');
        if (!w) return toast.error('Libere pop-ups para imprimir');
        w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ata - ${esc(meeting!.title)}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.55}
pre{white-space:pre-wrap;font-family:inherit;font-size:14px}.sign{margin-top:64px;display:flex;gap:48px}
.sign div{flex:1;border-top:1px solid #333;padding-top:6px;text-align:center;font-size:12px}</style></head>
<body><pre>${esc(ataText())}</pre><div class="sign"><div>Presidente</div><div>Secretário(a)</div></div>
<script>window.onload=()=>window.print()</script></body></html>`);
        w.document.close();
    }

    // ------------------------------------------------------------ UI
    const agendaForActions = items;
    const tabs: [Tab, string, number | null][] = [
        ['pauta', 'Pauta', items.length],
        ['participantes', 'Participantes', attendees.length],
        ['encaminhamentos', 'Encaminhamentos', actions.length],
        ['ata', 'Ata', null],
    ];

    return (
        <div className="space-y-6">
            <Link href="/admin/reunioes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 pl-12 lg:pl-0">
                <ArrowLeft size={16} /> Pautas de Reunião
            </Link>

            {/* Cabeçalho */}
            <div className={`bg-white rounded-xl border p-6 ${live ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
                            <Pill className={MEETING_STATUS[meeting.status].className}>
                                {live && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                {MEETING_STATUS[meeting.status].label}
                            </Pill>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
                            <span className="capitalize flex items-center gap-1"><CalendarCheck size={15} /> {formatDateLong(meeting.meeting_date)}</span>
                            <span className="flex items-center gap-1"><Clock size={15} /> {formatTime(meeting.meeting_date)}{endTime && ` – ${endTime}`}</span>
                            <span className="flex items-center gap-1">
                                {meeting.format === 'online' ? <Video size={15} /> : <MapPin size={15} />}
                                {meeting.format === 'online' ? 'Online' : (meeting.location || MEETING_FORMAT[meeting.format])}
                                {meeting.format === 'hibrida' && ' + online'}
                            </span>
                            {meeting.meeting_link && (
                                <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#af1c15] hover:underline">
                                    <ExternalLink size={14} /> Entrar na chamada
                                </a>
                            )}
                        </div>
                        {meeting.objective && <p className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-md p-3"><strong>Objetivo:</strong> {meeting.objective}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end flex-shrink-0">
                        {(meeting.status === 'agendada' || meeting.status === 'rascunho') && (
                            <Button onClick={() => setStatus('em_andamento')}><Play size={15} className="mr-1" /> Iniciar reunião</Button>
                        )}
                        {live && <Button onClick={() => setCloseModal(true)}><Check size={15} className="mr-1" /> Encerrar reunião</Button>}
                        {meeting.status === 'realizada' && (
                            <Button variant="outline" onClick={() => setStatus('em_andamento')}><Undo2 size={15} className="mr-1" /> Reabrir</Button>
                        )}
                        <Button variant="outline" onClick={() => copy(inviteText(), 'Convite')}><MessageCircle size={15} className="mr-1" /> Convite WhatsApp</Button>
                        <Button variant="outline" onClick={() => setEditMeeting(true)}><Pencil size={15} className="mr-1" /> Editar</Button>
                        <Button variant="ghost" aria-label="Excluir reunião" onClick={() => setConfirm({
                            title: 'Excluir reunião',
                            message: 'A reunião, participantes e encaminhamentos serão apagados. As pautas voltam para o banco de pautas.',
                            run: async () => {
                                const { error } = await supabase.from('board_meetings').delete().eq('id', meetingId);
                                if (!fail('Erro ao excluir', error)) { toast.success('Reunião excluída'); router.push('/admin/reunioes'); }
                            },
                        })}><Trash2 size={16} className="text-red-600" /></Button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniStat label="Pautas" value={String(items.length)} />
                    <MiniStat label="Tratadas" value={`${treated}/${items.length}`} />
                    <MiniStat label="Duração prevista" value={totalMinutes ? formatDuration(totalMinutes) : '—'} />
                    <MiniStat label="Presença" value={attendees.length ? `${present}/${attendees.length}` : '—'} />
                </div>
            </div>

            {/* Abas */}
            <div className="border-b border-gray-200 flex gap-1 overflow-x-auto">
                {tabs.map(([k, l, n]) => (
                    <button key={k} onClick={() => setTab(k)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === k ? 'border-[#af1c15] text-[#af1c15]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        {l} {n !== null && <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{n}</span>}
                    </button>
                ))}
            </div>

            {tab === 'pauta' && (
                <section className="space-y-4">
                    <div className="flex flex-wrap gap-2 justify-end">
                        {items.length > 1 && <Button variant="ghost" size="sm" onClick={sortByPriority}>Ordenar por prioridade</Button>}
                        <Button variant="outline" onClick={() => { setPickedBacklog(new Set()); setBacklogModal(true); }}>
                            <Inbox size={15} className="mr-1" /> Do banco ({backlog.length})
                        </Button>
                        <Button onClick={() => setItemModal({ open: true, item: null })}><Plus size={15} className="mr-1" /> Nova pauta</Button>
                    </div>

                    {items.length === 0 ? (
                        <EmptyState icon={<ListPlus size={28} />} title="Pauta vazia" text="Adicione assuntos novos ou puxe do banco de pautas." />
                    ) : (
                        <ol className="space-y-3">
                            {items.map((it, idx) => {
                                const offset = items.slice(0, idx).reduce((s, x) => s + (x.duration_minutes ?? 0), 0);
                                const startAt = formatTime(new Date(start + offset * 60000).toISOString());
                                const isCurrent = it.id === currentItemId;
                                const itemActions = actions.filter(a => a.agenda_item_id === it.id);
                                const open = expanded.has(it.id);
                                return (
                                    <li key={it.id} className={`bg-white rounded-xl border p-4 transition ${isCurrent ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                                <button className="text-gray-300 hover:text-gray-700 disabled:opacity-30" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Subir"><ArrowUp size={16} /></button>
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${it.status === 'pendente' ? 'bg-slate-900 text-white' : 'bg-green-100 text-green-800'}`}>{idx + 1}</span>
                                                <button className="text-gray-300 hover:text-gray-700 disabled:opacity-30" disabled={idx === items.length - 1} onClick={() => move(idx, 1)} aria-label="Descer"><ArrowDown size={16} /></button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <button className="text-left min-w-0" onClick={() => {
                                                        const s = new Set(expanded); if (open) s.delete(it.id); else s.add(it.id); setExpanded(s);
                                                    }}>
                                                        {isCurrent && <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Em discussão agora</p>}
                                                        <p className="font-semibold text-gray-900">{it.title}</p>
                                                    </button>
                                                    <Pill className={ITEM_STATUS[it.status].className}>{ITEM_STATUS[it.status].label}</Pill>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-gray-500">
                                                    <Pill className={ITEM_PRIORITY[it.priority].className}>{ITEM_PRIORITY[it.priority].label}</Pill>
                                                    <Pill className="bg-white text-gray-600 border-gray-200">{ITEM_CATEGORY[it.category]}</Pill>
                                                    <Pill className="bg-white text-gray-500 border-gray-200">{ITEM_TYPE[it.item_type]}</Pill>
                                                    <span className="flex items-center gap-1"><Clock size={12} />{startAt}{it.duration_minutes ? ` · ${formatDuration(it.duration_minutes)}` : ''}</span>
                                                    {memberName(it.presenter_id) && <span>🎤 {memberName(it.presenter_id)}</span>}
                                                    {itemActions.length > 0 && <span className="flex items-center gap-1"><ListTodo size={12} />{itemActions.length}</span>}
                                                </div>

                                                {(open || isCurrent) && it.description && (
                                                    <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{it.description}</p>
                                                )}
                                                {it.decision && (
                                                    <div className="mt-3 rounded-md bg-green-50 border border-green-100 p-3 text-sm text-green-900 whitespace-pre-wrap">
                                                        <strong>Decisão:</strong> {it.decision}
                                                        {(it.votes_for != null || it.votes_against != null) && (
                                                            <span className="block text-xs mt-1 text-green-800">
                                                                Votação: {it.votes_for ?? 0} a favor · {it.votes_against ?? 0} contra · {it.votes_abstain ?? 0} abst.
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {(open || isCurrent) && itemActions.length > 0 && (
                                                    <ul className="mt-3 space-y-1 text-sm">
                                                        {itemActions.map(a => (
                                                            <li key={a.id} className="flex gap-2 text-gray-700">
                                                                <span>{a.status === 'concluida' ? '✅' : '▫️'}</span>
                                                                <span>{a.description} <span className="text-gray-400">— {memberName(a.responsible_id) ?? 'a definir'}</span></span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                                    {showOutcome && (['discutido', 'aprovado', 'rejeitado', 'adiado'] as ItemStatus[]).map(s => (
                                                        <button key={s} onClick={() => quickStatus(it, it.status === s ? 'pendente' : s)}
                                                            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${it.status === s ? ITEM_STATUS[s].className : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                            {ITEM_STATUS[s].label}
                                                        </button>
                                                    ))}
                                                    <span className="flex-1" />
                                                    <Button size="sm" variant="ghost" onClick={() => setItemModal({ open: true, item: it })}>
                                                        <Pencil size={14} className="mr-1" /> {showOutcome ? 'Registrar decisão' : 'Editar'}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setActionModal({ open: true, action: null, agendaItemId: it.id })}>
                                                        <ListTodo size={14} className="mr-1" /> Tarefa
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => returnToBacklog(it)} aria-label="Devolver ao banco" title="Devolver ao banco">
                                                        <Undo2 size={14} />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" aria-label="Excluir pauta" onClick={() => setConfirm({
                                                        title: 'Excluir pauta', message: `Excluir "${it.title}" definitivamente? (Para adiar, use "devolver ao banco".)`,
                                                        run: async () => {
                                                            const { error } = await supabase.from('board_agenda_items').delete().eq('id', it.id);
                                                            if (!fail('Erro ao excluir', error)) load();
                                                        },
                                                    })}><Trash2 size={14} className="text-red-600" /></Button>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>
            )}

            {tab === 'participantes' && (
                <section className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row gap-3 md:items-center">
                        <select className={`${inputCls} md:flex-1`} value={addMember} onChange={e => setAddMember(e.target.value)}>
                            <option value="">Adicionar participante...</option>
                            {members.filter(m => !attendees.some(a => a.member_id === m.id)).map(m => (
                                <option key={m.id} value={m.id}>{m.name}{m.isBoard ? ' (diretoria)' : ''}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <Button onClick={addAttendee} disabled={!addMember}><UserPlus size={15} className="mr-1" /> Adicionar</Button>
                            <Button variant="outline" onClick={inviteBoard}><Users size={15} className="mr-1" /> Convidar diretoria</Button>
                        </div>
                    </div>
                    {attendees.length > 0 && (
                        <div className="flex flex-wrap gap-3 text-sm">
                            {(Object.keys(ATTENDANCE) as AttendanceStatus[]).map(s => (
                                <span key={s} className={`rounded-md px-3 py-1 ${ATTENDANCE[s].className}`}>
                                    {ATTENDANCE[s].label}: <strong>{attendees.filter(a => a.attendance === s).length}</strong>
                                </span>
                            ))}
                            {live && attendees.some(a => a.attendance === 'convidado') && (
                                <button className="text-[#af1c15] hover:underline" onClick={async () => {
                                    await supabase.from('board_meeting_attendees').update({ attendance: 'presente' })
                                        .eq('meeting_id', meetingId).eq('attendance', 'convidado');
                                    load();
                                }}>Marcar todos como presentes</button>
                            )}
                        </div>
                    )}
                    {attendees.length === 0 ? (
                        <EmptyState icon={<Users size={28} />} title="Ninguém convidado" text='Use "Convidar diretoria" ou adicione integrantes um a um.' />
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                            {sortedAttendees.map(a => {
                                const m = members.find(x => x.id === a.member_id);
                                return (
                                    <div key={a.member_id} className="p-3 flex items-center gap-3">
                                        {m?.photo_url
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={m.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                                            : <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">{(m?.name ?? '?')[0]}</div>}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{m?.name ?? 'Integrante removido'}</p>
                                            {m?.isBoard && <p className="text-xs text-gray-400">Diretoria</p>}
                                        </div>
                                        <div className="flex gap-1 flex-wrap justify-end">
                                            {(['presente', 'ausente', 'justificado'] as AttendanceStatus[]).map(s => (
                                                <button key={s} onClick={() => setAttendance(a.member_id, a.attendance === s ? 'convidado' : s)}
                                                    className={`rounded-md px-2.5 py-1 text-xs font-medium border transition ${a.attendance === s ? ATTENDANCE[s].className + ' border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                    {ATTENDANCE[s].label}
                                                </button>
                                            ))}
                                            <Button size="sm" variant="ghost" onClick={() => removeAttendee(a.member_id)} aria-label="Remover"><Trash2 size={14} className="text-red-600" /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {tab === 'encaminhamentos' && (
                <section className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800">Desta reunião</h2>
                            <Button onClick={() => setActionModal({ open: true, action: null })}><Plus size={15} className="mr-1" /> Novo encaminhamento</Button>
                        </div>
                        {actions.length === 0 ? (
                            <EmptyState icon={<ListTodo size={28} />} title="Sem encaminhamentos" text="Registre quem ficou responsável por quê, e até quando." />
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                                {actions.map(a => (
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
                                        note={a.agenda_item_id ? `Pauta: ${items.find(i => i.id === a.agenda_item_id)?.title ?? '—'}` : null}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {prevActions.length > 0 && (
                        <div className="space-y-3">
                            <div>
                                <h2 className="font-semibold text-gray-800">Pendências de outras reuniões ({prevActions.length})</h2>
                                <p className="text-sm text-gray-500">Bom para cobrar na abertura da reunião.</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                                {prevActions.map(a => (
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
                        </div>
                    )}
                </section>
            )}

            {tab === 'ata' && (
                <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><FileText size={17} /> Anotações livres</h2>
                            <Button size="sm" onClick={() => saveMinutes()} disabled={!minutesDirty}>
                                <Save size={14} className="mr-1" /> {minutesDirty ? 'Salvar' : 'Salvo'}
                            </Button>
                        </div>
                        <textarea className={`${inputCls} min-h-[360px] font-mono text-[13px]`} value={minutes} maxLength={50000}
                            placeholder="Anote aqui o que for falado: informes, falas importantes, observações gerais..."
                            onChange={e => { setMinutes(e.target.value); setMinutesDirty(true); }} />
                        <p className="text-xs text-gray-400">As decisões de cada pauta são registradas na aba Pauta e entram automaticamente na ata.</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h2 className="font-semibold text-gray-800">Prévia da ata</h2>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => copy(ataText(), 'Texto da ata')}><Copy size={14} className="mr-1" /> Copiar</Button>
                                <Button size="sm" variant="outline" onClick={printAta}><Printer size={14} className="mr-1" /> Imprimir / PDF</Button>
                            </div>
                        </div>
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded-md p-4 max-h-[520px] overflow-y-auto font-serif leading-relaxed">{ataText()}</pre>
                    </div>
                </section>
            )}

            {/* Modais */}
            <MeetingFormModal isOpen={editMeeting} onClose={() => setEditMeeting(false)} meeting={meeting} onSubmit={saveMeeting} />

            <AgendaItemModal isOpen={itemModal.open} item={itemModal.item} members={members} showOutcome={showOutcome || !!itemModal.item?.decision}
                onClose={() => setItemModal({ open: false, item: null })} onSubmit={saveItem} />

            <ActionItemModal isOpen={actionModal.open} members={members} agendaItems={agendaForActions}
                action={actionModal.action} defaultAgendaItemId={actionModal.agendaItemId ?? null}
                onClose={() => setActionModal({ open: false, action: null })}
                onSubmit={saveAction} />

            <Modal isOpen={backlogModal} onClose={() => setBacklogModal(false)} title="Incluir pautas do banco" footer={<>
                <Button variant="outline" onClick={() => setBacklogModal(false)}>Cancelar</Button>
                <Button onClick={addFromBacklog} disabled={!pickedBacklog.size}>Incluir {pickedBacklog.size || ''}</Button>
            </>}>
                {backlog.length === 0 ? (
                    <p className="text-sm text-gray-600">O banco de pautas está vazio.</p>
                ) : (
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                        {backlog.map(b => (
                            <label key={b.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                                <input type="checkbox" className="mt-1 accent-[#af1c15]" checked={pickedBacklog.has(b.id)} onChange={e => {
                                    const s = new Set(pickedBacklog); if (e.target.checked) s.add(b.id); else s.delete(b.id); setPickedBacklog(s);
                                }} />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{b.title}</p>
                                    <div className="flex gap-1.5 mt-1 flex-wrap">
                                        <Pill className={ITEM_PRIORITY[b.priority].className}>{ITEM_PRIORITY[b.priority].label}</Pill>
                                        <Pill className="bg-white text-gray-600 border-gray-200">{ITEM_CATEGORY[b.category]}</Pill>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </Modal>

            <Modal isOpen={closeModal} onClose={() => setCloseModal(false)} title="Encerrar reunião" footer={<>
                <Button variant="outline" onClick={() => setCloseModal(false)}>Cancelar</Button>
                <Button onClick={closeMeeting}>Encerrar</Button>
            </>}>
                <div className="space-y-4 text-sm text-gray-700">
                    <p>{treated} de {items.length} pauta(s) tratada(s) · {actions.length} encaminhamento(s) registrado(s).</p>
                    {unresolved.length > 0 && (
                        <label className="flex items-start gap-2">
                            <input type="checkbox" className="mt-0.5 accent-[#af1c15]" checked={returnUnresolved} onChange={e => setReturnUnresolved(e.target.checked)} />
                            <span>Devolver ao banco as {unresolved.length} pauta(s) pendente(s)/adiada(s):
                                <span className="block text-gray-500">{unresolved.map(u => u.title).join(' · ')}</span>
                            </span>
                        </label>
                    )}
                    {attendees.some(a => a.attendance === 'convidado') && (
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="accent-[#af1c15]" checked={markAbsent} onChange={e => setMarkAbsent(e.target.checked)} />
                            Marcar como ausente quem não teve presença registrada
                        </label>
                    )}
                </div>
            </Modal>

            <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title ?? ''}
                message={confirm?.message ?? ''} confirmLabel={confirm?.label} onConfirm={async () => { await confirm?.run(); }} />
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    );
}
