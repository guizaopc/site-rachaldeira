'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NextImage from 'next/image';
import {
    User, Upload, Save, Camera, Edit2, Goal, HandMetal,
    Activity, Shield, Trophy, Crown, Star, Award, Medal,
} from 'lucide-react';

const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {children}
    </label>
);

const POSITIONS = [
    { value: 'Goleiro',  label: 'Goleiro' },
    { value: 'Zagueiro', label: 'Zagueiro' },
    { value: 'Meia',     label: 'Meia' },
    { value: 'Atacante', label: 'Atacante' },
];

const LEVEL_LABEL  = ['Bronze', 'Prata', 'Ouro', 'Elite', 'Lenda'];
const LEVEL_BORDER = ['#cd7f32', '#a8b8c8', '#ffd700', '#00BFFF', '#ff5500'];
const LEVEL_RATING = [65, 73, 80, 87, 94];

interface Stats {
    goals: number; assists: number; saves: number; warnings: number;
    matches: number; top1: number; top2: number; top3: number; sheriff: number; championships: number;
}

export default function UserProfilePage() {
    const [loading, setLoading]       = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [user, setUser]             = useState<any>(null);
    const [member, setMember]         = useState<any>(null);
    const [stats, setStats]           = useState<Stats>({
        goals: 0, assists: 0, saves: 0, warnings: 0,
        matches: 0, top1: 0, top2: 0, top3: 0, sheriff: 0, championships: 0,
    });

    const [formData, setFormData] = useState({ name: '', position: '', photo_url: '' });
    const [isEditing, setIsEditing] = useState(false);

    const [showGalleryUpload, setShowGalleryUpload] = useState(false);
    const [galleryFile, setGalleryFile]             = useState<File | null>(null);
    const [galleryType, setGalleryType]             = useState<'photo' | 'video'>('photo');
    const [galleryCaption, setGalleryCaption]       = useState('');
    const [galleryUploading, setGalleryUploading]   = useState(false);

    const supabase = createClient();

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);

            const { data: profile } = await supabase
                .from('profiles').select('member_id, role').eq('id', user.id).single();

            let memberId = profile?.member_id;

            if (!memberId && user.email) {
                const { data: memberByEmail } = await supabase
                    .from('members').select('id').eq('email', user.email).maybeSingle();
                if (memberByEmail) {
                    memberId = memberByEmail.id;
                    await supabase.from('profiles').update({ member_id: memberId }).eq('id', user.id);
                }
            }

            if (memberId) {
                const { data: memberData } = await supabase
                    .from('members').select('*').eq('id', memberId).single();
                if (memberData) {
                    setMember(memberData);
                    setFormData({ name: memberData.name || '', position: memberData.position || '', photo_url: memberData.photo_url || '' });
                    loadStats(memberId);
                }
            } else {
                setFormData(prev => ({ ...prev, name: user.user_metadata?.name || user.email?.split('@')[0] || '' }));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async (memberId: string) => {
        // IDs de ajuste manual
        const { data: allManualRachas } = await supabase
            .from('rachas').select('id')
            .or('name.eq.Ajustes Globais Manuais,location.eq.Sistema (Manual)');
        const adjustmentIds = new Set((allManualRachas || []).map(r => r.id));

        // Stats de rachas
        const { data: rachaScouts } = await supabase
            .from('racha_scouts').select('*').eq('member_id', memberId);

        // Stats de campeonatos (apenas finalizados)
        const { data: champScouts } = await supabase
            .from('match_player_stats')
            .select('*, championship_matches!inner(status)')
            .eq('member_id', memberId);
        const completedChampScouts = (champScouts || []).filter(s => (s.championship_matches as any)?.status === 'completed');

        // Presenças reais em rachas fechados
        const { data: attendance } = await supabase
            .from('racha_attendance')
            .select('racha_id, rachas!inner(status, id)')
            .eq('member_id', memberId)
            .eq('status', 'in')
            .eq('rachas.status', 'closed');
        const realAttendance = (attendance || []).filter(a => !adjustmentIds.has((a.rachas as any).id));

        // Destaques
        const { data: rachasAsTop1 }    = await supabase.from('rachas').select('id').eq('status', 'closed').or(`top1_id.eq.${memberId},top1_extra_id.eq.${memberId},top1_extra2_id.eq.${memberId}`);
        const { data: rachasAsTop2 }    = await supabase.from('rachas').select('id').eq('status', 'closed').or(`top2_id.eq.${memberId},top2_extra_id.eq.${memberId},top2_extra2_id.eq.${memberId}`);
        const { data: rachasAsTop3 }    = await supabase.from('rachas').select('id').eq('status', 'closed').or(`top3_id.eq.${memberId},top3_extra_id.eq.${memberId},top3_extra2_id.eq.${memberId}`);
        const { data: rachasAsSheriff } = await supabase.from('rachas').select('id').eq('status', 'closed').or(`sheriff_id.eq.${memberId},sheriff_extra_id.eq.${memberId},sheriff_extra2_id.eq.${memberId}`);

        const manualAdjustments = (rachaScouts || []).filter(s => adjustmentIds.has(s.racha_id));
        const manualGames   = manualAdjustments.reduce((acc, s) => acc + ((s as any).attendance_count || 0), 0);
        const manualTop1    = manualAdjustments.reduce((acc, s) => acc + ((s as any).top1_count || 0), 0);
        const manualTop2    = manualAdjustments.reduce((acc, s) => acc + ((s as any).top2_count || 0), 0);
        const manualTop3    = manualAdjustments.reduce((acc, s) => acc + ((s as any).top3_count || 0), 0);
        const manualSheriff = manualAdjustments.reduce((acc, s) => acc + ((s as any).sheriff_count || 0), 0);

        const goals    = (rachaScouts || []).reduce((a, s) => a + (s.goals || 0), 0) + completedChampScouts.reduce((a, s) => a + (s.goals || 0), 0);
        const assists  = (rachaScouts || []).reduce((a, s) => a + (s.assists || 0), 0) + completedChampScouts.reduce((a, s) => a + (s.assists || 0), 0);
        const saves    = (rachaScouts || []).reduce((a, s) => a + (s.difficult_saves || 0), 0) + completedChampScouts.reduce((a, s) => a + (s.difficult_saves || 0), 0);
        const warnings = (rachaScouts || []).reduce((a, s) => a + (s.warnings || 0), 0) + completedChampScouts.reduce((a, s) => a + (s.warnings || 0), 0);
        const matches  = realAttendance.length + manualGames;

        const top1    = ((rachasAsTop1 || []).filter(r => !adjustmentIds.has(r.id)).length) + manualTop1;
        const top2    = ((rachasAsTop2 || []).filter(r => !adjustmentIds.has(r.id)).length) + manualTop2;
        const top3    = ((rachasAsTop3 || []).filter(r => !adjustmentIds.has(r.id)).length) + manualTop3;
        const sheriff = ((rachasAsSheriff || []).filter(r => !adjustmentIds.has(r.id)).length) + manualSheriff;

        // Títulos de campeonato
        let championships = 0;
        const { data: completedChamps } = await supabase.from('championships').select('id').eq('status', 'completed');
        if (completedChamps && completedChamps.length > 0) {
            for (const champ of completedChamps) {
                const [{ data: champMatches }, { data: teams }] = await Promise.all([
                    supabase.from('championship_matches').select('team_a_id, team_b_id, score_a, score_b').eq('championship_id', champ.id).eq('status', 'completed'),
                    supabase.from('teams').select('id, team_members(member_id)').eq('championship_id', champ.id),
                ]);
                if (!champMatches || !teams || teams.length === 0) continue;
                const standings = teams.map((team: any) => {
                    let pts = 0;
                    for (const m of champMatches) {
                        const isA = m.team_a_id === team.id, isB = m.team_b_id === team.id;
                        if (!isA && !isB) continue;
                        const mine = isA ? m.score_a : m.score_b, theirs = isA ? m.score_b : m.score_a;
                        if (mine > theirs) pts += 3; else if (mine === theirs) pts += 1;
                    }
                    return { pts, members: (team.team_members || []).map((tm: any) => tm.member_id) };
                });
                standings.sort((a: any, b: any) => b.pts - a.pts);
                if (standings[0]?.members.includes(memberId)) championships += 1;
            }
        }

        setStats({ goals, assists, saves, warnings, matches, top1, top2, top3, sheriff, championships });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
        setSaveStatus('saving');
        try {
            const { error: uploadError } = await supabase.storage.from('Fotos').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('Fotos').getPublicUrl(fileName);
            setFormData(prev => ({ ...prev, photo_url: publicUrl }));
            setSaveStatus('idle');
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            if (member) {
                const { error } = await supabase.from('members')
                    .update({ name: formData.name, position: formData.position, photo_url: formData.photo_url })
                    .eq('id', member.id);
                if (error) throw error;
            } else {
                if (!formData.name) { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 2000); return; }
                const { data: existing } = await supabase.from('members').select('*').eq('email', user.email).maybeSingle();
                let targetMemberId;
                if (existing) {
                    targetMemberId = existing.id;
                    await supabase.from('members').update({ name: formData.name, position: formData.position, photo_url: formData.photo_url }).eq('id', targetMemberId);
                } else {
                    const { data: newMember, error: createError } = await supabase.from('members')
                        .insert({ name: formData.name, position: formData.position, photo_url: formData.photo_url, email: user.email })
                        .select().single();
                    if (createError) throw createError;
                    targetMemberId = newMember.id;
                }
                await supabase.from('profiles').update({ member_id: targetMemberId }).eq('id', user.id);
                const { data: finalMember } = await supabase.from('members').select('*').eq('id', targetMemberId).single();
                setMember(finalMember);
                loadProfile();
            }
            setSaveStatus('success');
            setIsEditing(false);
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleGalleryUpload = async () => {
        if (!galleryFile || !user) return;
        setGalleryUploading(true);
        try {
            const fileName = `${Math.random()}.${galleryFile.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('Fotos').upload(fileName, galleryFile);
            if (uploadError) throw new Error(uploadError.message);
            const { data: { publicUrl } } = supabase.storage.from('Fotos').getPublicUrl(fileName);
            const { error: insertError } = await supabase.from('gallery_media').insert({ type: galleryType, url: publicUrl, caption: galleryCaption || null, uploaded_by: user.id });
            if (insertError) throw new Error(insertError.message);
            alert('Midia enviada com sucesso!');
            setShowGalleryUpload(false); setGalleryFile(null); setGalleryCaption('');
        } catch (err: any) {
            alert(err.message || 'Erro ao fazer upload');
        } finally {
            setGalleryUploading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Carregando perfil...</p>
        </div>
    );

    const level  = Math.max(1, Math.min(5, member?.level || 1));
    const border = LEVEL_BORDER[level - 1];
    const label  = LEVEL_LABEL[level - 1];
    const rating = LEVEL_RATING[level - 1];
    const rawPos = formData.position || '';
    const posLabel = POSITIONS.find(p => p.value === rawPos)?.label || rawPos || 'Sem posição';
    const points = stats.top1 * 3 + stats.top2 * 2 + stats.top3 + stats.sheriff;
    const goalsPerGame = stats.matches > 0 ? (stats.goals / stats.matches).toFixed(2) : '0.00';
    const savesPerGame = stats.matches > 0 ? (stats.saves / stats.matches).toFixed(2) : '0.00';

    const inputClass = "w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#093a9f] placeholder:text-gray-400";

    return (
        <div className="py-10 px-4">
            <div className="max-w-3xl mx-auto space-y-5">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meu Perfil</h1>
                </div>

                {/* ── HEADER CARD ── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="px-6 py-6">
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0 z-10">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-white" style={{ border: `3px solid ${border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                                    {formData.photo_url ? (
                                        <NextImage src={formData.photo_url} alt={formData.name} width={96} height={96} className="w-full h-full object-cover" style={{ objectPosition: 'center 30%' }} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                            <User size={32} className="text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                {isEditing && (
                                    <label className="absolute -bottom-1 -right-1 p-1.5 rounded-full cursor-pointer z-20 bg-[#093a9f] shadow">
                                        <Upload size={12} className="text-white" />
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={saveStatus === 'saving'} />
                                    </label>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-black text-gray-900 truncate">{formData.name || 'Sem nome'}</h2>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {rawPos && (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#093a9f] border border-blue-100">
                                            {rawPos}
                                        </span>
                                    )}
                                    {member && (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ background: `${border}1e`, color: level === 3 ? '#a16207' : border, border: `1px solid ${border}55` }}>
                                            Nv {level} — {label} · {rating}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Botão Editar */}
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-1 bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors shadow-sm"
                                >
                                    <Edit2 size={12} /> Editar
                                </button>
                            )}
                        </div>

                        {/* 4 stats rápidos */}
                        <div className="grid grid-cols-4 gap-2 mt-5">
                            {[
                                { value: stats.matches,       label: 'Jogos',   color: 'text-gray-900' },
                                { value: stats.goals,         label: 'Gols',    color: 'text-emerald-600' },
                                { value: stats.assists,       label: 'Assist.', color: 'text-[#093a9f]' },
                                { value: stats.championships, label: 'Títulos', color: 'text-yellow-600' },
                            ].map(s => (
                                <div key={s.label} className="rounded-xl p-3 text-center bg-gray-50 border border-gray-100">
                                    <p className={`text-xl font-black leading-none ${s.color}`}>{s.value}</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider mt-1.5 text-gray-400">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── EDIÇÃO DE PERFIL ── */}
                {isEditing && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Editar Informações</p>

                        <div className="space-y-1.5">
                            <Label htmlFor="name">Nome Completo</Label>
                            <input id="name" className={inputClass} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Seu nome completo" disabled={saveStatus === 'saving'} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="position">Posição Principal</Label>
                            <select id="position" className={inputClass} value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} disabled={saveStatus === 'saving'}>
                                <option value="">Selecione...</option>
                                {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleSave}
                                disabled={saveStatus === 'saving'}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                            >
                                <Save size={14} />
                                {saveStatus === 'saving' ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button
                                onClick={() => { setIsEditing(false); loadProfile(); }}
                                disabled={saveStatus === 'saving'}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STATS: OFENSIVA + DEFESA ── */}
                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Produção Ofensiva */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={13} className="text-emerald-600" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Produção Ofensiva</p>
                        </div>
                        {[
                            { label: 'Gols Marcados',      value: stats.goals,   color: 'text-emerald-600' },
                            { label: 'Assistências',        value: stats.assists, color: 'text-[#093a9f]' },
                            { label: 'Média de Gols/Jogo', value: goalsPerGame,  color: 'text-gray-900', bold: true },
                        ].map((row, i, arr) => (
                            <div key={row.label} className={`flex justify-between items-center py-2.5 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                <span className={`text-sm ${row.bold ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>{row.label}</span>
                                <span className={`text-lg font-black ${row.color}`}>{row.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Defesa e Disciplina */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield size={13} className="text-purple-600" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-purple-600">Defesa e Disciplina</p>
                        </div>
                        {[
                            { label: 'Defesas Difíceis',      value: stats.saves,    color: 'text-purple-600' },
                            { label: 'Cartões / Advertências', value: stats.warnings, color: 'text-amber-500' },
                            { label: 'Média de Defesas/Jogo',  value: savesPerGame,   color: 'text-gray-900', bold: true },
                        ].map((row, i, arr) => (
                            <div key={row.label} className={`flex justify-between items-center py-2.5 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                <span className={`text-sm ${row.bold ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>{row.label}</span>
                                <span className={`text-lg font-black ${row.color}`}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── DESTAQUES ── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy size={13} className="text-yellow-600" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-600">Histórico de Destaques</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                        {[
                            { icon: Crown,  label: 'Craque', value: stats.top1,    bg: 'bg-yellow-50', bdr: 'border-yellow-200', color: 'text-yellow-700' },
                            { icon: Star,   label: 'Top 2',  value: stats.top2,    bg: 'bg-gray-50',   bdr: 'border-gray-200',   color: 'text-gray-500' },
                            { icon: Award,  label: 'Top 3',  value: stats.top3,    bg: 'bg-orange-50', bdr: 'border-orange-200', color: 'text-orange-700' },
                            { icon: Shield, label: 'Xerife', value: stats.sheriff, bg: 'bg-blue-50',   bdr: 'border-blue-200',   color: 'text-[#093a9f]' },
                        ].map(d => {
                            const Icon = d.icon;
                            return (
                                <div key={d.label} className={`rounded-xl p-3 text-center ${d.bg} border ${d.bdr}`}>
                                    <Icon size={14} className={`mx-auto mb-1.5 ${d.color}`} />
                                    <p className={`text-xl font-black leading-none ${d.color}`}>{d.value}</p>
                                    <p className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 ${d.color}`}>{d.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between rounded-xl p-4 bg-[#093a9f]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/10"><Medal size={16} className="text-white" /></div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Pontuação Total</p>
                                <p className="text-2xl font-black text-white leading-none">{points} pts</p>
                            </div>
                        </div>
                        <p className="text-[9px] text-white/50 text-right hidden sm:block leading-relaxed">
                            Craque (3) · Top 2 (2)<br />Top 3 (1) · Xerife (1)
                        </p>
                    </div>
                </div>

                {/* ── TÍTULO ── */}
                {stats.championships > 0 && (
                    <div className="rounded-3xl p-5 flex items-center gap-4 bg-yellow-50 border border-yellow-200">
                        <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                            <Trophy size={22} className="text-white fill-white" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-gray-900">{stats.championships}x Campeão</p>
                            <p className="text-sm text-yellow-700 mt-0.5">Título{stats.championships > 1 ? 's' : ''} de campeonato</p>
                        </div>
                    </div>
                )}

                {/* ── GALERIA ── */}
                {member && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Camera size={13} className="text-[#093a9f]" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#093a9f]">Galeria</p>
                        </div>

                        {!showGalleryUpload ? (
                            <button
                                onClick={() => setShowGalleryUpload(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-[#093a9f] border border-blue-100 hover:bg-blue-100 transition-colors"
                            >
                                <Upload size={14} /> Enviar Foto / Vídeo
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="gallery-type">Tipo</Label>
                                    <select id="gallery-type" className={inputClass} value={galleryType} onChange={e => setGalleryType(e.target.value as 'photo' | 'video')}>
                                        <option value="photo">Foto</option>
                                        <option value="video">Vídeo</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="gallery-file">Arquivo</Label>
                                    <input id="gallery-file" type="file" accept={galleryType === 'photo' ? 'image/*' : 'video/*'} onChange={e => setGalleryFile(e.target.files?.[0] || null)} className={inputClass + " cursor-pointer"} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="gallery-caption">Legenda (opcional)</Label>
                                    <input id="gallery-caption" className={inputClass} value={galleryCaption} onChange={e => setGalleryCaption(e.target.value)} placeholder="Descrição da foto/vídeo" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleGalleryUpload}
                                        disabled={!galleryFile || galleryUploading}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#093a9f] text-white hover:bg-[#0b46bd] transition-colors disabled:opacity-50"
                                    >
                                        {galleryUploading ? 'Enviando...' : 'Enviar'}
                                    </button>
                                    <button
                                        onClick={() => { setShowGalleryUpload(false); setGalleryFile(null); setGalleryCaption(''); }}
                                        disabled={galleryUploading}
                                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
