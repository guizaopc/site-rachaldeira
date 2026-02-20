import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Trophy, Medal, Star, Shield, Users, HandMetal, Beer, Crosshair } from 'lucide-react';

export default async function ChampionshipRankingPage() {
    const supabase = await createClient();

    // Buscar membros
    const { data: members } = await supabase
        .from('members')
        .select('id, name, position')
        .order('name');

    // Buscar stats de partidas de campeonato
    const { data: championshipStats } = await supabase
        .from('match_player_stats')
        .select(`
            member_id,
            goals,
            assists,
            difficult_saves,
            match_id,
            matches:match_id!inner (
                championship_id
            )
        `);

    // Buscar todos os campeonatos para contar títulos e prêmios individuais
    const { data: championships } = await supabase
        .from('championships')
        .select('id, status, craque_id, xerifao_id, paredao_id, garcom_id, artilheiro_id');

    // Processar dados
    const rankings = members?.map(member => {
        const stats = championshipStats?.filter((s: any) => s.member_id === member.id) || [];

        const goals = stats.reduce((sum: number, s: any) => sum + (s.goals || 0), 0);
        const assists = stats.reduce((sum: number, s: any) => sum + (s.assists || 0), 0);

        // Calcular participações em campeonatos distintos
        const uniqueCamps = new Set(stats.map((s: any) => s.matches?.championship_id).filter(Boolean));
        const participations = uniqueCamps.size;

        // Prêmios individuais salvos nos campeonatos
        const craqueTitles = championships?.filter(c => c.craque_id === member.id).length || 0;
        const xerifaoTitles = championships?.filter(c => c.xerifao_id === member.id).length || 0;
        const paredaoTitles = championships?.filter(c => c.paredao_id === member.id).length || 0;
        const garcomTitles = championships?.filter(c => c.garcom_id === member.id).length || 0;
        const artilheiroTitles = championships?.filter(c => c.artilheiro_id === member.id).length || 0;

        // TODO: Títulos de campeão
        const titles = 0;
        const finals = 0;

        return {
            ...member,
            goals,
            assists,
            participations,
            titles,
            finals,
            craqueTitles,
            xerifaoTitles,
            garcomTitles,
            paredaoTitles,
            artilheiroTitles
        };
    }) || [];

    // Ordenar por prêmios individuais + goals/assists
    const sortedRankings = rankings.sort((a, b) =>
        (b.craqueTitles + b.titles + b.artilheiroTitles) - (a.craqueTitles + a.titles + a.artilheiroTitles) ||
        b.goals - a.goals ||
        b.assists - a.assists
    );

    return (
        <main className="min-h-screen bg-slate-50 p-6 pb-20">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gray-900 text-yellow-500 mb-6 shadow-xl rotate-3">
                        <Trophy size={40} />
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tight">Hall da Fama</h1>
                    <p className="text-slate-500 font-medium text-lg">Os maiores nomes da história do Rachaldeira</p>
                </div>

                <Card className="shadow-2xl border-none rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white border-b p-8">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-2xl font-bold text-slate-800">Ranking de Atletas</CardTitle>
                            <div className="flex gap-2">
                                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">VIP</span>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">Oficial</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 hover:bg-transparent border-none">
                                        <TableHead className="w-20 text-center font-bold text-slate-400">#</TableHead>
                                        <TableHead className="font-bold text-slate-800">Atleta</TableHead>
                                        <TableHead className="text-center font-bold text-slate-800">Gols</TableHead>
                                        <TableHead className="text-center font-bold text-slate-800">Assist</TableHead>
                                        <TableHead className="text-center bg-yellow-50/50 font-bold text-yellow-700"><Star size={16} className="inline mr-1" /> Craque</TableHead>
                                        <TableHead className="text-center bg-red-50/50 font-bold text-red-700"><Crosshair size={16} className="inline mr-1" /> Artilheiro</TableHead>
                                        <TableHead className="text-center bg-blue-50/50 font-bold text-blue-700"><Shield size={16} className="inline mr-1" /> Xerifão</TableHead>
                                        <TableHead className="text-center bg-orange-50/50 font-bold text-orange-700"><HandMetal size={16} className="inline mr-1" /> Paredão</TableHead>
                                        <TableHead className="text-center bg-green-50/50 font-bold text-green-700"><Beer size={16} className="inline mr-1" /> Garçom</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedRankings.filter(p => p.goals > 0 || p.craqueTitles > 0).map((player, idx) => (
                                        <TableRow key={player.id} className="group hover:bg-slate-50 transition-all border-b border-slate-100">
                                            <TableCell className="text-center">
                                                <span className={`text-lg font-black ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-400' : 'text-slate-300'}`}>
                                                    {idx + 1}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{player.name}</span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">{player.position || 'RESERVA'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-xl font-bold text-slate-800">{player.goals}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-xl font-medium text-slate-500">{player.assists}</span>
                                            </TableCell>

                                            {/* Awards */}
                                            <TableCell className="text-center bg-yellow-50/20">
                                                {player.craqueTitles > 0 ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 text-yellow-700 font-bold border border-yellow-200">{player.craqueTitles}</span> : <span className="text-slate-200">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center bg-red-50/20">
                                                {player.artilheiroTitles > 0 ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-700 font-bold border border-red-200">{player.artilheiroTitles}</span> : <span className="text-slate-200">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center bg-blue-50/20">
                                                {player.xerifaoTitles > 0 ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold border border-blue-200">{player.xerifaoTitles}</span> : <span className="text-slate-200">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center bg-orange-50/20">
                                                {player.paredaoTitles > 0 ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold border border-orange-200">{player.paredaoTitles}</span> : <span className="text-slate-200">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center bg-green-50/20">
                                                {player.garcomTitles > 0 ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 font-bold border border-green-200">{player.garcomTitles}</span> : <span className="text-slate-200">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
