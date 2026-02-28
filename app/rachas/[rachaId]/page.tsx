import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CalendarDays, MapPin, Clock, Users, Trophy, Shield, Medal, Activity, ChevronLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import RachaAttendance from '@/components/racha-attendance';
import StartRachaButton from '@/components/start-racha-button';
import OpenRachaButton from '@/components/open-racha-button';
import ShareRachaButton from '@/components/share-racha-button';
import { PrintModeToggle } from '@/components/print-mode-toggle';

export default async function RachaDetalhesPage({ params }: { params: Promise<{ rachaId: string }> }) {
    const { rachaId } = await params;
    const supabase = await createClient();

    // Buscar racha
    const { data: racha } = await supabase
        .from('rachas')
        .select('*')
        .eq('id', rachaId)
        .single();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;
    let userMemberId: string | null = null;

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, member_id')
            .eq('id', user.id)
            .single();
        isAdmin = profile?.role === 'admin' || profile?.role === 'director';
        userMemberId = profile?.member_id || null;
    }

    if (!racha) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Racha não encontrado</h1>
                    <Link href="/rachas" className="text-blue-600 hover:underline">
                        Voltar para rachas
                    </Link>
                </div>
            </main>
        );
    }

    // Buscar confirmados
    const { data: attendance } = await supabase
        .from('racha_attendance')
        .select(`
      *,
      members:member_id (
        name,
        position
      )
    `)
        .eq('racha_id', rachaId);

    const confirmedIn = (attendance?.filter(a => a.status === 'in') || [])
        .sort((a, b) => (a.members?.name || '').localeCompare(b.members?.name || ''));
    const confirmedOut = (attendance?.filter(a => a.status === 'out') || [])
        .sort((a, b) => (a.members?.name || '').localeCompare(b.members?.name || ''));

    // Buscar scouts (se racha em andamento ou fechado)
    let scouts: any[] = [];
    if (racha.status === 'closed' || racha.status === 'in_progress') {
        const { data: scoutsData } = await supabase
            .from('racha_scouts')
            .select(`
        *,
        members:member_id (
          name,
          position
        )
      `)
            .eq('racha_id', rachaId)
        // Filtrar apenas quem está confirmado "IN" no dia e ordenar alfabeticamente
        const attendeeIds = new Set(confirmedIn.map(a => a.member_id));
        scouts = (scoutsData || [])
            .filter(s => attendeeIds.has(s.member_id))
            .sort((a, b) => (a.members?.name || '').localeCompare(b.members?.name || ''));
    }

    const getMemberName = (id: string) => {
        const att = attendance?.find(a => a.member_id === id);
        if (att?.members?.name) return att.members.name;

        const scout = scouts?.find(s => s.member_id === id);
        if (scout?.members?.name) return scout.members.name;

        return 'Desconhecido';
    };

    const HighlightCard = ({ id, extraId, extra2Id, title, emoji, label, colorClass, bgColorClass, borderColorClass, textColorClass }: any) => {
        if (!id && !extraId && !extra2Id) return null;

        return (
            <div className={`bg-white p-4 rounded-lg shadow-sm border ${borderColorClass} flex flex-col items-center text-center relative overflow-hidden h-full justify-center`}>
                <div className={`absolute top-0 right-0 ${bgColorClass} ${textColorClass} text-[10px] px-2 py-0.5 rounded-bl font-bold uppercase`}>{title}</div>
                <div className="text-3xl mb-2">{emoji}</div>
                <div className="font-bold text-gray-900 line-clamp-1">{getMemberName(id)}</div>
                {extraId && (
                    <>
                        <div className="text-[10px] text-gray-400 font-bold mt-1">&</div>
                        <div className="font-bold text-gray-900 line-clamp-1">{getMemberName(extraId)}</div>
                    </>
                )}
                {extra2Id && (
                    <>
                        <div className="text-[10px] text-gray-400 font-bold mt-1">&</div>
                        <div className="font-bold text-gray-900 line-clamp-1">{getMemberName(extra2Id)}</div>
                    </>
                )}
                <div className={`text-xs ${colorClass} font-semibold mt-1`}>{label}</div>
                <div className="text-xs text-green-600 font-bold mt-1">+1 Ponto</div>
            </div>
        );
    };

    // Find current user status
    let userAttendanceStatus: 'in' | 'out' | null = null;
    if (userMemberId) {
        const userAtt = attendance?.find(a => a.member_id === userMemberId);
        if (userAtt) {
            userAttendanceStatus = userAtt.status as 'in' | 'out';
        }
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2 back-button-container no-print">
                            <Link href="/rachas">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 hover:bg-transparent text-blue-600 font-bold"
                                >
                                    <ChevronLeft size={20} /> Voltar para Rachas
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
                            {racha.location === 'Sistema (Manual)' ? 'Ajustes Globais Manuais' : racha.name || racha.location}
                        </h1>
                        <p className="text-lg text-gray-600 mt-2">
                            {racha.location === 'Sistema (Manual)'
                                ? 'Estatísticas de ajuste manual para o Ranking geral.'
                                : 'Acompanhe quem está confirmado para este racha.'}
                        </p>
                    </div>

                    {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto admin-actions-container no-print">
                            {(racha.status === 'open' || racha.status === 'locked') && (
                                <StartRachaButton rachaId={rachaId} />
                            )}
                            <Link href={`/admin/rachas/${rachaId}/scouts`} className="w-full md:w-auto">
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto font-bold"
                                >
                                    Gerenciar Scouts / Destaques
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Informações do Racha</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-700">
                                <Calendar className="text-blue-600" size={20} />
                                <span className="font-semibold">Data:</span>
                                <span>{new Date(racha.date_time).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-700">
                                <MapPin className="text-green-600" size={20} />
                                <span className="font-semibold">Local:</span>
                                <span>{racha.location}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-700">Status:</span>
                                <span className={`px-3 py-1 text-sm rounded ${racha.status === 'open' ? 'bg-green-100 text-green-800' :
                                    racha.status === 'locked' ? 'bg-yellow-100 text-yellow-800' :
                                        racha.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                    }`}>
                                    {racha.status === 'open' ? '✅ Aberto' :
                                        racha.status === 'locked' ? '🔒 Travado' :
                                            racha.status === 'in_progress' ? '⚡ Em Andamento' : '✔️ Fechado'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Destaques */}
                {(racha.top1_id || racha.top2_id || racha.top3_id || racha.sheriff_id) && (
                    <Card className="mb-6 border-yellow-200 bg-yellow-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-800">
                                <Trophy className="text-yellow-600" /> Destaques da Partida
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <HighlightCard
                                    id={racha.top1_id}
                                    extraId={racha.top1_extra_id}
                                    extra2Id={racha.top1_extra2_id}
                                    title="TOP 1"
                                    emoji="🥇"
                                    label="Melhor do Dia"
                                    colorClass="text-yellow-600"
                                    bgColorClass="bg-yellow-100"
                                    borderColorClass="border-yellow-200"
                                    textColorClass="text-yellow-800"
                                />
                                <HighlightCard
                                    id={racha.top2_id}
                                    extraId={racha.top2_extra_id}
                                    extra2Id={racha.top2_extra2_id}
                                    title="TOP 2"
                                    emoji="🥈"
                                    label="Vice-Craque"
                                    colorClass="text-gray-500"
                                    bgColorClass="bg-gray-100"
                                    borderColorClass="border-gray-200"
                                    textColorClass="text-gray-800"
                                />
                                <HighlightCard
                                    id={racha.top3_id}
                                    extraId={racha.top3_extra_id}
                                    extra2Id={racha.top3_extra2_id}
                                    title="TOP 3"
                                    emoji="🥉"
                                    label="Bronze"
                                    colorClass="text-orange-700"
                                    bgColorClass="bg-orange-100"
                                    borderColorClass="border-orange-200"
                                    textColorClass="text-orange-800"
                                />
                                <HighlightCard
                                    id={racha.sheriff_id}
                                    extraId={racha.sheriff_extra_id}
                                    extra2Id={racha.sheriff_extra2_id}
                                    title="XERIFE"
                                    emoji="👮"
                                    label="Melhor Defensor"
                                    colorClass="text-blue-600"
                                    bgColorClass="bg-blue-100"
                                    borderColorClass="border-blue-200"
                                    textColorClass="text-blue-800"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Confirmação de Presença (Botões) */}
                <Card className="mb-6 attendance-buttons-card no-print">
                    <CardHeader>
                        <CardTitle>Confirmação de Presença</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RachaAttendance
                            rachaId={rachaId}
                            initialStatus={userAttendanceStatus}
                            isOpen={racha.status === 'open'}
                            isAdmin={isAdmin}
                        />
                    </CardContent>
                </Card>

                {/* Confirmados */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <span>✅ Confirmados (Dentro)</span>
                                    <span className="text-sm font-normal text-gray-600">({confirmedIn.length})</span>
                                </div>
                                <ShareRachaButton
                                    rachaName={racha.name}
                                    rachaLocation={racha.location}
                                    rachaDate={new Date(racha.date_time).toLocaleString('pt-BR', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'America/Sao_Paulo'
                                    })}
                                    confirmedPlayers={confirmedIn}
                                    rachaId={rachaId}
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {confirmedIn.length > 0 ? (
                                <ul className="space-y-2">
                                    {confirmedIn.map((att: any) => (
                                        <li key={att.id} className="flex items-center gap-2 text-gray-700">
                                            <Users size={16} className="text-green-600" />
                                            <span>{att.members?.name || 'Jogador'}</span>
                                            {att.members?.position && (
                                                <span className="text-xs text-gray-500">({att.members.position})</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-sm">Nenhum confirmado ainda</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>❌ Confirmados (Fora)</span>
                                <span className="text-sm font-normal text-gray-600">{confirmedOut.length}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {confirmedOut.length > 0 ? (
                                <ul className="space-y-2">
                                    {confirmedOut.map((att: any) => (
                                        <li key={att.id} className="flex items-center gap-2 text-gray-500">
                                            <Users size={16} />
                                            <span>{att.members?.name || 'Jogador'}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 text-sm">Ninguém confirmou fora ainda</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Scouts (só se stats compatíveis e NÃO for o de Ajustes) */}
                {(racha.status === 'closed' || racha.status === 'in_progress') && racha.location !== 'Sistema (Manual)' && scouts.length > 0 && (
                    <Card className="mb-6 print-scouts-card">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2 flex-center-title">
                                <div className="flex items-center gap-2">
                                    <Activity className="text-blue-600" /> Scouts da Partida
                                </div>
                                <PrintModeToggle />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto print:hidden no-print-section">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Jogador</TableHead>
                                            <TableHead className="text-center">Gols</TableHead>
                                            <TableHead className="text-center">Assists</TableHead>
                                            <TableHead className="text-center">Defesas</TableHead>
                                            <TableHead className="text-center">Cartões</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {scouts.map((scout) => (
                                            <TableRow key={scout.id}>
                                                <TableCell className="font-medium">
                                                    {scout.members?.name || 'Desconhecido'}
                                                    {scout.members?.position && (
                                                        <span className="text-xs text-gray-500 ml-1">({scout.members.position})</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-gray-900">{scout.goals}</TableCell>
                                                <TableCell className="text-center text-gray-600">{scout.assists}</TableCell>
                                                <TableCell className="text-center text-gray-600">{scout.difficult_saves}</TableCell>
                                                <TableCell className="text-center">
                                                    {scout.warnings > 0 && (
                                                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">
                                                            {scout.warnings} 🟨
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Versão Exclusiva para Print (WhatsApp Mode) */}
                            <div className="print-scouts-grid">
                                {scouts.map((scout) => (
                                    <div key={scout.id} className="scout-print-item">
                                        <div className="scout-member-info">
                                            <span className="scout-member-name">{scout.members?.name}</span>
                                            {scout.members?.position && (
                                                <div className="text-[10px] text-gray-400 font-bold uppercase">{scout.members.position}</div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {scout.goals > 0 && (
                                                <div className="flex flex-col items-center">
                                                    <span className="scout-stats-badge bg-green-50 text-green-700">{scout.goals}</span>
                                                    <span className="text-[8px] font-black uppercase text-green-600">Gols</span>
                                                </div>
                                            )}
                                            {scout.assists > 0 && (
                                                <div className="flex flex-col items-center">
                                                    <span className="scout-stats-badge bg-blue-50 text-blue-700">{scout.assists}</span>
                                                    <span className="text-[8px] font-black uppercase text-blue-600">Ass</span>
                                                </div>
                                            )}
                                            {scout.difficult_saves > 0 && (
                                                <div className="flex flex-col items-center">
                                                    <span className="scout-stats-badge bg-orange-50 text-orange-700">{scout.difficult_saves}</span>
                                                    <span className="text-[8px] font-black uppercase text-orange-600">Def</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    );
}
