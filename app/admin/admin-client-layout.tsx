'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, CalendarDays, Trophy, PiggyBank, Home, LayoutDashboard, Shuffle, Image as ImageIcon, Menu, X, ChevronRight } from 'lucide-react';

interface AdminClientLayoutProps {
    children: React.ReactNode;
    role: string;
}

export default function AdminClientLayout({
    children,
    role
}: AdminClientLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Menu logic moved here to avoid serialization errors
    const allNavItems = [
        { href: '/admin', label: 'Painel', icon: LayoutDashboard },
        { href: '/admin/integrantes', label: 'Integrantes', icon: Users },
        { href: '/admin/rachas', label: 'Rachas', icon: CalendarDays },
        { href: '/admin/campeonatos', label: 'Campeonatos', icon: Trophy },
        { href: '/admin/galeria', label: 'Galeria', icon: ImageIcon },
        { href: '/admin/financeiro', label: 'Financeiro', icon: PiggyBank },
        { href: '/admin/sorteio', label: 'Sorteio', icon: Shuffle },
    ];

    const navItems = allNavItems.filter(item => {
        if (role === 'director' && item.href === '/admin/financeiro') {
            return false;
        }
        return true;
    });

    // Close sidebar on navigation (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="flex min-h-screen bg-gray-100 relative">
            {/* Minimalist Mobile Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className={`
                    lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-950 text-white rounded-md shadow-lg transition-opacity duration-300
                    ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                `}
            >
                <ChevronRight size={24} />
            </button>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-[70] w-64 bg-slate-950 text-white flex flex-col border-r border-slate-800 transition-transform duration-300 transform
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex-shrink-0
            `}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between lg:block">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Trophy className="text-yellow-500" />
                        RachaAdmin
                    </h1>
                    <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-slate-900/50 border-b border-slate-800 lg:block hidden">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        {role === 'admin' ? 'Administrador' : role === 'director' ? 'Diretor' : 'Usuário'}
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-[#af1c15] text-white'
                                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-900 hover:text-white rounded-lg transition-colors"
                    >
                        <Home size={20} />
                        <span>Voltar ao Site</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 w-full lg:mt-0 mt-2 overflow-x-hidden">
                <div className="max-w-[1400px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
