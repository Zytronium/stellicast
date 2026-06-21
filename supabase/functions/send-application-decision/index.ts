import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { email, displayName, status, note } = await req.json();

        if (!email || !displayName || !status) {
            throw new Error('Missing required fields: email, displayName, status');
        }

        if (!['accepted', 'rejected'].includes(status)) {
            throw new Error('status must be "accepted" or "rejected"');
        }

        const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://stellicast.com';
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

        const isAccepted = status === 'accepted';

        // -------- accepted-only content --------
        const acceptedBody = `
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #d1d5db; text-align: center;">
        Your channel <strong style="color: #ffffff;">${displayName}</strong> is now live. You can start uploading right away.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 0 0 32px;">
            <a href="${baseUrl}/upload" style="display: inline-block; padding: 16px 48px; background: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
              Upload Your First Video
            </a>
          </td>
        </tr>
      </table>
    `;

        // -------- rejected-only content --------
        const rejectedBody = `
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #d1d5db; text-align: center;">
        We've reviewed your application for <strong style="color: #ffffff;">${displayName}</strong> and aren't able to approve it at this time.
      </p>
      <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center;">
        You're welcome to apply again in the future.
      </p>
    `;

        // -------- optional admin note, shown for either outcome --------
        const noteBlock = note
            ? `
      <div style="margin: 0 0 32px; padding: 20px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border-left: 4px solid ${isAccepted ? '#16a34a' : '#dc2626'};">
        <h2 style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #ffffff;">
          Note from the Stellicast team
        </h2>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #d1d5db; white-space: pre-wrap;">${note}</p>
      </div>
      `
            : '';

        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Channel Application ${isAccepted ? 'Accepted' : 'Update'} - Stellicast</title>
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
            <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: 600; color: #ffffff; text-align: center; letter-spacing: -0.5px;">
              ${isAccepted ? 'Your Channel Was Approved!' : 'Channel Application Update'}
            </h1>

            ${isAccepted ? acceptedBody : rejectedBody}
            ${noteBlock}

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

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Stellicast <noreply@stellicast.com>',
                to: [email],
                subject: isAccepted
                    ? 'Your Stellicast channel application was approved'
                    : 'An update on your Stellicast channel application',
                html: emailHtml,
            }),
        });

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Failed to send email: ${error}`);
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Decision email sent' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        console.error('Error in send-application-decision function:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
