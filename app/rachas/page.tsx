import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Clock } from 'lucide-react';

export default async function RachasPage() {
    const supabase = await createClient();

    const now = new Date().toISOString();

    // Rachas futuros (apenas não fechados)
    const { data: upcomingRachas } = await supabase
        .from('rachas')
        .select('*')
        .gte('date_time', now)
        .neq('status', 'closed')
        .neq('location', 'Sistema (Manual)')
        .order('date_time', { ascending: true });

    // Rachas passados ou fechados
    const { data: pastRachas } = await supabase
        .from('rachas')
        .select('*')
        .or(`date_time.lt.${now},status.eq.closed`)
        .neq('location', 'Sistema (Manual)')
        .order('date_time', { ascending: false })
        .limit(10);

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">
                    Rachaldeiras
                </h1>

                {/* Próximos Rachas */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                        Próximas Rachaldeiras
                    </h2>

                    {upcomingRachas && upcomingRachas.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingRachas.map((racha) => (
                                <Link
                                    key={racha.id}
                                    href={racha.is_next ? '/rachas/proximo' : `/rachas/${racha.id}`}
                                >
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div>
                                                            <h3 className="text-xl font-semibold text-gray-900">
                                                                {racha.is_next && 'PRÓXIMO RACHALDEIRA: '}
                                                                {racha.location}
                                                            </h3>
                                                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                                                <span className="flex items-center gap-1">
                                                                    <CalendarDays size={16} />
                                                                    {new Date(racha.date_time).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock size={16} />
                                                                    {new Date(racha.date_time).toLocaleTimeString('pt-BR', {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        timeZone: 'America/Sao_Paulo'
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 text-xs">
                                                        <span className={`px-2 py-1 rounded ${racha.status === 'open' ? 'bg-green-100 text-green-800' :
                                                            racha.status === 'locked' ? 'bg-yellow-100 text-yellow-800' :
                                                                racha.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {racha.status === 'open' ? 'Aberto para confirmação' :
                                                                racha.status === 'locked' ? 'Inscrições travadas' :
                                                                    racha.status === 'in_progress' ? 'Em andamento' : 'Fechado'}
                                                        </span>
                                                        {racha.periodicity !== 'once' && (
                                                            <span className="px-2 py-1 rounded bg-purple-100 text-purple-800">
                                                                {racha.periodicity === 'weekly' ? 'Semanal' : 'Mensal'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {racha.is_next && racha.status === 'open' && (
                                                    <Button className="ml-4">
                                                        Confirmar Presença
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                Nenhum racha agendado no momento
                            </CardContent>
                        </Card>
                    )}
                </section>

                {/* Rachas Passados */}
                <section>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                        Histórico de Rachaldeiras
                    </h2>

                    {pastRachas && pastRachas.length > 0 ? (
                        <div className="space-y-3">
                            {pastRachas.map((racha) => (
                                <Link key={racha.id} href={`/rachas/${racha.id}`}>
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{racha.location}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {new Date(racha.date_time).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às {' '}
                                                        {new Date(racha.date_time).toLocaleTimeString('pt-BR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            timeZone: 'America/Sao_Paulo'
                                                        })}
                                                    </p>
                                                </div>
                                                <span className="text-gray-400">
                                                    Ver detalhes →
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                Nenhum racha no histórico
                            </CardContent>
                        </Card>
                    )}
                </section>
            </div>
        </main>
    );
}
