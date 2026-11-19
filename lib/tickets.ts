export const TICKET_TYPES = {
    sugestao: { label: 'Sugestão', emoji: '💡', color: 'bg-amber-100 text-amber-800' },
    bug: { label: 'Bug', emoji: '🐞', color: 'bg-red-100 text-red-800' },
    reclamacao: { label: 'Reclamação', emoji: '📣', color: 'bg-purple-100 text-purple-800' },
    outro: { label: 'Outro', emoji: '💬', color: 'bg-slate-100 text-slate-800' },
} as const;

export const TICKET_STATUSES = {
    aberto: { label: 'Aberto', color: 'bg-blue-100 text-blue-800' },
    em_andamento: { label: 'Em andamento', color: 'bg-yellow-100 text-yellow-800' },
    resolvido: { label: 'Resolvido', color: 'bg-green-100 text-green-800' },
    fechado: { label: 'Fechado', color: 'bg-gray-200 text-gray-700' },
} as const;

export type TicketType = keyof typeof TICKET_TYPES;
export type TicketStatus = keyof typeof TICKET_STATUSES;

export interface Ticket {
    id: string;
    user_id: string;
    member_id: string | null;
    type: TicketType;
    title: string;
    description: string;
    page_url: string | null;
    status: TicketStatus;
    admin_response: string | null;
    created_at: string;
    updated_at: string;
}

export function isTicketType(v: unknown): v is TicketType {
    return typeof v === 'string' && v in TICKET_TYPES;
}

export function isTicketStatus(v: unknown): v is TicketStatus {
    return typeof v === 'string' && v in TICKET_STATUSES;
}
