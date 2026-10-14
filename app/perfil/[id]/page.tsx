import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, User, Trophy, Activity, Shield, Star, Medal, Crown, Award } from 'lucide-react';
import { PUBLIC_MEMBER_COLUMNS } from '@/lib/utils';

export const revalidate = 0;

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: member, error: memberError } = await supabase
        .from('members')
        .select(PUBLIC_MEMBER_COLUMNS)
        .eq('id', id)
        .single();

    if (memberError || !member) notFound();

    // IDs de rachas de ajuste manual
    const { data: allManualRachas } = await supabase
        .from('rachas')
        .select('id')
        .or('name.eq.Ajustes Globais Manuais,location.eq.Sistema (Manual)');
    const adjustmentIds = new Set((allManualRachas || []).map(r => r.id));

    // Stats de rachas
    const { data: rachaScouts } = await supabase
        .from('racha_scouts')
        .select('*')
        .eq('member_id', id);

    // Stats de campeonatos (apenas partidas finalizadas)
    const { data: champScouts } = await supabase
        .from('match_player_stats')
        .select('*, championship_matches!inner(status)')
        .eq('member_id', id);
    const completedChampScouts = champScouts?.filter(s => (s.championship_matches as any)?.status === 'completed') || [];

    // Presenças reais em rachas fechados
    const { data: attendance } = await supabase
        .from('racha_attendance')
        .select('id, racha_id, rachas!inner(status, id)')
        .eq('member_id', id)
        .eq('status', 'in')
        .eq('rachas.status', 'closed');
    const realAttendance = (attendance || []).filter(a => !adjustmentIds.has((a.rachas as any).id));

    // Destaques dos rachas fechados
    const { data: rachasAsTop1 } = await supabase.from('rachas').select('id').eq('status', 'closed').or(`top1_id.eq.${id},top1_extra_id.eq.${id},top1_extra2_id.eq.${id}`);
    const { data: rachasAsTop2 } = await supabase.from('rachas').select('id').eq('status', 'closed').or(`top2_id.eq.${id},top2_extra_id.eq.${id},top2_extra2_id.eq.${id}`);
    const { data: rachasAsTop3 } = await supabase.from('rachas').select('id').eq('status', 'closed').or(`top3_id.eq.${id},top3_extra_id.eq.${id},top3_extra2_id.eq.${id}`);
    const { data: rachasAsSheriff } = await supabase.from('rachas').select('id').eq('status', 'closed').or(`sheriff_id.eq.${id},sheriff_extra_id.eq.${id},sheriff_extra2_id.eq.${id}`);

    // Ajustes manuais
    const manualAdjustments = (rachaScouts || []).filter(s => adjustmentIds.has(s.racha_id));
    const manualGames   = manualAdjustments.reduce((acc, s) => acc + ((s as any).attendance_count || 0), 0);
    const manualTop1    = manualAdjustments.reduce((acc, s) => acc + ((s as any).top1_count || 0), 0);
    const manualTop2    = manualAdjustments.reduce((acc, s) => acc + ((s as any).top2_count || 0), 0);
    const manualTop3    = manualAdjustments.reduce((acc, s) => acc + ((s as any).top3_count || 0), 0);
    const manualSheriff = manualAdjustments.reduce((acc, s) => acc + ((s as any).sheriff_count || 0), 0);

    // Consolidar stats (rachas + campeonatos, igual ao modal de integrantes)
    const rachaGoals    = (rachaScouts || []).reduce((acc, s) => acc + (s.goals || 0), 0);
    const rachaAssists  = (rachaScouts || []).reduce((acc, s) => acc + (s.assists || 0), 0);
    const rachaSaves    = (rachaScouts || []).reduce((acc, s) => acc + (s.difficult_saves || 0), 0);
    const rachaWarnings = (rachaScouts || []).reduce((acc, s) => acc + (s.warnings || 0), 0);

    const champGoals    = completedChampScouts.reduce((acc, s) => acc + (s.goals || 0), 0);
    const champAssists  = completedChampScouts.reduce((acc, s) => acc + (s.assists || 0), 0);
    const champSaves    = completedChampScouts.reduce((acc, s) => acc + (s.difficult_saves || 0), 0);
    const champWarnings = completedChampScouts.reduce((acc, s) => acc + (s.warnings || 0), 0);

    const goals    = rachaGoals + champGoals;
    const assists  = rachaAssists + champAssists;
    const saves    = rachaSaves + champSaves;
    const warnings = rachaWarnings + champWarnings;
    const matches  = realAttendance.length + manualGames;

    const top1Count    = ((rachasAsTop1 || []).filter(r => !adjustmentIds.has(r.id)).length) + manualTop1;
    const top2Count    = ((rachasAsTop2 || []).filter(r => !adjustmentIds.has(r.id)).length) + manualTop2;
    const top3Count    = ((rachasAsTop3 || []).filter(r => !adjustmentIds.has(r.id)).length) + manualTop3;
    const sheriffCount = ((rachasAsSheriff || []).filter(r => !adjustmentIds.has(r.id)).length) + manualSheriff;
    const points       = top1Count * 3 + top2Count * 2 + top3Count + sheriffCount;

    // Títulos de campeonato (mesma lógica da página de integrantes)
    const { data: completedChamps } = await supabase
        .from('championships')
        .select('id')
        .eq('status', 'completed');

    let championships = 0;
    if (completedChamps && completedChamps.length > 0) {
        for (const champ of completedChamps) {
            const [{ data: champMatches }, { data: teams }] = await Promise.all([
                supabase.from('championship_matches')
                    .select('team_a_id, team_b_id, score_a, score_b')
                    .eq('championship_id', champ.id)
                    .eq('status', 'completed'),
                supabase.from('teams')
                    .select('id, team_members(member_id)')
                    .eq('championship_id', champ.id),
            ]);
            if (!champMatches || !teams || teams.length === 0) continue;

            const standings = teams.map((team: any) => {
                let pts = 0;
                for (const m of champMatches) {
                    const isA = m.team_a_id === team.id;
                    const isB = m.team_b_id === team.id;
                    if (!isA && !isB) continue;
                    const mine   = isA ? m.score_a : m.score_b;
                    const theirs = isA ? m.score_b : m.score_a;
                    if (mine > theirs) pts += 3;
                    else if (mine === theirs) pts += 1;
                }
                return { pts, members: (team.team_members || []).map((tm: any) => tm.member_id) };
            });
            standings.sort((a: any, b: any) => b.pts - a.pts);
            const winner = standings[0];
            if (winner?.members.includes(id)) championships += 1;
        }
    }

    const LEVEL_RATING = [65, 73, 80, 87, 94];
    const LEVEL_LABEL  = ['Bronze', 'Prata', 'Ouro', 'Elite', 'Lenda'];
    const LEVEL_BORDER = ['#cd7f32', '#a8b8c8', '#ffd700', '#00BFFF', '#ff5500'];
    const level  = Math.max(1, Math.min(5, member.level || 1));
    const rating = LEVEL_RATING[level - 1];
    const label  = LEVEL_LABEL[level - 1];
    const border = LEVEL_BORDER[level - 1];

    const POS_ALIASES: Record<string, string> = {
        'atacante': 'ATA', 'meia': 'MEI', 'volante': 'VOL',
        'zagueiro': 'ZAG', 'goleiro': 'GOL', 'lateral': 'LAT',
    };
    const rawPos = member.position || '';
    const pos = (POS_ALIASES[rawPos.toLowerCase()] ?? rawPos.substring(0, 3).toUpperCase()) || 'JOG';

    const goalsPerGame = matches > 0 ? (goals / matches).toFixed(2) : '0.00';
    const savesPerGame = matches > 0 ? (saves / matches).toFixed(2) : '0.00';

    return (
        <main className="min-h-screen bg-gray-950 py-10 px-4">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/integrantes"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-medium group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Voltar para o Elenco
                </Link>

                {/* ── HEADER ── */}
                <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1.5px solid ${border}33`, background: '#0d0d1a', boxShadow: `0 0 48px ${border}22` }}>
                    {/* Banner */}
                    <div className="h-36 relative" style={{ background: `linear-gradient(135deg, ${border}30 0%, #0d0d1a 80%)` }}>
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,.04) 20px, rgba(255,255,255,.04) 40px)' }} />
                    </div>

                    {/* Info principal */}
                    <div className="px-6 pb-6 -mt-16">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                            {/* Avatar */}
                            <div className="w-28 h-28 rounded-full overflow-hidden flex-shrink-0" style={{ border: `3px solid ${border}`, boxShadow: `0 0 20px ${border}44` }}>
                                {member.photo_url ? (
                                    <Image src={member.photo_url} alt={member.name} width={112} height={112} className="w-full h-full object-cover object-top" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a2e' }}>
                                        <User size={40} className="text-gray-500" />
                                    </div>
                                )}
                            </div>

                            {/* Nome e badges */}
                            <div className="flex-1 min-w-0 pb-1">
                                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight truncate">{member.name}</h1>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {pos && (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: `${border}22`, color: border, border: `1px solid ${border}44` }}>
                                            {pos}
                                        </span>
                                    )}
                                    {member.age && (
                                        <span className="text-xs text-gray-500">{member.age} anos</span>
                                    )}
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: border }}>
                                        Nv {level} — {label}
                                    </span>
                                    <span className="text-xs font-black" style={{ color: border }}>
                                        {rating}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4 stats rápidos */}
                        <div className="grid grid-cols-4 gap-3 mt-6">
                            {[
                                { value: matches, label: 'Jogos', color: '#fff' },
                                { value: goals,   label: 'Gols',  color: '#4ade80' },
                                { value: assists, label: 'Assist.', color: '#60a5fa' },
                                { value: championships, label: 'Títulos', color: '#ffd700' },
                            ].map(s => (
                                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <p className="text-xl font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider mt-1.5 text-gray-500">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── GRID DE STATS ── */}
                <div className="grid sm:grid-cols-2 gap-4 mb-4">

                    {/* Produção Ofensiva */}
                    <div className="rounded-2xl p-5" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={14} className="text-green-400" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-green-400">Produção Ofensiva</p>
                        </div>
                        <div className="space-y-1">
                            {[
                                { label: 'Gols Marcados',     value: goals,        color: '#4ade80' },
                                { label: 'Assistências',      value: assists,      color: '#60a5fa' },
                                { label: 'Média de Gols/Jogo', value: goalsPerGame, color: '#fff', bold: true },
                            ].map((row, i, arr) => (
                                <div key={row.label} className="flex justify-between items-center py-2.5" style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <span className="text-sm" style={{ color: row.bold ? '#e5e7eb' : '#9ca3af', fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                                    <span className="text-lg font-black" style={{ color: row.color }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Defesa e Disciplina */}
                    <div className="rounded-2xl p-5" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Shield size={14} className="text-purple-400" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-purple-400">Defesa e Disciplina</p>
                        </div>
                        <div className="space-y-1">
                            {[
                                { label: 'Defesas Difíceis',    value: saves,        color: '#a78bfa' },
                                { label: 'Cartões / Advertências', value: warnings,  color: '#fbbf24' },
                                { label: 'Média de Defesas/Jogo', value: savesPerGame, color: '#fff', bold: true },
                            ].map((row, i, arr) => (
                                <div key={row.label} className="flex justify-between items-center py-2.5" style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <span className="text-sm" style={{ color: row.bold ? '#e5e7eb' : '#9ca3af', fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                                    <span className="text-lg font-black" style={{ color: row.color }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── DESTAQUES ── */}
                <div className="rounded-2xl p-5" style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy size={14} className="text-yellow-400" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-400">Histórico de Destaques</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                        {[
                            { icon: Crown,  label: 'Craque', value: top1Count,    bg: 'rgba(234,179,8,0.1)',   color: '#ca8a04', border: 'rgba(234,179,8,0.2)' },
                            { icon: Star,   label: 'Top 2',  value: top2Count,    bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' },
                            { icon: Award,  label: 'Top 3',  value: top3Count,    bg: 'rgba(234,88,12,0.1)',   color: '#ea580c', border: 'rgba(234,88,12,0.2)' },
                            { icon: Shield, label: 'Xerife', value: sheriffCount, bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
                        ].map(d => {
                            const Icon = d.icon;
                            return (
                                <div key={d.label} className="rounded-xl p-3 text-center" style={{ background: d.bg, border: `1px solid ${d.border}` }}>
                                    <Icon size={16} className="mx-auto mb-1.5" style={{ color: d.color }} />
                                    <p className="text-xl font-black leading-none" style={{ color: d.color }}>{d.value}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-wider mt-1.5" style={{ color: d.color }}>{d.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pontuação total */}
                    <div className="flex items-center justify-between rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/10">
                                <Medal size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Pontuação Total</p>
                                <p className="text-2xl font-black text-white leading-none">{points} pts</p>
                            </div>
                        </div>
                        <p className="text-[9px] text-white/40 text-right hidden sm:block leading-relaxed">
                            Craque (3) · Top 2 (2)<br />Top 3 (1) · Xerife (1)
                        </p>
                    </div>
                </div>

                {/* ── TÍTULO DE CAMPEONATO ── */}
                {championships > 0 && (
                    <div className="rounded-2xl p-5 mt-4 flex items-center gap-4" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)' }}>
                        <Trophy size={36} style={{ color: '#ffd700', flexShrink: 0 }} />
                        <div>
                            <p className="text-xl font-black" style={{ color: '#ffd700' }}>{championships}x Campeão</p>
                            <p className="text-sm text-yellow-700 mt-0.5">Título{championships > 1 ? 's' : ''} de campeonato</p>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
