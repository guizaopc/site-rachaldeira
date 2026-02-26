'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Player {
    id: string;
    name: string;
    position?: string;
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

interface RankingTableProps {
    players: Player[];
}

export default function RankingTable({ players }: RankingTableProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPlayers = players.filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-bold">Ranking Geral</CardTitle>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar jogador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">Pos</TableHead>
                                <TableHead>Jogador</TableHead>

                                <TableHead className="text-center">
                                    <span title="Vezes eleito Craque (Top 1)">Craque</span>
                                </TableHead>
                                <TableHead className="text-center">
                                    <span title="Vezes eleito Xerife">Xerife</span>
                                </TableHead>
                                <TableHead className="text-center">
                                    <span title="Gols marcados">Artilheiro</span>
                                </TableHead>
                                <TableHead className="text-center">
                                    <span title="Assistências">Garçom</span>
                                </TableHead>
                                <TableHead className="text-center">
                                    <span title="Defesas difíceis">Paredão</span>
                                </TableHead>
                                <TableHead className="text-center font-bold">
                                    <span title="Participação em Rachas Encerrados">Fominha</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPlayers.length > 0 ? (
                                filteredPlayers
                                    .sort((a, b) => b.points - a.points || b.goals - a.goals)
                                    .map((player, idx) => (
                                        <TableRow key={player.id}>
                                            <TableCell className="font-bold text-lg">
                                                {idx === 0 && '🥇'}
                                                {idx === 1 && '🥈'}
                                                {idx === 2 && '🥉'}
                                                {idx >= 3 && `${idx + 1}º`}
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                {player.name}
                                                {player.position && (
                                                    <span className="text-xs text-gray-500 block">{player.position}</span>
                                                )}
                                            </TableCell>

                                            <TableCell className="text-center text-yellow-600 font-medium">
                                                {player.craquePoints}
                                            </TableCell>
                                            <TableCell className="text-center text-blue-900 font-medium">
                                                {player.sheriffPoints}
                                            </TableCell>
                                            <TableCell className="text-center text-green-700">
                                                {player.goals}
                                            </TableCell>
                                            <TableCell className="text-center text-blue-700">
                                                {player.assists}
                                            </TableCell>
                                            <TableCell className="text-center text-red-700">
                                                {player.saves}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-gray-700">
                                                {player.participations}
                                            </TableCell>
                                        </TableRow>
                                    ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        Nenhum jogador encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
