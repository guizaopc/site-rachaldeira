'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Save, Play, X, Trophy, Shield, Medal, RotateCcw, AlertTriangle } from 'lucide-react';

export default function ScoutsPage({ params }: { params: Promise<{ rachaId: string }> }) {
    const { rachaId } = use(params);
    const router = useRouter();
    const [racha, setRacha] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [scouts, setScouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlights, setHighlights] = useState({
        top1_id: '',
        top1_extra_id: '',
        top2_id: '',
        top2_extra_id: '',
        top3_id: '',
        top3_extra_id: '',
        sheriff_id: '',
        sheriff_extra_id: '',
    });

    const [initialScouts, setInitialScouts] = useState<any[]>([]);

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
            top1_extra_id: rachaData?.top1_extra_id || '',
            top2_id: rachaData?.top2_id || '',
            top2_extra_id: rachaData?.top2_extra_id || '',
            top3_id: rachaData?.top3_id || '',
            top3_extra_id: rachaData?.top3_extra_id || '',
            sheriff_id: rachaData?.sheriff_id || '',
            sheriff_extra_id: rachaData?.sheriff_extra_id || '',
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

        // Buscar scouts existentes para ter os IDs e valores atuais (para soma)
        const { data: scoutsData } = await supabase
            .from('racha_scouts')
            .select('*')
            .eq('racha_id', rachaId);

        const scoutsMap = new Map(scoutsData?.map(s => [s.member_id, s]) || []);

        // A UI deve começar ZERADA conforme solicitado pelo usuário
        const sessionScouts = attendanceData?.map(att => {
            return {
                racha_id: rachaId,
                member_id: att.member_id,
                goals: 0,
                assists: 0,
                difficult_saves: 0,
                warnings: 0,
            };
        }) || [];

        setInitialScouts(scoutsData || []); // Guardar o que já existia no banco
        setScouts(sessionScouts);
        setLoading(false);
    };

    const updateScout = (memberId: string, field: string, delta: number) => {
        setScouts(prev => prev.map(s => {
            if (s.member_id === memberId) {
                const newValue = (s[field] || 0) + delta;
                return { ...s, [field]: newValue };
            }
            return s;
        }));
    };

    const filteredScouts = scouts.filter(s => {
        const member = attendance.find(a => a.member_id === s.member_id)?.members;
        return member?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSave = async () => {
        setSaving(true);
        const supabase = createClient();

        try {
            for (const sessionScout of scouts) {
                // Pular se não houver alteração nesta sessão
                if (sessionScout.goals === 0 && sessionScout.assists === 0 && sessionScout.difficult_saves === 0 && sessionScout.warnings === 0) {
                    continue;
                }

                // Encontrar o registro original no banco
                const original = initialScouts.find(s => s.member_id === sessionScout.member_id);

                if (original) {
                    // Update: somar o que foi digitado agora ao que já tinha
                    await supabase
                        .from('racha_scouts')
                        .update({
                            goals: (original.goals || 0) + sessionScout.goals,
                            assists: (original.assists || 0) + sessionScout.assists,
                            difficult_saves: (original.difficult_saves || 0) + sessionScout.difficult_saves,
                            warnings: (original.warnings || 0) + sessionScout.warnings,
                        })
                        .eq('id', original.id);
                } else {
                    // Insert new
                    await supabase
                        .from('racha_scouts')
                        .insert({
                            racha_id: sessionScout.racha_id,
                            member_id: sessionScout.member_id,
                            goals: sessionScout.goals,
                            assists: sessionScout.assists,
                            difficult_saves: sessionScout.difficult_saves,
                            warnings: sessionScout.warnings,
                        });
                }
            }

            alert('Scouts processados e somados aos existentes!');
            loadData();
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveHighlightsOnly = async () => {
        setSaving(true);
        const supabase = createClient();
        try {
            const { error: hlError } = await supabase
                .from('rachas')
                .update({
                    top1_id: highlights.top1_id && highlights.top1_id !== 'none' ? highlights.top1_id : null,
                    top2_id: highlights.top2_id && highlights.top2_id !== 'none' ? highlights.top2_id : null,
                    top3_id: highlights.top3_id && highlights.top3_id !== 'none' ? highlights.top3_id : null,
                    top3_extra_id: highlights.top3_extra_id && highlights.top3_extra_id !== 'none' ? highlights.top3_extra_id : null,
                    sheriff_id: highlights.sheriff_id && highlights.sheriff_id !== 'none' ? highlights.sheriff_id : null,
                    sheriff_extra_id: highlights.sheriff_extra_id && highlights.sheriff_extra_id !== 'none' ? highlights.sheriff_extra_id : null,
                })
                .eq('id', rachaId);

            if (hlError) throw hlError;
            alert('Destaques atualizados com sucesso!');
        } catch (error: any) {
            alert('Erro ao salvar destaques: ' + error.message);
        } finally {
            setSaving(false);
        }
    };


    const handleCloseAndSaveRacha = async () => {
        if (!confirm('Tem certeza que deseja fechar este racha e salvar os scouts? O status mudará para "closed".')) return;

        // First save scouts
        setSaving(true);
        const supabase = createClient();

        try {
            // Save all scouts using additive logic
            for (const sessionScout of scouts) {
                // Pular se não houver alteração nesta sessão
                if (sessionScout.goals === 0 && sessionScout.assists === 0 && sessionScout.difficult_saves === 0 && sessionScout.warnings === 0) {
                    continue;
                }

                const original = initialScouts.find(s => s.member_id === sessionScout.member_id);

                if (original) {
                    await supabase
                        .from('racha_scouts')
                        .update({
                            goals: (original.goals || 0) + sessionScout.goals,
                            assists: (original.assists || 0) + sessionScout.assists,
                            difficult_saves: (original.difficult_saves || 0) + sessionScout.difficult_saves,
                            warnings: (original.warnings || 0) + sessionScout.warnings,
                        })
                        .eq('id', original.id);
                } else {
                    await supabase
                        .from('racha_scouts')
                        .insert({
                            racha_id: rachaId,
                            member_id: sessionScout.member_id,
                            goals: sessionScout.goals,
                            assists: sessionScout.assists,
                            difficult_saves: sessionScout.difficult_saves,
                            warnings: sessionScout.warnings,
                        });
                }
            }

            // Save highlights
            await supabase
                .from('rachas')
                .update({
                    top1_id: highlights.top1_id && highlights.top1_id !== 'none' ? highlights.top1_id : null,
                    top1_extra_id: highlights.top1_extra_id && highlights.top1_extra_id !== 'none' ? highlights.top1_extra_id : null,
                    top2_id: highlights.top2_id && highlights.top2_id !== 'none' ? highlights.top2_id : null,
                    top2_extra_id: highlights.top2_extra_id && highlights.top2_extra_id !== 'none' ? highlights.top2_extra_id : null,
                    top3_id: highlights.top3_id && highlights.top3_id !== 'none' ? highlights.top3_id : null,
                    top3_extra_id: highlights.top3_extra_id && highlights.top3_extra_id !== 'none' ? highlights.top3_extra_id : null,
                    sheriff_id: highlights.sheriff_id && highlights.sheriff_id !== 'none' ? highlights.sheriff_id : null,
                    sheriff_extra_id: highlights.sheriff_extra_id && highlights.sheriff_extra_id !== 'none' ? highlights.sheriff_extra_id : null,
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

    const handleReopenRacha = async () => {
        if (!confirm('Deseja reabrir este racha? Isso permitirá editar os scouts numéricos novamente.')) return;

        setSaving(true);
        const supabase = createClient();
        try {
            const { error } = await supabase
                .from('rachas')
                .update({ status: 'in_progress' })
                .eq('id', rachaId);

            if (error) throw error;
            alert('Racha reaberto com sucesso!');
            loadData();
        } catch (error: any) {
            alert('Erro ao reabrir racha: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleOpenConfirmations = async () => {
        if (!confirm('Deseja reabrir as confirmações para este racha? Isso mudará o status para "Aberto".')) return;

        setSaving(true);
        const supabase = createClient();
        try {
            const { error } = await supabase
                .from('rachas')
                .update({ status: 'open' })
                .eq('id', rachaId);

            if (error) throw error;
            alert('Confirmações reabertas!');
            loadData();
        } catch (error: any) {
            alert('Erro ao abrir confirmações: ' + error.message);
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
                            <>
                                <Button variant="outline" onClick={handleSave} disabled={saving} size="lg">
                                    <Save size={16} className="mr-2" />
                                    {saving ? 'Salvando...' : 'Salvar Scouts'}
                                </Button>
                                <Button variant="danger" onClick={handleCloseAndSaveRacha} disabled={saving} size="lg">
                                    <X size={16} className="mr-2" />
                                    {saving ? 'Finalizando...' : 'Finalizar e Fechar Racha'}
                                </Button>
                            </>
                        )}
                        {racha.status !== 'open' && (
                            <Button variant="outline" onClick={handleOpenConfirmations} disabled={saving} size="lg" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                                <RotateCcw size={16} className="mr-2" />
                                {saving ? 'Abrindo...' : 'Reabrir Confirmações'}
                            </Button>
                        )}
                        {racha.status === 'closed' && (
                            <Button variant="outline" onClick={handleReopenRacha} disabled={saving} size="lg" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                                <Play size={16} className="mr-2" />
                                {saving ? 'Reabrindo...' : 'Reativar Scouts (Em Andamento)'}
                            </Button>
                        )}
                        <Button onClick={() => router.push('/admin/rachas')} variant="secondary" size="lg">
                            Voltar
                        </Button>
                    </div>
                </div>

                {racha.status !== 'closed' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                        <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                        <div>
                            <p className="text-yellow-800 font-bold">Modo de Entrada Incremental</p>
                            <p className="text-yellow-700 text-sm">
                                Os scouts abaixo começam em <b>0</b> nesta sessão. Ao salvar, os valores serão <b>SOMADOS</b> aos que já existem no banco de dados.
                                <br />Exemplo: Se o jogador já tem 2 gols e você colocar +1 aqui, o total dele passará a ser 3.
                            </p>
                        </div>
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
                        <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <CardTitle>Jogadores Confirmados ({attendance.length})</CardTitle>
                            <div className="relative w-full md:w-64">
                                <Input
                                    placeholder="Buscar jogador..."
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    className="pl-4"
                                />
                            </div>
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
                                        {filteredScouts.map((scout) => {
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
                                                                onDoubleClick={() => updateScout(scout.member_id, 'goals', -1)}
                                                                disabled={isReadonly || scout.goals <= 0}
                                                                title="Clique duplo para remover"
                                                            >
                                                                <Minus size={16} />
                                                            </Button>
                                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                                {scout.goals}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onDoubleClick={() => updateScout(scout.member_id, 'goals', 1)}
                                                                disabled={isReadonly}
                                                                title="Clique duplo para adicionar"
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
                                                                onDoubleClick={() => updateScout(scout.member_id, 'assists', -1)}
                                                                disabled={isReadonly || scout.assists <= 0}
                                                                title="Clique duplo para remover"
                                                            >
                                                                <Minus size={16} />
                                                            </Button>
                                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                                {scout.assists}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onDoubleClick={() => updateScout(scout.member_id, 'assists', 1)}
                                                                disabled={isReadonly}
                                                                title="Clique duplo para adicionar"
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
                                                                onDoubleClick={() => updateScout(scout.member_id, 'difficult_saves', -1)}
                                                                disabled={isReadonly || scout.difficult_saves <= 0}
                                                                title="Clique duplo para remover"
                                                            >
                                                                <Minus size={16} />
                                                            </Button>
                                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                                {scout.difficult_saves}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onDoubleClick={() => updateScout(scout.member_id, 'difficult_saves', 1)}
                                                                disabled={isReadonly}
                                                                title="Clique duplo para adicionar"
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
                                                                onDoubleClick={() => updateScout(scout.member_id, 'warnings', -1)}
                                                                disabled={isReadonly || scout.warnings <= 0}
                                                                title="Clique duplo para remover"
                                                            >
                                                                <Minus size={16} />
                                                            </Button>
                                                            <span className="font-bold text-lg min-w-[2rem] text-center">
                                                                {scout.warnings}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onDoubleClick={() => updateScout(scout.member_id, 'warnings', 1)}
                                                                disabled={isReadonly}
                                                                title="Clique duplo para adicionar"
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
                )

                }

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
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">🥇 Top 1</label>
                                        <Select
                                            value={highlights.top1_id}
                                            onValueChange={(value) => setHighlights({ ...highlights, top1_id: value })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {attendance.map((a) => (
                                                    <SelectItem key={a.member_id} value={a.member_id}>{a.members.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400 italic font-medium">+ Top 1 Extra</label>
                                        <Select
                                            value={highlights.top1_extra_id}
                                            onValueChange={(value) => setHighlights({ ...highlights, top1_extra_id: value })}
                                        >
                                            <SelectTrigger className="border-dashed"><SelectValue placeholder="Segundo Top 1..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {attendance.map((a) => (
                                                    <SelectItem key={a.member_id} value={a.member_id}>{a.members.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">🥈 Top 2</label>
                                        <Select
                                            value={highlights.top2_id}
                                            onValueChange={(value) => setHighlights({ ...highlights, top2_id: value })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {attendance.map((a) => (
                                                    <SelectItem key={a.member_id} value={a.member_id}>{a.members.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400 italicfont-medium">+ Top 2 Extra</label>
                                        <Select
                                            value={highlights.top2_extra_id}
                                            onValueChange={(value) => setHighlights({ ...highlights, top2_extra_id: value })}
                                        >
                                            <SelectTrigger className="border-dashed"><SelectValue placeholder="Segundo Top 2..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {attendance.map((a) => (
                                                    <SelectItem key={a.member_id} value={a.member_id}>{a.members.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">🥉 Top 3</label>
                                        <Select
                                            value={highlights.top3_id}
                                            onValueChange={(value) => setHighlights({ ...highlights, top3_id: value })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {attendance.map((a) => (
                                                    <SelectItem key={a.member_id} value={a.member_id}>{a.members.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400 italic">+ Top 3 Extra</label>
                                        <Select
                                            value={highlights.top3_extra_id}
                                            onValueChange={(value) => setHighlights({ ...highlights, top3_extra_id: value })}
                                        >
                                            <SelectTrigger className="border-dashed"><SelectValue placeholder="Segundo Top 3..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {attendance.map((a) => (
                                                    <SelectItem key={a.member_id} value={a.member_id}>{a.members.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">👮 Xerife</label>
                                        <Select
                                            value={highlights.sheriff_id}
                                            onValueChange={(value) => setHighlights({ ...highlights, sheriff_id: value })}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {attendance.map((a) => (
                                                    <SelectItem key={a.member_id} value={a.member_id}>{a.members.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400 italic">+ Xerife Extra</label>
                                        <Select
                                            value={highlights.sheriff_extra_id}
                                            onValueChange={(value) => setHighlights({ ...highlights, sheriff_extra_id: value })}
                                        >
                                            <SelectTrigger className="border-dashed"><SelectValue placeholder="Segundo Xerife..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {attendance.map((a) => (
                                                    <SelectItem key={a.member_id} value={a.member_id}>{a.members.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t flex justify-end">
                                <Button
                                    onClick={handleSaveHighlightsOnly}
                                    disabled={saving}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                                >
                                    <Trophy size={18} className="mr-2" />
                                    {saving ? 'Atualizando...' : 'Salvar/Atualizar Destaques'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    );
}
