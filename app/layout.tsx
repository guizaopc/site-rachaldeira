import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import Footer from "@/components/Footer";

export const dynamic = 'force-dynamic';

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-poppins',
});

export const metadata: Metadata = {
    title: "Rachaldeira",
    description: "Sistema completo para gestão do racha de futebol Rachaldeira",
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
            </body>
        </html>
    );
}
