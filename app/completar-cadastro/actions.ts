'use server';

import { safeImageExtension } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function completarCadastroAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Usuário não autenticado.' };
    }

    // Check if already has member linked
    const adminClient = createAdminClient();
    const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('member_id')
        .eq('id', user.id)
        .maybeSingle();

    if (existingProfile?.member_id) {
        return { error: 'Este usuário já tem cadastro completo.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const position = formData.get('position') as string;
    const age = formData.get('age') as string;
    const phone = (formData.get('phone') as string)?.trim();
    const photo = formData.get('photo') as File | null;

    if (!name || !position) {
        return { error: 'Nome e posição são obrigatórios.' };
    }

    const email = user.email ?? '';

    // Check if member with same email already exists
    const { data: existingMember } = await adminClient
        .from('members')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (existingMember) {
        // Just link the existing member to this auth user
        const { error: profileError } = await adminClient
            .from('profiles')
            .upsert({ id: user.id, role: 'user', member_id: existingMember.id });

        if (profileError) {
            return { error: 'Erro ao vincular perfil: ' + profileError.message };
        }

        return { success: true };
    }

    // Create member record
    const { data: memberData, error: memberError } = await adminClient
        .from('members')
        .insert({
            name,
            email,
            age: parseInt(age) || 0,
            phone,
            position,
        })
        .select()
        .single();

    if (memberError) {
        return { error: 'Erro ao registrar integrante: ' + memberError.message };
    }

    // Handle photo upload
    if (photo && photo.size > 0) {
        try {
            const fileExt = safeImageExtension(photo);
            if (!fileExt) throw new Error('Foto inválida (use JPG, PNG, WEBP ou GIF até 5 MB)');
            const fileName = `${memberData.id}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await adminClient.storage
                .from('Fotos')
                .upload(fileName, photo, { contentType: photo.type, upsert: true });

            if (!uploadError) {
                const { data: { publicUrl } } = adminClient.storage
                    .from('Fotos')
                    .getPublicUrl(fileName);

                await adminClient
                    .from('members')
                    .update({ photo_url: publicUrl })
                    .eq('id', memberData.id);
            }
        } catch {
            // Photo upload failed, proceed anyway
        }
    }

    // Create / update profile linking auth user to member
    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({ id: user.id, role: 'user', member_id: memberData.id });

    if (profileError) {
        await adminClient.from('members').delete().eq('id', memberData.id);
        return { error: 'Erro ao finalizar perfil: ' + profileError.message };
    }

    return { success: true };
}
