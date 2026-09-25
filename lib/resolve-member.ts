import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Retorna o member_id do usuário. Se o perfil não existir ou não estiver vinculado,
 * procura o integrante pelo e-mail e grava o vínculo (cria o perfil se preciso).
 */
export async function resolveMemberId(user: { id: string; email?: string | null }) {
    const admin = createAdminClient();

    const { data: profile } = await admin
        .from('profiles')
        .select('member_id, role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.member_id) return { memberId: profile.member_id as string, role: profile.role as string | null };
    if (!user.email) return { memberId: null, role: profile?.role ?? null };

    const { data: member } = await admin
        .from('members')
        .select('id')
        .ilike('email', user.email.replace(/[%_\\]/g, '\\$&'))
        .maybeSingle();

    if (!member) return { memberId: null, role: profile?.role ?? null };

    await admin
        .from('profiles')
        .upsert({ id: user.id, role: profile?.role ?? 'user', member_id: member.id });

    return { memberId: member.id as string, role: profile?.role ?? 'user' };
}
