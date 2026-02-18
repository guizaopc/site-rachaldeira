import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    try {
        let supabaseResponse = NextResponse.next({
            request,
        })

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
                        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        // IMPORTANT: Avoid writing any logic between createServerClient and
        // supabase.auth.getUser(). A simple mistake could make it very hard to debug
        // issues with users being randomly logged out.

        const {
            data: { user },
        } = await supabase.auth.getUser()

        // Public routes that don't require authentication
        const isPublicRoute =
            request.nextUrl.pathname === '/' ||
            request.nextUrl.pathname.startsWith('/login') ||
            request.nextUrl.pathname.startsWith('/signup') ||
            request.nextUrl.pathname.startsWith('/forgot-password') ||
            request.nextUrl.pathname.startsWith('/auth') ||
            request.nextUrl.pathname.startsWith('/rachas') ||
            request.nextUrl.pathname.startsWith('/campeonatos') ||
            request.nextUrl.pathname.startsWith('/galeria') ||
            request.nextUrl.pathname.startsWith('/stats') ||
            request.nextUrl.pathname.startsWith('/rank') ||
            request.nextUrl.pathname.startsWith('/integrantes');

        // Protected routes check
        if (!user && !isPublicRoute) {
            // No user and not public, redirect to login
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Admin routes check
        if (user && request.nextUrl.pathname.startsWith('/admin')) {
            // Allow access to /admin/perfil for any authenticated user
            if (request.nextUrl.pathname.startsWith('/admin/perfil')) {
                return supabaseResponse
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin' && profile?.role !== 'director') {
                // Not admin or director, redirect to home
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }
        }

        return supabaseResponse
    } catch (e) {
        // If you are here, a Supabase client could not be created!
        // This is likely because you have not set up environment variables.
        // Check out http://localhost:3000 for Next Steps.
        console.error('Middleware Error:', e)
        return NextResponse.next({
            request: {
                headers: request.headers,
            },
        })
    }
}
