'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { isTicketStatus, isTicketType, type Ticket } from '@/lib/tickets';

export async function createTicket(input: {
    type: string;
    title: string;
    description: string;
    pageUrl?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Faça login para abrir um ticket.' };

    const title = input.title?.trim() ?? '';
    const description = input.description?.trim() ?? '';
    if (!isTicketType(input.type)) return { error: 'Tipo inválido.' };
    if (title.length < 3 || title.length > 120) return { error: 'O título deve ter entre 3 e 120 caracteres.' };
    if (description.length < 5 || description.length > 4000) return { error: 'A descrição deve ter entre 5 e 4000 caracteres.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('member_id')
        .eq('id', user.id)
        .maybeSingle();

    const { error } = await supabase.from('tickets').insert({
        user_id: user.id,
        member_id: profile?.member_id ?? null,
        type: input.type,
        title,
        description,
        page_url: input.pageUrl?.slice(0, 500) || null,
    });

    if (error) {
        console.error('createTicket:', error);
        return { error: 'Não foi possível enviar o ticket. Tente novamente.' };
    }

    revalidatePath('/admin/tickets');
    return { error: null };
}

export async function getMyTickets(): Promise<Ticket[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

    return (data as Ticket[]) ?? [];
}

export async function updateTicket(id: string, input: { status: string; adminResponse: string }) {
    const auth = await requireRole(['admin', 'director']);
    if (auth.error) return { error: auth.error };

    if (!isTicketStatus(input.status)) return { error: 'Status inválido.' };
    const adminResponse = input.adminResponse?.trim() ?? '';
    if (adminResponse.length > 4000) return { error: 'Resposta muito longa.' };

    const supabase = await createClient();
    const { error } = await supabase
        .from('tickets')
        .update({ status: input.status, admin_response: adminResponse || null })
        .eq('id', id);

    if (error) {
        console.error('updateTicket:', error);
        return { error: 'Erro ao atualizar o ticket.' };
    }

    revalidatePath('/admin/tickets');
    return { error: null };
}

export async function deleteTicket(id: string) {
    const auth = await requireRole(['admin', 'director']);
    if (auth.error) return { error: auth.error };

    const supabase = await createClient();
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (error) return { error: 'Erro ao excluir o ticket.' };

    revalidatePath('/admin/tickets');
    return { error: null };
}
