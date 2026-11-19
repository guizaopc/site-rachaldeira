import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, History, Calendar, MapPin, ArrowRight, Medal, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function CampeonatosPage() {
    const supabase = await createClient();

    // Buscar campeonatos
    const { data: championships } = await supabase
        .from('championships')
        .select('*')
        .order('start_date', { ascending: false });

    const activeChampionships = championships?.filter(c => c.status !== 'completed') || [];
    const pastChampionships = championships?.filter(c => c.status === 'completed') || [];

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white text-gray-900 pt-8 pb-8 px-4 border-b border-gray-200">
                <div className="max-w-6xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-2">
                        Campeonatos Rachaldeira
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        O palco onde as lendas são forjadas e as amizades... bem, continuam as mesmas.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Link href="/campeonatos/ranking">
                            <Button className="gap-2 rounded-full bg-[#093a9f] hover:bg-[#072d7c] text-white px-6 shadow-md">
                                <BarChart3 size={16} />
                                Ranking Geral
                            </Button>
                        </Link>
                        <Link href="/campeonatos/trofeus">
                            <Button variant="outline" className="gap-2 rounded-full px-6">
                                <Medal size={16} />
                                Troféus
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">

                {/* Campeonatos Ativos */}
                <section>
                    <div className="flex items-center gap-3 mb-8 border-b border-gray-200 pb-4">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                            <Trophy className="text-yellow-700" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Próximo Campeonato
                        </h2>
                    </div>

                    {activeChampionships.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {activeChampionships.map((camp) => (
                                <Link key={camp.id} href={`/campeonatos/${camp.id}`} className="group h-full block">
                                    <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-t-4 border-t-yellow-500 overflow-hidden">
                                        <CardContent className="p-0 flex flex-col h-full">
                                            {/* Top Promotional Logo Area */}
                                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 flex items-center justify-center border-b border-gray-100">
                                                {camp.logo_url ? (
                                                    <div className="relative w-48 h-48 transform group-hover:scale-105 transition-transform duration-500">
                                                        <img src={camp.logo_url} className="w-full h-full object-contain filter drop-shadow-xl" alt="" />
                                                    </div>
                                                ) : (
                                                    <Trophy size={64} className="text-gray-200" />
                                                )}
                                            </div>

                                            <div className="p-6 flex-1 flex flex-col">
                                                <div className="mb-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wide ${camp.status === 'in_progress' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {camp.status === 'in_progress' ? 'Em Andamento' : 'Em Breve'}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-2xl font-black text-gray-900 group-hover:text-amber-600 transition-colors tracking-tight">
                                                        {camp.name}
                                                    </h3>
                                                </div>

                                                <div className="space-y-3 text-sm text-gray-600 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={16} className="text-gray-900" />
                                                        <span>Início: <strong>{new Date(camp.start_date).toLocaleDateString('pt-BR')}</strong></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={16} className="text-gray-900" />
                                                        <span>{camp.location}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-6 pt-4 border-t border-gray-100">
                                                    <Button className="w-full bg-gray-900 hover:bg-black group-hover:shadow-md transition-all">
                                                        Ver Detalhes <ArrowRight size={16} className="ml-2" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-lg">Nenhum campeonato ativo no momento.</p>
                        </div>
                    )}
                </section>

                {/* Histórico */}
                {(pastChampionships.length > 0 || activeChampionships.length === 0) && (
                    <section>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 border-b border-gray-200 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-100 p-2 rounded-lg">
                                    <History className="text-gray-700" size={24} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Galeria de Campeões (Histórico)
                                </h2>
                            </div>
                            <div className="flex gap-2">
                                <Link href="/campeonatos/ranking">
                                    <Button variant="outline" className="gap-2 rounded-full text-sm">
                                        <BarChart3 size={15} />
                                        Ranking Geral
                                    </Button>
                                </Link>
                                <Link href="/campeonatos/trofeus">
                                    <Button variant="outline" className="gap-2 rounded-full text-sm">
                                        <Medal size={15} />
                                        Ver Troféus
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {pastChampionships.length > 0 ? (
                            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {pastChampionships.map((camp) => (
                                    <Link key={camp.id} href={`/campeonatos/${camp.id}`} className="group h-full block">
                                        <Card className="h-full hover:shadow-md transition-all hover:bg-gray-50 border-gray-200">
                                            <CardContent className="p-5 flex flex-col items-center text-center">
                                                <div className="relative w-full aspect-square bg-gray-50 rounded-xl mb-4 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors overflow-hidden">
                                                    {camp.logo_url ? (
                                                        <img src={camp.logo_url} className="w-3/4 h-3/4 object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-500" alt="" />
                                                    ) : (
                                                        <Trophy size={40} className="text-gray-200" />
                                                    )}
                                                    <div className="absolute top-2 right-2">
                                                        <span className="text-[10px] font-black text-gray-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-gray-100">
                                                            {new Date(camp.start_date).getFullYear()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <h3 className="text-lg font-black text-gray-800 group-hover:text-gray-900 mb-1 leading-tight px-2">
                                                    {camp.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                                    {camp.location}
                                                </p>
                                                <div className="text-blue-600 text-sm font-medium flex items-center group-hover:underline">
                                                    Ver resultados
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 italic">
                                A história ainda está sendo escrita...
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}
