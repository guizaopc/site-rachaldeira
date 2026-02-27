import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UserManagementClient from './user-management-client';

export default async function UserManagementPage() {
    const supabase = await createClient();

    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/');

    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (currentUserProfile?.role !== 'admin') {
        redirect('/admin');
    }

    // Fetch all profiles with their member details
    // Note: profiles usually link to members. Auth email is in auth.users which we can't easily join here without a view or rpc, 
    // BUT members table has email! AND profiles links to members.
    // So we can fetch profiles and join members.

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
            id,
            role,
            created_at,
            members (
                id,
                name,
                email,
                photo_url,
                position,
                level
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return <div>Erro ao carregar usuários.</div>;
    }

    // Do not filter out profiles without members, so we can see who is "broken"
    const validProfiles = profiles;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
                <p className="text-gray-500">Defina quem é Admin, Diretor ou Usuário comum.</p>
            </div>

            <UserManagementClient profiles={validProfiles} />
        </div>
    );
}
