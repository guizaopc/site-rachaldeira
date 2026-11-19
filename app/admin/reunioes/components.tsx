'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
    ACTION_STATUS, ITEM_CATEGORY, ITEM_PRIORITY, ITEM_STATUS, ITEM_TYPE, MEETING_FORMAT, MEETING_STATUS,
    fromLocalInput, toLocalInput,
    type ActionItem, type ActionStatus, type AgendaItem, type BoardMember, type ItemCategory, type ItemPriority,
    type ItemStatus, type ItemType, type Meeting, type MeetingFormat, type MeetingStatus,
} from '@/lib/reunioes';

export const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#af1c15]/40 focus:border-[#af1c15]';
export const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export function Pill({ className, children }: { className: string; children: React.ReactNode }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>
            {children}
        </span>
    );
}

export function MemberSelect({ members, value, onChange, placeholder = 'Ninguém' }: {
    members: BoardMember[]; value: string | null; onChange: (v: string | null) => void; placeholder?: string;
}) {
    const board = members.filter(m => m.isBoard);
    const others = members.filter(m => !m.isBoard);
    return (
        <select className={inputCls} value={value ?? ''} onChange={e => onChange(e.target.value || null)}>
            <option value="">{placeholder}</option>
            {board.length > 0 && (
                <optgroup label="Diretoria">
                    {board.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
            )}
            <optgroup label={board.length > 0 ? 'Demais integrantes' : 'Integrantes'}>
                {others.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
        </select>
    );
}

// ---------------------------------------------------------------
// Reunião
// ---------------------------------------------------------------
export type MeetingFormValues = {
    title: string;
    meeting_date: string;
    format: MeetingFormat;
    location: string;
    meeting_link: string;
    objective: string;
    status: MeetingStatus;
};

function nextWeekAt20h() {
    const d = new Date(Date.now() + 7 * 86400000);
    return toLocalInput(d.toISOString()).slice(0, 10) + 'T20:00';
}

export function MeetingFormModal({ isOpen, onClose, meeting, onSubmit, extra }: {
    isOpen: boolean;
    onClose: () => void;
    meeting?: Meeting | null;
    onSubmit: (values: Omit<MeetingFormValues, 'meeting_date'> & { meeting_date: string }) => Promise<boolean>;
    extra?: React.ReactNode;
}) {
    const [v, setV] = useState<MeetingFormValues>(empty());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function empty(): MeetingFormValues {
        return { title: '', meeting_date: nextWeekAt20h(), format: 'presencial', location: '', meeting_link: '', objective: '', status: 'agendada' };
    }

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setV(meeting ? {
            title: meeting.title,
            meeting_date: toLocalInput(meeting.meeting_date),
            format: meeting.format,
            location: meeting.location ?? '',
            meeting_link: meeting.meeting_link ?? '',
            objective: meeting.objective ?? '',
            status: meeting.status,
        } : empty());
    }, [isOpen, meeting]);

    async function submit() {
        if (!v.title.trim()) return setError('Dê um título para a reunião.');
        if (!v.meeting_date) return setError('Informe data e horário.');
        if (v.meeting_link && !/^https?:\/\//i.test(v.meeting_link)) return setError('O link precisa começar com http:// ou https://');
        setSaving(true);
        const ok = await onSubmit({ ...v, title: v.title.trim(), meeting_date: fromLocalInput(v.meeting_date) });
        setSaving(false);
        if (ok) onClose();
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={meeting ? 'Editar reunião' : 'Nova reunião'}
            footer={<>
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={submit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </>}
        >
            <div className="space-y-4">
                <div>
                    <label className={labelCls}>Título *</label>
                    <input className={inputCls} value={v.title} maxLength={200} placeholder="Ex.: Reunião ordinária de novembro"
                        onChange={e => setV({ ...v, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Data e horário *</label>
                        <input type="datetime-local" className={inputCls} value={v.meeting_date}
                            onChange={e => setV({ ...v, meeting_date: e.target.value })} />
                    </div>
                    <div>
                        <label className={labelCls}>Status</label>
                        <select className={inputCls} value={v.status} onChange={e => setV({ ...v, status: e.target.value as MeetingStatus })}>
                            {Object.entries(MEETING_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Formato</label>
                    <div className="flex gap-2">
                        {(Object.keys(MEETING_FORMAT) as MeetingFormat[]).map(f => (
                            <button key={f} type="button" onClick={() => setV({ ...v, format: f })}
                                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${v.format === f ? 'border-[#af1c15] bg-red-50 text-[#af1c15]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                {MEETING_FORMAT[f]}
                            </button>
                        ))}
                    </div>
                </div>
                {v.format !== 'online' && (
                    <div>
                        <label className={labelCls}>Local</label>
                        <input className={inputCls} value={v.location} maxLength={300} placeholder="Ex.: Sede / Quadra"
                            onChange={e => setV({ ...v, location: e.target.value })} />
                    </div>
                )}
                {v.format !== 'presencial' && (
                    <div>
                        <label className={labelCls}>Link da chamada</label>
                        <input className={inputCls} value={v.meeting_link} maxLength={500} placeholder="https://meet.google.com/..."
                            onChange={e => setV({ ...v, meeting_link: e.target.value })} />
                    </div>
                )}
                <div>
                    <label className={labelCls}>Objetivo da reunião</label>
                    <textarea className={`${inputCls} min-h-[80px]`} value={v.objective} maxLength={2000}
                        placeholder="O que precisa sair decidido desta reunião?"
                        onChange={e => setV({ ...v, objective: e.target.value })} />
                </div>
                {extra}
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        </Modal>
    );
}

// ---------------------------------------------------------------
// Item de pauta
// ---------------------------------------------------------------
export type AgendaItemValues = {
    title: string;
    description: string;
    category: ItemCategory;
    priority: ItemPriority;
    item_type: ItemType;
    presenter_id: string | null;
    duration_minutes: number | null;
    status: ItemStatus;
    decision: string;
    votes_for: number | null;
    votes_against: number | null;
    votes_abstain: number | null;
};

function numOrNull(s: string) {
    if (s.trim() === '') return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

export function AgendaItemModal({ isOpen, onClose, item, members, showOutcome, onSubmit }: {
    isOpen: boolean;
    onClose: () => void;
    item?: AgendaItem | null;
    members: BoardMember[];
    /** Mostra campos de resultado (status, decisão, votação). */
    showOutcome: boolean;
    onSubmit: (values: AgendaItemValues) => Promise<boolean>;
}) {
    const blank: AgendaItemValues = {
        title: '', description: '', category: 'geral', priority: 'media', item_type: 'discussao', presenter_id: null,
        duration_minutes: 10, status: 'pendente', decision: '', votes_for: null, votes_against: null, votes_abstain: null,
    };
    const [v, setV] = useState<AgendaItemValues>(blank);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setV(item ? {
            title: item.title, description: item.description ?? '', category: item.category, priority: item.priority,
            item_type: item.item_type, presenter_id: item.presenter_id, duration_minutes: item.duration_minutes,
            status: item.status, decision: item.decision ?? '', votes_for: item.votes_for,
            votes_against: item.votes_against, votes_abstain: item.votes_abstain,
        } : blank);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, item]);

    async function submit() {
        if (!v.title.trim()) return setError('Dê um título para a pauta.');
        setSaving(true);
        const ok = await onSubmit({ ...v, title: v.title.trim() });
        setSaving(false);
        if (ok) onClose();
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={item ? 'Editar pauta' : 'Nova pauta'}
            footer={<>
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={submit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </>}
        >
            <div className="space-y-4">
                <div>
                    <label className={labelCls}>Assunto *</label>
                    <input className={inputCls} value={v.title} maxLength={200} placeholder="Ex.: Reajuste da mensalidade"
                        onChange={e => setV({ ...v, title: e.target.value })} />
                </div>
                <div>
                    <label className={labelCls}>Contexto / detalhes</label>
                    <textarea className={`${inputCls} min-h-[90px]`} value={v.description} maxLength={5000}
                        placeholder="Explique o problema, números, propostas..."
                        onChange={e => setV({ ...v, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className={labelCls}>Categoria</label>
                        <select className={inputCls} value={v.category} onChange={e => setV({ ...v, category: e.target.value as ItemCategory })}>
                            {Object.entries(ITEM_CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Tipo</label>
                        <select className={inputCls} value={v.item_type} onChange={e => setV({ ...v, item_type: e.target.value as ItemType })}>
                            {Object.entries(ITEM_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Prioridade</label>
                        <select className={inputCls} value={v.priority} onChange={e => setV({ ...v, priority: e.target.value as ItemPriority })}>
                            {Object.entries(ITEM_PRIORITY).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                        <label className={labelCls}>Quem apresenta</label>
                        <MemberSelect members={members} value={v.presenter_id} onChange={id => setV({ ...v, presenter_id: id })} placeholder="A definir" />
                    </div>
                    <div>
                        <label className={labelCls}>Tempo (min)</label>
                        <input type="number" min={1} max={600} className={inputCls} value={v.duration_minutes ?? ''}
                            onChange={e => setV({ ...v, duration_minutes: numOrNull(e.target.value) || null })} />
                    </div>
                </div>

                {showOutcome && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                        <p className="text-sm font-semibold text-gray-800">Resultado</p>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(ITEM_STATUS) as ItemStatus[]).map(s => (
                                <button key={s} type="button" onClick={() => setV({ ...v, status: s })}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${v.status === s ? ITEM_STATUS[s].className + ' ring-2 ring-offset-1 ring-gray-400' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                    {ITEM_STATUS[s].label}
                                </button>
                            ))}
                        </div>
                        <div>
                            <label className={labelCls}>Decisão / encaminhamento registrado</label>
                            <textarea className={`${inputCls} min-h-[70px]`} value={v.decision} maxLength={5000}
                                placeholder="O que ficou decidido?"
                                onChange={e => setV({ ...v, decision: e.target.value })} />
                        </div>
                        {v.item_type === 'deliberacao' && (
                            <div className="grid grid-cols-3 gap-3">
                                {([['votes_for', 'A favor'], ['votes_against', 'Contra'], ['votes_abstain', 'Abstenções']] as const).map(([k, l]) => (
                                    <div key={k}>
                                        <label className={labelCls}>{l}</label>
                                        <input type="number" min={0} className={inputCls} value={v[k] ?? ''}
                                            onChange={e => setV({ ...v, [k]: numOrNull(e.target.value) })} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        </Modal>
    );
}

// ---------------------------------------------------------------
// Encaminhamento
// ---------------------------------------------------------------
export type ActionValues = {
    description: string;
    responsible_id: string | null;
    due_date: string | null;
    status: ActionStatus;
    agenda_item_id: string | null;
};

export function ActionItemModal({ isOpen, onClose, action, members, agendaItems, defaultAgendaItemId = null, onSubmit }: {
    isOpen: boolean;
    onClose: () => void;
    action?: ActionItem | null;
    members: BoardMember[];
    agendaItems?: AgendaItem[];
    /** Pauta pré-selecionada ao criar um encaminhamento novo. */
    defaultAgendaItemId?: string | null;
    onSubmit: (values: ActionValues) => Promise<boolean>;
}) {
    const blank: ActionValues = { description: '', responsible_id: null, due_date: null, status: 'pendente', agenda_item_id: null };
    const [v, setV] = useState<ActionValues>(blank);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setV(action ? {
            description: action.description, responsible_id: action.responsible_id, due_date: action.due_date,
            status: action.status, agenda_item_id: action.agenda_item_id,
        } : { ...blank, agenda_item_id: defaultAgendaItemId });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, action, defaultAgendaItemId]);

    async function submit() {
        if (!v.description.trim()) return setError('Descreva a tarefa.');
        setSaving(true);
        const ok = await onSubmit({ ...v, description: v.description.trim() });
        setSaving(false);
        if (ok) onClose();
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={action ? 'Editar encaminhamento' : 'Novo encaminhamento'}
            footer={<>
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={submit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </>}
        >
            <div className="space-y-4">
                <div>
                    <label className={labelCls}>O que precisa ser feito *</label>
                    <textarea className={`${inputCls} min-h-[70px]`} value={v.description} maxLength={1000}
                        placeholder="Ex.: Orçar 3 fornecedores de uniforme"
                        onChange={e => setV({ ...v, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Responsável</label>
                        <MemberSelect members={members} value={v.responsible_id} onChange={id => setV({ ...v, responsible_id: id })} placeholder="A definir" />
                    </div>
                    <div>
                        <label className={labelCls}>Prazo</label>
                        <input type="date" className={inputCls} value={v.due_date ?? ''}
                            onChange={e => setV({ ...v, due_date: e.target.value || null })} />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Status</label>
                        <select className={inputCls} value={v.status} onChange={e => setV({ ...v, status: e.target.value as ActionStatus })}>
                            {Object.entries(ACTION_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                        </select>
                    </div>
                    {agendaItems && agendaItems.length > 0 && (
                        <div>
                            <label className={labelCls}>Ligado à pauta</label>
                            <select className={inputCls} value={v.agenda_item_id ?? ''} onChange={e => setV({ ...v, agenda_item_id: e.target.value || null })}>
                                <option value="">Nenhuma</option>
                                {agendaItems.map((it, i) => <option key={it.id} value={it.id}>{i + 1}. {it.title}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        </Modal>
    );
}

export function ConfirmModal({ isOpen, onClose, title, message, confirmLabel = 'Excluir', onConfirm }: {
    isOpen: boolean; onClose: () => void; title: string; message: React.ReactNode; confirmLabel?: string; onConfirm: () => Promise<void> | void;
}) {
    const [busy, setBusy] = useState(false);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={<>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button variant="danger" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); onClose(); }}>
                {busy ? 'Aguarde...' : confirmLabel}
            </Button>
        </>}>
            <div className="text-sm text-gray-600">{message}</div>
        </Modal>
    );
}
