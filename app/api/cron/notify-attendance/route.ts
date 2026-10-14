import { NextRequest, NextResponse } from 'next/server';
import { sendAttendanceNotifications } from '@/lib/send-attendance-notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    // Sem CRON_SECRET configurado a rota fica fechada (evita aceitar "Bearer undefined")
    if (!secret || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await sendAttendanceNotifications();
        return NextResponse.json(result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
