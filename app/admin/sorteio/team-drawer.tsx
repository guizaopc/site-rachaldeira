'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Shuffle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Member {
    id: string;
    name: string;
    photo_url: string | null;
    position: string | null;
    level?: number; // 1-5
}

interface TeamDrawerProps {
    confirmedMembers: Member[];
    rachaLocation: string;
    rachaDate: string;
}

export function TeamDrawer({ confirmedMembers, rachaLocation, rachaDate }: TeamDrawerProps) {
    const [teams, setTeams] = useState<Member[][]>([]);
    const [isShuffling, setIsShuffling] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
        new Set(confirmedMembers.map(m => m.id))
    );

    const handleToggleMember = (memberId: string) => {
        setSelectedMemberIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(memberId)) {
                newSet.delete(memberId);
            } else {
                newSet.add(memberId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        setSelectedMemberIds(new Set(confirmedMembers.map(m => m.id)));
    };

    const handleDeselectAll = () => {
        setSelectedMemberIds(new Set());
    };

    const handleDrawTeams = () => {
        const selectedMembers = confirmedMembers.filter(m => selectedMemberIds.has(m.id));

        if (selectedMembers.length === 0) return;

        setIsShuffling(true);
        setTimeout(() => {
            // Function to normalize position
            const normalizePosition = (pos: string | null): 'DEF' | 'MID' | 'ATT' | 'GK' | 'OTHER' => {
                if (!pos) return 'OTHER';
                const p = pos.toLowerCase();
                if (p.includes('gol') || p.includes('gk')) return 'GK';
                if (p.includes('zag') || p.includes('def') || p.includes('lat') || p.includes('bec')) return 'DEF';
                if (p.includes('mei') || p.includes('vol') || p.includes('arm')) return 'MID';
                if (p.includes('ata') || p.includes('pon') || p.includes('cen')) return 'ATT';
                return 'OTHER';
            };

            // Group members by position
            const positionGroups: Record<string, Member[]> = {
                GK: [],
                DEF: [],
                MID: [],
                ATT: [],
                OTHER: []
            };

            selectedMembers.forEach(m => {
                const role = normalizePosition(m.position);
                positionGroups[role].push(m);
            });

            // Sort each group by level (descending)
            Object.values(positionGroups).forEach(group => {
                group.sort((a, b) => (b.level || 1) - (a.level || 1));
            });

            // Determine number of teams
            const totalPlayers = selectedMembers.length;
            const targetTeamSize = 5; // Preference: 5 per team
            let numTeams = Math.floor(totalPlayers / targetTeamSize);
            if (numTeams < 2 && totalPlayers >= 4) {
                numTeams = 2; // Min 2 teams for a match
            } else if (numTeams === 0) {
                numTeams = 1; // Fallback
            }

            const newTeams: Member[][] = Array.from({ length: numTeams }, () => []);
            const teamLevelSums = new Array(numTeams).fill(0);

            // Helper to add player to a specific team
            const addPlayerToTeam = (teamIndex: number, player: Member) => {
                newTeams[teamIndex].push(player);
                teamLevelSums[teamIndex] += (player.level || 1);
            };

            // Helper to find the best team for a player (balancing levels)
            // Strategy: Add to the team with the lowest total level that needs this position?
            // Or simpler: Add to team with lowest total level, period.
            const distributePlayers = (players: Member[]) => {
                for (const player of players) {
                    // Find team with lowest total level sum
                    // Preference: Lowest sum among teams with fewest players
                    let minLen = Math.min(...newTeams.map(t => t.length));
                    const candidateIndices = newTeams
                        .map((t, idx) => ({ idx, len: t.length, sum: teamLevelSums[idx] }))
                        // We want to fill evenly, so restrict to teams with minLen (unless we are filling specific slots)
                        // But here we are just distributing generalized lists.
                        // Let's stick to "Lowest Level Sum" to balance skills, 
                        // BUT we must respect size balance. 
                        // If one team has 3 players and another has 2, give to the one with 2.
                        .sort((a, b) => {
                            if (a.len !== b.len) return a.len - b.len; // Fill empty slots first
                            return a.sum - b.sum; // Then balance levels
                        });

                    const chosenIndex = candidateIndices[0].idx;
                    addPlayerToTeam(chosenIndex, player);
                }
            };

            // Specialized distribution for "Ideal Composition"
            // Ideal: 1 GK, 2 DEF, 1 MID, 2 ATT (Total 6?) 
            // User requested: 5 per team -> 2 Zagueiros, 1 Meio, 2 Atacantes. (Total 5).
            // Usually GKs are separate. If there are GKs, we add them on top or swap? 
            // Let's assume GK is +1 if present, or one of the 5. 
            // If user says 2 Zag, 1 Mei, 2 Ata = 5 players. So GK replaces someone or is extra.
            // Let's distribute GKs first (1 per team max)

            // 1. Distribute GKs
            // We strip GKs from the teams first so they don't count towards the "2 DEF" limit logic yet?
            // Actually, let's just use the generic distribute for GKs first, they take a slot.
            distributePlayers(positionGroups.GK);

            // 2. Distribute DEF (Target 2 per team)
            // We want to ensure each team gets 2 DEFs if possible.
            // We can iterate team by team? No, better to distribute pool of DEFs across teams.
            // Loop 2 times: Round 1 of defs, Round 2 of defs.
            const distributeRestricted = (players: Member[], maxPerTeam: number) => {
                // Determine how many rounds of distribution we can fully do
                // Actually, just distribute normally but prioritize teams that have FEWER of this position than needed?
                // Too complex.
                // Simpler: Just distribute using the balanced logic.
                // Because we sort by level, the strongest DEF goes to Team A, next to Team B...
                // Ideally this results in 1-1-1-1... then 2-2-2-2.
                // So standard "distributePlayers" essentially does Round Robin if counts are equal.
                // It balances size, then level.
                distributePlayers(players);
            };

            // The user wants specifically: 2 DEF, then 1 MID, then 2 ATT.
            // If we just dump them all in `distributePlayers` order:
            // DEF -> fills slots 1..N (each team gets 1 DEF), then slots N+1..2N (each team gets 2nd DEF).
            // MID -> fills slots.
            // ATT -> fills slots.
            // This perfectly achieves the goal of "2 DEF, 1 MID, 2 ATT" per team IF we have exact numbers.
            // If we don't, it "mixes" naturally by filling the next available slots.

            // Order of injection strictly matters to satisfy "Core Requirement first".
            // 1. Defenders (Foundation)
            distributePlayers(positionGroups.DEF);

            // 2. Midfielders (Link)
            distributePlayers(positionGroups.MID);

            // 3. Attackers (Finishers)
            distributePlayers(positionGroups.ATT);

            // 4. Others/Wildcards
            distributePlayers(positionGroups.OTHER);

            setTeams(newTeams);
            setIsShuffling(false);
        }, 800);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sorteio de Times</h2>
                    <p className="text-gray-500">
                        Racha: {rachaDate} • {rachaLocation}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-full border">
                        {selectedMemberIds.size} / {confirmedMembers.length} Selecionados
                    </span>
                    <Button onClick={handleDrawTeams} disabled={isShuffling || selectedMemberIds.size === 0}>
                        <Shuffle className={`mr-2 h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />
                        {isShuffling ? 'Sorteando...' : 'Sortear Times'}
                    </Button>
                </div>
            </div>

            {confirmedMembers.length === 0 && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nenhum confirmado</AlertTitle>
                    <AlertDescription>
                        Ninguém confirmou presença neste racha ainda.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lista de Confirmados (Sidebar/Column) */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>Lista de Confirmados</span>
                                </div>
                            </CardTitle>
                            <div className="flex gap-2 mt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectAll}
                                    className="flex-1 text-xs"
                                >
                                    Todos
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDeselectAll}
                                    className="flex-1 text-xs"
                                >
                                    Nenhum
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                {confirmedMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        onClick={() => handleToggleMember(member.id)}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${selectedMemberIds.has(member.id)
                                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                            : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMemberIds.has(member.id)}
                                            onChange={() => { }}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.photo_url || ''} />
                                            <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{member.position || 'Sem posição'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Times Gerados */}
                <div className="lg:col-span-2">
                    {teams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {teams.map((team, index) => (
                                <Card key={index} className="border-t-4 border-t-blue-600 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3 border-b bg-gray-50/50">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg">Time {index + 1}</CardTitle>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{team.length} Jogadores</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="space-y-3">
                                            {team.map((member) => (
                                                <div key={member.id} className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-gray-200">
                                                        <AvatarImage src={member.photo_url || ''} />
                                                        <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                                        <p className="text-xs text-gray-500">{member.position}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50">
                            <Shuffle className="h-12 w-12 mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Pronto para sortear</h3>
                            <p className="text-sm max-w-sm">
                                Clique no botão "Sortear Times" para gerar as equipes aleatoriamente com base nos confirmados.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
