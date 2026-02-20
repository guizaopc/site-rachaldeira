'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CheckCircle, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RegistrarResultadoPage({ params }: { params: Promise<{ campId: string; matchId: string }> }) {
    const { campId, matchId } = use(params);
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [playerStats, setPlayerStats] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const supabase = createClient();

        // 1. Buscar partida e times
        const { data: matchData } = await supabase
            .from('championship_matches')
            .select(`
                *,
                team_a:team_a_id (
                    id,
                    name,
                    team_members (
                        members (id, name, position)
                    )
                ),
                team_b:team_b_id (
                    id,
                    name,
                    team_members (
                        members (id, name, position)
                    )
                )
            `)
            .eq('id', matchId)
            .single();

        setMatch(matchData);
        setScoreA(matchData?.score_a || 0);
        setScoreB(matchData?.score_b || 0);

        // 2. Buscar scouts existentes
        const { data: statsData } = await supabase
            .from('match_player_stats')
            .select('*')
            .eq('match_id', matchId);

        // 3. Preparar lista de todos os jogadores dos dois times
        const statsMap = new Map(statsData?.map(s => [s.member_id, s]) || []);
        const initialStats: any[] = [];

        const processTeam = (team: any) => {
            if (!team?.team_members) return;
            team.team_members.forEach((tm: any) => {
                const memberId = tm.members.id;
                const existing = statsMap.get(memberId);
                initialStats.push(existing || {
                    id: null,
                    match_id: matchId,
                    member_id: memberId,
                    team_id: team.id,
                    goals: 0,
                    assists: 0,
                    difficult_saves: 0,
                    warnings: 0,
                    name: tm.members.name,
                    position: tm.members.position
                });
            });
        };

        processTeam(matchData.team_a);
        processTeam(matchData.team_b);

        setPlayerStats(initialStats);
        setLoading(false);
    };

    const updateStat = (memberId: string, field: string, delta: number) => {
        setPlayerStats(prev => prev.map(s => {
            if (s.member_id === memberId) {
                const newValue = Math.max(0, (s[field] || 0) + delta);
                // Se o campo for 'goals', atualizar automaticamente o placar do time correspondente
                if (field === 'goals') {
                    if (s.team_id === match.team_a_id) setScoreA(prev => Math.max(0, prev + delta));
                    if (s.team_id === match.team_b_id) setScoreB(prev => Math.max(0, prev + delta));
                }
                return { ...s, [field]: newValue };
            }
            return s;
        }));
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            const supabase = createClient();

            // 1. Atualizar partida
            const { error: matchError } = await supabase
                .from('championship_matches')
                .update({
                    score_a: scoreA,
                    score_b: scoreB,
                    status: 'completed',
                    played_at: new Date().toISOString()
                })
                .eq('id', matchId);

            if (matchError) throw matchError;

            // 2. Upsert scouts
            for (const stat of playerStats) {
                // Só salvar se tiver algum dado ou se já existia
                const hasData = stat.goals > 0 || stat.assists > 0 || stat.difficult_saves > 0 || stat.warnings > 0;

                if (stat.id) {
                    await supabase
                        .from('match_player_stats')
                        .update({
                            goals: stat.goals,
                            assists: stat.assists,
                            difficult_saves: stat.difficult_saves,
                            warnings: stat.warnings,
                        })
                        .eq('id', stat.id);
                } else if (hasData) {
                    await supabase
                        .from('match_player_stats')
                        .insert({
                            match_id: matchId,
                            member_id: stat.member_id,
                            team_id: stat.team_id,
                            goals: stat.goals,
                            assists: stat.assists,
                            difficult_saves: stat.difficult_saves,
                            warnings: stat.warnings,
                        });
                }
            }

            alert('Resultado e scouts salvos com sucesso!');
            router.push(`/admin/campeonatos/${campId}`);
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    if (!match) return <div className="min-h-screen flex items-center justify-center">Partida não encontrada</div>;

    const teamAPlayers = playerStats.filter(s => s.team_id === match.team_a_id);
    const teamBPlayers = playerStats.filter(s => s.team_id === match.team_b_id);

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" onClick={() => router.push(`/admin/campeonatos/${campId}`)}>
                        <ArrowLeft size={20} />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">
                        ⚽ Resultado e Scouts
                    </h1>
                </div>

                {/* Scoreboard */}
                <Card className="mb-8 bg-white shadow-lg overflow-hidden border-t-4 border-t-blue-600">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex-1 text-center">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2 truncate max-w-[250px] mx-auto">
                                    {match.team_a?.name}
                                </h2>
                                <div className="flex items-center justify-center gap-4">
                                    <Button variant="outline" size="icon" onClick={() => setScoreA(Math.max(0, scoreA - 1))}><Minus size={16} /></Button>
                                    <span className="text-6xl font-black text-blue-900 w-24">{scoreA}</span>
                                    <Button variant="outline" size="icon" onClick={() => setScoreA(scoreA + 1)}><Plus size={16} /></Button>
                                </div>
                            </div>

                            <div className="text-4xl font-black text-gray-300">VS</div>

                            <div className="flex-1 text-center">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2 truncate max-w-[250px] mx-auto">
                                    {match.team_b?.name}
                                </h2>
                                <div className="flex items-center justify-center gap-4">
                                    <Button variant="outline" size="icon" onClick={() => setScoreB(Math.max(0, scoreB - 1))}><Minus size={16} /></Button>
                                    <span className="text-6xl font-black text-blue-900 w-24">{scoreB}</span>
                                    <Button variant="outline" size="icon" onClick={() => setScoreB(scoreB + 1)}><Plus size={16} /></Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Scouts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Team A Scouts */}
                    <TeamScoutsTable
                        teamName={match.team_a?.name}
                        players={teamAPlayers}
                        onUpdate={updateStat}
                    />

                    {/* Team B Scouts */}
                    <TeamScoutsTable
                        teamName={match.team_b?.name}
                        players={teamBPlayers}
                        onUpdate={updateStat}
                    />
                </div>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-xl z-10">
                    <div className="max-w-5xl mx-auto flex justify-end gap-3">
                        <Button variant="outline" onClick={() => router.push(`/admin/campeonatos/${campId}`)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving} size="lg" className="px-10">
                            <CheckCircle size={20} className="mr-2" />
                            {saving ? 'Salvando...' : 'Finalizar Partida e Salvar Scouts'}
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}

function TeamScoutsTable({ teamName, players, onUpdate }: { teamName: string, players: any[], onUpdate: any }) {
    return (
        <Card>
            <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="text-lg">Scouts: {teamName}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Jogador</TableHead>
                            <TableHead className="text-center w-24">⚽ Gols</TableHead>
                            <TableHead className="text-center w-24">🎯 Ast</TableHead>
                            <TableHead className="text-center w-24">🧱 Def</TableHead>
                            <TableHead className="text-center w-24">⚠️ Adv</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {players.map((stat) => (
                            <TableRow key={stat.member_id}>
                                <TableCell className="py-2">
                                    <div className="font-medium text-sm">{stat.name}</div>
                                    <div className="text-[10px] text-gray-500 uppercase">{stat.position}</div>
                                </TableCell>
                                <TableCell className="text-center py-2">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => onUpdate(stat.member_id, 'goals', -1)} className="p-1 hover:bg-gray-100 rounded"><Minus size={12} /></button>
                                        <span className={`font-bold ${stat.goals > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{stat.goals}</span>
                                        <button onClick={() => onUpdate(stat.member_id, 'goals', 1)} className="p-1 hover:bg-gray-100 rounded"><Plus size={12} /></button>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center py-2">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => onUpdate(stat.member_id, 'assists', -1)} className="p-1 hover:bg-gray-100 rounded"><Minus size={12} /></button>
                                        <span className={`font-bold ${stat.assists > 0 ? 'text-green-600' : 'text-gray-400'}`}>{stat.assists}</span>
                                        <button onClick={() => onUpdate(stat.member_id, 'assists', 1)} className="p-1 hover:bg-gray-100 rounded"><Plus size={12} /></button>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center py-2">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => onUpdate(stat.member_id, 'difficult_saves', -1)} className="p-1 hover:bg-gray-100 rounded"><Minus size={12} /></button>
                                        <span className={`font-bold ${stat.difficult_saves > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{stat.difficult_saves}</span>
                                        <button onClick={() => onUpdate(stat.member_id, 'difficult_saves', 1)} className="p-1 hover:bg-gray-100 rounded"><Plus size={12} /></button>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center py-2">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => onUpdate(stat.member_id, 'warnings', -1)} className="p-1 hover:bg-gray-100 rounded"><Minus size={12} /></button>
                                        <span className={`font-bold ${stat.warnings > 0 ? 'text-red-600' : 'text-gray-400'}`}>{stat.warnings}</span>
                                        <button onClick={() => onUpdate(stat.member_id, 'warnings', 1)} className="p-1 hover:bg-gray-100 rounded"><Plus size={12} /></button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
