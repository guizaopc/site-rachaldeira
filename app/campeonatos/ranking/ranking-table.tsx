'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface ChampionTeam {
    teamName: string;
    logo_url: string | null;
    championship: string;
    year: number;
}

export interface ChampionshipRankingRow {
    id: string;
    name: string;
    photo_url?: string | null;
    position?: string | null;
    championTeams: ChampionTeam[];
    goals: number;
    assists: number;
    saves: number;
    trophies: number;
    craque: number;
    artilheiro: number;
    paredao: number;
    xerifao: number;
    garcom: number;
}

type SortKey = Exclude<keyof ChampionshipRankingRow, 'id' | 'name' | 'photo_url' | 'position' | 'championTeams'>;

function ChampionTeamsCell({ teams }: { teams: ChampionTeam[] }) {
    if (teams.length === 0) return <span className="text-gray-200">–</span>;
    return (
        <div className="flex flex-wrap justify-center gap-1 max-w-[150px] mx-auto">
            {teams.map((t, i) => (
                <span
                    key={i}
                    title={`${t.teamName} — ${t.championship} (${t.year})`}
                    className="w-7 h-7 rounded-full bg-white border border-yellow-200 shadow-sm flex items-center justify-center overflow-hidden"
                >
                    {t.logo_url
                        ? <img src={t.logo_url} alt={t.teamName} className="w-5 h-5 object-contain" />
                        : <span className="text-[9px] font-black text-yellow-800">{t.teamName.slice(0, 3).toUpperCase()}</span>}
                </span>
            ))}
        </div>
    );
}

const COLUMNS: { key: SortKey; label: string; emoji: string; title: string; award?: string }[] = [
    { key: 'goals', label: 'Gols', emoji: '⚽', title: 'Gols marcados em campeonatos' },
    { key: 'assists', label: 'Assist.', emoji: '🎯', title: 'Assistências em campeonatos' },
    { key: 'saves', label: 'Defesas', emoji: '🧤', title: 'Defesas difíceis em campeonatos' },
    { key: 'trophies', label: 'Troféus', emoji: '🏆', title: 'Campeonatos vencidos', award: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { key: 'craque', label: 'Craque', emoji: '👑', title: 'Vezes eleito Craque do campeonato', award: 'bg-amber-100 text-amber-800 border-amber-200' },
    { key: 'artilheiro', label: 'Artilheiro', emoji: '🥇', title: 'Vezes artilheiro do campeonato', award: 'bg-green-100 text-green-800 border-green-200' },
    { key: 'paredao', label: 'Paredão', emoji: '🧱', title: 'Vezes eleito Paredão do campeonato', award: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'xerifao', label: 'Xerife', emoji: '👮', title: 'Vezes eleito Xerifão do campeonato', award: 'bg-red-100 text-red-800 border-red-200' },
    { key: 'garcom', label: 'Garçom', emoji: '🍽️', title: 'Vezes eleito Garçom do campeonato', award: 'bg-purple-100 text-purple-800 border-purple-200' },
];

// Desempate padrão: títulos > prêmios > números
const TIEBREAK: SortKey[] = ['trophies', 'craque', 'artilheiro', 'goals', 'assists', 'saves', 'paredao', 'garcom', 'xerifao'];

function initials(name: string) {
    const parts = (name || '?').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default function ChampionshipRankingTable({ rows }: { rows: ChampionshipRankingRow[] }) {
    const [sortKey, setSortKey] = useState<SortKey>('trophies');
    const [search, setSearch] = useState('');

    const sorted = useMemo(() => {
        const order = [sortKey, ...TIEBREAK.filter(k => k !== sortKey)];
        return [...rows].sort((a, b) => {
            for (const k of order) if (b[k] !== a[k]) return b[k] - a[k];
            return a.name.localeCompare(b.name);
        });
    }, [rows, sortKey]);

    const term = search.trim().toLowerCase();
    const leaders = useMemo(() => {
        const map = {} as Record<SortKey, number>;
        for (const c of COLUMNS) map[c.key] = Math.max(0, ...rows.map(r => r[c.key]));
        return map;
    }, [rows]);

    if (rows.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-400">
                Nenhuma estatística de campeonato registrada ainda.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 md:p-6 border-b border-gray-100">
                <div>
                    <h2 className="text-xl font-black text-gray-900">Classificação dos atletas</h2>
                    <p className="text-sm text-gray-500 hidden md:block">Clique no título de uma coluna para ordenar.</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar jogador..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 rounded-full"
                    />
                </div>
            </div>

            {/* Celular: cards empilhados, sem rolagem lateral */}
            <div className="md:hidden">
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Ordenar por</p>
                    <div className="grid grid-cols-3 gap-1.5">
                        {COLUMNS.map(c => {
                            const active = c.key === sortKey;
                            return (
                                <button
                                    key={c.key}
                                    type="button"
                                    onClick={() => setSortKey(c.key)}
                                    className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold uppercase transition-colors ${active ? 'bg-[#093a9f] text-white' : 'bg-gray-50 text-gray-600'}`}
                                >
                                    <span className="text-sm leading-none">{c.emoji}</span>
                                    {c.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <ul>
                    {sorted.map((p, idx) => {
                        if (term && !p.name.toLowerCase().includes(term)) return null;
                        const pos = idx + 1;
                        const main = COLUMNS.find(c => c.key === sortKey)!;
                        return (
                            <li key={p.id} className="border-b border-gray-100 last:border-0 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 text-center font-black ${pos === 1 ? 'text-yellow-500' : pos === 2 ? 'text-gray-400' : pos === 3 ? 'text-orange-400' : 'text-gray-300'}`}>
                                        {pos}
                                    </span>
                                    <Link href={`/perfil/${p.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500">
                                            {p.photo_url
                                                ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                                : initials(p.name)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{p.name}</p>
                                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{p.position || '—'}</p>
                                        </div>
                                    </Link>
                                    <div className="text-center flex-shrink-0">
                                        <p className="text-xl font-black text-[#093a9f] leading-none">{p[sortKey]}</p>
                                        <p className="text-[9px] font-bold uppercase text-gray-400 mt-0.5">{main.label}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-1 mt-3">
                                    {COLUMNS.map(c => {
                                        const v = p[c.key];
                                        return (
                                            <div
                                                key={c.key}
                                                className={`rounded-lg py-1 text-center ${v > 0 && c.award ? c.award.replace(/border-\S+/, '') : 'bg-gray-50'} ${c.key === sortKey ? 'ring-1 ring-[#093a9f]' : ''}`}
                                            >
                                                <p className={`text-sm font-black leading-tight ${v === 0 ? 'text-gray-300' : ''}`}>
                                                    <span className="text-xs mr-0.5">{c.emoji}</span>{v}
                                                </p>
                                                <p className="text-[9px] font-bold uppercase text-gray-400">{c.label}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {p.championTeams.length > 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold uppercase text-gray-400">Campeão com</span>
                                        <div className="flex flex-wrap gap-1">
                                            {p.championTeams.map((t, i) => (
                                                <span key={i} title={`${t.teamName} — ${t.championship} (${t.year})`} className="w-6 h-6 rounded-full bg-white border border-yellow-200 flex items-center justify-center overflow-hidden">
                                                    {t.logo_url
                                                        ? <img src={t.logo_url} alt={t.teamName} className="w-4 h-4 object-contain" />
                                                        : <span className="text-[8px] font-black text-yellow-800">{t.teamName.slice(0, 3).toUpperCase()}</span>}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Computador: tabela completa */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1040px] text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500">
                            <th className="w-12 py-3 text-center font-bold">#</th>
                            <th className="py-3 pl-2 text-left font-bold sticky left-0 bg-gray-50 z-10">Atleta</th>
                            {COLUMNS.map(c => {
                                const active = c.key === sortKey;
                                return (
                                    <th key={c.key} className="py-2 px-1 text-center">
                                        <button
                                            type="button"
                                            title={c.title}
                                            onClick={() => setSortKey(c.key)}
                                            className={`inline-flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 font-bold transition-colors ${active ? 'bg-[#093a9f] text-white' : 'hover:bg-gray-200 text-gray-600'}`}
                                        >
                                            <span className="text-base leading-none">{c.emoji}</span>
                                            <span className="text-[11px] uppercase tracking-wide flex items-center">
                                                {c.label}
                                                {active && <ChevronDown size={12} className="ml-0.5" />}
                                            </span>
                                        </button>
                                    </th>
                                );
                            }).flatMap((th, i) => COLUMNS[i].key === 'trophies'
                                ? [th, (
                                    <th key="champion-teams" className="py-2 px-1 text-center text-gray-600" title="Times com que o jogador foi campeão">
                                        <span className="inline-flex flex-col items-center gap-0.5 px-2 py-1 font-bold">
                                            <span className="text-base leading-none">🛡️</span>
                                            <span className="text-[11px] uppercase tracking-wide">Times campeões</span>
                                        </span>
                                    </th>
                                )]
                                : [th])}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((p, idx) => {
                            if (term && !p.name.toLowerCase().includes(term)) return null;
                            const pos = idx + 1;
                            return (
                                <tr key={p.id} className="group border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="py-3 text-center">
                                        <span className={`font-black text-base ${pos === 1 ? 'text-yellow-500' : pos === 2 ? 'text-gray-400' : pos === 3 ? 'text-orange-400' : 'text-gray-300'}`}>
                                            {pos}
                                        </span>
                                    </td>
                                    <td className="py-3 pl-2 pr-3 sticky left-0 bg-white group-hover:bg-gray-50 transition-colors z-10">
                                        <Link href={`/perfil/${p.id}`} className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-500">
                                                {p.photo_url
                                                    ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                                                    : initials(p.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 truncate group-hover:text-[#093a9f] transition-colors">{p.name}</p>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{p.position || '—'}</p>
                                            </div>
                                        </Link>
                                    </td>
                                    {COLUMNS.map(c => {
                                        const v = p[c.key];
                                        const active = c.key === sortKey;
                                        const isLeader = v > 0 && v === leaders[c.key];
                                        return (
                                            <td key={c.key} className={`py-3 px-1 text-center ${active ? 'bg-blue-50/60' : ''}`}>
                                                {v === 0 ? (
                                                    <span className="text-gray-200">–</span>
                                                ) : c.award ? (
                                                    <span className={`inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg border font-black ${c.award}`}>{v}</span>
                                                ) : (
                                                    <span className={`text-base ${isLeader ? 'font-black text-[#093a9f]' : 'font-bold text-gray-700'}`}>{v}</span>
                                                )}
                                            </td>
                                        );
                                    }).flatMap((td, i) => COLUMNS[i].key === 'trophies'
                                        ? [td, (
                                            <td key="champion-teams" className="py-3 px-1 text-center">
                                                <ChampionTeamsCell teams={p.championTeams} />
                                            </td>
                                        )]
                                        : [td])}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
