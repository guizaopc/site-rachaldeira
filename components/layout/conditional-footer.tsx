'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function ConditionalFooter() {
    const pathname = usePathname();
    const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route));
    if (isAuthRoute) return null;
    if (pathname.startsWith('/admin')) return <div className="lg:pl-64"><Footer /></div>;
    return <Footer />;
}
