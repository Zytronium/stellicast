import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// -------- where new-application notifications go --------
// TODO: switch to 'applications@stellicast.com' once the stellicast.com email service is back online
const ADMIN_NOTIFICATION_EMAIL = 'zytronium.dev@gmail.com';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const {
            email,
            displayName,
            handle,
            channelType,
            isExistingChannel,
            contentType,
            uploadFrequency,
            contentReadiness,
            otherPlatforms,
            howHeard,
            whyStellicast,
        } = await req.json();

        if (!email || !displayName || !handle) {
            throw new Error('Missing required fields: email, displayName, handle');
        }

        const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://stellicast.com';
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        // -------- shared email shell --------
        const wrapEmail = (title: string, bodyHtml: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: linear-gradient(to bottom, #020617, #000000); color: #ededed;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(to bottom, #020617, #000000); padding: 40px 20px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: linear-gradient(to bottom, rgba(30, 58, 138, 0.8), rgba(15, 23, 42, 0.9)); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">

        <!-- Header with Logo -->
        <tr>
          <td style="padding: 40px 40px 30px; text-align: center; background: rgba(0, 0, 0, 0.3);">
            <img src="https://stellicast.com/stellicast.png" alt="Stellicast" style="max-width: 250px; height: auto; display: block; margin: 0 auto;">
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding: 40px 40px 20px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Branding Footer -->
        <tr>
          <td style="padding: 24px 40px; background: rgba(0, 0, 0, 0.4); text-align: center;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
              <strong style="color: #9ca3af;">Stellicast</strong>: Watch Without Being Watched
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
        `;

        // -------- admin notification email --------
        const detailRow = (label: string, value?: string | null) =>
            value
                ? `
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #9ca3af; width: 160px; vertical-align: top;">${label}</td>
          <td style="padding: 6px 0; font-size: 13px; color: #ededed;">${value}</td>
        </tr>`
                : '';

        const adminBody = `
      <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #ffffff; text-align: center; letter-spacing: -0.5px;">
        New Channel Early Access Application
      </h1>
      <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #d1d5db; text-align: center;">
        ${isExistingChannel ? 'An existing (frozen) channel has applied to unfreeze.' : 'A new channel application was submitted.'}
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 32px; padding: 20px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
        ${detailRow('Applicant', email)}
        ${detailRow('Channel', displayName)}
        ${detailRow('Handle', `@${handle}`)}
        ${detailRow('Channel type', channelType)}
        ${detailRow('Content type', contentType)}
        ${detailRow('Upload frequency', uploadFrequency)}
        ${detailRow('Content readiness', contentReadiness)}
        ${detailRow('Other platforms', otherPlatforms)}
        ${detailRow("How they heard about us", howHeard)}
        ${detailRow('Why Stellicast', whyStellicast)}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 0 0 8px;">
            <a href="${baseUrl}/admin/channel-applications" style="display: inline-block; padding: 16px 48px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
              Review Application
            </a>
          </td>
        </tr>
      </table>
    `;

        // -------- applicant confirmation email --------
        const applicantBody = `
      <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #ffffff; text-align: center; letter-spacing: -0.5px;">
        Application Submitted
      </h1>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #d1d5db; text-align: center;">
        Thanks for applying for Channels Early Access with <strong style="color: #ffffff;">${displayName}</strong>.
      </p>
      <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center;">
        A human will review your application shortly, usually within 48 hours. We'll email you as soon as a decision has been made.
      </p>
    `;

        const sendEmail = async (to: string, subject: string, html: string) => {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: 'Stellicast <noreply@stellicast.com>',
                    to: [to],
                    subject,
                    html,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to send email to ${to}: ${errorText}`);
            }
        };

        // -------- send both emails --------
        await Promise.all([
            sendEmail(
                ADMIN_NOTIFICATION_EMAIL,
                `New Early Access Application: ${displayName}`,
                wrapEmail('New Channel Application - Stellicast', adminBody)
            ),
            sendEmail(
                email,
                'Your Stellicast application has been submitted',
                wrapEmail('Application Submitted - Stellicast', applicantBody)
            ),
        ]);

        return new Response(
            JSON.stringify({ success: true, message: 'Notification emails sent' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        console.error('Error in send-application-submitted function:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
