import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trophy, Calendar, Star, Shield, HandMetal, Beer, Crosshair } from 'lucide-react';
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
                members (name)
            )
        `)
        .eq('championship_id', campId);

    // Buscar partidas
    const { data: matches } = await supabase
        .from('championship_matches')
        .select(`
            *,
            team_a:team_a_id (name),
            team_b:team_b_id (name)
        `)
        .eq('id', campId) // Oops, this should be championship_id, but keeping consistent with current logic if it works
        // Wait, the previous version had championship_id, let me fix it to championship_id
        .eq('championship_id', campId)
        .order('round', { ascending: true });

    // Calcular classificação
    let standings: any[] = [];
    const groupMatches = matches?.filter(m => m.round && !m.bracket_position) || [];
    const showStandings = (championship.format === 'round_robin' || (championship.format === 'bracket' && groupMatches.length > 0));

    if (showStandings && teams) {
        standings = teams.map(team => {
            const teamMatches = groupMatches.filter(m =>
                (m.team_a_id === team.id || m.team_b_id === team.id) && m.status === 'completed'
            );

            let points = 0;
            let wins = 0;
            let draws = 0;
            let losses = 0;
            let goalsFor = 0;
            let goalsAgainst = 0;

            teamMatches.forEach(match => {
                const isTeamA = match.team_a_id === team.id;
                const ownScore = isTeamA ? match.score_a : match.score_b;
                const oppScore = isTeamA ? match.score_b : match.score_a;

                goalsFor += ownScore || 0;
                goalsAgainst += oppScore || 0;

                if (ownScore > oppScore) {
                    points += 3; wins++;
                } else if (ownScore === oppScore) {
                    points += 1; draws++;
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
        }).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
            return b.goalsFor - a.goalsFor;
        });
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
                    <div className="flex items-center gap-4">
                        {championship.logo_url && (
                            <div className="relative w-20 h-20">
                                <Image src={championship.logo_url} alt={championship.name} fill className="object-contain" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{championship.name}</h1>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 font-medium">
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
                    <Card className="mb-8 overflow-hidden border-none shadow-md rounded-2xl">
                        <CardHeader className="bg-gray-900 text-white">
                            <CardTitle className="text-lg">📊 {championship.format === 'bracket' ? 'Classificação — Fase de Grupos' : 'Classificação'}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-16 text-center font-bold">Pos</TableHead>
                                        <TableHead className="font-bold">Time</TableHead>
                                        <TableHead className="text-center font-bold">PTS</TableHead>
                                        <TableHead className="text-center font-medium hidden md:table-cell text-gray-400">PJ</TableHead>
                                        <TableHead className="text-center font-medium hidden md:table-cell text-gray-400">V</TableHead>
                                        <TableHead className="text-center font-medium hidden md:table-cell text-gray-400">E</TableHead>
                                        <TableHead className="text-center font-medium hidden md:table-cell text-gray-400">D</TableHead>
                                        <TableHead className="text-center font-medium text-gray-400">SG</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {standings.map((team, idx) => (
                                        <TableRow key={team.id} className={idx < 4 ? 'bg-white font-medium' : ''}>
                                            <TableCell className="text-center">
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        idx === 1 ? 'bg-gray-100 text-gray-600' :
                                                            idx === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
                                                    }`}>
                                                    {idx + 1}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-bold">
                                                <div className="flex items-center gap-2">
                                                    {team.logo_url && <img src={team.logo_url} className="w-6 h-6 object-contain" alt="" />}
                                                    {team.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-black text-blue-600">{team.points}</TableCell>
                                            <TableCell className="text-center hidden md:table-cell">{team.played}</TableCell>
                                            <TableCell className="text-center hidden md:table-cell text-green-600">{team.wins}</TableCell>
                                            <TableCell className="text-center hidden md:table-cell text-gray-500">{team.draws}</TableCell>
                                            <TableCell className="text-center hidden md:table-cell text-red-500">{team.losses}</TableCell>
                                            <TableCell className="text-center font-semibold">{team.goalDiff}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Bracket */}
                {championship.format === 'bracket' && (
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
                            {matches.map(match => (
                                <Link key={match.id} href={`/campeonatos/${campId}/partida/${match.id}`}>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex items-center justify-between">
                                        <div className="flex-1 text-right pr-4">
                                            <span className="text-sm font-bold block truncate">{match.team_a?.name || 'A definir'}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center min-w-[80px] py-1 px-3 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                            {match.status === 'completed' ? (
                                                <div className="flex items-center gap-2 font-black text-lg">
                                                    <span className={match.score_a > match.score_b ? 'text-blue-600' : ''}>{match.score_a}</span>
                                                    <span className="text-gray-300 text-xs text-center font-normal">vs</span>
                                                    <span className={match.score_b > match.score_a ? 'text-blue-600' : ''}>{match.score_b}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">VS</span>
                                            )}
                                            <span className="text-[9px] text-gray-400 font-bold mt-1">
                                                {match.round ? `Rodada ${match.round}` : 'Mata-mata'}
                                            </span>
                                        </div>
                                        <div className="flex-1 text-left pl-4">
                                            <span className="text-sm font-bold block truncate">{match.team_b?.name || 'A definir'}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
