import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    try {
        let supabaseResponse = NextResponse.next({
            request,
        })

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Configuração Incompleta',
                    message: 'As chaves do Supabase não foram encontradas na Vercel.',
                }),
                { status: 503, headers: { 'content-type': 'application/json' } }
            )
        }

        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
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

        const {
            data: { user },
        } = await supabase.auth.getUser()

        // Rotas públicas
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

        if (!user && !isPublicRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        if (user && request.nextUrl.pathname.startsWith('/admin')) {
            if (request.nextUrl.pathname.startsWith('/admin/perfil')) {
                return supabaseResponse
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin' && profile?.role !== 'director') {
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }
        }

        return supabaseResponse
    } catch (error: any) {
        console.error('CRITICAL MIDDLEWARE ERROR:', error)
        return new NextResponse(
            `Erro Interno no Middleware: ${error.message || 'Erro desconhecido'}`,
            { status: 500 }
        )
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
