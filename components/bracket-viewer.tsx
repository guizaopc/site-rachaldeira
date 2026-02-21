'use client';

import Link from 'next/link';

interface Match {
    id: string;
    bracket_position: string;
    championship_id: string;
    team_a: { name: string; logo_url?: string } | null;
    team_b: { name: string; logo_url?: string } | null;
    score_a: number | null;
    score_b: number | null;
    status: string;
}

interface BracketViewerProps {
    matches: Match[];
    campId: string;
}

export function BracketViewer({ matches, campId }: BracketViewerProps) {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const getMatch = (pos: string) => {
        const search = normalize(pos);
        return matches.find((m) => normalize(m.bracket_position || '') === search);
    };

    const renderTeamRow = (
        team: { name: string; logo_url?: string } | null,
        score: number | null,
        isWinner: boolean
    ) => (
        <div
            className={`flex justify-between items-center px-4 py-2.5 ${isWinner ? 'bg-green-50/50' : 'bg-white'
                }`}
        >
            <span
                className={`text-[12px] truncate max-w-[130px] flex items-center gap-2 ${isWinner ? 'font-black text-green-700' : 'text-gray-700 font-medium'
                    }`}
            >
                {team?.logo_url ? (
                    <img
                        src={team.logo_url}
                        className="w-5 h-5 object-contain rounded-full border border-gray-100 shadow-sm bg-white"
                        alt=""
                    />
                ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-[8px] text-gray-300 font-bold">?</div>
                )}
                {team?.name || (
                    <span className="italic text-gray-400 font-normal">A Definir</span>
                )}
            </span>
            <span
                className={`text-xs font-mono px-2 py-1 rounded-md min-w-[28px] text-center border ${isWinner
                    ? 'bg-green-100 text-green-900 font-bold border-green-200 shadow-sm'
                    : 'bg-gray-50 text-gray-500 border-gray-100'
                    }`}
            >
                {score ?? '-'}
            </span>
        </div>
    );

    const renderMatchCard = (match: Match | undefined, label: string) => {
        if (!match) {
            return (
                <div className="w-[210px] h-[86px] border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/40 flex items-center justify-center text-[10px] text-gray-400 font-medium uppercase tracking-widest italic">
                    {label}
                </div>
            );
        }

        const sA = match.score_a;
        const sB = match.score_b;
        const done = sA !== null && sB !== null;
        const aWin = done && sA! > sB!;
        const bWin = done && sB! > sA!;

        const borderColor =
            match.status === 'in_progress'
                ? 'border-green-400 ring-4 ring-green-50/50'
                : match.status === 'completed'
                    ? 'border-gray-200'
                    : 'border-gray-100';

        const statusBar =
            match.status === 'in_progress'
                ? 'bg-green-500 text-white'
                : match.status === 'completed'
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-slate-50 text-slate-300';

        const statusText =
            match.status === 'in_progress'
                ? '● AO VIVO'
                : match.status === 'completed'
                    ? 'ENCERRADO'
                    : 'AGENDADO';

        const hasTeams = match.team_a && match.team_b;

        const cardContent = (
            <div className={`w-[210px] rounded-xl border bg-white shadow-sm transition-all duration-300 ${borderColor} ${hasTeams ? 'cursor-pointer hover:shadow-lg hover:border-blue-400 hover:-translate-y-0.5' : ''}`}>
                {renderTeamRow(match.team_a, sA, aWin)}
                <div className="h-[1px] bg-gray-50" />
                {renderTeamRow(match.team_b, sB, bWin)}
                <div
                    className={`text-[9px] text-center py-1 uppercase tracking-widest font-black ${statusBar}`}
                >
                    {statusText}
                </div>
            </div>
        );

        if (hasTeams) {
            return (
                <Link href={`/campeonatos/${campId}/partida/${match.id}`}>
                    {cardContent}
                </Link>
            );
        }

        return cardContent;
    };

    // Unified match lookup
    const qfMatches = matches.filter(m => normalize(m.bracket_position || '').startsWith('qf')).sort((a, b) => (a.bracket_position || '').localeCompare(b.bracket_position || ''));

    // We expect at least 2 QFs for a 6-team bracket, or 4 for an 8-team one.
    // We'll show slots for at least 2.
    const qfSlots = Math.max(2, qfMatches.length);
    const semi1 = getMatch('semi-1');
    const semi2 = getMatch('semi-2');
    const final = getMatch('final-1');

    // Sizing
    const MATCH_H = 86;
    const TOTAL_COLUMN_H = 340;
    const CONNECTOR_W = 60;
    const COLUMN_W = 210;

    return (
        <div className="bg-[#fcfdfe] border border-gray-100 rounded-3xl p-12 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-50/20 rounded-full -ml-32 -mb-32 blur-3xl opacity-50" />

            <div className="min-w-[850px] relative z-10">
                {/* Headers */}
                <div className="flex justify-center items-center mb-16 px-4">
                    <div style={{ width: COLUMN_W }} className="flex justify-center">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white px-5 py-2 rounded-full border border-gray-100 shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Quartas
                        </span>
                    </div>
                    <div style={{ width: CONNECTOR_W }}></div>
                    <div style={{ width: COLUMN_W }} className="flex justify-center">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white px-5 py-2 rounded-full border border-gray-100 shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Semifinais
                        </span>
                    </div>
                    <div style={{ width: CONNECTOR_W }}></div>
                    <div style={{ width: COLUMN_W }} className="flex justify-center">
                        <span className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] bg-amber-50/50 px-5 py-2 rounded-full border border-amber-100 shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Final
                        </span>
                    </div>
                </div>

                {/* Match Grid */}
                <div className="flex items-stretch justify-center" style={{ minHeight: TOTAL_COLUMN_H }}>

                    {/* QF Column */}
                    <div className="flex flex-col justify-around space-y-12">
                        {renderMatchCard(getMatch('qf-1'), 'Quartas 1')}
                        {renderMatchCard(getMatch('qf-2'), 'Quartas 2')}
                    </div>

                    {/* Connector QF -> Semi (Straight) */}
                    <div className="flex flex-col justify-around" style={{ width: CONNECTOR_W }}>
                        <div className="flex-1 flex items-center"><div className="bg-gray-200 w-full h-[2px]" /></div>
                        <div className="flex-1 flex items-center"><div className="bg-gray-200 w-full h-[2px]" /></div>
                    </div>

                    {/* SEMI Column */}
                    <div className="flex flex-col justify-around space-y-12">
                        {renderMatchCard(semi1, 'Semi 1')}
                        {renderMatchCard(semi2, 'Semi 2')}
                    </div>

                    {/* Connector Semi -> Final (Fork) */}
                    <div className="relative flex flex-col justify-around" style={{ width: CONNECTOR_W }}>
                        {/* Fork structure using flex boxes for alignment */}
                        <div className="flex-1 flex items-center">
                            <div className="bg-gray-200 w-1/2 h-[2px]" />
                        </div>
                        <div className="flex-1 flex items-center">
                            <div className="bg-gray-200 w-1/2 h-[2px]" />
                        </div>
                        {/* Vertical bar of the fork */}
                        <div className="absolute bg-gray-200" style={{ top: '25%', bottom: '25%', left: '50%', width: 2 }} />
                        {/* Center stem to final */}
                        <div className="absolute bg-gray-200" style={{ top: '50%', left: '50%', width: '50%', height: 2 }} />
                    </div>

                    {/* FINAL Column */}
                    <div className="flex flex-col justify-center">
                        {renderMatchCard(final, 'Grande Final')}
                    </div>

                </div>
            </div>
        </div>
    );
}
