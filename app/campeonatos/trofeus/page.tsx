import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Star, Target, Shield, Utensils, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function AwardBadge({ emoji, label, member, bg, border, labelColor }: {
    emoji: string;
    label: string;
    member: { name: string; photo_url?: string };
    bg: string;
    border: string;
    labelColor: string;
}) {
    return (
        <div className={`flex flex-col items-center gap-2 p-3 rounded-xl ${bg} ${border} border text-center`}>
            <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm mx-auto">
                    {member.photo_url ? (
                        <img
                            src={member.photo_url}
                            alt={member.name}
                            className="w-full h-full object-cover object-center"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-lg">
                            {emoji}
                        </div>
                    )}
                </div>
                <span className="absolute -bottom-1 -right-1 text-sm leading-none">{emoji}</span>
            </div>
            <div className="min-w-0 w-full">
                <p className={`text-[10px] font-bold ${labelColor} uppercase tracking-wider`}>{label}</p>
                <p className="font-bold text-gray-900 text-xs leading-tight truncate">{member.name}</p>
            </div>
        </div>
    );
}

export const metadata = {
    title: 'Troféus & Campeões | Rachaldeira',
};

interface AwardCardProps {
    icon: React.ReactNode;
    label: string;
    member: { name: string; photo_url?: string; position?: string } | null;
    color: string;
    bgColor: string;
}

function AwardCard({ icon, label, member, color, bgColor }: AwardCardProps) {
    if (!member) return null;
    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl ${bgColor} border border-white/10`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">{label}</p>
                <p className="font-bold text-white text-sm leading-tight truncate">{member.name}</p>
                {member.position && (
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{member.position}</p>
                )}
            </div>
        </div>
    );
}

export default async function TrofeusPage() {
    const supabase = await createClient();

    const { data: championships } = await supabase
        .from('championships')
        .select(`
            *,
            craque:craque_id(id, name, photo_url, position),
            xerifao:xerifao_id(id, name, photo_url, position),
            paredao:paredao_id(id, name, photo_url, position),
            garcom:garcom_id(id, name, photo_url, position),
            artilheiro:artilheiro_id(id, name, photo_url, position),
            champion_team:champion_team_id(id, name, logo_url)
        `)
        .eq('status', 'completed')
        .order('start_date', { ascending: false });

    // Buscar os times campeões (1º lugar) para cada campeonato
    const championsMap: Record<string, any> = {};
    if (championships && championships.length > 0) {
        for (const camp of championships) {
            // Se houver campeão definido manualmente, usa ele
            if ((camp as any).champion_team) {
                championsMap[camp.id] = (camp as any).champion_team;
                continue;
            }

            const { data: matches } = await supabase
                .from('championship_matches')
                .select('*, team_a:team_a_id(id, name, logo_url), team_b:team_b_id(id, name, logo_url)')
                .eq('championship_id', camp.id)
                .eq('status', 'completed');

            if (!matches || matches.length === 0) continue;

            const { data: teams } = await supabase
                .from('teams')
                .select('id, name, logo_url, team_members(members(id, name))')
                .eq('championship_id', camp.id);

            if (!teams) continue;

            // Calcular pontuação
            const standings = teams.map((team: any) => {
                const teamMatches = matches.filter((m: any) =>
                    m.team_a_id === team.id || m.team_b_id === team.id
                );

                let points = 0, wins = 0, goalsFor = 0, goalsAgainst = 0;
                teamMatches.forEach((match: any) => {
                    const isA = match.team_a_id === team.id;
                    const myGoals = isA ? match.score_a : match.score_b;
                    const theirGoals = isA ? match.score_b : match.score_a;
                    goalsFor += myGoals ?? 0;
                    goalsAgainst += theirGoals ?? 0;
                    if (myGoals > theirGoals) { points += 3; wins++; }
                    else if (myGoals === theirGoals) points += 1;
                });

                return { ...team, points, wins, goalDiff: goalsFor - goalsAgainst };
            });

            standings.sort((a: any, b: any) =>
                b.points - a.points || b.wins - a.wins || b.goalDiff - a.goalDiff
            );

            if (standings.length > 0) {
                championsMap[camp.id] = standings[0];
            }
        }
    }

    const totalAwards = championships?.reduce((acc, c) => {
        return acc + [c.craque, c.artilheiro, c.paredao, c.garcom, c.xerifao].filter(Boolean).length;
    }, 0) ?? 0;

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 pt-12 pb-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-3">
                                Troféus & Campeões
                            </h1>
                            <p className="text-gray-500 text-base md:text-lg max-w-xl">
                                A história de cada campeonato, os times que venceram e os jogadores que brilharam.
                            </p>
                        </div>

                        {championships && championships.length > 0 && (
                            <div className="flex gap-10 md:pb-1">
                                <div>
                                    <p className="text-3xl font-black text-[#093a9f]">{championships.length}</p>
                                    <p className="text-gray-400 text-sm font-medium">Campeonatos</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-black text-[#093a9f]">{totalAwards}</p>
                                    <p className="text-gray-400 text-sm font-medium">Prêmios Entregues</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/campeonatos">
                        <Button variant="ghost" className="text-gray-600 hover:text-gray-900 gap-2 -ml-2">
                            <ArrowLeft size={16} />
                            Voltar para Campeonatos
                        </Button>
                    </Link>
                </div>

                {!championships || championships.length === 0 ? (
                    <div className="text-center py-24 text-gray-400">
                        <Trophy size={64} className="mx-auto mb-4 opacity-20" />
                        <p className="text-xl font-semibold">Nenhum campeonato concluído ainda.</p>
                        <p className="text-sm mt-2">A história está sendo escrita!</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {championships.map((camp, index) => {
                            const champion = championsMap[camp.id];
                            const hasAwards = camp.craque || camp.artilheiro || camp.paredao || camp.garcom || camp.xerifao;
                            const year = new Date(camp.start_date).getFullYear();

                            return (
                                <div
                                    key={camp.id}
                                    className="group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300"
                                >
                                    <div className="p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row gap-6">

                                            {/* Logo + Info */}
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                                                        {camp.logo_url ? (
                                                            <img
                                                                src={camp.logo_url}
                                                                alt={camp.name}
                                                                className="w-16 h-16 md:w-20 md:h-20 object-contain"
                                                            />
                                                        ) : (
                                                            <Trophy size={36} className="text-gray-300" />
                                                        )}
                                                    </div>
                                                    <span className="absolute -top-2 -right-2 bg-[#093a9f] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                                        {year}
                                                    </span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">
                                                        {camp.name}
                                                    </h2>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {camp.location} · {camp.format === 'round_robin' ? 'Pontos Corridos' : 'Mata-mata'}
                                                    </p>

                                                    {/* Campeão */}
                                                    {champion && (
                                                        <div className="mt-4 inline-flex items-center gap-3 bg-yellow-50 border border-yellow-200 pl-3 pr-4 py-2 rounded-xl">
                                                            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                                                                <Trophy size={16} className="text-white fill-white" />
                                                            </div>
                                                            {champion.logo_url && (
                                                                <img src={champion.logo_url} alt={champion.name} className="w-8 h-8 object-contain" />
                                                            )}
                                                            <div className="leading-tight">
                                                                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-yellow-600">Campeão</p>
                                                                <p className="text-base font-black text-gray-900">{champion.name}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Link */}
                                            <div className="flex items-center">
                                                <Link href={`/campeonatos/${camp.id}`}>
                                                    <Button variant="outline" size="sm" className="gap-2 rounded-full whitespace-nowrap">
                                                        Ver campeonato
                                                        <Trophy size={14} />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Prêmios individuais */}
                                        {hasAwards && (
                                            <div className="mt-6 pt-6 border-t border-gray-100">
                                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Prêmios Individuais</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                                    {camp.craque && (
                                                        <AwardBadge emoji="👑" label="Craque" member={camp.craque} bg="bg-yellow-50" border="border-yellow-100" labelColor="text-yellow-700" />
                                                    )}
                                                    {camp.artilheiro && (
                                                        <AwardBadge emoji="⚽" label="Artilheiro" member={camp.artilheiro} bg="bg-green-50" border="border-green-100" labelColor="text-green-700" />
                                                    )}
                                                    {camp.paredao && (
                                                        <AwardBadge emoji="🧤" label="Paredão" member={camp.paredao} bg="bg-blue-50" border="border-blue-100" labelColor="text-blue-700" />
                                                    )}
                                                    {camp.garcom && (
                                                        <AwardBadge emoji="🍽️" label="Garçom" member={camp.garcom} bg="bg-purple-50" border="border-purple-100" labelColor="text-purple-700" />
                                                    )}
                                                    {camp.xerifao && (
                                                        <AwardBadge emoji="👮" label="Xerifão" member={camp.xerifao} bg="bg-red-50" border="border-red-100" labelColor="text-red-700" />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
