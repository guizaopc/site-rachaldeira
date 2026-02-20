import { createClient } from '@/lib/supabase/server';
import MembersList from './members-list';

export default async function IntegrantesPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    let currentUserRole = null;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        currentUserRole = profile?.role || null;
    }

    const { data: members } = await supabase
        .from('members')
        .select('*')
        .order('name', { ascending: true });

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-[#093a9f] mb-4">
                        Perebas
                    </h1>
                    <p className="text-xl text-gray-600">
                        Conheça o elenco estelar (e nem tanto) do Rachaldeira
                    </p>
                </div>

                <MembersList initialMembers={members || []} currentUserRole={currentUserRole} />
            </div>
        </main>
    );
}
