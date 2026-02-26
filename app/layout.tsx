import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";


export const dynamic = 'force-dynamic';

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-poppins',
});

export const metadata: Metadata = {
    title: "Rachaldeira - Racha, Futebol e Dindo",
    description: "Site para a gestão do nosso racha",
    openGraph: {
        title: "Rachaldeira - Racha, Futebol e Dindo",
        description: "Site para a gestão do nosso racha",
        url: process.env.NEXT_PUBLIC_SITE_URL || 'https://site-rachaldeira.vercel.app',
        siteName: 'Rachaldeira',
        images: [
            {
                url: '/logo.png', // Assuming logo.png is good for OG, or maybe hero-bg.png looks better? usually logo is fine if square, but landscape is better. Let's stick to logo for now or add a specific og-image if available.
                width: 800,
                height: 600,
            },
        ],
        locale: 'pt_BR',
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: "Rachaldeira - Racha, Futebol e Dindo",
        description: "Site para a gestão do nosso racha",
        images: ['/logo.png'],
    },
    icons: {
        icon: '/logo.png',
        shortcut: '/logo.png',
        apple: '/logo.png',
    },
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Rachaldeira',
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    let user: any = null;
    let profile: any = null;
    let memberData: any = null;

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
            const supabase = await createClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();
            user = authUser;

            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                profile = data;

                // Try to find member by profile link first
                if (profile?.member_id) {
                    const { data: member } = await supabase
                        .from('members')
                        .select('name, photo_url')
                        .eq('id', profile.member_id)
                        .single();
                    memberData = member;
                }

                // Fallback: find member by email if not linked yet
                if (!memberData && user.email) {
                    const { data: memberByEmail } = await supabase
                        .from('members')
                        .select('name, photo_url')
                        .eq('email', user.email)
                        .maybeSingle();
                    if (memberByEmail) {
                        memberData = memberByEmail;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error in RootLayout Auth:", error);
    }

    return (
        <html lang="pt-BR">
            <body className={`${poppins.className} antialiased flex flex-col min-h-screen`}>
                <Navbar user={user} profile={profile} member={memberData} />
                <div className="flex-1">
                    {children}
                </div>
                <Footer />
                <Toaster />
            </body>
        </html>
    );
}
