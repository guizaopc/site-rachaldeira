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
                .select('id, location, top1_id, top1_extra_id, top1_extra2_id, top2_id, top2_extra_id, top2_extra2_id, top3_id, top3_extra_id, top3_extra2_id, sheriff_id, sheriff_extra_id, sheriff_extra2_id');

            const allRachaIds = allRachas?.map(r => r.id) || [];

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
                .in('racha_id', allRachaIds.filter(id => id !== adjRacha?.id));

            // 4. Consolidar: Agora mostramos EXATAMENTE o que está no racha de Ajustes
            const consolidated = membersData?.map(m => {
                const manual = allRachaScouts?.find(s => s.member_id === m.id && s.racha_id === adjRacha?.id);

                return {
                    ...m,
                    manual_id: manual?.id || null,
                    // Valores do racha de ajustes (agora são os totais manuais)
                    total_goals: manual?.goals || 0,
                    total_assists: manual?.assists || 0,
                    total_saves: manual?.difficult_saves || 0,
                    total_presence: manual?.attendance_count || 0,
                    total_top1: (manual as any)?.top1_count || 0,
                    total_top2: (manual as any)?.top2_count || 0,
                    total_top3: (manual as any)?.top3_count || 0,
                    total_sheriff: (manual as any)?.sheriff_count || 0,
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
            const newValue = Math.max(0, (member[totalField] || 0) + delta);

            // 1. Atualizar Supabase (Salvamento automático)
            const { error } = await supabase
                .from('racha_scouts')
                .upsert({
                    racha_id: adjustmentRachaId,
                    member_id: memberId,
                    [dbField]: newValue
                }, { onConflict: 'racha_id,member_id' });

            if (error) throw error;

            // 2. Atualizar estado local para feedback instantâneo
            setMembers(prev => prev.map(m => {
                if (m.id === memberId) {
                    return {
                        ...m,
                        [totalField]: newValue
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Planilha Geral (Geral)</h1>
                    <p className="text-slate-500 font-medium">Edite os números totais da galera diretamente. Os valores aqui são os que aparecem no Ranking.</p>
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

                                        <TableCell><ScoutCell member={member} field="presence" color="slate" onUpdate={updateScoutValue} isSaving={savingId?.startsWith(`${member.id}-presence`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="goals" color="red" onUpdate={updateScoutValue} isSaving={savingId?.startsWith(`${member.id}-goals`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="assists" color="emerald" onUpdate={updateScoutValue} isSaving={savingId?.startsWith(`${member.id}-assists`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="saves" color="purple" onUpdate={updateScoutValue} isSaving={savingId?.startsWith(`${member.id}-saves`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top1" color="yellow" onUpdate={updateScoutValue} isSaving={savingId?.startsWith(`${member.id}-top1`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top2" color="slate" onUpdate={updateScoutValue} isSaving={savingId?.startsWith(`${member.id}-top2`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top3" color="orange" onUpdate={updateScoutValue} isSaving={savingId?.startsWith(`${member.id}-top3`)} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="sheriff" color="blue" onUpdate={updateScoutValue} isSaving={savingId?.startsWith(`${member.id}-sheriff`)} /></TableCell>
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
                    Salvamento Automático Ativo! Cada alteração é salva instantaneamente no banco de dados.
                </p>
            </div>
        </div>
    );
}

function ScoutCell({ member, field, color, onUpdate, isSaving }: any) {
    const totalField = `total_${field}`;
    const colorScheme: any = {
        red: { text: 'text-red-600', btn: 'bg-red-50 text-red-600 hover:bg-red-100' },
        emerald: { text: 'text-emerald-600', btn: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
        purple: { text: 'text-purple-600', btn: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
        yellow: { text: 'text-yellow-600', btn: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' },
        slate: { text: 'text-slate-600', btn: 'bg-slate-50 text-slate-600 hover:bg-slate-100' },
        orange: { text: 'text-orange-600', btn: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
        blue: { text: 'text-blue-600', btn: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    };
    const s = colorScheme[color];

    return (
        <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onUpdate(member.id, field, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors shadow-sm disabled:opacity-50"
                    disabled={isSaving}
                >
                    <Minus size={14} />
                </button>

                <div className={`min-w-[36px] px-1 h-8 flex items-center justify-center rounded-lg font-black text-sm border-2 bg-white ${isSaving ? 'border-dashed border-blue-400 text-blue-400' : 'border-slate-100 text-slate-800'}`}>
                    {isSaving ? '...' : member[totalField] || 0}
                </div>

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
