function formatDateBR(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Sao_Paulo',
    });
}

function formatTimeBR(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    });
}

export function attendanceEmailTemplate(
    memberName: string,
    racha: { id: string; date: string; location: string },
    siteUrl: string
): string {
    const firstName = memberName.split(' ')[0];
    const dateFormatted = formatDateBR(racha.date);
    const timeFormatted = formatTimeBR(racha.date);
    const confirmUrl = `${siteUrl}/rachas/${racha.id}`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme sua presença - Rachaldeira</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background-color:#0f172a;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0f172a;padding:28px 32px;text-align:center;border-bottom:1px solid #1e293b;">
              <img src="${siteUrl}/logo-new.png" alt="Rachaldeira" width="80" height="80" style="display:block;margin:0 auto;border-radius:12px;object-fit:contain;" />
              <p style="color:#475569;font-size:12px;margin:12px 0 0;text-transform:uppercase;letter-spacing:1.5px;">Confirmação de Presença</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#94a3b8;margin:0 0 4px;font-size:14px;">Olá,</p>
              <h2 style="color:#ffffff;margin:0 0 20px;font-size:20px;font-weight:bold;">${firstName}! 👋</h2>

              <p style="color:#cbd5e1;font-size:15px;line-height:24px;margin:0 0 24px;">
                O racha desta semana está confirmado. Precisamos saber se você vai comparecer!
              </p>

              <!-- Racha Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:8px;margin-bottom:28px;border-left:4px solid #af1c15;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 6px;font-weight:bold;">Próximo Racha</p>
                    <p style="color:#ffffff;font-size:17px;font-weight:bold;margin:0 0 14px;text-transform:capitalize;">${dateFormatted}</p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width:50%;vertical-align:top;">
                          <p style="color:#64748b;font-size:11px;margin:0 0 3px;text-transform:uppercase;letter-spacing:0.8px;">Horário</p>
                          <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0;">🕐 ${timeFormatted}</p>
                        </td>
                        <td style="width:50%;vertical-align:top;">
                          <p style="color:#64748b;font-size:11px;margin:0 0 3px;text-transform:uppercase;letter-spacing:0.8px;">Local</p>
                          <p style="color:#e2e8f0;font-size:14px;font-weight:600;margin:0;">📍 ${racha.location}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <a href="${confirmUrl}"
                       style="display:inline-block;background-color:#af1c15;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:8px;font-size:16px;font-weight:bold;">
                      ✅ Confirmar Presença
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#475569;font-size:12px;text-align:center;margin:0;">
                Acesse também: <a href="${confirmUrl}" style="color:#af1c15;text-decoration:none;">${confirmUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0a1020;padding:18px 32px;border-top:1px solid #1e293b;">
              <p style="color:#475569;font-size:11px;text-align:center;margin:0;line-height:18px;">
                Você recebe este email por ser membro da Rachaldeira.<br>
                Confirme sua presença com pelo menos <strong style="color:#64748b;">24h de antecedência</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type RankingEmailCategory = {
    title: string;
    valueLabel: string;
    color: string;
    rows: { name: string; value: number }[];
};

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rankingCategoryTable(category: RankingEmailCategory): string {
    const medal = ['#eab308', '#94a3b8', '#f97316'];
    const rows = category.rows.map((row, idx) => `
                <tr>
                  <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">
                    <span style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:10px;text-align:center;font-size:10px;font-weight:bold;margin-right:6px;background-color:${medal[idx] || '#f1f5f9'};color:${idx < 3 ? '#ffffff' : '#94a3b8'};">${idx + 1}</span>${escapeHtml(row.name)}
                  </td>
                  <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:bold;color:#0f172a;text-align:right;">${row.value}</td>
                </tr>`).join('');

    return `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="padding:10px;border-top:4px solid ${category.color};font-size:14px;font-weight:bold;color:#0f172a;">${category.title}</td>
                </tr>
                <tr>
                  <td style="padding:4px 10px;background-color:#f8fafc;font-size:10px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Jogador</td>
                  <td style="padding:4px 10px;background-color:#f8fafc;font-size:10px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;text-align:right;">${category.valueLabel}</td>
                </tr>${rows || `
                <tr><td colspan="2" style="padding:10px;font-size:12px;color:#94a3b8;">Nenhum dado</td></tr>`}
              </table>`;
}

export function rankingReportEmailTemplate(
    dateLabel: string,
    closedRachas: number,
    categories: RankingEmailCategory[],
    siteUrl: string
): string {
    // Duas listas por linha, como no "Modo Print" da página /rank
    const pairs: string[] = [];
    for (let i = 0; i < categories.length; i += 2) {
        const [left, right] = categories.slice(i, i + 2);
        pairs.push(`
          <tr>
            <td width="50%" style="width:50%;padding:0 6px 12px 0;vertical-align:top;">${rankingCategoryTable(left)}</td>
            <td width="50%" style="width:50%;padding:0 0 12px 6px;vertical-align:top;">${right ? rankingCategoryTable(right) : ''}</td>
          </tr>`);
    }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ranking Geral - Rachaldeira</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 8px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="background-color:#093a9f;border-radius:12px 12px 0 0;padding:22px 24px;text-align:center;">
              <img src="${siteUrl}/logo-new.png" alt="Rachaldeira" width="64" height="64" style="display:block;margin:0 auto 10px;border-radius:12px;object-fit:contain;" />
              <p style="color:#ffffff;font-size:20px;font-weight:bold;margin:0;">Ranking Geral</p>
              <p style="color:#bfdbfe;font-size:13px;margin:6px 0 0;">Situação em ${dateLabel} · ${closedRachas} rachas encerrados</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">${pairs.join('')}
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 0 4px;">
              <a href="${siteUrl}/rank" style="display:inline-block;background-color:#093a9f;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:bold;">Ver ranking no site</a>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0 0;">
              <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Email automático enviado toda segunda-feira com o ranking acumulado.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
