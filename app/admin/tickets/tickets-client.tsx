'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, Trash2, MessageSquare, Inbox } from 'lucide-react';
import { deleteTicket, updateTicket } from '@/lib/tickets-actions';
import { TICKET_STATUSES, TICKET_TYPES, type Ticket, type TicketStatus, type TicketType } from '@/lib/tickets';

export type AdminTicket = Ticket & { members: { name: string; photo_url: string | null } | null };

export default function TicketsClient({ tickets }: { tickets: AdminTicket[] }) {
    const [statusFilter, setStatusFilter] = useState<TicketStatus | 'todos' | 'pendentes'>('pendentes');
    const [typeFilter, setTypeFilter] = useState<TicketType | 'todos'>('todos');

    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const t of tickets) c[t.status] = (c[t.status] ?? 0) + 1;
        return c;
    }, [tickets]);

    const filtered = tickets.filter(t => {
        if (typeFilter !== 'todos' && t.type !== typeFilter) return false;
        if (statusFilter === 'todos') return true;
        if (statusFilter === 'pendentes') return t.status === 'aberto' || t.status === 'em_andamento';
        return t.status === statusFilter;
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="text-[#af1c15]" /> Tickets
                </h1>
                <p className="text-gray-500 text-sm">Sugestões, bugs e reclamações enviados pelos jogadores.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(TICKET_STATUSES) as TicketStatus[]).map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`rounded-xl bg-white p-4 text-left shadow-sm ring-2 transition ${statusFilter === s ? 'ring-[#093a9f]' : 'ring-transparent hover:ring-gray-200'}`}
                    >
                        <p className="text-xs font-semibold uppercase text-gray-500">{TICKET_STATUSES[s].label}</p>
                        <p className="text-2xl font-bold text-gray-900">{counts[s] ?? 0}</p>
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-3 rounded-xl bg-white p-3 shadow-sm">
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                    <option value="pendentes">Pendentes (aberto + em andamento)</option>
                    <option value="todos">Todos os status</option>
                    {(Object.keys(TICKET_STATUSES) as TicketStatus[]).map(s => (
                        <option key={s} value={s}>{TICKET_STATUSES[s].label}</option>
                    ))}
                </select>
                <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                    <option value="todos">Todos os tipos</option>
                    {(Object.keys(TICKET_TYPES) as TicketType[]).map(t => (
                        <option key={t} value={t}>{TICKET_TYPES[t].emoji} {TICKET_TYPES[t].label}</option>
                    ))}
                </select>
                <span className="ml-auto self-center text-sm text-gray-500">{filtered.length} ticket(s)</span>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-white py-16 text-gray-400 shadow-sm">
                    <Inbox size={40} />
                    <p>Nenhum ticket aqui.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(t => <TicketCard key={t.id} ticket={t} />)}
                </div>
            )}
        </div>
    );
}

function TicketCard({ ticket }: { ticket: AdminTicket }) {
    const router = useRouter();
    const [status, setStatus] = useState<TicketStatus>(ticket.status);
    const [response, setResponse] = useState(ticket.admin_response ?? '');
    const [isPending, startTransition] = useTransition();
    const dirty = status !== ticket.status || response !== (ticket.admin_response ?? '');

    const save = () => startTransition(async () => {
        const res = await updateTicket(ticket.id, { status, adminResponse: response });
        if (res.error) return void toast.error(res.error);
        toast.success('Ticket atualizado');
        router.refresh();
    });

    const remove = () => {
        if (!confirm('Excluir este ticket? Essa ação não pode ser desfeita.')) return;
        startTransition(async () => {
            const res = await deleteTicket(ticket.id);
            if (res.error) return void toast.error(res.error);
            toast.success('Ticket excluído');
            router.refresh();
        });
    };

    return (
        <div className="rounded-xl bg-white p-4 md:p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TICKET_TYPES[ticket.type].color}`}>
                    {TICKET_TYPES[ticket.type].emoji} {TICKET_TYPES[ticket.type].label}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TICKET_STATUSES[ticket.status].color}`}>
                    {TICKET_STATUSES[ticket.status].label}
                </span>
                <span className="text-xs text-gray-500">
                    por <strong className="text-gray-700">{ticket.members?.name ?? 'Usuário sem integrante vinculado'}</strong>
                    {' · '}{new Date(ticket.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {ticket.page_url && <> · página <code className="text-gray-600">{ticket.page_url}</code></>}
                </span>
            </div>

            <div>
                <h3 className="font-bold text-gray-900">{ticket.title}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-start border-t pt-3">
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value as TicketStatus)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                    {(Object.keys(TICKET_STATUSES) as TicketStatus[]).map(s => (
                        <option key={s} value={s}>{TICKET_STATUSES[s].label}</option>
                    ))}
                </select>
                <textarea
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    rows={2}
                    maxLength={4000}
                    placeholder="Resposta para o jogador (ele vê em “Meus tickets”)"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
                />
                <div className="flex gap-2">
                    <button
                        onClick={save}
                        disabled={!dirty || isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-[#093a9f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b47c2] disabled:opacity-40"
                    >
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                    </button>
                    <button
                        onClick={remove}
                        disabled={isPending}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Excluir"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
