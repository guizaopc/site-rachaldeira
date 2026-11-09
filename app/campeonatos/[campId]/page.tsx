import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trophy, Calendar, Star, Shield, HandMetal, Beer, Crosshair, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { BracketViewer } from '@/components/bracket-viewer';
export default async function CampeonatoDetalhesPage({ params }: { params: Promise<{ campId: string }> }) {
    const { campId } = await params;
    const supabase = await createClient();

    // Buscar campeonato com destaques
    const { data: championship } = await supabase
        .from('championships')
        .select(`
            *,
            craque:craque_id(id, name, photo_url, position),
            xerifao:xerifao_id(id, name, photo_url, position),
            paredao:paredao_id(id, name, photo_url, position),
            garcom:garcom_id(id, name, photo_url, position),
            artilheiro:artilheiro_id(id, name, photo_url, position)
        `)
        .eq('id', campId)
        .single();

    if (!championship) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Campeonato não encontrado</h1>
                </div>
            </main>
        );
    }

    // Buscar times
    const { data: teams } = await supabase
        .from('teams')
        .select(`
            *,
            team_members (
                members (id, name, photo_url, position)
            )
        `)
        .eq('championship_id', campId);

    const { data: matches } = await supabase
        .from('championship_matches')
        .select(`
            *,
            team_a_id,
            team_b_id,
            team_a:team_a_id (name, logo_url),
            team_b:team_b_id (name, logo_url)
        `)
        .eq('championship_id', campId)
        .order('round', { ascending: true });

    // Calcular classificação
    let standings: any[] = [];
    const groupMatches = matches?.filter(m => !m.bracket_position) || [];
    const is6Teams = championship.format === 'tournament_6_teams';
    const showStandings = (championship.format === 'round_robin' || (is6Teams && groupMatches.length > 0) || (championship.format === 'bracket' && groupMatches.length > 0));

    if (showStandings && teams) {
        standings = teams.map(team => {
            const teamMatches = matches?.filter(m =>
                (m.team_a_id === team.id || m.team_b_id === team.id) && m.status === 'completed'
            ) || [];

            let points = 0;
            let wins = 0;
            let draws = 0;
            let losses = 0;
            let goalsFor = 0;
            let goalsAgainst = 0;

            teamMatches.forEach(match => {
                const isTeamA = match.team_a_id === team.id;
                const ownScore = Number(isTeamA ? match.score_a : match.score_b) || 0;
                const oppScore = Number(isTeamA ? match.score_b : match.score_a) || 0;

                goalsFor += ownScore;
                goalsAgainst += oppScore;

                if (ownScore > oppScore) {
                    points += 3; wins++;
                } else if (ownScore === oppScore) {
                    points += 1; draws++;
                    // Ponto extra por pênaltis no torneio de 6 equipes
                    if (is6Teams && match.penalty_winner_id === team.id) {
                        points += 1;
                    }
                } else {
                    losses++;
                }
            });

            return {
                ...team,
                points,
                played: teamMatches.length,
                wins, draws, losses,
                goalsFor, goalsAgainst,
                goalDiff: goalsFor - goalsAgainst,
            };
        });

        if (is6Teams) {
            // Sort will happen later when splitting into groups
        } else {
            standings.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
                return b.goalsFor - a.goalsFor;
            });
        }
    }

    const highlightCards = [
        { title: 'CRAQUE', member: championship.craque, icon: <Star className="text-yellow-500" />, color: 'from-yellow-500 to-yellow-600' },
        { title: 'ARTILHEIRO', member: championship.artilheiro, icon: <Crosshair className="text-red-500" />, color: 'from-red-500 to-red-600' },
        { title: 'XERIFÃO', member: championship.xerifao, icon: <Shield className="text-blue-500" />, color: 'from-blue-500 to-blue-600' },
        { title: 'PAREDÃO', member: championship.paredao, icon: <HandMetal className="text-orange-500" />, color: 'from-orange-500 to-orange-600' },
        { title: 'GARÇOM', member: championship.garcom, icon: <Beer className="text-green-500" />, color: 'from-green-500 to-green-600' },
    ];

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        {championship.logo_url && (
                            <div className="relative w-32 h-32 md:w-40 md:h-40 filter drop-shadow-md">
                                <Image src={championship.logo_url} alt={championship.name} fill className="object-contain" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">{championship.name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3 text-sm text-gray-500 font-medium">
                                <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(championship.start_date).toLocaleDateString('pt-BR')}</span>
                                <span>📍 {championship.location}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${championship.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                                    championship.status === 'not_started' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {championship.status === 'in_progress' ? 'Em Andamento' :
                                        championship.status === 'not_started' ? 'Não Iniciado' : 'Finalizado'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Highlights Section */}
                {(championship.craque_id || championship.artilheiro_id || championship.xerifao_id || championship.paredao_id || championship.garcom_id) && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            🏆 Destaques do Campeonato
                        </h2>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {highlightCards.map((card, i) => card.member && (
                                <div key={i} className="group relative overflow-hidden bg-white rounded-2xl shadow-md border border-gray-100 transition-all hover:scale-[1.02] hover:shadow-xl">
                                    <div className={`h-1.5 w-full bg-gradient-to-r ${card.color}`} />
                                    <div className="p-4 flex flex-col items-center text-center">
                                        <div className="mb-3 p-2 bg-gray-50 rounded-full group-hover:bg-white transition-colors">
                                            {card.icon}
                                        </div>
                                        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">{card.title}</span>
                                        <div className="relative w-20 h-20 mb-3 rounded-full overflow-hidden border-4 border-gray-50 group-hover:border-white shadow-inner transition-all">
                                            {card.member.photo_url ? (
                                                <Image src={card.member.photo_url} alt={card.member.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                    <Trophy size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-900 leading-tight mb-0.5 text-sm">{card.member.name}</h3>
                                        <p className="text-[10px] text-gray-500 font-medium uppercase">{card.member.position || 'Jogador'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Standings */}
                {showStandings && standings.length > 0 && (
                    <>
                        {/* Se houver grupos definidos, mostramos lado a lado */}
                        {standings.some(t => t.group) ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                <StandingsTable
                                    title="Grupo A"
                                    teams={standings
                                        .filter(t => t.group === 'A' || !t.group)
                                        .sort((a, b) => {
                                            if (b.points !== a.points) return b.points - a.points;
                                            if (b.wins !== a.wins) return b.wins - a.wins;
                                            if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
                                            return b.goalsFor - a.goalsFor;
                                        })
                                    }
                                />
                                <StandingsTable
                                    title="Grupo B"
                                    teams={standings
                                        .filter(t => t.group === 'B')
                                        .sort((a, b) => {
                                            if (b.points !== a.points) return b.points - a.points;
                                            if (b.wins !== a.wins) return b.wins - a.wins;
                                            if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
                                            return b.goalsFor - a.goalsFor;
                                        })
                                    }
                                />
                            </div>
                        ) : (
                            <div className="mb-12">
                                <StandingsTable
                                    title={championship.format === 'bracket' ? 'Classificação — Fase de Grupos' : 'Classificação'}
                                    teams={standings}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Bracket */}
                {(championship.format === 'bracket' || is6Teams) && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            🔥 Fase Mata-Mata
                        </h2>
                        {matches && matches.some(m => m.bracket_position) ? (
                            <BracketViewer matches={matches.filter(m => m.bracket_position)} campId={campId} />
                        ) : (
                            <Card className="rounded-2xl border-dashed border-2">
                                <CardContent className="p-12 text-center text-gray-400">
                                    A fase eliminatória ainda não começou.
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Matches List */}
                {matches && matches.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 mt-8">
                            📅 Agenda de Jogos
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[...matches].sort((a, b) => {
                                const ta = a.scheduled_time || '';
                                const tb = b.scheduled_time || '';
                                if (ta && tb && ta !== tb) return ta.localeCompare(tb);
                                if (ta && !tb) return -1;
                                if (!ta && tb) return 1;
                                return (a.round || 0) - (b.round || 0);
                            }).map(match => (
                                <Link key={match.id} href={`/campeonatos/${campId}/partida/${match.id}`}>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex items-center justify-between">
                                        <div className="flex-1 flex items-center justify-end gap-3 pr-4">
                                            <span className="text-sm font-bold truncate">{match.team_a?.name || 'A definir'}</span>
                                            {match.team_a?.logo_url ? (
                                                <img src={match.team_a.logo_url} className="w-8 h-8 object-contain" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px] text-gray-300">?</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center justify-center min-w-[90px] py-1 px-3 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                            {match.status === 'completed' ? (
                                                <div className="flex items-center gap-2 font-black text-lg">
                                                    <span className={match.score_a > match.score_b ? 'text-blue-600' : ''}>{match.score_a}</span>
                                                    <span className="text-gray-300 text-xs text-center font-normal">vs</span>
                                                    <span className={match.score_b > match.score_a ? 'text-blue-600' : ''}>{match.score_b}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">VS</span>
                                            )}
                                            {match.scheduled_time && (
                                                <span className="text-xs font-black text-blue-600 mt-1">
                                                    🕒 {String(match.scheduled_time).slice(0, 5)}
                                                </span>
                                            )}
                                            <span className="text-[9px] text-gray-400 font-bold mt-1 uppercase">
                                                {match.bracket_position === 'final-1' ? 'Final' :
                                                    match.bracket_position?.startsWith('semi') ? 'Semi-final' :
                                                        match.bracket_position?.startsWith('qf') ? 'Quartas' :
                                                            `Rodada ${match.round || 1}`}
                                            </span>
                                        </div>
                                        <div className="flex-1 flex items-center justify-start gap-3 pl-4">
                                            {match.team_b?.logo_url ? (
                                                <img src={match.team_b.logo_url} className="w-8 h-8 object-contain" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px] text-gray-300">?</div>
                                            )}
                                            <span className="text-sm font-bold truncate">{match.team_b?.name || 'A definir'}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                {/* Teams Lineup */}
                {teams && teams.length > 0 && (
                    <div className="mt-20 space-y-10">
                        <div className="flex flex-col items-center justify-center text-center">
                            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                                <Shield className="text-blue-600" size={32} />
                                Elencos das Equipes
                            </h2>
                            <div className="h-1.5 w-24 bg-blue-600 rounded-full mt-3" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {teams.map(team => (
                                <TeamLineup key={team.id} team={team} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function TeamLineup({ team }: { team: any }) {
    const players = team.team_members?.map((tm: any) => tm.members).filter(Boolean) || [];

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-white rounded-3xl transition-transform hover:scale-[1.01]">
            <div className="relative h-24 bg-gradient-to-r from-blue-700 to-blue-900 flex items-center px-8 overflow-hidden">
                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                    <Shield size={120} className="text-white" />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    {team.logo_url ? (
                        <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                            <img src={team.logo_url} className="w-full h-full object-contain" alt="" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-blue-800 rounded-2xl flex items-center justify-center border-2 border-blue-400/30 text-white shadow-lg">
                            <Shield size={32} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{team.name}</h3>
                        <p className="text-blue-200 text-[10px] font-bold tracking-widest uppercase">{players.length} Atletas Inscritos</p>
                    </div>
                </div>
            </div>
            <CardContent className="p-6">
                <div className="space-y-3">
                    {players.map((player: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center shrink-0">
                                    {player.photo_url ? (
                                        <Image src={player.photo_url} alt={player.name} width={32} height={32} className="object-cover" />
                                    ) : (
                                        <User className="text-gray-400" size={16} />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{player.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{player.position || 'Jogador'}</p>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-gray-300">#{String(idx + 1).padStart(2, '0')}</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function StandingsTable({ title, teams }: { title: string, teams: any[] }) {
    return (
        <Card className="overflow-hidden border border-gray-100 shadow-xl rounded-2xl bg-white text-slate-900 font-sans">
            <CardHeader className="bg-gray-50/80 border-b border-gray-100 py-3 px-4">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-800">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
                <Table>
                    <TableHeader className="bg-white border-b border-gray-50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-10 text-center font-bold text-gray-400 text-[10px] uppercase py-2 px-1">Pos</TableHead>
                            <TableHead className="font-bold text-gray-400 text-[10px] uppercase py-2 px-2">Time</TableHead>
                            <TableHead className="text-center font-black text-gray-900 text-[10px] uppercase py-2 px-1">Pts</TableHead>
                            <TableHead className="text-center font-bold text-gray-400 text-[10px] uppercase py-2 px-1">PJ</TableHead>
                            <TableHead className="text-center font-bold text-gray-400 text-[10px] uppercase py-2 px-1">V</TableHead>
                            <TableHead className="text-center font-bold text-gray-400 text-[10px] uppercase py-2 px-1">E</TableHead>
                            <TableHead className="text-center font-bold text-red-400 text-[10px] uppercase py-2 px-1">D</TableHead>
                            <TableHead className="text-center font-bold text-gray-400 text-[10px] uppercase py-2 px-1 pr-4">SG</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {teams.map((team, idx) => (
                            <TableRow key={team.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                <TableCell className="text-center py-3 px-1">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black 
                                        ${idx === 0 ? 'bg-yellow-400 text-yellow-900 shadow-sm' :
                                            idx === 1 ? 'bg-gray-200 text-gray-600' :
                                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'text-gray-400 font-medium'}
                                    `}>
                                        {idx + 1}
                                    </span>
                                </TableCell>
                                <TableCell className="font-bold text-gray-800 text-sm py-3 px-2">
                                    <div className="flex items-center gap-2">
                                        {team.logo_url ? (
                                            <div className="relative w-6 h-6 shrink-0">
                                                <Image src={team.logo_url} alt="" fill className="object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px] text-gray-300 font-bold shrink-0">?</div>
                                        )}
                                        <span className="truncate max-w-[80px] sm:max-w-none">{team.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-black text-slate-900 text-sm py-3 px-1">{team.points}</TableCell>
                                <TableCell className="text-center text-gray-500 text-[11px] py-3 px-1">{team.played}</TableCell>
                                <TableCell className="text-center text-gray-500 text-[11px] py-3 px-1 font-medium">{team.wins}</TableCell>
                                <TableCell className="text-center text-gray-500 text-[11px] py-3 px-1">{team.draws}</TableCell>
                                <TableCell className="text-center text-red-400 text-[11px] py-3 px-1 font-medium">{team.losses}</TableCell>
                                <TableCell className="text-center font-bold text-gray-400 text-[11px] py-3 px-1 pr-4">
                                    <span className={team.goalDiff > 0 ? 'text-emerald-600' : team.goalDiff < 0 ? 'text-red-500' : ''}>
                                        {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
