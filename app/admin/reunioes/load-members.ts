import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { BoardMember } from '@/lib/reunioes';

/** Integrantes ativos, marcando quem é da diretoria (perfil admin/diretor). */
export async function loadBoardMembers(): Promise<BoardMember[]> {
    const supabase = await createClient();
    const { data: members } = await supabase
        .from('members')
        .select('id, name, photo_url')
        .eq('is_active', true)
        .order('name');

    let boardIds = new Set<string>();
    try {
        const { data: profiles } = await createAdminClient()
            .from('profiles')
            .select('member_id')
            .in('role', ['admin', 'director'])
            .not('member_id', 'is', null);
        boardIds = new Set((profiles ?? []).map(p => p.member_id as string));
    } catch {
        // Sem service role configurada: segue sem destacar a diretoria.
    }

    return (members ?? []).map(m => ({ ...m, isBoard: boardIds.has(m.id) }));
}
