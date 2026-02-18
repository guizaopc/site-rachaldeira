'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Save, Play, X, Trophy, Shield, Medal } from 'lucide-react';

export default function ScoutsPage({ params }: { params: Promise<{ rachaId: string }> }) {
    const { rachaId } = use(params);
    const router = useRouter();
    const [racha, setRacha] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [scouts, setScouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [highlights, setHighlights] = useState({
        top1_id: '',
        top2_id: '',
        top3_id: '',
        sheriff_id: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const supabase = createClient();

        // Buscar racha
        const { data: rachaData } = await supabase
            .from('rachas')
            .select('*')
            .eq('id', rachaId)
            .single();

        setRacha(rachaData);
        setHighlights({
            top1_id: rachaData?.top1_id || '',
            top2_id: rachaData?.top2_id || '',
            top3_id: rachaData?.top3_id || '',
            sheriff_id: rachaData?.sheriff_id || '',
        });

        // Buscar apenas confirmados "in"
        const { data: attendanceData } = await supabase
            .from('racha_attendance')
            .select(`
        *,
        members:member_id (
          id,
          name,
          position
        )
      `)
            .eq('racha_id', rachaId)
            .eq('status', 'in');

        setAttendance(attendanceData || []);

        // Buscar scouts existentes
        const { data: scoutsData } = await supabase
            .from('racha_scouts')
            .select('*')
            .eq('racha_id', rachaId);

        // Criar scouts vazios para quem não tem
        const scoutsMap = new Map(scoutsData?.map(s => [s.member_id, s]) || []);
        const initialScouts = attendanceData?.map(att => {
            const existing = scoutsMap.get(att.member_id);
            return existing || {
                id: null,
                racha_id: rachaId,
                member_id: att.member_id,
                goals: 0,
                assists: 0,
                difficult_saves: 0,
                warnings: 0,
            };
        }) || [];

        setScouts(initialScouts);
        setLoading(false);
    };

    const updateScout = (memberId: string, field: string, delta: number) => {
        setScouts(prev => prev.map(s => {
            if (s.member_id === memberId) {
                const newValue = Math.max(0, (s[field] || 0) + delta);
                return { ...s, [field]: newValue };
            }
            return s;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        const supabase = createClient();

        try {
            for (const scout of scouts) {
                if (scout.id) {
                    // Update existing
                    await supabase
                        .from('racha_scouts')
                        .update({
                            goals: scout.goals,
                            assists: scout.assists,
                            difficult_saves: scout.difficult_saves,
                            warnings: scout.warnings,
                        })
                        .eq('id', scout.id);
                } else {
                    // Insert new
                    await supabase
                        .from('racha_scouts')
                        .insert({
                            racha_id: scout.racha_id,
                            member_id: scout.member_id,
                            goals: scout.goals,
                            assists: scout.assists,
                            difficult_saves: scout.difficult_saves,
                            warnings: scout.warnings,
                        });
                }
            }

            alert('Scouts salvos com sucesso!');
            loadData();
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }

        // Save highlights separately to racha
        const { error: hlError } = await supabase
            .from('rachas')
            .update({
                top1_id: highlights.top1_id || null,
                top2_id: highlights.top2_id || null,
                top3_id: highlights.top3_id || null,
                sheriff_id: highlights.sheriff_id || null,
            })
            .eq('id', rachaId);

        if (hlError) alert('Erro ao salvar destaques: ' + hlError.message);
    };


    const handleCloseAndSaveRacha = async () => {
        if (!confirm('Tem certeza que deseja fechar este racha e salvar os scouts? O status mudará para "closed".')) return;

        // First save scouts
        setSaving(true);
        const supabase = createClient();

        try {
            // Save all scouts
            for (const scout of scouts) {
                if (scout.id) {
                    await supabase
                        .from('racha_scouts')
                        .update({
                            goals: scout.goals,
                            assists: scout.assists,
                            difficult_saves: scout.difficult_saves,
                            warnings: scout.warnings,
                        })
                        .eq('id', scout.id);
                } else {
                    await supabase
                        .from('racha_scouts')
                        .insert({
                            racha_id: rachaId,
                            member_id: scout.member_id,
                            goals: scout.goals,
                            assists: scout.assists,
                            difficult_saves: scout.difficult_saves,
                            warnings: scout.warnings,
                        });
                }
            }

            // Save highlights
            await supabase
                .from('rachas')
                .update({
                    top1_id: highlights.top1_id && highlights.top1_id !== 'none' ? highlights.top1_id : null,
                    top2_id: highlights.top2_id && highlights.top2_id !== 'none' ? highlights.top2_id : null,
                    top3_id: highlights.top3_id && highlights.top3_id !== 'none' ? highlights.top3_id : null,
                    sheriff_id: highlights.sheriff_id && highlights.sheriff_id !== 'none' ? highlights.sheriff_id : null,
                })
                .eq('id', rachaId);

            // Then close racha
            await supabase
                .from('rachas')
                .update({ status: 'closed' })
                .eq('id', rachaId);

            // If racha is recurring, create the next one
            if (racha.periodicity === 'weekly' || racha.periodicity === 'monthly') {
                const currentDate = new Date(racha.date_time);
                const nextDate = new Date(currentDate);

                if (racha.periodicity === 'weekly') {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (racha.periodicity === 'monthly') {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                await supabase
                    .from('rachas')
                    .insert({
                        name: racha.name,
                        date_time: nextDate.toISOString(),
                        location: racha.location,
                        periodicity: racha.periodicity,
                        status: 'open',
                    });
            }

            alert('Racha fechado e scouts salvos com sucesso!' +
                (racha.periodicity !== 'once' ? ' Próximo racha criado automaticamente!' : ''));
            router.push('/admin/rachas');
        } catch (error: any) {
            alert('Erro ao fechar racha: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    }

    if (!racha) {
        return <div className="min-h-screen flex items-center justify-center">Racha não encontrado</div>;
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                            ⚡ Scouts ao Vivo
                        </h1>
                        <p className="text-gray-600">
                            {racha.location} - {new Date(racha.date_time).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Status: <span className="font-semibold">{racha.status === 'open' ? 'Aberto' : racha.status === 'locked' ? 'Travado' : racha.status === 'in_progress' ? 'Em andamento' : 'Fechado'}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {racha.status === 'in_progress' && (
                            <Button variant="danger" onClick={handleCloseAndSaveRacha} disabled={saving} size="lg">
                                <Save size={16} className="mr-2" />
                                {saving ? 'Salvando e Fechando...' : 'Fechar Racha e Salvar Scouts'}
                            </Button>
                        )}
                        <Button onClick={() => router.push('/admin/rachas')} variant="secondary" size="lg">
                            Voltar
                        </Button>
                    </div>
                </div>

                {racha.status === 'closed' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <p className="text-yellow-800">
                            ⚠️ Este racha já foi fechado. Os scouts estão finalizados e não podem ser editados.
                        </p>
                    </div>
                )}

                {attendance.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-gray-500">
                            Nenhum jogador confirmou presença neste racha
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Jogadores Confirmados ({attendance.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Jogador</TableHead>
                                            <TableHead className="text-center">⚽ Gols</TableHead>
                                            <TableHead className="text-center">🎯 Assistências</TableHead>
                                            <TableHead className="text-center">🧱 Defesas</TableHead>
                                            <TableHead className="text-center">⚠️ Advertências</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {scouts.map((scout) => {
                                            const member = attendance.find(a => a.member_id === scout.member_id)?.members;
                                            const isReadonly = racha.status === 'closed';

                                            return (
                                                <TableRow key={scout.member_id}>
                                                    <TableCell className="font-medium">
                                                        {member?.name}
                                                        {member?.position && (
                                                            <span className="text-xs text-gray-500 block">{member.position}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => updateScout(scout.member_id, 'goals', -1)}
                                                                disabled={isReadonly || scout.goals <= 0}
                                                            >
                                                                <Minus size={16} />
                                                            </Button>
                                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                                {scout.goals}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => updateScout(scout.member_id, 'goals', 1)}
                                                                disabled={isReadonly}
                                                            >
                                                                <Plus size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => updateScout(scout.member_id, 'assists', -1)}
                                                                disabled={isReadonly || scout.assists <= 0}
                                                            >
                                                                <Minus size={16} />
                                                            </Button>
                                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                                {scout.assists}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => updateScout(scout.member_id, 'assists', 1)}
                                                                disabled={isReadonly}
                                                            >
                                                                <Plus size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => updateScout(scout.member_id, 'difficult_saves', -1)}
                                                                disabled={isReadonly || scout.difficult_saves <= 0}
                                                            >
                                                                <Minus size={16} />
                                                            </Button>
                                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                                {scout.difficult_saves}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => updateScout(scout.member_id, 'difficult_saves', 1)}
                                                                disabled={isReadonly}
                                                            >
                                                                <Plus size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => updateScout(scout.member_id, 'warnings', -1)}
                                                                disabled={isReadonly || scout.warnings <= 0}
                                                            >
                                                                <Minus size={16} />
                                                            </Button>
                                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                                {scout.warnings}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => updateScout(scout.member_id, 'warnings', 1)}
                                                                disabled={isReadonly}
                                                            >
                                                                <Plus size={16} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Highlights Selection */}
                {attendance.length > 0 && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="text-yellow-500" />
                                Destaques da Partida
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        🥇 Top 1 (Melhor do Dia)
                                    </label>
                                    <Select
                                        value={highlights.top1_id}
                                        onValueChange={(value) => setHighlights({ ...highlights, top1_id: value })}
                                        disabled={racha.status === 'closed'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum</SelectItem>
                                            {attendance.map((a) => (
                                                <SelectItem key={a.member_id} value={a.member_id}>
                                                    {a.members.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        🥈 Top 2
                                    </label>
                                    <Select
                                        value={highlights.top2_id}
                                        onValueChange={(value) => setHighlights({ ...highlights, top2_id: value })}
                                        disabled={racha.status === 'closed'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum</SelectItem>
                                            {attendance.map((a) => (
                                                <SelectItem key={a.member_id} value={a.member_id}>
                                                    {a.members.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        🥉 Top 3
                                    </label>
                                    <Select
                                        value={highlights.top3_id}
                                        onValueChange={(value) => setHighlights({ ...highlights, top3_id: value })}
                                        disabled={racha.status === 'closed'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum</SelectItem>
                                            {attendance.map((a) => (
                                                <SelectItem key={a.member_id} value={a.member_id}>
                                                    {a.members.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        👮 Xerife (Melhor Defensor)
                                    </label>
                                    <Select
                                        value={highlights.sheriff_id}
                                        onValueChange={(value) => setHighlights({ ...highlights, sheriff_id: value })}
                                        disabled={racha.status === 'closed'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum</SelectItem>
                                            {attendance.map((a) => (
                                                <SelectItem key={a.member_id} value={a.member_id}>
                                                    {a.members.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}


            </div>
        </main>
    );
}
