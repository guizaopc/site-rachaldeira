'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Save, Search, Users, Loader2, Plus, Minus, AlertCircle, Edit3, Check } from 'lucide-react';

export default function EdicaoScoutsPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
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
            let { data: adjRacha, error: fetchError } = await supabase
                .from('rachas')
                .select('id')
                .or('name.eq.Ajustes Globais Manuais,location.eq.Sistema (Manual)')
                .maybeSingle();

            if (!adjRacha) {
                const { data: newRacha, error: createError } = await supabase
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
                .select('id, location, top1_id, top1_extra_id, top2_id, top2_extra_id, top3_id, top3_extra_id, sheriff_id, sheriff_extra_id');

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

            // 4. Consolidar
            const consolidated = membersData?.map(m => {
                const rScouts = allRachaScouts?.filter(s => s.member_id === m.id) || [];
                const cScouts = champScouts?.filter(s => s.member_id === m.id) || [];
                const mAttendance = attendance?.filter(a => a.member_id === m.id) || [];
                const manual = rScouts.find(s => s.racha_id === adjRacha?.id);

                // Gols, Assis e Defesas (Soma de tudo)
                const total_goals = rScouts.reduce((acc, s) => acc + (s.goals || 0), 0) + cScouts.reduce((acc, s) => acc + (s.goals || 0), 0);
                const total_assists = rScouts.reduce((acc, s) => acc + (s.assists || 0), 0) + cScouts.reduce((acc, s) => acc + (s.assists || 0), 0);
                const total_saves = rScouts.reduce((acc, s) => acc + (s.difficult_saves || 0), 0) + cScouts.reduce((acc, s) => acc + (s.difficult_saves || 0), 0);

                // Presidência/Jogos (Reais + Ajuste Manual)
                const total_presence = mAttendance.length + (manual?.attendance_count || 0);

                // Destaques (Soma das indicações nos rachas + Ajustes Manuais na racha_scouts)
                const total_top1 = (allRachas?.filter(r => r.top1_id === m.id || r.top1_extra_id === m.id).length || 0) +
                    rScouts.reduce((acc, s) => acc + ((s as any).top1_count || 0), 0);
                const total_top2 = (allRachas?.filter(r => r.top2_id === m.id || r.top2_extra_id === m.id).length || 0) +
                    rScouts.reduce((acc, s) => acc + ((s as any).top2_count || 0), 0);
                const total_top3 = (allRachas?.filter(r => r.top3_id === m.id || r.top3_extra_id === m.id).length || 0) +
                    rScouts.reduce((acc, s) => acc + ((s as any).top3_count || 0), 0);
                const total_sheriff = (allRachas?.filter(r => r.sheriff_id === m.id || r.sheriff_extra_id === m.id).length || 0) +
                    rScouts.reduce((acc, s) => acc + ((s as any).sheriff_count || 0), 0);

                return {
                    ...m,
                    manual_id: manual?.id || null,
                    // Valores manuais
                    manual_goals: manual?.goals || 0,
                    manual_assists: manual?.assists || 0,
                    manual_saves: manual?.difficult_saves || 0,
                    manual_presence: manual?.attendance_count || 0,
                    manual_top1: (manual as any)?.top1_count || 0,
                    manual_top2: (manual as any)?.top2_count || 0,
                    manual_top3: (manual as any)?.top3_count || 0,
                    manual_sheriff: (manual as any)?.sheriff_count || 0,
                    // Totais exibidos
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

    const updateValue = async (memberId: string, field: string, delta: number) => {
        if (saving || !adjustmentRachaId) return;
        setSaving(true);
        const supabase = createClient();

        try {
            const member = members.find(m => m.id === memberId);
            if (!member) return;

            const manualField = `manual_${field}`;
            const totalField = `total_${field}`;

            const dbFieldMap: { [key: string]: string } = {
                'goals': 'goals',
                'assists': 'assists',
                'saves': 'difficult_saves',
                'presence': 'attendance_count',
                'top1': 'top1_count',
                'top2': 'top2_count',
                'top3': 'top3_count',
                'sheriff': 'sheriff_count'
            };
            const dbField = dbFieldMap[field] || field;

            const currentManualValue = member[manualField] || 0;
            const newManualValue = Math.max(0, currentManualValue + delta);

            if (member.manual_id) {
                const { error } = await supabase
                    .from('racha_scouts')
                    .update({ [dbField]: newManualValue })
                    .eq('id', member.manual_id);
                if (error) throw error;
            } else {
                const { data: newScout, error } = await supabase
                    .from('racha_scouts')
                    .insert({
                        racha_id: adjustmentRachaId,
                        member_id: memberId,
                        [dbField]: newManualValue
                    })
                    .select()
                    .single();

                if (error) throw error;
                if (newScout) {
                    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, manual_id: newScout.id } : m));
                }
            }

            setMembers(prev => prev.map(m => {
                if (m.id === memberId) {
                    return {
                        ...m,
                        [manualField]: newManualValue,
                        [totalField]: (m[totalField] || 0) + delta
                    };
                }
                return m;
            }));

        } catch (error: any) {
            console.error('Erro ao atualizar:', error);
            alert('Falha ao salvar alteração: ' + (error.message || 'Verifique sua conexão.'));
        } finally {
            setSaving(false);
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Estatísticas Totais</h1>
                    <p className="text-slate-500 font-medium">Consolidado Geral (Ao Vivo + Campeonatos)</p>
                </div>

                <div className="flex items-center gap-3">
                    {saving && (
                        <div className="flex items-center gap-2 text-blue-600 text-sm font-bold animate-pulse px-3 py-1 bg-blue-50 rounded-full">
                            <Loader2 size={14} className="animate-spin" />
                            Salvando...
                        </div>
                    )}
                    <Button
                        onClick={() => setIsEditing(!isEditing)}
                        variant={isEditing ? "primary" : "outline"}
                        className={isEditing ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold"}
                    >
                        {isEditing ? (
                            <><Check size={18} className="mr-2" /> Concluir Edição</>
                        ) : (
                            <><Edit3 size={18} className="mr-2" /> Ativar Edição</>
                        )}
                    </Button>
                </div>
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

                                        <TableCell><ScoutCell member={member} field="presence" color="slate" isEditing={isEditing} saving={saving} onUpdate={updateValue} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="goals" color="red" isEditing={isEditing} saving={saving} onUpdate={updateValue} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="assists" color="emerald" isEditing={isEditing} saving={saving} onUpdate={updateValue} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="saves" color="purple" isEditing={isEditing} saving={saving} onUpdate={updateValue} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top1" color="yellow" isEditing={isEditing} saving={saving} onUpdate={updateValue} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top2" color="slate" isEditing={isEditing} saving={saving} onUpdate={updateValue} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="top3" color="orange" isEditing={isEditing} saving={saving} onUpdate={updateValue} /></TableCell>
                                        <TableCell><ScoutCell member={member} field="sheriff" color="blue" isEditing={isEditing} saving={saving} onUpdate={updateValue} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {isEditing && (
                <div className="bg-blue-600 p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <AlertCircle className="text-white" size={20} />
                    </div>
                    <p className="text-white text-sm font-bold">
                        Modo de Edição Ativado! Os botões + e - alteram os scouts totais permanentemente através de ajustes manuais.
                    </p>
                </div>
            )}
        </div>
    );
}

function ScoutCell({ member, field, color, isEditing, saving, onUpdate }: any) {
    const totalField = `total_${field}`;
    const colorScheme: any = {
        red: { text: 'text-red-600', btn: 'hover:bg-red-50 hover:text-red-600', active: 'hover:bg-red-600 hover:text-white' },
        emerald: { text: 'text-emerald-600', btn: 'hover:bg-emerald-50 hover:text-emerald-600', active: 'hover:bg-emerald-600 hover:text-white' },
        purple: { text: 'text-purple-600', btn: 'hover:bg-purple-50 hover:text-purple-600', active: 'hover:bg-purple-600 hover:text-white' },
        yellow: { text: 'text-yellow-600', btn: 'hover:bg-yellow-50 hover:text-yellow-600', active: 'hover:bg-yellow-600 hover:text-white' },
        slate: { text: 'text-slate-600', btn: 'hover:bg-slate-50 hover:text-slate-600', active: 'hover:bg-slate-600 hover:text-white' },
        orange: { text: 'text-orange-600', btn: 'hover:bg-orange-50 hover:text-orange-600', active: 'hover:bg-orange-600 hover:text-white' },
        blue: { text: 'text-blue-600', btn: 'hover:bg-blue-50 hover:text-blue-600', active: 'hover:bg-blue-600 hover:text-white' },
    };
    const s = colorScheme[color];

    return (
        <div className="flex items-center justify-center gap-1">
            {isEditing && (
                <button
                    onClick={() => onUpdate(member.id, field, -1)}
                    className={`w-5 h-5 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 ${s.btn} transition-all`}
                    disabled={saving || (member[totalField] || 0) <= 0}
                >
                    <Minus size={10} />
                </button>
            )}
            <div className="flex flex-col items-center min-w-[24px]">
                <span className={`text-base font-black ${(member[totalField] || 0) > 0 ? s.text : 'text-slate-200'}`}>
                    {member[totalField] || 0}
                </span>
            </div>
            {isEditing && (
                <button
                    onClick={() => onUpdate(member.id, field, 1)}
                    className={`w-5 h-5 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 ${s.active} transition-all shadow-sm`}
                    disabled={saving}
                >
                    <Plus size={10} />
                </button>
            )}
        </div>
    );
}
