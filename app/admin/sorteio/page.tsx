import { createClient } from '@/lib/supabase/server';
import { TeamDrawer } from './team-drawer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CalendarX } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SorteioPage() {
    const supabase = await createClient();

    // 1. Fetch Next Racha (any status except closed)
    const { data: nextRacha } = await supabase
        .from('rachas')
        .select('*')
        .neq('status', 'closed')
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
        .limit(1)
        .single();

    if (!nextRacha) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <CalendarX className="h-4 w-4" />
                    <AlertTitle>Nenhum Racha Disponível</AlertTitle>
                    <AlertDescription>
                        Não há rachas futuros ativos para realizar o sorteio.
                        Agende um novo racha ou verifique se há algum disponível.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // 2. Fetch Confirmed Members for this Racha
    // We get the attendance records linked to members
    const { data: attendance } = await supabase
        .from('racha_attendance')
        .select(`
            status,
            member:members (
                id,
                name,
                photo_url,
                position,
                level
            )
        `)
        .eq('racha_id', nextRacha.id)
        .eq('status', 'in');

    // Extract the member objects from the join structure
    const confirmedMembers = attendance?.map((record: any) => record.member) || [];

    return (
        <div className="p-8">
            <TeamDrawer
                confirmedMembers={confirmedMembers}
                rachaLocation={nextRacha.location}
                rachaDate={new Date(nextRacha.date_time).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
            />
        </div>
    );
}
