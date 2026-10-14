'use server';

import { safeImageExtension } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export async function signUpAction(formData: FormData) {
    // 0. Extract and normalize data
    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;
    const position = formData.get('position') as string;
    const age = formData.get('age') as string;
    const phone = (formData.get('phone') as string)?.trim();
    const photo = formData.get('photo') as File | null;

    if (!email || !password || !name) {
        return { error: 'Dados obrigatórios ausentes.' };
    }
    if (password.length < 8) {
        return { error: 'A senha deve ter pelo menos 8 caracteres.' };
    }
    if (name.length > 100 || email.length > 254 || (phone && phone.length > 30)) {
        return { error: 'Dados inválidos.' };
    }

    const supabase = createAdminClient();

    try {
        // 1. Check if member already exists in members table
        const { data: existingMember, error: fetchError } = await supabase
            .from('members')
            .select('id, email')
            .eq('email', email)
            .maybeSingle();

        if (existingMember) {
            return { error: 'Este e-mail já está cadastrado como integrante. Tente fazer login.' };
        }

        // 2. Create auth user with auto-confirm.
        // Não reaproveitamos contas de Auth existentes: quem soubesse o e-mail de outra
        // pessoa conseguiria vincular um integrante à conta dela. Se o e-mail já existir,
        // o Supabase retorna erro e o cadastro é recusado.
        let userId: string;
        {
            const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name }
            });

            if (signUpError) {
                console.error('Error creating user:', signUpError);
                const msg = signUpError.message.includes('unexpected response')
                    ? 'O servidor do Supabase retornou um erro inesperado (500). Verifique a conexão.'
                    : signUpError.message;
                if (signUpError.message.toLowerCase().includes('already')) {
                    return { error: 'Este e-mail já possui conta. Tente fazer login ou recuperar a senha.' };
                }
                return { error: 'Erro no servidor de autenticação: ' + msg };
            }

            if (!authData.user) {
                return { error: 'Falha ao criar usuário.' };
            }
            userId = authData.user.id;
        }

        // 4. Create member record
        const { data: memberData, error: memberError } = await supabase
            .from('members')
            .insert({
                name,
                email,
                age: parseInt(age) || 0,
                phone,
                position,
                // photo_url will be updated later if upload succeeds
            })
            .select()
            .single();

        if (memberError) {
            console.error('Error creating member:', memberError);
            // Rollback Auth user if we just created it (optional, but safer to keep clean)
            // Note: If we reused an existingAuthUser, we might not want to delete it, 
            // but since it has no member record, it's probably a failed registration anyway.
            await supabase.auth.admin.deleteUser(userId);
            return { error: 'Erro ao registrar integrante: ' + memberError.message };
        }

        // 5. Create Profile link
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ // Use upsert because a trigger might have already created it
                id: userId,
                role: 'user',
                member_id: memberData.id
            });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            // Rollback member and auth
            await supabase.from('members').delete().eq('id', memberData.id);
            await supabase.auth.admin.deleteUser(userId);
            return { error: 'Erro ao finalizar perfil: ' + profileError.message };
        }

        // 6. Handle Photo Upload (Lazy/Post-creation)
        // If image upload fails, the user is still registered! This is better than failing the whole process.
        if (photo && photo.size > 0) {
            try {
                const fileExt = safeImageExtension(photo);
                if (!fileExt) throw new Error('Foto inválida (use JPG, PNG, WEBP ou GIF até 5 MB)');
                const fileName = `${memberData.id}_${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('Fotos')
                    .upload(fileName, photo, {
                        contentType: photo.type,
                        upsert: true
                    });

                if (uploadError) {
                    console.error('Error uploading photo:', uploadError);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('Fotos')
                        .getPublicUrl(fileName);
                    
                    // Update member with photo URL
                    await supabase
                        .from('members')
                        .update({ photo_url: publicUrl })
                        .eq('id', memberData.id);
                }
            } catch (storageError) {
                console.error('Storage error (recovered):', storageError);
                // We don't return error here because the account is already usable
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Unexpected error in signUpAction:', error);
        return { error: 'Erro crítico inesperado. Por favor, tente novamente mais tarde.' };
    }
}
