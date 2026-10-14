import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
    // Verificar se usuário é admin (sessão via cookies)
    const auth = await requireRole(['admin']);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.user ? 403 : 401 });
    }

    try {
        const { email, password, member_id } = await req.json();

        if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
            return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
        }
        if (typeof password !== 'string' || password.length < 8) {
            return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres' }, { status: 400 });
        }
        if (typeof member_id !== 'string' || !UUID_RE.test(member_id)) {
            return NextResponse.json({ error: 'Integrante inválido' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // Criar usuário
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
        });

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }

        // Criar profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: newUser.user.id,
                role: 'user',
                member_id,
            });

        if (profileError) {
            // Se falhar ao criar profile, deletar usuário
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
            return NextResponse.json({ error: 'Erro ao criar perfil do usuário' }, { status: 400 });
        }

        return NextResponse.json({ user_id: newUser.user.id }, { status: 200 });
    } catch (error) {
        console.error('Erro em create-user:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
