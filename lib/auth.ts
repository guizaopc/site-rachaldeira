import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type Role = 'admin' | 'director' | 'user';

/**
 * Valida a sessão do usuário (via cookies) e confere o papel no banco.
 * Use no início de toda server action / rota que faça algo privilegiado.
 * O papel é lido com a service role para não depender de RLS.
 */
export async function requireRole(allowed: Role[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, role: null, error: 'Não autenticado' as const };

    const { data: profile } = await createAdminClient()
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    const role = (profile?.role ?? null) as Role | null;
    if (!role || !allowed.includes(role)) {
        return { user, role, error: 'Sem permissão' as const };
    }
    return { user, role, error: null };
}
