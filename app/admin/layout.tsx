import { Users, CalendarDays, Trophy, PiggyBank, LayoutDashboard, Shuffle, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClientLayout from './admin-client-layout';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const role = profile?.role || 'user';

    const allNavItems = [
        { href: '/admin', label: 'Painel', icon: LayoutDashboard },
        { href: '/admin/integrantes', label: 'Integrantes', icon: Users },
        { href: '/admin/rachas', label: 'Rachas', icon: CalendarDays },
        { href: '/admin/campeonatos', label: 'Campeonatos', icon: Trophy },
        { href: '/admin/galeria', label: 'Galeria', icon: ImageIcon },
        { href: '/admin/financeiro', label: 'Financeiro', icon: PiggyBank },
        { href: '/admin/sorteio', label: 'Sorteio', icon: Shuffle },
    ];

    // Filtrar itens baseados no cargo
    const navItems = allNavItems.filter(item => {
        if (role === 'director' && item.href === '/admin/financeiro') {
            return false;
        }
        return true;
    });

    return (
        <AdminClientLayout navItems={navItems} role={role}>
            {children}
        </AdminClientLayout>
    );
}
