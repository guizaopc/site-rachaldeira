import { createClient } from '@/lib/supabase/server';
import TicketsClient, { type AdminTicket } from './tickets-client';

export default async function TicketsPage() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tickets')
        .select('*, members(name, photo_url)')
        .order('created_at', { ascending: false });

    if (error) {
        return (
            <div className="rounded-xl bg-red-50 p-6 text-red-800">
                Erro ao carregar tickets. A migração <code>009_tickets.sql</code> já foi aplicada no Supabase?
            </div>
        );
    }

    return <TicketsClient tickets={(data ?? []) as AdminTicket[]} />;
}
