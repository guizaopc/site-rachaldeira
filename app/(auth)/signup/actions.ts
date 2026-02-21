'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export async function signUpAction(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const position = formData.get('position') as string;
    const age = formData.get('age') as string;
    const phone = formData.get('phone') as string;
    const photo = formData.get('photo') as File | null;

    try {
        const supabase = createAdminClient();

        console.log('Creating user:', { email, name });

        // Upload photo if exists
        let photo_url = null;
        if (photo && photo.size > 0) {
            const fileExt = photo.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('Foto dos Usuarios')
                .upload(filePath, photo, {
                    contentType: photo.type,
                    upsert: true
                });

            if (uploadError) {
                console.error('Error uploading photo:', uploadError);
                // Continue without photo or handle error?
                // For now, let's log and continue
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('Foto dos Usuarios')
                    .getPublicUrl(filePath);
                photo_url = publicUrl;
            }
        }

        // 1. Create auth user with auto-confirm
        const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name }
        });

        if (signUpError) {
            console.error('Error creating user:', signUpError);
            return { error: signUpError.message };
        }

        if (!authData.user) {
            return { error: 'Erro inesperado ao criar usuário' };
        }

        // 2. Create member
        const { data: memberData, error: memberError } = await supabase
            .from('members')
            .insert({
                name,
                email,
                age: parseInt(age) || 0,
                phone,
                position,
                photo_url
            })
            .select()
            .single();

        if (memberError) {
            console.error('Error creating member:', memberError);
            // Desfazer criação do usuário se falhar membro (opcional, mas recomendado)
            await supabase.auth.admin.deleteUser(authData.user.id);
            return { error: 'Erro ao criar registro de membro: ' + memberError.message };
        }

        // 3. Create/Link profile
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                role: 'user',
                member_id: memberData.id
            });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            // Tentar limpar
            await supabase.from('members').delete().eq('id', memberData.id);
            await supabase.auth.admin.deleteUser(authData.user.id);
            return { error: 'Erro ao criar perfil: ' + profileError.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error in signUpAction:', error);
        return { error: error.message || 'Erro interno do servidor ao criar conta.' };
    }
}
