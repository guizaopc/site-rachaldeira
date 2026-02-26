'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CalendarDays, Trophy, BarChart3, Award, LogOut, Settings, Menu, X, User, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';


interface NavbarProps {
    user: any;
    profile: any;
    member?: { name: string; photo_url: string } | null;
}

export function Navbar({ user, profile, member }: NavbarProps) {
    const pathname = usePathname();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'director';
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const navLinks = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/integrantes', label: 'Integrantes', icon: Users },
        { href: '/rachas', label: 'Rachas', icon: CalendarDays },
        { href: '/campeonatos', label: 'Campeonatos', icon: Trophy },
        { href: '/galeria', label: 'Galeria', icon: ImageIcon },
        { href: '/stats/2026', label: 'Estatísticas', icon: BarChart3 },
        { href: '/rank', label: 'Ranking', icon: Award },
    ];

    const adminLinks = [
        { href: '/admin', label: 'Painel Admin', icon: Settings },
        { href: '/admin/rachas', label: 'Admin: Rachas', icon: Settings },
        { href: '/admin/campeonatos', label: 'Admin: Campeonatos', icon: Settings },
    ];

    return (
        <header className="shadow-lg relative z-50">
            {/* Top Bar - Vermelha */}
            <div className="h-6 bg-[#af1c15] w-full" />

            {/* Nav Bar - Azul */}
            <nav className="bg-[#093a9f] text-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo Simplificada */}
                        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity relative z-50">
                            <NextImage
                                src="https://pqroxmeyuicutatbessb.supabase.co/storage/v1/object/public/Fotos/logo%20rachaldeira.png"
                                alt="Rachaldeira Logo"
                                width={220}
                                height={220}
                                className="object-contain -mt-9 drop-shadow-2xl"
                                sizes="(max-width: 768px) 150px, 220px"
                            />
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive
                                            ? 'bg-blue-800 text-white shadow-sm'
                                            : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
                                            }`}
                                    >
                                        <span>{link.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* User Actions & Mobile Toggle */}
                        <div className="flex items-center gap-4">

                            {/* Admin Link - For Admins and Directors */}
                            {(isAdmin || profile?.role === 'director') && (
                                <div className="hidden lg:flex items-center">
                                    <Link href="/admin" className="p-2 text-blue-200 hover:text-white transition-colors" title="Área Administrativa">
                                        <Settings size={20} />
                                    </Link>
                                </div>
                            )}

                            {user ? (
                                <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-blue-800">
                                    <Link
                                        href="/meu-perfil"
                                        className="flex items-center gap-2 hover:bg-blue-800 py-1 px-2 rounded transition-colors group"
                                        title="Meu Perfil"
                                    >
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-blue-200 group-hover:text-white font-medium">
                                                {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'director' ? 'Diretor' : 'Membro'}
                                            </span>
                                            <span className="text-xs text-blue-300 group-hover:text-blue-100">
                                                {member?.name || user.email?.split('@')[0]}
                                            </span>
                                        </div>
                                        <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-blue-400 group-hover:border-white transition-colors">
                                            {member?.photo_url ? (
                                                <NextImage
                                                    src={member.photo_url}
                                                    alt={member.name || 'User'}
                                                    width={32}
                                                    height={32}
                                                    className="object-cover w-full h-full"
                                                    sizes="32px"
                                                />
                                            ) : (
                                                <div className="bg-blue-700 w-full h-full flex items-center justify-center group-hover:bg-blue-600">
                                                    <User size={16} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </Link>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleLogout}
                                        className="text-red-300 hover:bg-red-600/20 hover:text-red-200 h-8 w-8 p-0 rounded-full"
                                        title="Sair"
                                    >
                                        <LogOut size={16} />
                                    </Button>
                                </div>
                            ) : (
                                <div className="hidden lg:flex items-center gap-3">
                                    <Link href="/login">
                                        <Button variant="secondary" className="rounded-full w-32 font-bold transition-colors">
                                            Entrar
                                        </Button>
                                    </Link>
                                    <Link href="/signup">
                                        <Button variant="black" className="rounded-full w-32 font-bold shadow-lg border border-gray-800">
                                            Criar Conta
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="lg:hidden p-2 rounded-md text-blue-100 hover:bg-blue-800 focus:outline-none"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="lg:hidden bg-[#093a9f] border-t border-blue-800 px-4 pt-2 pb-6 shadow-xl animate-in slide-in-from-top-5">
                        <div className="space-y-1">
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium ${isActive
                                            ? 'bg-blue-800 text-white'
                                            : 'text-blue-100 hover:bg-blue-800/50'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span>{link.label}</span>
                                    </Link>
                                );
                            })}


                            {isAdmin && (
                                <>
                                    <div className="h-px bg-blue-800 my-2" />
                                    <p className="px-3 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Administração</p>
                                    {adminLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsMenuOpen(false)}
                                            className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-blue-100 hover:bg-blue-800/50"
                                        >
                                            <link.icon size={20} />
                                            <span>{link.label.replace('Admin: ', '')}</span>
                                        </Link>
                                    ))}
                                </>
                            )}


                            {user ? (
                                <>
                                    <div className="h-px bg-blue-800 my-2" />
                                    <Link
                                        href="/meu-perfil"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-blue-100 hover:bg-blue-800/50"
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-400 flex-shrink-0">
                                            {member?.photo_url ? (
                                                <NextImage
                                                    src={member.photo_url}
                                                    alt={member.name || 'User'}
                                                    width={32}
                                                    height={32}
                                                    className="object-cover w-full h-full"
                                                    sizes="32px"
                                                />
                                            ) : (
                                                <div className="bg-blue-700 w-full h-full flex items-center justify-center">
                                                    <User size={16} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">{member?.name || 'Meu Perfil'}</span>
                                            <span className="text-xs text-blue-300">{profile?.role === 'admin' ? 'Administrador' : profile?.role === 'director' ? 'Diretor' : 'Membro'}</span>
                                        </div>
                                    </Link>
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <span className="text-sm text-blue-200">{user.email}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleLogout}
                                            className="text-red-300 hover:text-red-100 hover:bg-red-900/20"
                                        >
                                            <LogOut size={18} className="mr-2" /> Sair
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="h-px bg-blue-800 my-4" />
                                    <div className="grid grid-cols-2 gap-3 px-1">
                                        <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                                            <Button variant="secondary" className="w-full rounded-full font-bold transition-colors">
                                                Entrar
                                            </Button>
                                        </Link>
                                        <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                                            <Button variant="black" className="w-full rounded-full font-bold shadow-lg border border-gray-800">
                                                Criar Conta
                                            </Button>
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
