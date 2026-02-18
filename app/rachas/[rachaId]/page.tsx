import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CalendarDays, MapPin, Clock, Users, Trophy, Shield, Medal, Activity } from 'lucide-react';
import Link from 'next/link';
import RachaAttendance from '@/components/racha-attendance';
import StartRachaButton from '@/components/start-racha-button';

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
        isAdmin = profile?.role === 'admin';
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

    const confirmedIn = attendance?.filter(a => a.status === 'in') || [];
    const confirmedOut = attendance?.filter(a => a.status === 'out') || [];

    // Buscar scouts (só se racha fechado)
    let scouts: any[] = [];
    if (racha.status === 'closed') {
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
            .order('goals', { ascending: false });

        scouts = scoutsData || [];
    }

    const getMemberName = (id: string) => {
        const att = attendance?.find(a => a.member_id === id);
        return att?.members?.name || 'Desconhecido';
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
                <div className="flex justify-between items-start mb-2">
                    <h1 className="text-4xl font-bold text-gray-900">
                        ⚽ Detalhes do Racha
                    </h1>
                    {isAdmin && (
                        <div className="flex gap-2">
                            {(racha.status === 'open' || racha.status === 'locked') && (
                                <StartRachaButton rachaId={rachaId} />
                            )}
                            <Link href={`/admin/rachas/${rachaId}/scouts`}>
                                <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                                    <Activity size={16} />
                                    Ir para os Scouts Ao vivo
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
                <p className="text-gray-600 mb-8">{racha.location}</p>

                {/* Info do Racha */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Informações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3 text-gray-700">
                            <CalendarDays className="text-green-600" size={20} />
                            <span className="font-semibold">Data:</span>
                            <span>{new Date(racha.date_time).toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <Clock className="text-green-600" size={20} />
                            <span className="font-semibold">Horário:</span>
                            <span>{new Date(racha.date_time).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</span>
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
                                {racha.top1_id && (
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200 flex flex-col items-center text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-bl">TOP 1</div>
                                        <div className="text-3xl mb-2">🥇</div>
                                        <div className="font-bold text-gray-900 line-clamp-1">{getMemberName(racha.top1_id)}</div>
                                        <div className="text-xs text-yellow-600 font-semibold mt-1">Melhor do Dia</div>
                                        <div className="text-xs text-green-600 font-bold mt-1">+1 Ponto</div>
                                    </div>
                                )}
                                {racha.top2_id && (
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-gray-100 text-gray-800 text-[10px] px-2 py-0.5 rounded-bl">TOP 2</div>
                                        <div className="text-3xl mb-2">🥈</div>
                                        <div className="font-bold text-gray-900 line-clamp-1">{getMemberName(racha.top2_id)}</div>
                                        <div className="text-xs text-gray-500 font-semibold mt-1">Vice-Craque</div>
                                        <div className="text-xs text-green-600 font-bold mt-1">+1 Ponto</div>
                                    </div>
                                )}
                                {racha.top3_id && (
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-200 flex flex-col items-center text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-bl">TOP 3</div>
                                        <div className="text-3xl mb-2">🥉</div>
                                        <div className="font-bold text-gray-900 line-clamp-1">{getMemberName(racha.top3_id)}</div>
                                        <div className="text-xs text-orange-700 font-semibold mt-1">Bronze</div>
                                        <div className="text-xs text-green-600 font-bold mt-1">+1 Ponto</div>
                                    </div>
                                )}
                                {racha.sheriff_id && (
                                    <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 flex flex-col items-center text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-bl">XERIFE</div>
                                        <div className="text-3xl mb-2">👮</div>
                                        <div className="font-bold text-gray-900 line-clamp-1">{getMemberName(racha.sheriff_id)}</div>
                                        <div className="text-xs text-blue-600 font-semibold mt-1">Melhor Defensor</div>
                                        <div className="text-xs text-green-600 font-bold mt-1">+1 Ponto</div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Confirmação de Presença (Botões) */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Confirmação de Presença</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RachaAttendance
                            rachaId={rachaId}
                            initialStatus={userAttendanceStatus}
                            isOpen={racha.status === 'open'}
                        />
                    </CardContent>
                </Card>

                {/* Confirmados */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>✅ Confirmados (Dentro)</span>
                                <span className="text-sm font-normal text-gray-600">{confirmedIn.length}</span>
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

                {/* Scouts (só se fechado e com dados) */}
                {racha.status === 'closed' && scouts.length > 0 && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="text-blue-600" /> Scouts da Partida
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
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
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    );
}
