'use client';

import React from 'react';

interface Player {
    id: string;
    name: string;
    top1Count: number;
    sheriffCount: number;
    craquePoints: number;
    sheriffPoints: number;
    goals: number;
    assists: number;
    saves: number;
    fominhaPct: number;
    participations: number;
    points: number;
}

interface HighlightsGridProps {
    players: Player[];
}

import { Trophy, Target, Shield, Users, Star, Flame, Award } from 'lucide-react';

const HighlightsGrid = ({ players }: HighlightsGridProps) => {
    const [isPrintMode, setIsPrintMode] = React.useState(false);

    // Get all players for each category, sorted
    const topCraque = [...players].sort((a, b) => b.craquePoints - a.craquePoints || b.points - a.points);
    const topXerife = [...players].sort((a, b) => b.sheriffPoints - a.sheriffPoints || b.points - a.points);
    const topArtilheiro = [...players].sort((a, b) => b.goals - a.goals || b.points - a.points);
    const topGarcom = [...players].sort((a, b) => b.assists - a.assists || b.points - a.points);
    const topParedao = [...players].sort((a, b) => b.saves - a.saves || b.points - a.points);
    const topFominha = [...players].sort((a, b) => b.participations - a.participations || b.fominhaPct - a.fominhaPct);

    const TableComponent = ({
        title,
        items,
        valueLabel,
        valueKey,
        icon: Icon,
        colorClass,
    }: {
        title: string,
        items: any[],
        valueLabel: string,
        valueKey: keyof Player,
        icon: any,
        colorClass: string,
    }) => (
        <div className={`flex flex-col min-w-0 flex-1 group ${isPrintMode ? 'gap-1' : ''}`}>
            <div className={`flex items-center gap-2 px-1 ${isPrintMode ? 'mb-1' : 'mb-4'}`}>
                <div className={`flex-shrink-0 ${isPrintMode ? 'w-6 h-6 rounded-lg' : 'w-10 h-10 rounded-xl'} ${colorClass} text-white shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110`}>
                    <Icon size={isPrintMode ? 14 : 20} strokeWidth={2.5} />
                </div>
                <h3 className={`${isPrintMode ? 'text-sm font-bold' : 'text-lg font-extrabold'} text-gray-800 tracking-tight whitespace-nowrap`}>{title}</h3>
            </div>

            <div className={`bg-white rounded-xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden transition-all duration-300 ${isPrintMode ? '' : 'hover:shadow-2xl hover:-translate-y-1'}`}>
                <div className={`bg-gray-50/50 ${isPrintMode ? 'px-2 py-1' : 'px-5 py-3'} border-b border-gray-100 flex text-[9px] font-bold uppercase text-gray-400 tracking-wider`}>
                    <span className="flex-[2]">Jogador</span>
                    <span className="flex-1 text-right">{valueLabel}</span>
                </div>

                <div className={`${isPrintMode ? 'max-h-none' : 'max-h-[480px] overflow-y-auto'} scrollbar-thin`}>
                    {items.length > 0 ? (
                        items.slice(0, isPrintMode ? 15 : 50).map((player, idx) => (
                            <div
                                key={player.id}
                                className={`flex items-center ${isPrintMode ? 'px-2 py-1' : 'px-5 py-4'} border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors group/row`}
                            >
                                <div className="flex-[2] flex items-center gap-2 overflow-hidden">
                                    <div className={`flex-shrink-0 ${isPrintMode ? 'w-4 h-4 text-[9px]' : 'w-7 h-7 text-[11px]'} flex items-center justify-center rounded-full font-black
                                        ${idx === 0 ? 'bg-yellow-400 text-white shadow-sm' :
                                            idx === 1 ? 'bg-slate-300 text-white' :
                                                idx === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        {idx + 1}
                                    </div>
                                    <span className={`${isPrintMode ? 'text-[11px]' : 'text-[13px]'} font-bold text-gray-700 truncate`}>
                                        {player.name}
                                    </span>
                                </div>

                                <span className={`flex-1 text-right font-black ${isPrintMode ? 'text-[11px]' : 'text-[15px]'} ${idx === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {player[valueKey]}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="px-5 py-4 text-center">
                            <p className="text-gray-400 italic text-[11px]">Nenhum dado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full pb-12">
            <div className="justify-end mb-4 px-4 no-print hidden md:flex">
                <button
                    onClick={() => setIsPrintMode(!isPrintMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-md ${isPrintMode
                        ? 'bg-blue-600 text-white scale-105'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    {isPrintMode ? (
                        <>🖨️ Sair do Modo Print</>
                    ) : (
                        <>📸 Ativar Modo Print (Screenshot)</>
                    )}
                </button>
            </div>

            <div className={`px-4 py-2 ${isPrintMode
                ? 'grid grid-cols-6 gap-2 max-w-full'
                : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8'
                }`}>
                <TableComponent
                    title="Craque"
                    items={topCraque}
                    valueLabel="Pts"
                    valueKey="craquePoints"
                    icon={Star}
                    colorClass="bg-yellow-500 shadow-yellow-200"
                />
                <TableComponent
                    title="Xerife"
                    items={topXerife}
                    valueLabel="Pts"
                    valueKey="sheriffPoints"
                    icon={Shield}
                    colorClass="bg-blue-600 shadow-blue-200"
                />
                <TableComponent
                    title="Artilheiro"
                    items={topArtilheiro}
                    valueLabel="Gols"
                    valueKey="goals"
                    icon={Target}
                    colorClass="bg-red-600 shadow-red-200"
                />
                <TableComponent
                    title="Garçom"
                    items={topGarcom}
                    valueLabel="Assis"
                    valueKey="assists"
                    icon={Award}
                    colorClass="bg-green-600 shadow-green-200"
                />
                <TableComponent
                    title="Paredão"
                    items={topParedao}
                    valueLabel="Defesas"
                    valueKey="saves"
                    icon={Award}
                    colorClass="bg-purple-600 shadow-purple-200"
                />
                <TableComponent
                    title="Fominha"
                    items={topFominha}
                    valueLabel="Jogos"
                    valueKey="participations"
                    icon={Flame}
                    colorClass="bg-orange-600 shadow-orange-200"
                />
            </div>

            {isPrintMode && (
                <p className="text-center text-[10px] text-gray-400 mt-4 italic no-print">
                    Dica: Use 100% de zoom no navegador para a melhor qualidade na print.
                </p>
            )}
        </div>
    );
};

export default HighlightsGrid;
