import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeRankings, RANKING_CATEGORIES } from '@/lib/ranking';
import { rankingReportEmailTemplate, RankingEmailCategory } from './email-templates';

const ROWS_PER_CATEGORY = 15;
const CATEGORY_COLORS: Record<string, string> = {
    craquePoints: '#eab308',
    sheriffPoints: '#2563eb',
    goals: '#dc2626',
    assists: '#16a34a',
    saves: '#9333ea',
    participations: '#ea580c',
};

export type RankingReportResult = {
    success: boolean;
    message?: string;
    recipients: number;
    emails_sent: number;
    first_error?: string;
};

// Envia o ranking geral (as 6 listas da página /rank) para os emails de RANKING_REPORT_EMAILS
export async function sendRankingReport(): Promise<RankingReportResult> {
    const recipients = (process.env.RANKING_REPORT_EMAILS || '')
        .split(',')
        .map(email => email.trim())
        .filter(Boolean);

    if (!recipients.length) {
        return { success: false, message: 'RANKING_REPORT_EMAILS não configurado', recipients: 0, emails_sent: 0 };
    }

    const supabase = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://site-rachaldeira.vercel.app';
    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@rachaldeira.com';

    const { rankings, totalClosedRachas } = await computeRankings(supabase);

    const categories: RankingEmailCategory[] = RANKING_CATEGORIES.map(category => ({
        title: category.title,
        valueLabel: category.valueLabel,
        color: CATEGORY_COLORS[category.valueKey],
        rows: [...rankings]
            .sort(category.sort)
            .slice(0, ROWS_PER_CATEGORY)
            .map(player => ({ name: player.name, value: player[category.valueKey] })),
    }));

    const dateLabel = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const html = rankingReportEmailTemplate(dateLabel, totalClosedRachas, categories, siteUrl);

    // Um email por destinatário, para ninguém ver o endereço dos outros
    const { data, error } = await resend.batch.send(recipients.map(to => ({
        from: `Rachaldeira <${fromEmail}>`,
        to,
        subject: `🏆 Ranking Geral Rachaldeira – ${dateLabel}`,
        html,
    })));

    return {
        success: !error,
        recipients: recipients.length,
        emails_sent: data?.data?.length ?? 0,
        first_error: error?.message,
    };
}
