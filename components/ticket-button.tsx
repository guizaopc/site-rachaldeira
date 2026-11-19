'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, X, Loader2, Send, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { createTicket, getMyTickets } from '@/lib/tickets-actions';
import { TICKET_STATUSES, TICKET_TYPES, type Ticket, type TicketType } from '@/lib/tickets';

const HIDDEN_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/admin'];

export function TicketButton({ isLoggedIn }: { isLoggedIn: boolean }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'novo' | 'meus'>('novo');
    const [type, setType] = useState<TicketType>('sugestao');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [myTickets, setMyTickets] = useState<Ticket[] | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    useEffect(() => {
        if (open && tab === 'meus' && myTickets === null) {
            getMyTickets().then(setMyTickets).catch(() => setMyTickets([]));
        }
    }, [open, tab, myTickets]);

    if (!isLoggedIn || HIDDEN_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const res = await createTicket({ type, title, description, pageUrl: pathname });
            if (res.error) {
                toast.error(res.error);
                return;
            }
            toast.success('Ticket enviado! Valeu pelo feedback 🙌');
            setTitle('');
            setDescription('');
            setType('sugestao');
            setMyTickets(null);
            setTab('meus');
        });
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#af1c15] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/30 ring-2 ring-white/20 transition hover:bg-[#c62b23] hover:scale-105 print:hidden"
                aria-label="Abrir ticket: sugestão ou bug"
                title="Sugestão, bug ou reclamação"
            >
                <MessageSquarePlus size={20} />
                <span className="hidden sm:inline">Feedback</span>
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ticket-title"
                        onClick={e => e.stopPropagation()}
                        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200"
                    >
                        <div className="sticky top-0 z-10 bg-[#093a9f] text-white px-5 pt-4 pb-0 rounded-t-3xl">
                            <div className="flex items-center justify-between">
                                <h2 id="ticket-title" className="text-lg font-bold">Fale com a organização</h2>
                                <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-white/10" aria-label="Fechar">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-xs text-blue-100/80 mt-0.5">Sugestões, bugs no site, reclamações — tudo é bem-vindo.</p>
                            <div className="flex gap-1 mt-3">
                                {(['novo', 'meus'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors ${tab === t ? 'bg-white text-[#093a9f]' : 'text-blue-100 hover:bg-white/10'}`}
                                    >
                                        {t === 'novo' ? 'Novo ticket' : 'Meus tickets'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {tab === 'novo' ? (
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <span className="block text-sm font-semibold text-gray-700 mb-2">Tipo</span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {(Object.keys(TICKET_TYPES) as TicketType[]).map(key => (
                                            <button
                                                type="button"
                                                key={key}
                                                onClick={() => setType(key)}
                                                className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-2.5 text-xs font-semibold transition ${type === key ? 'border-[#093a9f] bg-blue-50 text-[#093a9f]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                            >
                                                <span className="text-xl">{TICKET_TYPES[key].emoji}</span>
                                                {TICKET_TYPES[key].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="ticket-title-input" className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                                    <input
                                        id="ticket-title-input"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        maxLength={120}
                                        required
                                        minLength={3}
                                        placeholder={type === 'bug' ? 'Ex.: Botão de presença não funciona' : 'Resumo em poucas palavras'}
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-[#093a9f] focus:outline-none focus:ring-2 focus:ring-[#093a9f]/20"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="ticket-desc-input" className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                                    <textarea
                                        id="ticket-desc-input"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        maxLength={4000}
                                        required
                                        minLength={5}
                                        rows={5}
                                        placeholder={type === 'bug' ? 'O que aconteceu? O que você esperava? Celular ou computador?' : 'Conte com detalhes...'}
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-[#093a9f] focus:outline-none focus:ring-2 focus:ring-[#093a9f]/20 resize-y"
                                    />
                                    <p className="text-[11px] text-gray-400 text-right">{description.length}/4000</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full flex items-center justify-center gap-2 rounded-full bg-[#af1c15] py-3 text-sm font-bold text-white transition hover:bg-[#c62b23] disabled:opacity-60"
                                >
                                    {isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    Enviar ticket
                                </button>
                            </form>
                        ) : (
                            <div className="p-5">
                                {myTickets === null ? (
                                    <div className="flex justify-center py-10 text-gray-400"><Loader2 className="animate-spin" /></div>
                                ) : myTickets.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                                        <Inbox size={36} />
                                        <p className="text-sm">Você ainda não abriu nenhum ticket.</p>
                                    </div>
                                ) : (
                                    <ul className="space-y-3">
                                        {myTickets.map(t => (
                                            <li key={t.id} className="rounded-2xl border border-gray-200 p-3.5">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TICKET_TYPES[t.type].color}`}>
                                                        {TICKET_TYPES[t.type].emoji} {TICKET_TYPES[t.type].label}
                                                    </span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TICKET_STATUSES[t.status].color}`}>
                                                        {TICKET_STATUSES[t.status].label}
                                                    </span>
                                                    <span className="ml-auto text-[11px] text-gray-400">
                                                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                                <p className="font-semibold text-sm text-gray-900">{t.title}</p>
                                                <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">{t.description}</p>
                                                {t.admin_response && (
                                                    <div className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-900">
                                                        <span className="font-bold">Resposta: </span>
                                                        <span className="whitespace-pre-wrap">{t.admin_response}</span>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
