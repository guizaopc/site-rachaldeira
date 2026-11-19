// Tipos, rótulos e utilitários da área de Pautas de Reunião da diretoria.
// Sem imports de servidor: é usado também nos componentes cliente.

export type MeetingStatus = 'rascunho' | 'agendada' | 'em_andamento' | 'realizada' | 'cancelada';
export type MeetingFormat = 'presencial' | 'online' | 'hibrida';
export type ItemStatus = 'pendente' | 'discutido' | 'aprovado' | 'rejeitado' | 'adiado';
export type ItemCategory = 'geral' | 'financeiro' | 'eventos' | 'campeonatos' | 'disciplina' | 'integrantes' | 'estrutura' | 'comunicacao';
export type ItemPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type ItemType = 'informe' | 'discussao' | 'deliberacao';
export type AttendanceStatus = 'convidado' | 'presente' | 'ausente' | 'justificado';
export type ActionStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';

export interface Meeting {
    id: string;
    title: string;
    meeting_date: string;
    format: MeetingFormat;
    location: string | null;
    meeting_link: string | null;
    objective: string | null;
    status: MeetingStatus;
    minutes: string | null;
    created_at: string;
    updated_at: string;
}

export interface AgendaItem {
    id: string;
    meeting_id: string | null;
    position: number;
    title: string;
    description: string | null;
    category: ItemCategory;
    priority: ItemPriority;
    item_type: ItemType;
    presenter_id: string | null;
    duration_minutes: number | null;
    status: ItemStatus;
    decision: string | null;
    votes_for: number | null;
    votes_against: number | null;
    votes_abstain: number | null;
    created_at: string;
}

export interface Attendee {
    meeting_id: string;
    member_id: string;
    attendance: AttendanceStatus;
}

export interface ActionItem {
    id: string;
    meeting_id: string | null;
    agenda_item_id: string | null;
    description: string;
    responsible_id: string | null;
    due_date: string | null;
    status: ActionStatus;
    completed_at: string | null;
    created_at: string;
}

export interface BoardMember {
    id: string;
    name: string;
    photo_url: string | null;
    isBoard: boolean;
}

export const MEETING_STATUS: Record<MeetingStatus, { label: string; className: string }> = {
    rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    agendada: { label: 'Agendada', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    em_andamento: { label: 'Em andamento', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    realizada: { label: 'Realizada', className: 'bg-green-50 text-green-700 border-green-200' },
    cancelada: { label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200' },
};

export const MEETING_FORMAT: Record<MeetingFormat, string> = {
    presencial: 'Presencial',
    online: 'Online',
    hibrida: 'Híbrida',
};

export const ITEM_STATUS: Record<ItemStatus, { label: string; className: string }> = {
    pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    discutido: { label: 'Discutido', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    aprovado: { label: 'Aprovado', className: 'bg-green-50 text-green-700 border-green-200' },
    rejeitado: { label: 'Rejeitado', className: 'bg-red-50 text-red-700 border-red-200' },
    adiado: { label: 'Adiado', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const ITEM_CATEGORY: Record<ItemCategory, string> = {
    geral: 'Geral',
    financeiro: 'Financeiro',
    eventos: 'Eventos',
    campeonatos: 'Campeonatos',
    disciplina: 'Disciplina',
    integrantes: 'Integrantes',
    estrutura: 'Estrutura',
    comunicacao: 'Comunicação',
};

export const ITEM_PRIORITY: Record<ItemPriority, { label: string; className: string; weight: number }> = {
    urgente: { label: 'Urgente', className: 'bg-red-600 text-white border-red-600', weight: 4 },
    alta: { label: 'Alta', className: 'bg-orange-100 text-orange-800 border-orange-200', weight: 3 },
    media: { label: 'Média', className: 'bg-yellow-50 text-yellow-800 border-yellow-200', weight: 2 },
    baixa: { label: 'Baixa', className: 'bg-gray-50 text-gray-600 border-gray-200', weight: 1 },
};

export const ITEM_TYPE: Record<ItemType, string> = {
    informe: 'Informe',
    discussao: 'Discussão',
    deliberacao: 'Deliberação',
};

export const ATTENDANCE: Record<AttendanceStatus, { label: string; className: string }> = {
    convidado: { label: 'Convidado', className: 'bg-gray-100 text-gray-700' },
    presente: { label: 'Presente', className: 'bg-green-100 text-green-800' },
    ausente: { label: 'Ausente', className: 'bg-red-100 text-red-800' },
    justificado: { label: 'Justificado', className: 'bg-amber-100 text-amber-800' },
};

export const ACTION_STATUS: Record<ActionStatus, { label: string; className: string }> = {
    pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    em_andamento: { label: 'Em andamento', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    concluida: { label: 'Concluída', className: 'bg-green-50 text-green-700 border-green-200' },
    cancelada: { label: 'Cancelada', className: 'bg-red-50 text-red-700 border-red-200' },
};

const TZ = 'America/Sao_Paulo';

export function formatDateLong(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
}

export function formatDateShort(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
}

export function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

/** Data "YYYY-MM-DD" (coluna DATE) para dd/mm/aaaa, sem deslocar fuso. */
export function formatDueDate(date: string) {
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
}

export function isOverdue(action: Pick<ActionItem, 'due_date' | 'status'>) {
    if (!action.due_date || action.status === 'concluida' || action.status === 'cancelada') return false;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    return action.due_date < today;
}

export function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Converte ISO para o valor de um <input type="datetime-local"> no fuso de Brasília. */
export function toLocalInput(iso: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
    const hour = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** Converte o valor de um datetime-local (hora de Brasília, UTC-3) para ISO. */
export function fromLocalInput(value: string) {
    return new Date(`${value}:00-03:00`).toISOString();
}
