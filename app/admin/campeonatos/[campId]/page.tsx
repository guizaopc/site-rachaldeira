'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Plus, Trash2, Users, Play, CheckCircle, Trophy, Upload, Edit3, Save, Star, Shield, HandMetal, Beer, Crosshair, ArrowLeft, Swords, Settings, Clock } from 'lucide-react';

type Tab = 'partidas' | 'times' | 'destaques';

export default function GerenciarCampeonatoPage({ params }: { params: Promise<{ campId: string }> }) {
    const { campId } = use(params);
    const router = useRouter();
    const [championship, setChampionship] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('partidas');

    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [isBracketModalOpen, setIsBracketModalOpen] = useState(false);
    const [isManualMatchModalOpen, setIsManualMatchModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);

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
        champion_team_id: '',
    });

    const [manualMatchForm, setManualMatchForm] = useState({
        team_a_id: '',
        team_b_id: '',
        score_a: '0',
        score_b: '0',
        stage: 'group',
        status: 'completed' as 'scheduled' | 'completed',
        scheduled_time: '',
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const supabase = createClient();

        const { data: champData } = await supabase
            .from('championships').select('*').eq('id', campId).single();

        setChampionship(champData);
        if (champData) {
            setHighlights({
                craque_id: champData.craque_id || 'none',
                xerifao_id: champData.xerifao_id || 'none',
                paredao_id: champData.paredao_id || 'none',
                garcom_id: champData.garcom_id || 'none',
                artilheiro_id: champData.artilheiro_id || 'none',
                champion_team_id: champData.champion_team_id || 'none',
            });
        }

        const { data: teamsData } = await supabase
            .from('teams')
            .select('*, team_members(members(id, name, position))')
            .eq('championship_id', campId).order('name');
        setTeams(teamsData || []);

        const { data: matchesData } = await supabase
            .from('championship_matches')
            .select('*, team_a:team_a_id(name, logo_url), team_b:team_b_id(name, logo_url)')
            .eq('championship_id', campId)
            .order('round', { ascending: true })
            .order('played_at', { ascending: true });
        setMatches(matchesData || []);

        const { data: membersData } = await supabase.from('members').select('*').order('name');
        setMembers(membersData || []);
        setLoading(false);
    };

    const handleUpdateStatus = async (newStatus: 'not_started' | 'in_progress' | 'completed') => {
        const msg = newStatus === 'completed' ? 'Finalizar o campeonato?' : newStatus === 'in_progress' ? 'Iniciar/reabrir o campeonato?' : 'Marcar como não iniciado?';
        if (!confirm(msg)) return;
        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.from('championships').update({ status: newStatus }).eq('id', campId);
            if (error) throw error;
            loadData();
            if (newStatus === 'completed') router.push('/admin/campeonatos');
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally { setSaving(false); }
    };

    const handleSaveHighlights = async () => {
        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.from('championships').update({
                craque_id: highlights.craque_id === 'none' ? null : highlights.craque_id,
                xerifao_id: highlights.xerifao_id === 'none' ? null : highlights.xerifao_id,
                paredao_id: highlights.paredao_id === 'none' ? null : highlights.paredao_id,
                garcom_id: highlights.garcom_id === 'none' ? null : highlights.garcom_id,
                artilheiro_id: highlights.artilheiro_id === 'none' ? null : highlights.artilheiro_id,
            }).eq('id', campId);
            if (error) throw error;
            const { error: champError } = await supabase.from('championships').update({
                champion_team_id: highlights.champion_team_id === 'none' ? null : highlights.champion_team_id,
            }).eq('id', campId);
            if (champError) throw new Error('Destaques salvos, mas não foi possível salvar o campeão: ' + champError.message);
            alert('Destaques salvos!');
            loadData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally { setSaving(false); }
    };

    const handleAddTeam = async () => {
        setSaving(true); setError('');
        try {
            const supabase = createClient();
            let logoUrl = teamForm.logo_url;
            if (teamPhotoFile) {
                const fileExt = teamPhotoFile.name.split('.').pop();
                const fileName = `team_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('Fotos camp-times').upload(fileName, teamPhotoFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('Fotos camp-times').getPublicUrl(fileName);
                logoUrl = publicUrl;
            }
            const { error: insertError } = await supabase.from('teams').insert({
                championship_id: campId, name: teamForm.name, logo_url: logoUrl,
                group: championship.format === 'tournament_6_teams' ? 'A' : null,
            });
            if (insertError) throw insertError;
            setIsTeamModalOpen(false);
            setTeamForm({ name: '', logo_url: '' });
            setTeamPhotoFile(null);
            loadData();
        } catch (err: any) {
            setError(err.message || String(err));
        } finally { setSaving(false); }
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
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleUpdateTeamGroup = async (teamId: string, group: string) => {
        const supabase = createClient();
        await supabase.from('teams').update({ group }).eq('id', teamId);
        loadData();
    };

    const handleRemovePlayer = async (teamId: string, memberId: string) => {
        if (!confirm('Remover jogador?')) return;
        const supabase = createClient();
        await supabase.from('team_members').delete().eq('team_id', teamId).eq('member_id', memberId);
        loadData();
    };

    const handleGenerateKnockout = async () => {
        setSaving(true); setError('');
        const is6Teams = championship.format === 'tournament_6_teams';
        try {
            const supabase = createClient();
            let matchesToInsert: any[] = [];
            let qualifiers: string[] = [];

            if (is6Teams) {
                const stats = teams.map(team => {
                    let pts = 0, wins = 0, gf = 0, ga = 0;
                    matches.filter(m => m.status === 'completed' && !m.bracket_position && (m.team_a_id === team.id || m.team_b_id === team.id)).forEach(m => {
                        const isA = m.team_a_id === team.id;
                        const own = isA ? m.score_a : m.score_b;
                        const opp = isA ? m.score_b : m.score_a;
                        gf += own; ga += opp;
                        if (own > opp) { pts += 3; wins++; }
                        else if (own === opp) { pts += 1; if (m.penalty_winner_id === team.id) pts += 1; }
                    });
                    return { id: team.id, group: team.group || 'A', pts, wins, gd: gf - ga, gf };
                });
                const groupA = stats.filter(s => s.group === 'A').sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.gd - a.gd || b.gf - a.gf);
                const groupB = stats.filter(s => s.group === 'B').sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.gd - a.gd || b.gf - a.gf);
                if (groupA.length < 3 || groupB.length < 3) throw new Error('Certifique-se de ter 3 times em cada grupo.');
                const [t1A, t2A, t3A, t1B, t2B, t3B] = [groupA[0].id, groupA[1].id, groupA[2].id, groupB[0].id, groupB[1].id, groupB[2].id];
                matchesToInsert = [
                    { championship_id: campId, bracket_position: 'qf-1', team_a_id: t2A, team_b_id: t3B, has_draw_advantage: true, status: 'scheduled' },
                    { championship_id: campId, bracket_position: 'qf-2', team_a_id: t2B, team_b_id: t3A, has_draw_advantage: true, status: 'scheduled' },
                    { championship_id: campId, bracket_position: 'semi-1', team_a_id: t1A, status: 'scheduled' },
                    { championship_id: campId, bracket_position: 'semi-2', team_a_id: t1B, status: 'scheduled' },
                    { championship_id: campId, bracket_position: 'final-1', status: 'scheduled' }
                ];
            } else {
                if (selectedQualifiers.length !== 6) { setError('Selecione exatamente 6 times'); setSaving(false); return; }
                qualifiers = selectedQualifiers;
                matchesToInsert = [
                    { championship_id: campId, bracket_position: 'qf-1', team_a_id: qualifiers[3], team_b_id: qualifiers[4], status: 'scheduled' },
                    { championship_id: campId, bracket_position: 'qf-2', team_a_id: qualifiers[2], team_b_id: qualifiers[5], status: 'scheduled' },
                    { championship_id: campId, bracket_position: 'semi-1', team_a_id: qualifiers[0], status: 'scheduled' },
                    { championship_id: campId, bracket_position: 'semi-2', team_a_id: qualifiers[1], status: 'scheduled' },
                    { championship_id: campId, bracket_position: 'final-1', status: 'scheduled' }
                ];
            }
            await supabase.from('championship_matches').insert(matchesToInsert);
            setIsBracketModalOpen(false); setSelectedQualifiers([]);
            loadData(); alert('Mata-mata gerado!');
        } catch (err: any) {
            alert('Erro: ' + err.message); setError(err.message);
        } finally { setSaving(false); }
    };

    const handleGenerateMatches = async () => {
        if (teams.length < 2) return alert('Pelo menos 2 times necessários');
        if (!confirm('Gerar partidas automáticas?')) return;
        setSaving(true);
        try {
            const supabase = createClient();
            let generated: any[] = [];
            if (championship.format === 'tournament_6_teams') {
                const groupA = teams.filter(t => t.group === 'A' || !t.group);
                const groupB = teams.filter(t => t.group === 'B');
                if (groupA.length !== 3 || groupB.length !== 3) return alert('3 times em cada grupo');
                generated = [
                    { championship_id: campId, round: 1, team_a_id: groupA[0].id, team_b_id: groupA[1].id, status: 'scheduled' },
                    { championship_id: campId, round: 2, team_a_id: groupA[0].id, team_b_id: groupA[2].id, status: 'scheduled' },
                    { championship_id: campId, round: 3, team_a_id: groupA[1].id, team_b_id: groupA[2].id, status: 'scheduled' },
                    { championship_id: campId, round: 1, team_a_id: groupB[0].id, team_b_id: groupB[1].id, status: 'scheduled' },
                    { championship_id: campId, round: 2, team_a_id: groupB[0].id, team_b_id: groupB[2].id, status: 'scheduled' },
                    { championship_id: campId, round: 3, team_a_id: groupB[1].id, team_b_id: groupB[2].id, status: 'scheduled' },
                ];
            } else if (championship.format === 'bracket') {
                const shuffled = [...teams].sort(() => 0.5 - Math.random());
                const ids = shuffled.map(t => t.id);
                if (ids.length % 2 !== 0) ids.push(null);
                const rounds = ids.length - 1;
                for (let r = 0; r < rounds; r++) {
                    for (let m = 0; m < ids.length / 2; m++) {
                        const t1 = ids[m]; const t2 = ids[ids.length - 1 - m];
                        if (t1 && t2) generated.push({ championship_id: campId, round: r + 1, team_a_id: t1, team_b_id: t2, status: 'scheduled' });
                    }
                    ids.splice(1, 0, ids.pop()!);
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
                            const t1 = ids[m]; const t2 = ids[ids.length - 1 - m];
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
        } finally { setSaving(false); }
    };

    const handleSaveManualMatch = async () => {
        if (!manualMatchForm.team_a_id || !manualMatchForm.team_b_id) return alert('Selecione os dois times');
        if (manualMatchForm.team_a_id === manualMatchForm.team_b_id) return alert('Times devem ser diferentes');
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
                scheduled_time: manualMatchForm.scheduled_time || null,
                played_at: manualMatchForm.status === 'completed' ? new Date().toISOString() : null
            });
            if (championship.status === 'not_started') await supabase.from('championships').update({ status: 'in_progress' }).eq('id', campId);
            setIsManualMatchModalOpen(false);
            loadData();
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally { setSaving(false); }
    };

    const handleDeleteMatch = async (matchId: string) => {
        if (!confirm('Excluir esta partida e seus scouts?')) return;
        const supabase = createClient();
        await supabase.from('match_player_stats').delete().eq('match_id', matchId);
        await supabase.from('championship_matches').delete().eq('id', matchId);
        loadData();
    };

    const handleTimeChange = async (matchId: string, time: string) => {
        const supabase = createClient();
        await supabase.from('championship_matches').update({ scheduled_time: time || null }).eq('id', matchId);
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, scheduled_time: time || null } : m));
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>;
    if (!championship) return <div className="min-h-screen flex items-center justify-center">Campeonato não encontrado</div>;

    const scheduledMatches = matches.filter(m => m.status === 'scheduled');
    const completedMatches = matches.filter(m => m.status === 'completed');

    const statusColor = championship.status === 'in_progress' ? 'bg-green-100 text-green-700' : championship.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700';
    const statusLabel = championship.status === 'in_progress' ? 'Em Andamento' : championship.status === 'completed' ? 'Finalizado' : 'Não Iniciado';

    const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
        { id: 'partidas', label: 'Partidas', icon: <Swords size={16} />, badge: scheduledMatches.length || undefined },
        { id: 'times', label: 'Times', icon: <Users size={16} />, badge: teams.length || undefined },
        { id: 'destaques', label: 'Destaques', icon: <Star size={16} /> },
    ];

    return (
        <main className="min-h-screen bg-gray-100">
            {/* Header fixo */}
            <div className="bg-[#093a9f] text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => router.push('/admin/campeonatos')} className="text-white/70 hover:text-white p-1 flex-shrink-0">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="font-black text-lg leading-tight truncate">{championship.name}</h1>
                            <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-0.5 ${statusColor}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {championship.status === 'not_started' && (
                            <Button size="sm" onClick={() => handleUpdateStatus('in_progress')} disabled={saving} className="bg-green-500 hover:bg-green-600 text-white text-xs">
                                <Play size={14} className="mr-1" /> Iniciar
                            </Button>
                        )}
                        {championship.status === 'in_progress' && (
                            <Button size="sm" variant="danger" onClick={() => handleUpdateStatus('completed')} disabled={saving} className="text-xs">
                                <CheckCircle size={14} className="mr-1" /> Finalizar
                            </Button>
                        )}
                        {championship.status === 'completed' && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('in_progress')} disabled={saving} className="text-xs bg-white/10 text-white border-white/30">
                                Reabrir
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-5xl mx-auto px-4 flex gap-0 border-t border-white/10">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors relative ${activeTab === tab.id ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.badge !== undefined && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white text-[#093a9f]' : 'bg-white/20 text-white'}`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">

                {/* ===== ABA PARTIDAS ===== */}
                {activeTab === 'partidas' && (
                    <div className="space-y-6">
                        {/* Ações rápidas */}
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setIsManualMatchModalOpen(true)} className="bg-white gap-1">
                                <Plus size={14} /> Nova Partida
                            </Button>
                            {championship.status === 'not_started' && teams.length >= 2 && (
                                <Button size="sm" onClick={handleGenerateMatches} disabled={saving} className="gap-1">
                                    <Play size={14} /> Gerar Partidas Automático
                                </Button>
                            )}
                            {championship.status === 'in_progress' && (
                                <Button size="sm" variant="outline" onClick={() => {
                                    if (championship.format === 'tournament_6_teams') {
                                        if (confirm('Calcular classificação e gerar mata-mata automaticamente?')) handleGenerateKnockout();
                                    } else {
                                        setIsBracketModalOpen(true);
                                    }
                                }} className="bg-white gap-1">
                                    <Trophy size={14} /> Gerar Mata-Mata
                                </Button>
                            )}
                        </div>

                        {/* Partidas agendadas */}
                        {scheduledMatches.length > 0 && (
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">A Jogar ({scheduledMatches.length})</h2>
                                <div className="space-y-3">
                                    {scheduledMatches.map(m => (
                                        <MatchCard key={m.id} match={m} onRegister={() => router.push(`/admin/campeonatos/${campId}/partidas/${m.id}`)} onDelete={() => handleDeleteMatch(m.id)} onTimeChange={handleTimeChange} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Partidas finalizadas */}
                        {completedMatches.length > 0 && (
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Finalizadas ({completedMatches.length})</h2>
                                <div className="space-y-3">
                                    {completedMatches.map(m => (
                                        <MatchCard key={m.id} match={m} onRegister={() => router.push(`/admin/campeonatos/${campId}/partidas/${m.id}`)} onDelete={() => handleDeleteMatch(m.id)} onTimeChange={handleTimeChange} completed />
                                    ))}
                                </div>
                            </div>
                        )}

                        {matches.length === 0 && (
                            <div className="text-center py-20 text-gray-400">
                                <Swords size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-semibold">Nenhuma partida cadastrada</p>
                                <p className="text-sm mt-1">Gere as partidas automaticamente ou adicione manualmente.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== ABA TIMES ===== */}
                {activeTab === 'times' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">{teams.length} time{teams.length !== 1 ? 's' : ''} cadastrado{teams.length !== 1 ? 's' : ''}</p>
                            <Button size="sm" onClick={() => setIsTeamModalOpen(true)} className="gap-1">
                                <Plus size={14} /> Novo Time
                            </Button>
                        </div>

                        {teams.length === 0 && (
                            <div className="text-center py-20 text-gray-400">
                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-semibold">Nenhum time cadastrado</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {teams.map(t => (
                                <Card key={t.id} className="overflow-hidden">
                                    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            {t.logo_url && <img src={t.logo_url} className="w-8 h-8 object-contain rounded" alt="" />}
                                            <span className="font-bold text-gray-900">{t.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {championship.format === 'tournament_6_teams' && (
                                                <Select value={t.group || 'A'} onValueChange={v => handleUpdateTeamGroup(t.id, v)}>
                                                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="A">Grupo A</SelectItem>
                                                        <SelectItem value="B">Grupo B</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setSelectedTeam(t); setIsPlayerModalOpen(true); }}>
                                                <Plus size={13} /> Jogador
                                            </Button>
                                            <Button size="sm" variant="outline" className="gap-1 text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteTeam(t.id)}>
                                                <Trash2 size={13} /> Excluir
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-3">
                                        {t.team_members?.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">Sem jogadores</p>}
                                        <div className="flex flex-wrap gap-1.5">
                                            {t.team_members?.map((tm: any) => (
                                                <div key={tm.members.id} className="flex items-center gap-1 bg-gray-50 border rounded-full px-2.5 py-1 text-xs">
                                                    <span className="font-medium text-gray-700">{tm.members.name}</span>
                                                    <button onClick={() => handleRemovePlayer(t.id, tm.members.id)} className="text-gray-300 hover:text-red-500 ml-0.5 font-bold">×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== ABA DESTAQUES ===== */}
                {activeTab === 'destaques' && (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-500">Selecione os melhores jogadores do campeonato para o hall de troféus.</p>

                        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 space-y-2">
                            <div>
                                <p className="font-bold text-gray-900">🏆 Time Campeão</p>
                                <p className="text-xs text-gray-500">Deixe em &quot;Automático&quot; para usar o vencedor da final (ou o 1º da tabela, se não houver final). Escolha um time só para casos especiais, como W.O.</p>
                            </div>
                            <Select value={highlights.champion_team_id} onValueChange={v => setHighlights({ ...highlights, champion_team_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— Automático —</SelectItem>
                                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AwardSelect label="👑 Craque" sublabel="Melhor jogador" value={highlights.craque_id} onChange={v => setHighlights({ ...highlights, craque_id: v })} members={members} />
                            <AwardSelect label="⚽ Artilheiro" sublabel="Mais gols" value={highlights.artilheiro_id} onChange={v => setHighlights({ ...highlights, artilheiro_id: v })} members={members} />
                            <AwardSelect label="🧤 Paredão" sublabel="Melhor goleiro" value={highlights.paredao_id} onChange={v => setHighlights({ ...highlights, paredao_id: v })} members={members} />
                            <AwardSelect label="🍽️ Garçom" sublabel="Mais assistências" value={highlights.garcom_id} onChange={v => setHighlights({ ...highlights, garcom_id: v })} members={members} />
                            <AwardSelect label="👮 Xerifão" sublabel="Melhor zagueiro" value={highlights.xerifao_id} onChange={v => setHighlights({ ...highlights, xerifao_id: v })} members={members} />
                        </div>

                        <Button onClick={handleSaveHighlights} disabled={saving} className="w-full" size="lg">
                            <Save size={18} className="mr-2" /> {saving ? 'Salvando...' : 'Salvar Destaques'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Novo Time"
                footer={<><Button variant="secondary" onClick={() => setIsTeamModalOpen(false)}>Cancelar</Button><Button onClick={handleAddTeam} disabled={saving}>Salvar</Button></>}>
                <div className="space-y-4">
                    {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
                    <Input placeholder="Nome do Time *" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                    <Input type="file" onChange={e => setTeamPhotoFile(e.target.files?.[0] || null)} />
                </div>
            </Modal>

            <Modal isOpen={isPlayerModalOpen} onClose={() => setIsPlayerModalOpen(false)} title={`Adicionar jogador — ${selectedTeam?.name}`}
                footer={<><Button variant="secondary" onClick={() => setIsPlayerModalOpen(false)}>Cancelar</Button><Button onClick={handleAddPlayer} disabled={saving}>Adicionar</Button></>}>
                <Select value={playerForm.member_id} onValueChange={v => setPlayerForm({ member_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o jogador" /></SelectTrigger>
                    <SelectContent>
                        {members.filter(m => !selectedTeam?.team_members?.some((tm: any) => tm.members.id === m.id)).map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Modal>

            <Modal isOpen={isManualMatchModalOpen} onClose={() => setIsManualMatchModalOpen(false)} title="Nova Partida"
                footer={<><Button variant="secondary" onClick={() => setIsManualMatchModalOpen(false)}>Cancelar</Button><Button onClick={handleSaveManualMatch} disabled={saving}>Salvar</Button></>}>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Time A</label>
                            <Select value={manualMatchForm.team_a_id} onValueChange={v => setManualMatchForm({ ...manualMatchForm, team_a_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Time A" /></SelectTrigger>
                                <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Time B</label>
                            <Select value={manualMatchForm.team_b_id} onValueChange={v => setManualMatchForm({ ...manualMatchForm, team_b_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Time B" /></SelectTrigger>
                                <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input type="number" placeholder="Gols A" value={manualMatchForm.score_a} onChange={e => setManualMatchForm({ ...manualMatchForm, score_a: e.target.value })} />
                        <Input type="number" placeholder="Gols B" value={manualMatchForm.score_b} onChange={e => setManualMatchForm({ ...manualMatchForm, score_b: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Select value={manualMatchForm.stage} onValueChange={(v: any) => setManualMatchForm({ ...manualMatchForm, stage: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="group">Fase de Grupos</SelectItem>
                                <SelectItem value="qf-1">Quartas 1</SelectItem>
                                <SelectItem value="qf-2">Quartas 2</SelectItem>
                                <SelectItem value="semi-1">Semifinal 1</SelectItem>
                                <SelectItem value="semi-2">Semifinal 2</SelectItem>
                                <SelectItem value="final-1">Final</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={manualMatchForm.status} onValueChange={(v: any) => setManualMatchForm({ ...manualMatchForm, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="scheduled">Agendada</SelectItem>
                                <SelectItem value="completed">Finalizada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">Horário (opcional)</label>
                        <Input type="time" value={manualMatchForm.scheduled_time} onChange={e => setManualMatchForm({ ...manualMatchForm, scheduled_time: e.target.value })} />
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isBracketModalOpen} onClose={() => setIsBracketModalOpen(false)} title="Gerar Mata-Mata"
                footer={<><Button variant="secondary" onClick={() => setIsBracketModalOpen(false)}>Cancelar</Button><Button onClick={handleGenerateKnockout} disabled={saving}>Gerar</Button></>}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Selecione os 6 times na ordem de classificação (1º ao 6º).</p>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                        {teams.map(t => (
                            <label key={t.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                                <input type="checkbox" className="w-4 h-4" checked={selectedQualifiers.includes(t.id)} onChange={e => {
                                    if (e.target.checked) setSelectedQualifiers([...selectedQualifiers, t.id]);
                                    else setSelectedQualifiers(selectedQualifiers.filter(id => id !== t.id));
                                }} />
                                {t.logo_url && <img src={t.logo_url} className="w-6 h-6 object-contain" alt="" />}
                                <span className="font-medium text-sm">{t.name}</span>
                                {selectedQualifiers.includes(t.id) && (
                                    <span className="ml-auto bg-blue-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                                        {selectedQualifiers.indexOf(t.id) + 1}
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
            </Modal>
        </main>
    );
}

function MatchCard({ match, onRegister, onDelete, onTimeChange, completed }: {
    match: any; onRegister: () => void; onDelete: () => void;
    onTimeChange: (id: string, time: string) => void; completed?: boolean;
}) {
    const stageLabel = match.bracket_position === 'final-1' ? '🏆 FINAL' :
        match.bracket_position?.startsWith('semi') ? '⚔️ SEMI' :
            match.bracket_position?.startsWith('qf') ? 'QUARTAS' :
                `Rodada ${match.round || '1'}`;

    const formatTime = (t: string) => t ? t.substring(0, 5) : null;

    return (
        <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${completed ? 'opacity-70' : 'border-blue-200 shadow-blue-50'}`}>
            <div className={`px-4 py-2 flex items-center justify-between gap-2 ${completed ? 'bg-gray-50' : 'bg-blue-50'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${completed ? 'text-gray-400' : 'text-blue-600'}`}>{stageLabel}</span>
                <div className="flex items-center gap-2 ml-auto">
                    {!completed && (
                        <div className="flex items-center gap-1">
                            <Clock size={11} className="text-gray-400" />
                            <input
                                type="time"
                                defaultValue={match.scheduled_time?.substring(0, 5) || ''}
                                onBlur={e => onTimeChange(match.id, e.target.value)}
                                className="text-[11px] font-semibold text-gray-600 bg-transparent border-0 outline-none w-[72px] cursor-pointer"
                                title="Horário da partida"
                            />
                        </div>
                    )}
                    {completed && match.scheduled_time && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock size={10} /> {formatTime(match.scheduled_time)}
                        </span>
                    )}
                    {completed && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Finalizada</span>}
                </div>
            </div>

            <div className="p-4 flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    {match.team_a?.logo_url && <img src={match.team_a.logo_url} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}
                    <span className="font-bold text-gray-900 truncate">{match.team_a?.name || '?'}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {completed ? (
                        <div className="bg-gray-900 text-white font-black text-xl px-4 py-2 rounded-xl tracking-wider">
                            {match.score_a} — {match.score_b}
                        </div>
                    ) : (
                        <div className="bg-blue-600 text-white font-black text-sm px-3 py-1.5 rounded-lg">VS</div>
                    )}
                </div>
                <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                    <span className="font-bold text-gray-900 truncate text-right">{match.team_b?.name || '?'}</span>
                    {match.team_b?.logo_url && <img src={match.team_b.logo_url} className="w-8 h-8 object-contain flex-shrink-0" alt="" />}
                </div>
            </div>

            <div className="px-4 pb-4 flex gap-2">
                <Button onClick={onRegister} className={`flex-1 font-bold ${completed ? 'bg-gray-900 hover:bg-gray-800' : 'bg-[#093a9f] hover:bg-blue-900'}`}>
                    <Edit3 size={15} className="mr-2" />
                    {completed ? 'Editar Resultado' : 'Registrar Resultado'}
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 border-red-100 hover:bg-red-50 w-10 h-10 p-0" onClick={onDelete}>
                    <Trash2 size={15} />
                </Button>
            </div>
        </div>
    );
}

function AwardSelect({ label, sublabel, value, onChange, members }: { label: string; sublabel: string; value: string; onChange: (v: string) => void; members: any[] }) {
    return (
        <div className="bg-white rounded-xl border p-4 space-y-2">
            <div>
                <p className="font-bold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">{sublabel}</p>
            </div>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}
