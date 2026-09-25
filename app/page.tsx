import Link from 'next/link';
import NextImage from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { CalendarDays, Trophy, Instagram, Crown, Medal, ShieldCheck, ArrowRight, ArrowUpRight } from 'lucide-react';

function PlayerRow({ player }: { player: any }) {
    if (!player) return null;
    return (
        <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-100">
                {player.photo_url ? (
                    <img
                        src={player.photo_url}
                        alt={player.name}
                        className="w-full h-full object-cover object-top"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                        {player.name?.charAt(0)}
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight truncate">{player.name}</p>
                {player.position && (
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{player.position}</p>
                )}
            </div>
        </div>
    );
}

function HighlightCard({ label, icon: Icon, players, chip }: {
    label: string;
    icon: any;
    players: any[];
    chip: string;
}) {
    const list = players.filter(Boolean);
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${chip}`}>
                    <Icon size={15} />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            </div>
            {list.length > 0 ? (
                <div className="space-y-3">
                    {list.map((p: any) => <PlayerRow key={p.id} player={p} />)}
                </div>
            ) : (
                <p className="text-gray-300 text-sm font-medium">Sem destaque</p>
            )}
        </div>
    );
}

export default async function Home() {
    let members: any[] = [];
    let lastRacha: any = null;
    let rachas: any[] = [];
    let campeonatos: any[] = [];
    let weeklyHighlights: any = null;

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
            const supabase = await createClient();

            // Buscar membros para exibir nomes nos destaques
            const { data: membersData } = await supabase
                .from('members')
                .select('id, name, position, photo_url');
            members = membersData || [];

            // Buscar último racha fechado para destaques semanais
            const { data: lastRachaData } = await supabase
                .from('rachas')
                .select('*')
                .eq('status', 'closed')
                .neq('location', 'Sistema (Manual)')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            lastRacha = lastRachaData;

            if (lastRacha && members.length > 0) {
                const find = (id: string) => members.find(m => m.id === id);

                weeklyHighlights = {
                    rachaLabel: new Date(lastRacha.date_time).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                    top1: [find(lastRacha.top1_id), find(lastRacha.top1_extra_id), find(lastRacha.top1_extra2_id)],
                    top2: [find(lastRacha.top2_id), find(lastRacha.top2_extra_id), find(lastRacha.top2_extra2_id)],
                    top3: [find(lastRacha.top3_id), find(lastRacha.top3_extra_id), find(lastRacha.top3_extra2_id)],
                    sheriff: [find(lastRacha.sheriff_id), find(lastRacha.sheriff_extra_id), find(lastRacha.sheriff_extra2_id)],
                };
            }

            // Buscar próximos rachas (abertos ou travados)
            const { data: rachasData } = await supabase
                .from('rachas')
                .select('*')
                .in('status', ['open', 'locked'])
                .neq('location', 'Sistema (Manual)')
                .order('date_time', { ascending: true })
                .limit(4);
            rachas = rachasData || [];

            // Buscar campeonatos ativos
            const { data: champData } = await supabase
                .from('championships')
                .select('*')
                .eq('status', 'in_progress')
                .order('start_date', { ascending: false });
            campeonatos = champData || [];
        }
    } catch (error) {
        console.error("Error fetching homepage data:", error);
    }

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col">
            {/* Hero Section */}
            <section className="relative -mt-24 min-h-[78vh] md:min-h-[88vh] flex items-start overflow-hidden">
                <NextImage
                    src="/hero-bg.png"
                    alt="Rachaldeira"
                    fill
                    className="object-cover object-[center_20%] md:object-[center_5%]"
                    priority
                    sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/40" />

                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 w-full pt-36 md:pt-40 pb-8">
                    <div className="animate-fade-in-up">
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none">
                            Rachaldeira
                        </h1>
                        <p className="text-white/70 text-lg md:text-xl mt-2 max-w-xl font-light">
                            Resenha, amizade e futebol levado a sério.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-4">
                            <Link
                                href="/rachas"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-gray-900 text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg"
                            >
                                Próximo Racha
                                <ArrowRight size={16} />
                            </Link>
                            <Link
                                href="/campeonatos"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/40 text-white text-sm font-bold hover:bg-white/10 backdrop-blur-sm transition-colors"
                            >
                                Campeonatos
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20 w-full space-y-16 md:space-y-24">

                {/* Destaques do Último Racha */}
                {weeklyHighlights && (
                    <section>
                        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-8">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                    Destaques da Semana
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Racha de {weeklyHighlights.rachaLabel}
                                </p>
                            </div>
                            <Link
                                href="/rank"
                                className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#093a9f] hover:text-[#0d4bc4] transition-colors"
                            >
                                Ver ranking completo
                                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <HighlightCard
                                label="Craque"
                                icon={Crown}
                                players={weeklyHighlights.top1}
                                chip="bg-amber-50 text-amber-600"
                            />
                            <HighlightCard
                                label="Top 2"
                                icon={Medal}
                                players={weeklyHighlights.top2}
                                chip="bg-slate-100 text-slate-500"
                            />
                            <HighlightCard
                                label="Top 3"
                                icon={Medal}
                                players={weeklyHighlights.top3}
                                chip="bg-orange-50 text-orange-500"
                            />
                            <HighlightCard
                                label="Xerife"
                                icon={ShieldCheck}
                                players={weeklyHighlights.sheriff}
                                chip="bg-blue-50 text-[#093a9f]"
                            />
                        </div>
                    </section>
                )}

                {/* Próximos Rachas */}
                <section>
                    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                Próximos Rachas
                            </h2>
                        </div>
                        <Link
                            href="/rachas"
                            className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#093a9f] hover:text-[#0d4bc4] transition-colors"
                        >
                            Ver agenda completa
                            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    {rachas && rachas.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {rachas.map((racha) => {
                                const date = new Date(racha.date_time);
                                return (
                                    <Link
                                        key={racha.id}
                                        href={racha.is_next ? '/rachas/proximo' : `/rachas/${racha.id}`}
                                        className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-[#093a9f]/30 hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#093a9f] flex flex-col items-center justify-center flex-shrink-0 leading-none">
                                                <span className="text-base font-black">
                                                    {date.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' })}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-wide">
                                                    {date.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}
                                                </span>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${racha.status === 'open' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${racha.status === 'open' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                {racha.status === 'open' ? 'Aberto' : 'Travado'}
                                            </span>
                                        </div>
                                        <p className="font-bold text-gray-900 group-hover:text-[#093a9f] transition-colors leading-snug">
                                            {racha.location}
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                                            {racha.is_next && <span className="ml-2 text-[#af1c15] font-bold text-xs">Próximo</span>}
                                        </p>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400">
                            Nenhum racha agendado no momento.
                        </div>
                    )}
                </section>

                {/* História do Grupo */}
                <section>
                    <div className="mb-6 md:mb-8">
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            Nossa História
                        </h2>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="grid md:grid-cols-5 gap-0">
                            <div className="md:col-span-2 relative min-h-[280px] md:min-h-[500px]">
                                <NextImage
                                    src="https://pqroxmeyuicutatbessb.supabase.co/storage/v1/object/public/Fotos/Foto%20cal%20presida.jpg"
                                    alt="Cal Presida - Rachaldeira"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 40vw"
                                />
                            </div>
                            <div className="md:col-span-3 p-6 md:p-12 flex flex-col justify-center">
                                <div className="text-gray-600 leading-relaxed space-y-4 text-base">
                                    <p>
                                        No início de 2019, surgiu no coração do Suricato a ideia de organizar um racha no Sport Gaúcho. Mas não era qualquer racha — a proposta era algo diferente: planilha na mão, scouts sendo anotados e, claro, aquela vontade de fazer tudo bem feito. Sabendo das dificuldades para reunir jogadores e manter o controle financeiro, Suricato convidou Cal para ajudar na organização.
                                    </p>
                                    <p>
                                        Tudo corria bem, até que em março de 2020 a pandemia chegou e atrapalhou os planos. O racha foi interrompido. Mas a paixão pelo futebol falou mais alto: em janeiro de 2021, Muca resolveu assumir a responsabilidade de reerguer o projeto ao lado de Cal. Trouxe com ele não só a sua galera, mas também inovação com o app Chega Mais, que além de controlar a presença, registrava os scouts e destacava os melhores jogadores da semana.
                                    </p>
                                    <p>
                                        A turma foi crescendo e o racha ganhando força. No fim de 2021, Muca se despediu do projeto, deixando o comando nas mãos de Caldeira, que seguiu firme.
                                    </p>
                                    <blockquote className="border-l-[3px] border-[#af1c15] pl-5 py-1 my-4 text-gray-900 font-semibold text-lg leading-snug">
                                        "Queremos um racha organizado, sem brigas, com muita resenha, competição saudável e, acima de tudo, amizade."
                                    </blockquote>
                                    <p>
                                        Desde então, Caldeira reuniu um grupo de pessoas com a mesma mentalidade, que hoje compõem a diretoria do time: Buiu, Diogo, PH, Matheus, Texas, Zirão e Guizao. Juntos, seguimos evoluindo dia após dia, sempre buscando excelência em tudo que fazemos.
                                    </p>
                                    <p>
                                        Não é à toa que já participamos de cinco campeonatos — todos com muita festa, resenha e diversão (menos pro presidente, que segue firme... mas ainda virgem de títulos).
                                    </p>
                                    <p className="text-gray-700 mt-2">
                                        Seja muito bem-vindo ao site do nosso racha. Aqui o futebol é levado a sério, mas a amizade é o que realmente importa.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                    {/* Campeonatos */}
                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                Campeonatos
                            </h2>
                        </div>
                        {campeonatos && campeonatos.length > 0 ? (
                            <div className="space-y-3">
                                {campeonatos.map((camp) => (
                                    <Link
                                        key={camp.id}
                                        href={`/campeonatos/${camp.id}`}
                                        className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-[#af1c15]/30 hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="w-11 h-11 rounded-xl bg-red-50 text-[#af1c15] flex items-center justify-center flex-shrink-0">
                                            <Trophy size={19} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 group-hover:text-[#af1c15] transition-colors truncate">
                                                {camp.name}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">
                                                {camp.format === 'round_robin' ? 'Pontos Corridos' : 'Mata-mata'} · {new Date(camp.start_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                            </p>
                                        </div>
                                        <ArrowRight size={16} className="text-gray-300 group-hover:text-[#af1c15] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                    </Link>
                                ))}
                                <Link
                                    href="/campeonatos"
                                    className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#093a9f] hover:text-[#0d4bc4] transition-colors pt-1"
                                >
                                    Ver classificação
                                    <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400">
                                Nenhum campeonato ativo.
                            </div>
                        )}
                    </section>

                    {/* Instagram */}
                    <section className="flex flex-col">
                        <div className="mb-6">
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                Siga o Rachaldeira
                            </h2>
                        </div>
                        <a
                            href="https://instagram.com/rachaldeira"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center hover:shadow-md transition-all duration-200"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-[2.5px] mb-4 group-hover:scale-105 transition-transform">
                                <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center">
                                    <Instagram size={28} className="text-gray-900" />
                                </div>
                            </div>
                            <p className="font-black text-gray-900 text-lg">@rachaldeira</p>
                            <p className="text-sm text-gray-400 mt-1 mb-5 max-w-xs">
                                Fotos, vídeos e os melhores momentos dos rachas e campeonatos.
                            </p>
                            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-bold group-hover:bg-gray-800 transition-colors">
                                Seguir no Instagram
                                <ArrowUpRight size={15} />
                            </span>
                        </a>
                    </section>
                </div>
            </div>
        </main>
    );
}
