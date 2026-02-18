import { NextResponse } from 'next/server'

export function middleware(request) {
    console.log('Middleware hit:', request.nextUrl.pathname)
    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
