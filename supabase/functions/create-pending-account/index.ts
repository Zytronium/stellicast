import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash password using native crypto
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { childEmail, parentEmail, dateOfBirth, password } = await req.json();

    // Hash the password using native crypto
    const passwordHash = await hashPassword(password);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin
      .from('pending_accounts')
      .insert({
        child_email: childEmail,
        parent_email: parentEmail,
        date_of_birth: dateOfBirth,
        password_hash: passwordHash,
        consent_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Send parental consent email
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://stellicast.com';
    const consentUrl = `${baseUrl}/consent?token=${data.consent_token}`;
    const rejectUrl = `${baseUrl}/consent/reject?token=${data.consent_token}`;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Parental Consent Required - Stellicast</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: linear-gradient(to bottom, #020617, #000000); color: #ededed;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(to bottom, #020617, #000000); padding: 40px 20px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: linear-gradient(to bottom, rgba(30, 58, 138, 0.8), rgba(15, 23, 42, 0.9)); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
        <tr>
          <td style="padding: 40px 40px 30px; text-align: center; background: rgba(0, 0, 0, 0.3);">
            <img src="https://stellicast.com/stellicast.png" alt="Stellicast" style="max-width: 250px; height: auto; display: block; margin: 0 auto;">
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 40px 20px;">
            <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: 600; color: #ffffff; text-align: center; letter-spacing: -0.5px;">
              Parental Consent Required
            </h1>
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #d1d5db; text-align: center;">
              A request has been made to create a Stellicast account for:
            </p>
            <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #ffffff; text-align: center; font-weight: 600;">
              ${childEmail}
            </p>
            <div style="margin: 0 0 32px; padding: 24px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border-left: 4px solid #2563eb;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #ffffff;">
                What Data We Collect
              </h2>
              <ul style="margin: 0; padding-left: 24px; font-size: 14px; line-height: 1.8; color: #d1d5db;">
                <li>Email address and date of birth</li>
                <li>Username and profile information</li>
                <li>Video viewing history and preferences</li>
                <li>Comments, likes, and channel subscriptions</li>
                <li>Device information and IP address</li>
              </ul>
              <p style="margin: 16px 0 0; font-size: 14px; line-height: 1.6; color: #9ca3af;">
                We collect this data to provide our video streaming service, personalize content recommendations, and improve user experience. For full details, see our <a href="${baseUrl}/privacy-policy" style="color: #60a5fa; text-decoration: none;">Privacy Policy</a>.
              </p>
            </div>
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #d1d5db; text-align: center;">
              Please review this information and choose whether to approve or reject this account creation request:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding: 0 0 16px;">
                  <a href="${consentUrl}" style="display: inline-block; padding: 16px 48px; background: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4); transition: background 0.2s;">
                    ✓ Approve Account Creation
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 0 32px;">
                  <a href="${rejectUrl}" style="display: inline-block; padding: 16px 48px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); transition: background 0.2s;">
                    ✗ Reject Request
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center;">
              Or copy and paste these links into your browser:
            </p>
            <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #6b7280; text-align: center; word-break: break-all; padding: 12px; background: rgba(0, 0, 0, 0.3); border-radius: 6px;">
              <strong>Approve:</strong><br>${consentUrl}
            </p>
            <p style="margin: 0 0 32px; font-size: 13px; line-height: 1.6; color: #6b7280; text-align: center; word-break: break-all; padding: 12px; background: rgba(0, 0, 0, 0.3); border-radius: 6px;">
              <strong>Reject:</strong><br>${rejectUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px 40px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
            <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.6; color: #6b7280; text-align: center;">
              This consent request will expire in 30 days.
            </p>
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #6b7280; text-align: center;">
              If you didn't expect this request, you can safely ignore this email or click "Reject Request" above.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 40px; background: rgba(0, 0, 0, 0.4); text-align: center;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
              <strong style="color: #9ca3af;">Stellicast</strong> – The YouTube Alternative We're Still Waiting For
            </p>
            <p style="margin: 0; font-size: 11px; color: #4b5563;">
              Please note that Stellicast is in early development and your account may be deleted at any time.
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

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Stellicast <noreply@stellicast.com>',
        to: [parentEmail],
        subject: 'Parental Consent Required - Stellicast Account Creation',
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.text();
      throw new Error(`Failed to send email: ${emailError}`);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-pending-account function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});