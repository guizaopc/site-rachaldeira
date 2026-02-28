'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

interface PlayerStats {
    id: string;
    name: string;
    position?: string;
    goals: number;
    assists: number;
    saves: number;
    warnings: number;
    participations: number;
}

interface StatsTableProps {
    stats: PlayerStats[];
    year: number;
}

export default function StatsTable({ stats, year }: StatsTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [positionFilter, setPositionFilter] = useState('all');

    // Extract unique positions for filter
    const positions = Array.from(new Set(stats.map(s => s.position).filter(Boolean)))
        .map(pos => ({ value: pos as string, label: pos as string }));

    const filterOptions = [
        { value: 'all', label: 'Todas as Posições' },
        ...positions
    ];

    const filteredStats = stats.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
        return matchesSearch && matchesPosition;
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle>Estatísticas Completas {year}</CardTitle>
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar jogador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <div className="relative w-full md:w-48">
                            <Select
                                value={positionFilter}
                                onValueChange={(value) => setPositionFilter(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas as Posições" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Posições</SelectItem>
                                    {positions.map((pos) => (
                                        <SelectItem key={pos.value} value={pos.value}>
                                            {pos.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Jogador</TableHead>
                                <TableHead className="text-center">Participações</TableHead>
                                <TableHead className="text-center">Gols</TableHead>
                                <TableHead className="text-center">Assistências</TableHead>
                                <TableHead className="text-center">Defesas</TableHead>
                                <TableHead className="text-center">Advertências</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStats.length > 0 ? (
                                filteredStats
                                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                    .map(player => (
                                        <TableRow key={player.id}>
                                            <TableCell className="font-medium">
                                                {player.name}
                                                {player.position && (
                                                    <span className="text-xs text-gray-500 block">{player.position}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">{player.participations}</TableCell>
                                            <TableCell className="text-center font-semibold text-green-700">
                                                {player.goals}
                                            </TableCell>
                                            <TableCell className="text-center text-blue-700">
                                                {player.assists}
                                            </TableCell>
                                            <TableCell className="text-center text-red-700">
                                                {player.saves}
                                            </TableCell>
                                            <TableCell className="text-center text-yellow-700">
                                                {player.warnings}
                                            </TableCell>
                                        </TableRow>
                                    ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhum jogador encontrado com os filtros selecionados.
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
