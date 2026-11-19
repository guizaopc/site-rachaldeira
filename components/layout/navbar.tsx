'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CalendarDays, Trophy, BarChart3, Award, LogOut, Settings, Menu, X, User, Image as ImageIcon, Medal } from 'lucide-react';
import NextImage from 'next/image';
import { createClient } from '@/lib/supabase/client';

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
        { href: '/campeonatos/trofeus', label: 'Troféus', icon: Medal },
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
        <header className={`sticky top-0 z-50 px-3 sm:px-4 pt-8 pb-1 ${pathname.startsWith('/admin') ? 'bg-gray-100 lg:pl-[17rem]' : ''}`}>
            <nav className="relative max-w-6xl mx-auto rounded-full bg-[#093a9f]/95 backdrop-blur-md text-white shadow-lg shadow-blue-950/25 ring-1 ring-white/10 overflow-hidden">
                <div className="flex items-center justify-between h-16 pl-4 pr-2.5 sm:pl-6 sm:pr-3">
                    {/* Logo */}
                    <Link href="/" className="flex items-center hover:opacity-90 transition-opacity flex-shrink-0">
                        <NextImage
                            src="https://pqroxmeyuicutatbessb.supabase.co/storage/v1/object/public/Fotos/logo%20rachaldeira.png"
                            alt="Rachaldeira Logo"
                            width={120}
                            height={120}
                            className="h-14 w-auto object-contain drop-shadow"
                            sizes="120px"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`relative px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${isActive
                                        ? 'text-white'
                                        : 'text-blue-100/70 hover:text-white'
                                        }`}
                                >
                                    {link.label}
                                    {isActive && (
                                        <span className="absolute left-3 right-3 -bottom-0.5 h-[3px] rounded-full bg-[#e02418]" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* User Actions & Mobile Toggle */}
                    <div className="flex items-center gap-2">

                        {/* Admin Link - For Admins and Directors */}
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className="hidden lg:flex p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
                                title="Área Administrativa"
                            >
                                <Settings size={18} />
                            </Link>
                        )}

                        {user ? (
                            <div className="hidden lg:flex items-center gap-1.5">
                                <Link
                                    href="/meu-perfil"
                                    className="flex items-center gap-2.5 hover:bg-white/10 py-1.5 pl-3 pr-1.5 rounded-full transition-colors group"
                                    title="Meu Perfil"
                                >
                                    <div className="flex flex-col items-end leading-tight">
                                        <span className="text-xs font-semibold text-white">
                                            {member?.name || user.email?.split('@')[0]}
                                        </span>
                                        <span className="text-[10px] text-blue-200/80">
                                            {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'director' ? 'Diretor' : 'Membro'}
                                        </span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/25 group-hover:ring-white/60 transition-all">
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
                                            <div className="bg-blue-800 w-full h-full flex items-center justify-center">
                                                <User size={15} className="text-blue-200" />
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-full text-blue-200/70 hover:text-white hover:bg-[#af1c15] transition-colors"
                                    title="Sair"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="hidden lg:flex items-center gap-2">
                                <Link
                                    href="/login"
                                    className="px-5 py-2 rounded-full text-sm font-bold bg-white text-[#093a9f] hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    Entrar
                                </Link>
                                <Link
                                    href="/signup"
                                    className="px-5 py-2 rounded-full text-sm font-bold bg-[#af1c15] text-white hover:bg-[#c62b23] transition-colors shadow-sm"
                                >
                                    Criar Conta
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-2.5 rounded-full text-blue-100 hover:bg-white/10 focus:outline-none transition-colors"
                            aria-label="Menu"
                        >
                            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
                {/* Faixa vermelha dentro da pílula */}
                <div className="absolute bottom-0 inset-x-0 h-[5px] bg-[#af1c15]" />
            </nav>

            {/* Mobile Menu - painel flutuante abaixo da pílula */}
            {isMenuOpen && (
                <div className="lg:hidden max-w-6xl mx-auto mt-2 rounded-3xl bg-[#093a9f]/95 backdrop-blur-md text-white shadow-xl shadow-blue-950/30 ring-1 ring-white/10 px-4 pt-3 pb-5 animate-in slide-in-from-top-3 fade-in duration-200">
                    <div className="space-y-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-medium transition-colors ${isActive
                                        ? 'bg-white/15 text-white'
                                        : 'text-blue-100 hover:bg-white/10'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span>{link.label}</span>
                                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e02418]" />}
                                </Link>
                            );
                        })}

                        {isAdmin && (
                            <>
                                <div className="h-px bg-white/10 my-2" />
                                <p className="px-4 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">Administração</p>
                                {adminLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-medium text-blue-100 hover:bg-white/10 transition-colors"
                                    >
                                        <link.icon size={20} />
                                        <span>{link.label.replace('Admin: ', '')}</span>
                                    </Link>
                                ))}
                            </>
                        )}

                        {user ? (
                            <>
                                <div className="h-px bg-white/10 my-2" />
                                <Link
                                    href="/meu-perfil"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-medium text-blue-100 hover:bg-white/10 transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/25 flex-shrink-0">
                                        {member?.photo_url ? (
                                            <NextImage
                                                src={member.photo_url}
                                                alt={member.name || 'User'}
                                                width={36}
                                                height={36}
                                                className="object-cover w-full h-full"
                                                sizes="36px"
                                            />
                                        ) : (
                                            <div className="bg-blue-800 w-full h-full flex items-center justify-center">
                                                <User size={16} className="text-blue-200" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold">{member?.name || 'Meu Perfil'}</span>
                                        <span className="text-xs text-blue-300">{profile?.role === 'admin' ? 'Administrador' : profile?.role === 'director' ? 'Diretor' : 'Membro'}</span>
                                    </div>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-medium text-red-200 hover:bg-[#af1c15]/80 hover:text-white transition-colors"
                                >
                                    <LogOut size={20} />
                                    <span>Sair</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="h-px bg-white/10 my-3" />
                                <div className="grid grid-cols-2 gap-3 px-1">
                                    <Link
                                        href="/login"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-bold bg-white text-[#093a9f] hover:bg-blue-50 transition-colors"
                                    >
                                        Entrar
                                    </Link>
                                    <Link
                                        href="/signup"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-bold bg-[#af1c15] text-white hover:bg-[#c62b23] transition-colors"
                                    >
                                        Criar Conta
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
