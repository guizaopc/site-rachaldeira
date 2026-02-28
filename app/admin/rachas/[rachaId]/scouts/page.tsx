'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Play, X, Trophy, Shield, Medal, RotateCcw, Check, AlertCircle } from 'lucide-react';

export default function ScoutsPage({ params }: { params: Promise<{ rachaId: string }> }) {
    const { rachaId } = use(params);
    const router = useRouter();
    const [racha, setRacha] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [scouts, setScouts] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const supabase = createClient();

        // Verificar admin
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            setIsAdmin(profile?.role === 'admin' || profile?.role === 'director');
        }

        // Buscar racha
        const { data: rachaData } = await supabase
            .from('rachas')
            .select('*')
            .eq('id', rachaId)
            .single();

        setRacha(rachaData);
        setHighlights({
            top1_id: rachaData?.top1_id || 'none',
            top1_extra_id: rachaData?.top1_extra_id || 'none',
            top2_id: rachaData?.top2_id || 'none',
            top2_extra_id: rachaData?.top2_extra_id || 'none',
            top3_id: rachaData?.top3_id || 'none',
            top3_extra_id: rachaData?.top3_extra_id || 'none',
            sheriff_id: rachaData?.sheriff_id || 'none',
            sheriff_extra_id: rachaData?.sheriff_extra_id || 'none',
        });

        // Buscar todos os membros (para a lista de busca/avulsos)
        const { data: allMembers } = await supabase
            .from('members')
            .select('id, name, position')
            .eq('is_active', true)
            .order('name');

        setMembers(allMembers || []);

        // Buscar confirmados "in"
        const { data: attendanceData } = await supabase
            .from('racha_attendance')
            .select(`
                *,
                members:member_id (id, name, position)
            `)
            .eq('racha_id', rachaId)
            .eq('status', 'in');

        setAttendance(attendanceData || []);

        // Buscar scouts existentes
        const { data: scoutsData } = await supabase
            .from('racha_scouts')
            .select('*')
            .eq('racha_id', rachaId);

        const dbScouts = scoutsData || [];

        // Consolidar: Apenas quem está confirmado "IN", ordenado alfabeticamente por nome
        const consolidatedScouts = (attendanceData || [])
            .sort((a, b) => (a.members?.name || '').localeCompare(b.members?.name || ''))
            .map(att => {
                const existing = dbScouts.find(s => s.member_id === att.member_id);
                return {
                    racha_id: rachaId,
                    member_id: att.member_id,
                    goals: existing?.goals || 0,
                    assists: existing?.assists || 0,
                    difficult_saves: existing?.difficult_saves || 0,
                    warnings: existing?.warnings || 0,
                };
            });

        // Adicionar também quem já tem scout salvo, mesmo que não esteja na lista de presença (legado do avulso anterior)
        // mas vamos priorizar a vontade do usuário de "apenas confirmados" filtrando no estado final.
        setScouts(consolidatedScouts);
        setLoading(false);
    };

    const handleSaveManual = async () => {
        setSaving(true);
        const supabase = createClient();
        try {
            // Salvar todos os scouts em lote
            for (const s of scouts) {
                await supabase
                    .from('racha_scouts')
                    .upsert({
                        racha_id: rachaId,
                        member_id: s.member_id,
                        goals: s.goals,
                        assists: s.assists,
                        difficult_saves: s.difficult_saves,
                        warnings: s.warnings,
                    }, { onConflict: 'racha_id,member_id' });
            }
            alert('Scouts salvos com sucesso!');
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const updateScout = (memberId: string, field: string, delta: number) => {
        setScouts(prev => {
            return prev.map(s => {
                if (s.member_id === memberId) {
                    const newVal = Math.max(0, (s[field] || 0) + delta);
                    return { ...s, [field]: newVal };
                }
                return s;
            });
        });
    };

    // Função de carregar dados já lida com a lista. Avulsos desativados conforme pedido.
    const addPlayerToScouts = async (memberId: string) => {
        alert('Funcionalidade de Avulso desativada. Apenas jogadores confirmados aparecem na lista.');
    };

    const filteredScouts = scouts.filter(s => {
        const member = members.find(m => m.id === s.member_id);
        return member?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSaveHighlightsOnly = async () => {
        setSaving(true);
        const supabase = createClient();
        try {
            const { error: hlError } = await supabase
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

            if (hlError) throw hlError;
            alert('Destaques atualizados com sucesso!');
        } catch (error: any) {
            alert('Erro ao salvar destaques: ' + error.message);
        } finally {
            setSaving(false);
        }
    };


    const handleCloseAndSaveRacha = async () => {
        if (!confirm('Tem certeza que deseja SALVAR os scouts e FECHAR este racha? O status mudará para "closed" e a pontuação será oficializada.')) return;

        setSaving(true);
        const supabase = createClient();

        try {
            // 1. PRIMEIRO: Salvar os scouts (Lógica do handleSaveManual)
            for (const s of scouts) {
                await supabase
                    .from('racha_scouts')
                    .upsert({
                        racha_id: rachaId,
                        member_id: s.member_id,
                        goals: s.goals,
                        assists: s.assists,
                        difficult_saves: s.difficult_saves,
                        warnings: s.warnings,
                    }, { onConflict: 'racha_id,member_id' });
            }

            // 2. SEGUNDO: Fechar o racha e salvar destaques
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
                    status: 'closed'
                })
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

            alert('Scouts salvos e racha fechado com sucesso!' +
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
                        {racha.status !== 'closed' && (
                            <Button variant="danger" onClick={handleCloseAndSaveRacha} disabled={saving} size="lg" className="bg-red-600 hover:bg-red-700 font-bold">
                                <X size={20} className="mr-2" />
                                {saving ? 'Fechando...' : 'FECHAR Racha de Hoje'}
                            </Button>
                        )}
                        {racha.status !== 'open' && (
                            <Button variant="outline" onClick={handleOpenConfirmations} disabled={saving} size="lg" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                                <RotateCcw size={16} className="mr-2" />
                                {saving ? 'Abrindo...' : 'Reabrir Confirmações'}
                            </Button>
                        )}
                        <Button onClick={() => router.push('/admin/rachas')} variant="secondary" size="lg">
                            Voltar
                        </Button>
                    </div>
                </div>


                {/* Aviso desativado conforme pedido para focar no botão Salvar manual */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Trophy className="text-yellow-600" size={24} />
                        <div>
                            <p className="text-yellow-800 font-bold text-lg">Gerenciando Scouts do Racha</p>
                            <p className="text-yellow-700 text-sm italic">O seu ranking geral será atualizado ao clicar em Salvar.</p>
                        </div>
                    </div>
                    <Button onClick={handleSaveManual} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 shadow-md">
                        <Check size={20} className="mr-2" />
                        {saving ? 'Salvando...' : 'SALVAR SCOUTS DE HOJE'}
                    </Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1">
                            <CardTitle>Participantes do Racha ({scouts.length})</CardTitle>
                            <p className="text-xs text-slate-500 mt-1">Apenas jogadores que confirmaram presença no site.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Input
                                    placeholder="Buscar na lista..."
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    className="pl-4"
                                />
                            </div>
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
                                        const member = members.find(m => m.id === scout.member_id);
                                        // Permitir edição mesmo se fechado (conforme solicitado pelo user)
                                        const isReadonly = false;

                                        return (
                                            <TableRow key={scout.member_id}>
                                                <TableCell className="font-medium">
                                                    {member?.name || 'Carregando...'}
                                                    <div className="flex items-center gap-1">
                                                        {member?.position && (
                                                            <span className="text-[10px] text-gray-400 uppercase font-bold">{member.position}</span>
                                                        )}

                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => updateScout(scout.member_id, 'goals', -1)}
                                                            disabled={isReadonly || scout.goals <= 0}
                                                            title="Remover"
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
                                                            title="Adicionar"
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
                                                            title="Remover"
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
                                                            title="Adicionar"
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
                                                            title="Remover"
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
                                                            title="Adicionar"
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
                                                            title="Remover"
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
                                                            title="Adicionar"
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
                        <div className="p-4 border-t flex justify-end bg-slate-50">
                            <Button onClick={handleSaveManual} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-sm">
                                <Check size={18} className="mr-2" />
                                {saving ? 'Salvando...' : 'SALVAR SCOUTS DE HOJE'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                {/* Highlights Selection */}
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
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 italic font-medium">+ Top 2 Extra</label>
                                    <Select
                                        value={highlights.top2_extra_id}
                                        onValueChange={(value) => setHighlights({ ...highlights, top2_extra_id: value })}
                                    >
                                        <SelectTrigger className="border-dashed"><SelectValue placeholder="Segundo Top 2..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum</SelectItem>
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                                            {members.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
            </div>
        </main>
    );
}
