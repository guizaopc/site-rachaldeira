// TEST REFRESH
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Users, Loader2, Plus, Minus, CheckCircle, RefreshCcw } from 'lucide-react';

export default function EdicaoScoutsPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [adjustmentRachaId, setAdjustmentRachaId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const supabase = createClient();
        setLoading(true);

        try {
            // 1. Buscar ou Criar o Racha de Ajustes Globais
            let { data: adjRacha } = await supabase
                .from('rachas')
                .select('id')
                .or('name.eq.Ajustes Globais Manuais,location.eq.Sistema (Manual)')
                .order('created_at', { ascending: true }) // Pegar o primeiro criado para ser o mestre
                .limit(1)
                .maybeSingle();

            if (!adjRacha) {
                const { data: newRacha } = await supabase
                    .from('rachas')
                    .insert({
                        name: 'Ajustes Globais Manuais',
                        date_time: new Date().toISOString(),
                        location: 'Sistema (Manual)',
                        status: 'closed',
                        periodicity: 'once'
                    })
                    .select()
                    .single();
                adjRacha = newRacha;
            }
            setAdjustmentRachaId(adjRacha?.id || null);

            // 2. Buscar membros ativos
            const { data: membersData } = await supabase
                .from('members')
                .select('id, name, position')
                .eq('is_active', true)
                .order('name');

            // 3. Buscar Dados de TODO o sistema
            const { data: allRachas } = await supabase
                .from('rachas')
                .select('id, status, location, top1_id, top1_extra_id, top1_extra2_id, top2_id, top2_extra_id, top2_extra2_id, top3_id, top3_extra_id, top3_extra2_id, sheriff_id, sheriff_extra_id, sheriff_extra2_id');

            const allRachaIds = allRachas?.map(r => r.id) || [];
            const closedRachaIds = allRachas?.filter(r => r.status === 'closed' && r.location !== 'Sistema (Manual)').map(r => r.id) || [];

            const { data: allRachaScouts } = await supabase
                .from('racha_scouts')
                .select('*')
                .in('racha_id', allRachaIds);

            const { data: champScouts } = await supabase
                .from('match_player_stats')
                .select('member_id, goals, assists, difficult_saves');

            const { data: attendance } = await supabase
                .from('racha_attendance')
                .select('member_id, racha_id')
                .eq('status', 'in')
                .in('racha_id', closedRachaIds);

            // 4. Consolidar
            const consolidated = membersData?.map(m => {
                const rScouts = allRachaScouts?.filter(s => s.member_id === m.id) || [];
                const cScouts = champScouts?.filter(s => s.member_id === m.id) || [];
                const mAttendance = attendance?.filter(a => a.member_id === m.id) || [];
                const manual = rScouts.find(s => s.racha_id === adjRacha?.id);

                // Gols, Assis e Defesas (Soma de tudo EXCEPTO campeonatos)
                const total_goals = rScouts.reduce((acc, s) => acc + (s.goals || 0), 0);
                const total_assists = rScouts.reduce((acc, s) => acc + (s.assists || 0), 0);
                const total_saves = rScouts.reduce((acc, s) => acc + (s.difficult_saves || 0), 0);

                // Presidência/Jogos (Reais + Ajuste Manual)
                const total_presence = mAttendance.length + (manual?.attendance_count || 0);

                // Destaques (Soma das indicações nos rachas + Ajustes Manuais na racha_scouts)
                // Incluindo suporte aos novos slots extra2
                const total_top1 = (allRachas?.filter((r: any) => (r.top1_id === m.id || r.top1_extra_id === m.id || r.top1_extra2_id === m.id) && r.id !== adjRacha?.id).length || 0) +
                    rScouts.reduce((acc, s) => acc + ((s as any).top1_count || 0), 0);
                const total_top2 = (allRachas?.filter((r: any) => (r.top2_id === m.id || r.top2_extra_id === m.id || r.top2_extra2_id === m.id) && r.id !== adjRacha?.id).length || 0) +
                    rScouts.reduce((acc, s) => acc + ((s as any).top2_count || 0), 0);
                const total_top3 = (allRachas?.filter((r: any) => (r.top3_id === m.id || r.top3_extra_id === m.id || r.top3_extra2_id === m.id) && r.id !== adjRacha?.id).length || 0) +
                    rScouts.reduce((acc, s) => acc + ((s as any).top3_count || 0), 0);
                const total_sheriff = (allRachas?.filter((r: any) => (r.sheriff_id === m.id || r.sheriff_extra_id === m.id || r.sheriff_extra2_id === m.id) && r.id !== adjRacha?.id).length || 0) +
                    rScouts.reduce((acc, s) => acc + ((s as any).sheriff_count || 0), 0);

                return {
                    ...m,
                    manual_id: manual?.id || null,
                    // Valores manuais (ajustes)
                    manual_goals: manual?.goals || 0,
                    manual_assists: manual?.assists || 0,
                    manual_saves: manual?.difficult_saves || 0,
                    manual_presence: manual?.attendance_count || 0,
                    manual_top1: (manual as any)?.top1_count || 0,
                    manual_top2: (manual as any)?.top2_count || 0,
                    manual_top3: (manual as any)?.top3_count || 0,
                    manual_sheriff: (manual as any)?.sheriff_count || 0,
                    // Totais exibidos (Soma real + Ajuste)
                    total_goals,
                    total_assists,
                    total_saves,
                    total_presence,
                    total_top1,
                    total_top2,
                    total_top3,
                    total_sheriff
                };
            }) || [];

            setMembers(consolidated);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateScoutValue = async (memberId: string, field: string, delta: number) => {
        if (!adjustmentRachaId) return;

        setSavingId(`${memberId}-${field}`);
        const supabase = createClient();

        try {
            const member = members.find(m => m.id === memberId);
            const manualField = `manual_${field}`;
            const totalField = `total_${field}`;

            const dbFieldMap: any = {
                'goals': 'goals',
                'assists': 'assists',
                'saves': 'difficult_saves',
                'presence': 'attendance_count',
                'top1': 'top1_count',
                'top2': 'top2_count',
                'top3': 'top3_count',
                'sheriff': 'sheriff_count'
            };

            const dbField = dbFieldMap[field];
            const newManualValue = Math.max(-1000, (member[manualField] || 0) + delta); // Permitir ajustes negativos se necessário

            // 1. Atualizar Supabase (Salvamento automático)
            const { error } = await supabase
                .from('racha_scouts')
                .upsert({
                    racha_id: adjustmentRachaId,
                    member_id: memberId,
                    [dbField]: newManualValue
                }, { onConflict: 'racha_id,member_id' });

            if (error) throw error;

            // 2. Atualizar estado local para feedback instantâneo
            setMembers(prev => prev.map(m => {
                if (m.id === memberId) {
                    return {
                        ...m,
                        [manualField]: newManualValue,
                        [totalField]: Math.max(0, (m[totalField] || 0) + delta)
                    };
                }
                return m;
            }));

        } catch (error: any) {
            console.error('Erro ao salvar ajuste:', error);
        } finally {
            setSavingId(null);
        }
    };

    const handleDirectUpdate = async (memberId: string, field: string, targetedTotal: number) => {
        if (!adjustmentRachaId) return;

        setSavingId(`${memberId}-${field}`);
        const supabase = createClient();

        try {
            const member = members.find(m => m.id === memberId);
            const manualField = `manual_${field}`;
            const totalField = `total_${field}`;

            const dbFieldMap: any = {
                'goals': 'goals',
                'assists': 'assists',
                'saves': 'difficult_saves',
                'presence': 'attendance_count',
                'top1': 'top1_count',
                'top2': 'top2_count',
                'top3': 'top3_count',
                'sheriff': 'sheriff_count'
            };

            const dbField = dbFieldMap[field];

            // Calcula quanto precisamos ajustar no manual para chegar no total desejado
            const currentTotal = member[totalField] || 0;
            const currentManual = member[manualField] || 0;
            const diff = targetedTotal - currentTotal;
            const newManualValue = currentManual + diff;

            // 1. Atualizar Supabase (Salvamento automático)
            const { error } = await supabase
                .from('racha_scouts')
                .upsert({
                    racha_id: adjustmentRachaId,
                    member_id: memberId,
                    [dbField]: newManualValue
                }, { onConflict: 'racha_id,member_id' });

            if (error) throw error;

            // 2. Atualizar estado local
            setMembers(prev => prev.map(m => {
                if (m.id === memberId) {
                    return {
                        ...m,
                        [manualField]: newManualValue,
                        [totalField]: targetedTotal
                    };
                }
                return m;
            }));

        } catch (error: any) {
            console.error('Erro ao salvar ajuste direto:', error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSavingId(null);
        }
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500 font-medium tracking-wide">Carregando planilha...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Planilha de Ajustes (Geral)</h1>
                    <p className="text-slate-500 font-medium">Os ajustes manuais são SOMADOS aos scouts automáticos dos rachas.</p>
                </div>
                <Button onClick={loadData} variant="outline" className="gap-2">
                    <RefreshCcw size={16} /> Atualizar Tudo
                </Button>
            </div>

            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 py-6">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Users className="text-blue-600" size={24} />
                        Lista de Jogadores
                    </CardTitle>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Buscar por nome..."
                            className="pl-10 h-11 border-slate-200 focus:ring-blue-500 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-slate-100">
                                    <TableHead className="w-[180px] font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-8">Integrante</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Jogos</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Gols</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Assis.</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Defesas</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Top 1</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Top 2</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Top 3</TableHead>
                                    <TableHead className="text-center font-bold text-slate-500 uppercase text-[10px] tracking-widest">Xerife</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMembers.map((member) => (
                                    <TableRow key={member.id} className="hover:bg-slate-50/30 transition-colors border-slate-100">
                                        <TableCell className="pl-8 py-5">
                                            <div className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{member.name}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">{member.position || 'N/I'}</div>
                                        </TableCell>

                                        <TableCell><ScoutCell member={member} field="presence" onUpdate={updateScoutValue} onDirectUpdate={handleDirectUpdate} isSaving={savingId?.startsWith(`${member.id}-presence`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="goals" onUpdate={updateScoutValue} onDirectUpdate={handleDirectUpdate} isSaving={savingId?.startsWith(`${member.id}-goals`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="assists" onUpdate={updateScoutValue} onDirectUpdate={handleDirectUpdate} isSaving={savingId?.startsWith(`${member.id}-assists`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="saves" onUpdate={updateScoutValue} onDirectUpdate={handleDirectUpdate} isSaving={savingId?.startsWith(`${member.id}-saves`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top1" onUpdate={updateScoutValue} onDirectUpdate={handleDirectUpdate} isSaving={savingId?.startsWith(`${member.id}-top1`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top2" onUpdate={updateScoutValue} onDirectUpdate={handleDirectUpdate} isSaving={savingId?.startsWith(`${member.id}-top2`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top3" onUpdate={updateScoutValue} onDirectUpdate={handleDirectUpdate} isSaving={savingId?.startsWith(`${member.id}-top3`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="sheriff" onUpdate={updateScoutValue} onDirectUpdate={handleDirectUpdate} isSaving={savingId?.startsWith(`${member.id}-sheriff`)} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                <div className="bg-emerald-600 p-2 rounded-lg">
                    <CheckCircle className="text-white" size={20} />
                </div>
                <p className="text-emerald-800 text-sm font-bold">
                    Salvamento Automático Ativo! Cada alteração é salva instantaneamente no banco de dados. Você também pode digitar os valores diretamente nos campos.
                </p>
            </div>
        </div>
    );
}

function ScoutCell({ member, field, onUpdate, onDirectUpdate, isSaving }: any) {
    const totalField = `total_${field}`;
    const [localValue, setLocalValue] = useState(member[totalField] || 0);

    // Sincronizar valor local quando o membro mudar
    useEffect(() => {
        setLocalValue(member[totalField] || 0);
    }, [member[totalField]]);

    const handleBlur = () => {
        const numValue = parseInt(localValue);
        if (!isNaN(numValue) && numValue !== member[totalField]) {
            onDirectUpdate(member.id, field, numValue);
        } else {
            setLocalValue(member[totalField] || 0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onUpdate(member.id, field, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors shadow-sm disabled:opacity-50"
                    disabled={isSaving}
                >
                    <Minus size={14} />
                </button>

                <input
                    type="text"
                    value={isSaving ? '...' : localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                    className={`w-11 h-8 text-center rounded-lg font-black text-sm border-2 bg-white transition-all
                        ${isSaving ? 'border-dashed border-blue-400 text-blue-400 bg-blue-50' : 'border-slate-100 text-slate-800 focus:border-blue-500 focus:ring-0 focus:outline-none'}
                    `}
                />

                <button
                    onClick={() => onUpdate(member.id, field, 1)}
                    className={`w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50`}
                    disabled={isSaving}
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
}
