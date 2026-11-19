// Destaques (prêmios individuais) de campeonato.
// Cada prêmio pode ter mais de um jogador — ficam na tabela championship_awards.

export type AwardType = 'craque' | 'artilheiro' | 'paredao' | 'garcom' | 'xerifao';

export const AWARD_TYPES: { id: AwardType; label: string; emoji: string; sublabel: string }[] = [
    { id: 'craque', label: 'Craque', emoji: '👑', sublabel: 'Melhor jogador' },
    { id: 'artilheiro', label: 'Artilheiro', emoji: '⚽', sublabel: 'Mais gols' },
    { id: 'paredao', label: 'Paredão', emoji: '🧤', sublabel: 'Melhor goleiro' },
    { id: 'garcom', label: 'Garçom', emoji: '🍽️', sublabel: 'Mais assistências' },
    { id: 'xerifao', label: 'Xerifão', emoji: '👮', sublabel: 'Melhor zagueiro' },
];

export type AwardMember = { id: string; name: string; photo_url?: string | null; position?: string | null };

export type AwardRow = { award: AwardType; member: AwardMember | null };

/** Agrupa as linhas de championship_awards por tipo de prêmio. */
export function groupAwards(rows: AwardRow[] | null | undefined): Record<AwardType, AwardMember[]> {
    const grouped: Record<AwardType, AwardMember[]> = { craque: [], artilheiro: [], paredao: [], garcom: [], xerifao: [] };
    for (const r of rows || []) {
        if (r.member && grouped[r.award]) grouped[r.award].push(r.member);
    }
    for (const list of Object.values(grouped)) list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return grouped;
}

/** Select para trazer os destaques junto do campeonato. */
export const AWARDS_SELECT = 'awards:championship_awards(award, member:member_id(id, name, photo_url, position))';
