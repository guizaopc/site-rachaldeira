// Utilitários compartilhados pelas telas de scouts

export const ADJUSTMENT_RACHA_NAME = 'Ajustes Globais Manuais';
export const ADJUSTMENT_RACHA_LOCATION = 'Sistema (Manual)';

export function isAdjustmentRacha(r: { name?: string | null; location?: string | null }) {
    return r.location === ADJUSTMENT_RACHA_LOCATION || r.name === ADJUSTMENT_RACHA_NAME;
}

export type ScoutField = 'goals' | 'assists' | 'difficult_saves' | 'warnings';

export const SCOUT_FIELDS: {
    key: ScoutField;
    label: string;
    short: string;
    emoji: string;
    tone: string; // classes do botão "+"
    soft: string; // classes de destaque suave
}[] = [
    { key: 'goals', label: 'Gols', short: 'Gols', emoji: '⚽', tone: 'bg-emerald-600 hover:bg-emerald-500 text-white', soft: 'bg-emerald-50 text-emerald-700' },
    { key: 'assists', label: 'Assistências', short: 'Assist.', emoji: '🎯', tone: 'bg-sky-600 hover:bg-sky-500 text-white', soft: 'bg-sky-50 text-sky-700' },
    { key: 'difficult_saves', label: 'Defesas', short: 'Defesas', emoji: '🧤', tone: 'bg-violet-600 hover:bg-violet-500 text-white', soft: 'bg-violet-50 text-violet-700' },
    { key: 'warnings', label: 'Advertências', short: 'Advert.', emoji: '🟨', tone: 'bg-amber-500 hover:bg-amber-400 text-white', soft: 'bg-amber-50 text-amber-700' },
];

export function normalizeName(s: string) {
    return (s || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Tenta casar um nome escrito à mão com um membro.
 * Ordem: nome exato → primeiro nome único → nome contido (único).
 * Busca primeiro entre `preferred` (ex.: presentes) e depois em `all`.
 */
export function matchMemberByName<T extends { id: string; name: string }>(
    rawName: string,
    preferred: T[],
    all: T[],
): T | null {
    const target = normalizeName(rawName);
    if (!target) return null;

    const strategies: ((m: T) => boolean)[] = [
        m => normalizeName(m.name) === target,
        m => normalizeName(m.name).split(' ')[0] === target.split(' ')[0] && target.split(' ').length === 1,
        m => {
            const n = normalizeName(m.name);
            return n.startsWith(target) || target.startsWith(n);
        },
        m => {
            const n = normalizeName(m.name);
            return n.includes(target) || target.includes(n);
        },
    ];

    for (const test of strategies) {
        for (const pool of [preferred, all]) {
            const hits = pool.filter(test);
            if (hits.length === 1) return hits[0];
        }
    }
    return null;
}

export function initials(name: string) {
    const parts = (name || '?').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
