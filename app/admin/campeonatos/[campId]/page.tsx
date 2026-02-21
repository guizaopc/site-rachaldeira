'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Trash2, Users, Play, CheckCircle, Trophy, Upload, Edit3, Save, Star, Shield, HandMetal, Beer, Crosshair } from 'lucide-react';

export default function GerenciarCampeonatoPage({ params }: { params: Promise<{ campId: string }> }) {
    const { campId } = use(params);
    const router = useRouter();
    const [championship, setChampionship] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [isBracketModalOpen, setIsBracketModalOpen] = useState(false);
    const [isManualMatchModalOpen, setIsManualMatchModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);

    // Forms
    const [teamForm, setTeamForm] = useState({ name: '', logo_url: '' });
    const [playerForm, setPlayerForm] = useState({ member_id: '' });
    const [selectedQualifiers, setSelectedQualifiers] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [teamPhotoFile, setTeamPhotoFile] = useState<File | null>(null);

    const [highlights, setHighlights] = useState({
        craque_id: '',
        xerifao_id: '',
        paredao_id: '',
        garcom_id: '',
        artilheiro_id: '',
    });

    const [manualMatchForm, setManualMatchForm] = useState({
        team_a_id: '',
        team_b_id: '',
        score_a: '0',
        score_b: '0',
        stage: 'group',
        status: 'completed' as 'scheduled' | 'completed'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const supabase = createClient();

        // Buscar campeonato
        const { data: champData } = await supabase
            .from('championships')
            .select('*')
            .eq('id', campId)
            .single();

        setChampionship(champData);
        if (champData) {
            setHighlights({
                craque_id: champData.craque_id || 'none',
                xerifao_id: champData.xerifao_id || 'none',
                paredao_id: champData.paredao_id || 'none',
                garcom_id: champData.garcom_id || 'none',
                artilheiro_id: champData.artilheiro_id || 'none',
            });
        }

        // Buscar times com jogadores
        const { data: teamsData } = await supabase
            .from('teams')
            .select(`
                *,
                team_members (
                    members (id, name, position)
                )
            `)
            .eq('championship_id', campId);

        setTeams(teamsData || []);

        // Buscar partidas
        const { data: matchesData } = await supabase
            .from('championship_matches')
            .select(`
                *,
                team_a:team_a_id(name, logo_url),
                team_b:team_b_id(name, logo_url)
            `)
            .eq('championship_id', campId)
            .order('round', { ascending: true })
            .order('played_at', { ascending: true });

        setMatches(matchesData || []);

        // Buscar todos os membros
        const { data: membersData } = await supabase
            .from('members')
            .select('*')
            .order('name');

        setMembers(membersData || []);
        setLoading(false);
    };

    const handleSaveHighlights = async () => {
        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('championships')
                .update({
                    craque_id: highlights.craque_id === 'none' ? null : highlights.craque_id,
                    xerifao_id: highlights.xerifao_id === 'none' ? null : highlights.xerifao_id,
                    paredao_id: highlights.paredao_id === 'none' ? null : highlights.paredao_id,
                    garcom_id: highlights.garcom_id === 'none' ? null : highlights.garcom_id,
                    artilheiro_id: highlights.artilheiro_id === 'none' ? null : highlights.artilheiro_id,
                })
                .eq('id', campId);

            if (error) throw error;
            alert('Destaques do campeonato salvos com sucesso!');
            loadData();
        } catch (err: any) {
            alert('Erro ao salvar destaques: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddTeam = async () => {
        setSaving(true);
        setError('');

        try {
            const supabase = createClient();

            let logoUrl = teamForm.logo_url;
            if (teamPhotoFile) {
                const fileExt = teamPhotoFile.name.split('.').pop();
                const fileName = `team_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('Fotos')
                    .upload(fileName, teamPhotoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('Fotos')
                    .getPublicUrl(fileName);

                logoUrl = publicUrl;
            }

            const { error: insertError } = await supabase
                .from('teams')
                .insert({
                    championship_id: campId,
                    name: teamForm.name,
                    logo_url: logoUrl,
                });

            if (insertError) throw insertError;

            setIsTeamModalOpen(false);
            setTeamForm({ name: '', logo_url: '' });
            setTeamPhotoFile(null);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm('Excluir este time?')) return;
        const supabase = createClient();
        await supabase.from('team_members').delete().eq('team_id', teamId);
        await supabase.from('teams').delete().eq('id', teamId);
        loadData();
    };

    const handleAddPlayer = async () => {
        if (!playerForm.member_id) return;
        setSaving(true);
        try {
            const supabase = createClient();
            await supabase.from('team_members').insert({ team_id: selectedTeam.id, member_id: playerForm.member_id });
            setIsPlayerModalOpen(false);
            setPlayerForm({ member_id: '' });
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRemovePlayer = async (teamId: string, memberId: string) => {
        if (!confirm('Remover jogador?')) return;
        const supabase = createClient();
        await supabase.from('team_members').delete().eq('team_id', teamId).eq('member_id', memberId);
        loadData();
    };

    const handleGenerateKnockout = async () => {
        setSaving(true);
        if (selectedQualifiers.length !== 6) {
            setError('Selecione exatamente 6 times (1º e 2º vão direto para Semis)');
            setSaving(false);
            return;
        }

        try {
            const supabase = createClient();
            const matchesToInsert: any[] = [
                {
                    championship_id: campId,
                    bracket_position: 'qf-1',
                    team_a_id: selectedQualifiers[3], // 4º colocado
                    team_b_id: selectedQualifiers[4], // 5º colocado
                    status: 'scheduled',
                },
                {
                    championship_id: campId,
                    bracket_position: 'qf-2',
                    team_a_id: selectedQualifiers[2], // 3º colocado
                    team_b_id: selectedQualifiers[5], // 6º colocado
                    status: 'scheduled',
                },
                {
                    championship_id: campId,
                    bracket_position: 'semi-1',
                    team_a_id: selectedQualifiers[0], // 1º colocado direto
                    status: 'scheduled',
                },
                {
                    championship_id: campId,
                    bracket_position: 'semi-2',
                    team_a_id: selectedQualifiers[1], // 2º colocado direto
                    status: 'scheduled',
                },
                {
                    championship_id: campId,
                    bracket_position: 'final-1',
                    status: 'scheduled',
                }
            ];

            await supabase.from('championship_matches').insert(matchesToInsert);
            setIsBracketModalOpen(false);
            setSelectedQualifiers([]);
            loadData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateMatches = async () => {
        if (teams.length < 2) return alert('Pelo menos 2 times necessários');
        if (!confirm(`Gerar partidas automáticas?`)) return;

        setSaving(true);
        try {
            const supabase = createClient();
            let generated: any[] = [];

            if (championship.format === 'bracket') {
                const shuffled = [...teams].sort(() => 0.5 - Math.random());
                const chunk = shuffled.length < 6 ? shuffled.length : 4;
                for (let i = 0; i < shuffled.length; i += chunk) {
                    const group = shuffled.slice(i, i + chunk);
                    if (group.length < 2) continue;
                    const ids = group.map(t => t.id);
                    if (ids.length % 2 !== 0) ids.push(null);
                    const rounds = ids.length - 1;
                    for (let r = 0; r < rounds; r++) {
                        for (let m = 0; m < ids.length / 2; m++) {
                            const t1 = ids[m];
                            const t2 = ids[ids.length - 1 - m];
                            if (t1 && t2) generated.push({ championship_id: campId, round: r + 1, team_a_id: t1, team_b_id: t2, status: 'scheduled' });
                        }
                        ids.splice(1, 0, ids.pop()!);
                    }
                }
                generated = generated.filter(m => m.round <= 3);
            } else {
                const roundsCount = championship.rounds || 1;
                const ids = teams.map(t => t.id);
                if (ids.length % 2 !== 0) ids.push(null);
                const numRounds = ids.length - 1;
                for (let turn = 1; turn <= roundsCount; turn++) {
                    for (let r = 0; r < numRounds; r++) {
                        for (let m = 0; m < ids.length / 2; m++) {
                            const t1 = ids[m];
                            const t2 = ids[ids.length - 1 - m];
                            if (t1 && t2) {
                                const isReturn = turn % 2 === 0;
                                generated.push({ championship_id: campId, round: (turn - 1) * numRounds + (r + 1), team_a_id: isReturn ? t2 : t1, team_b_id: isReturn ? t1 : t2, status: 'scheduled' });
                            }
                        }
                        ids.splice(1, 0, ids.pop()!);
                    }
                }
            }

            await supabase.from('championship_matches').insert(generated);
            await supabase.from('championships').update({ status: 'in_progress' }).eq('id', campId);
            loadData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveManualMatch = async () => {
        if (!manualMatchForm.team_a_id || !manualMatchForm.team_b_id) return alert('Selecione os dois times');
        if (manualMatchForm.team_a_id === manualMatchForm.team_b_id) return alert('Times diferentes');

        setSaving(true);
        try {
            const supabase = createClient();
            await supabase.from('championship_matches').insert({
                championship_id: campId,
                team_a_id: manualMatchForm.team_a_id,
                team_b_id: manualMatchForm.team_b_id,
                score_a: parseInt(manualMatchForm.score_a) || 0,
                score_b: parseInt(manualMatchForm.score_b) || 0,
                round: manualMatchForm.stage === 'group' ? 1 : null,
                bracket_position: manualMatchForm.stage !== 'group' ? manualMatchForm.stage : null,
                status: manualMatchForm.status,
                played_at: manualMatchForm.status === 'completed' ? new Date().toISOString() : null
            });

            if (championship.status === 'not_started') await supabase.from('championships').update({ status: 'in_progress' }).eq('id', campId);
            setIsManualMatchModalOpen(false);
            loadData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteMatch = async (matchId: string) => {
        if (!confirm('Excluir esta partida? Os scouts também serão excluídos.')) return;
        const supabase = createClient();
        await supabase.from('match_player_stats').delete().eq('match_id', matchId);
        await supabase.from('championship_matches').delete().eq('id', matchId);
        loadData();
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    if (!championship) return <div className="min-h-screen flex items-center justify-center">Campeonato não encontrado</div>;

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">{championship.name}</h1>
                        <p className="text-gray-600">{championship.location} - {new Date(championship.start_date).toLocaleDateString('pt-BR')}</p>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${championship.status === 'in_progress' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {championship.status === 'in_progress' ? 'Em Andamento' :
                                championship.status === 'completed' ? 'Finalizado' : 'Não Iniciado'}
                        </span>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => setIsManualMatchModalOpen(true)}>
                            <Plus size={16} className="mr-2" /> Partida Manual
                        </Button>
                        {championship.status === 'not_started' && teams.length >= 2 && (
                            <Button onClick={handleGenerateMatches} disabled={saving}><Play size={16} className="mr-2" /> Gerar Automático</Button>
                        )}
                        {championship.status === 'in_progress' && (
                            <>
                                <Button onClick={() => setIsBracketModalOpen(true)}><Trophy size={16} className="mr-2" /> Mata-Mata</Button>
                                <Button variant="secondary" onClick={() => { if (confirm('Finalizar?')) createClient().from('championships').update({ status: 'completed' }).eq('id', campId).then(() => router.push('/admin/campeonatos')); }}><CheckCircle size={16} className="mr-2" /> Finalizar</Button>
                            </>
                        )}
                        <Button variant="secondary" onClick={() => router.push('/admin/campeonatos')}>Voltar</Button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Matches and Highlights (2/3) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Highlights Section */}
                        <Card className="border-t-4 border-t-yellow-500 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between bg-yellow-50/50">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Trophy className="text-yellow-600" size={20} />
                                    Destaques do Campeonato
                                </CardTitle>
                                <Button size="sm" onClick={handleSaveHighlights} disabled={saving} className="bg-yellow-600 hover:bg-yellow-700">
                                    <Save size={16} className="mr-2" /> {saving ? 'Salvando...' : 'Salvar Destaques'}
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Craque */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Star size={16} className="text-yellow-500" /> Craque (Melhor Jogador)
                                        </label>
                                        <Select value={highlights.craque_id} onValueChange={v => setHighlights({ ...highlights, craque_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o Craque" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Artilheiro */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Crosshair size={16} className="text-red-500" /> Artilheiro (Mais Gols)
                                        </label>
                                        <Select value={highlights.artilheiro_id} onValueChange={v => setHighlights({ ...highlights, artilheiro_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o Artilheiro" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Xerifão */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Shield size={16} className="text-blue-600" /> Xerifão (Melhor Zagueiro)
                                        </label>
                                        <Select value={highlights.xerifao_id} onValueChange={v => setHighlights({ ...highlights, xerifao_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o Xerifão" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Paredão */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <HandMetal size={16} className="text-orange-500" /> Paredão (Melhor Goleiro)
                                        </label>
                                        <Select value={highlights.paredao_id} onValueChange={v => setHighlights({ ...highlights, paredao_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o Paredão" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Garçom */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Beer size={16} className="text-green-600" /> Garçom (Mais Assistências)
                                        </label>
                                        <Select value={highlights.garcom_id} onValueChange={v => setHighlights({ ...highlights, garcom_id: v })}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o Garçom" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Partidas ({matches.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {matches.length === 0 ? (
                                    <p className="text-gray-500 text-center py-10">Nenhuma partida gerada</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">Rd</TableHead>
                                                    <TableHead>Confronto</TableHead>
                                                    <TableHead className="text-center">Placar</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Ações</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {matches.map((m) => (
                                                    <TableRow key={m.id}>
                                                        <TableCell className="font-bold text-gray-400 whitespace-nowrap">
                                                            {m.bracket_position === 'final-1' ? 'FINAL' :
                                                                m.bracket_position?.startsWith('semi') ? 'SEMI' :
                                                                    m.bracket_position?.startsWith('qf') ? 'QUARTAS' :
                                                                        `G${m.round || '1'}`}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{m.team_a?.name || '?'}</span>
                                                                <span className="text-xs text-gray-400">vs</span>
                                                                <span className="font-medium">{m.team_b?.name || '?'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="bg-gray-100 rounded px-2 py-1 font-mono font-bold text-lg">
                                                                {m.score_a} - {m.score_b}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${m.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                {m.status === 'completed' ? 'Fim' : 'Agendada'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button size="sm" variant="ghost" title="Registrar Resultado / Scouts" onClick={() => router.push(`/admin/campeonatos/${campId}/partidas/${m.id}`)}>
                                                                    <Edit3 size={16} />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteMatch(m.id)}>
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Teams (1/3) */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Times ({teams.length})</CardTitle>
                                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setIsTeamModalOpen(true)}>
                                    <Plus size={14} /> Novo Time
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {teams.map(t => (
                                    <div key={t.id} className="p-3 bg-gray-50 rounded-lg border">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold truncate">{t.name}</span>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Gerenciar Jogadores" onClick={() => { setSelectedTeam(t); setIsPlayerModalOpen(true); }}>
                                                    <Users size={16} />
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-red-100 hover:border-red-200" title="Excluir Time" onClick={() => handleDeleteTeam(t.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {t.team_members?.map((tm: any) => (
                                                <span key={tm.members.id} className="text-[10px] bg-white border rounded px-1 flex items-center gap-1">
                                                    {tm.members.name}
                                                    <button onClick={() => handleRemovePlayer(t.id, tm.members.id)} className="text-red-400">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Modals */}
                <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Novo Time" footer={<Button onClick={handleAddTeam} disabled={saving}>Salvar</Button>}>
                    <div className="space-y-4">
                        <Input placeholder="Nome do Time" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                        <Input type="file" onChange={e => setTeamPhotoFile(e.target.files?.[0] || null)} />
                    </div>
                </Modal>

                <Modal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} title={`Jogadores - ${selectedTeam?.name}`} footer={<Button onClick={handleAddPlayer} disabled={saving}>Adicionar</Button>}>
                    <Select value={playerForm.member_id} onValueChange={v => setPlayerForm({ member_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                            {members.filter(m => !selectedTeam?.team_members?.some((tm: any) => tm.members.id === m.id)).map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Modal>

                <Modal isOpen={isManualMatchModalOpen} onClose={() => setIsManualMatchModalOpen(false)} title="Nova Partida" footer={<Button onClick={handleSaveManualMatch} disabled={saving}>Salvar</Button>}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Select value={manualMatchForm.team_a_id} onValueChange={v => setManualMatchForm({ ...manualMatchForm, team_a_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Time A" /></SelectTrigger>
                                <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={manualMatchForm.team_b_id} onValueChange={v => setManualMatchForm({ ...manualMatchForm, team_b_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Time B" /></SelectTrigger>
                                <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Input type="number" placeholder="Gols A" value={manualMatchForm.score_a} onChange={e => setManualMatchForm({ ...manualMatchForm, score_a: e.target.value })} />
                            <Input type="number" placeholder="Gols B" value={manualMatchForm.score_b} onChange={e => setManualMatchForm({ ...manualMatchForm, score_b: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Select value={manualMatchForm.stage} onValueChange={(v: any) => setManualMatchForm({ ...manualMatchForm, stage: v })}>
                                <SelectTrigger><SelectValue placeholder="Fase" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="group">Fase de Grupos</SelectItem>
                                    <SelectItem value="qf-1">Quartas 1 (para Semi 1)</SelectItem>
                                    <SelectItem value="qf-2">Quartas 2 (para Semi 2)</SelectItem>
                                    <SelectItem value="semi-1">Semi 1</SelectItem>
                                    <SelectItem value="semi-2">Semi 2</SelectItem>
                                    <SelectItem value="final-1">Final</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={manualMatchForm.status} onValueChange={(v: any) => setManualMatchForm({ ...manualMatchForm, status: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="completed">Finalizada</SelectItem>
                                    <SelectItem value="scheduled">Agendada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isBracketModalOpen} onClose={() => setIsBracketModalOpen(false)} title="Gerar Mata-Mata" footer={<Button onClick={handleGenerateKnockout} disabled={saving}>Gerar</Button>}>
                    <div className="space-y-4">
                        <p className="text-sm">Selecione 6 times na ordem de classificação (1º ao 6º):</p>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {teams.map(t => (
                                <label key={t.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer">
                                    <input type="checkbox" checked={selectedQualifiers.includes(t.id)} onChange={e => e.target.checked ? setSelectedQualifiers([...selectedQualifiers, t.id]) : setSelectedQualifiers(selectedQualifiers.filter(id => id !== t.id))} />
                                    <span>{t.name}</span>
                                    {selectedQualifiers.includes(t.id) && <span className="ml-auto text-xs font-bold">#{selectedQualifiers.indexOf(t.id) + 1}</span>}
                                </label>
                            ))}
                        </div>
                        {error && <p className="text-red-500 text-xs">{error}</p>}
                    </div>
                </Modal>
            </div>
        </main>
    );
}
