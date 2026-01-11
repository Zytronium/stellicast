/**
 * Example: How to send emails with compliant unsubscribe links
 *
 * This file demonstrates how to integrate the unsubscribe system
 * into your email sending logic.
 */

import { generateUnsubscribeLinks, generateEmailFooter } from '@/../lib/email-unsubscribe';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

// Example using a generic email service (replace with your actual service)
async function sendEmail(to: string, subject: string, html: string) {
  // This would be your actual email service (SendGrid, Resend, etc.)
  console.log('Sending email to:', to);
  console.log('Subject:', subject);
  console.log('HTML:', html);
}

/**
 * Example 1: Sending a promotional email
 */
export async function sendPromotionalEmail(userId: string, userEmail: string) {
  const links = generateUnsubscribeLinks(userId);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 20px;">
              <h1 style="color: #1f2937; margin: 0 0 20px 0;">🎉 Special Offer Just for You!</h1>
              
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
                We're excited to offer you exclusive access to premium features at 50% off!
              </p>
              
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                This limited-time offer expires in 48 hours. Don't miss out!
              </p>
              
              <a href="https://stellicast.com/premium" 
                 style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Claim Your Discount
              </a>
              
              ${generateEmailFooter(userId, 'promotional')}
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendEmail(userEmail, '🎉 Special Offer: 50% Off Premium', html);
}

/**
 * Example 2: Sending weekly recap email
 */
export async function sendWeeklyRecap(userId: string) {
  const supabase = await createSupabaseServerClient();

  // Get user data
  const { data: user } = await supabase
    .from('users')
    .select('email, notification_preferences')
    .eq('id', userId)
    .single();

  if (!user) return;

  // Check if user is subscribed to recaps
  const prefs = user.notification_preferences || {};
  if (!Array.isArray(prefs.recaps) || !prefs.recaps.includes('email')) {
    console.log(`User ${userId} is not subscribed to recap emails`);
    return;
  }

  // Fetch trending videos (example)
  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .order('views', { ascending: false })
    .limit(5);

  const videoList = videos?.map(v => `
    <div style="margin-bottom: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
      <h3 style="margin: 0 0 8px 0; color: #1f2937;">${v.title}</h3>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">${v.views.toLocaleString()} views</p>
      <a href="https://stellicast.com/watch/${v.id}" 
         style="display: inline-block; margin-top: 10px; color: #3b82f6; text-decoration: none; font-weight: 600;">
        Watch Now →
      </a>
    </div>
  `).join('') || '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 20px;">
              <h1 style="color: #1f2937; margin: 0 0 10px 0;">📊 Your Weekly Recap</h1>
              <p style="color: #6b7280; margin: 0 0 30px 0;">Top trending videos this week</p>
              
              ${videoList}
              
              <p style="color: #4b5563; line-height: 1.6; margin: 30px 0 0 0;">
                See you next week! 👋
              </p>
              
              ${generateEmailFooter(userId, 'recaps')}
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendEmail(user.email, '📊 Your Weekly Recap from Stellicast', html);
}

/**
 * Example 3: Sending followed channel upload notification
 */
export async function sendChannelUploadNotification(
  userId: string,
  channelId: string,
  videoId: string
) {
  const supabase = await createSupabaseServerClient();

  // Get user and check preferences
  const { data: user } = await supabase
    .from('users')
    .select('email, notification_preferences')
    .eq('id', userId)
    .single();

  if (!user) return;

  const prefs = user.notification_preferences || {};
  if (!Array.isArray(prefs.followedUploads) || !prefs.followedUploads.includes('email')) {
    return;
  }

  // Get channel and video details
  const { data: channel } = await supabase
    .from('channels')
    .select('name')
    .eq('id', channelId)
    .single();

  const { data: video } = await supabase
    .from('videos')
    .select('title, thumbnail')
    .eq('id', videoId)
    .single();

  if (!channel || !video) return;

  const links = generateUnsubscribeLinks(userId);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 20px;">
              <h1 style="color: #1f2937; margin: 0 0 20px 0;">
                📹 New upload from ${channel.name}
              </h1>
              
              <div style="margin-bottom: 20px;">
                <img src="${video.thumbnail}" 
                     alt="${video.title}"
                     style="width: 100%; max-width: 560px; border-radius: 8px;" />
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">
                ${video.title}
              </h2>
              
              <a href="https://stellicast.com/watch/${videoId}" 
                 style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Watch Now
              </a>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p style="margin: 0 0 8px 0;">
                  You received this because you follow ${channel.name}.
                </p>
                <p style="margin: 0;">
                  <a href="${links.unsubscribeCategory('followedUploads')}" style="color: #3b82f6; text-decoration: underline;">
                    Unsubscribe from channel upload notifications
                  </a>
                  |
                  <a href="https://stellicast.com/settings" style="color: #3b82f6; text-decoration: underline;">
                    Manage preferences
                  </a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendEmail(user.email, `New video from ${channel.name}`, html);
}

/**
 * Example 4: Batch send to multiple users
 */
export async function sendBatchPromotionalEmail(subject: string, content: string) {
  const supabase = await createSupabaseServerClient();

  // Get all users subscribed to promotional emails
  const { data: users } = await supabase
    .from('users')
    .select('id, email, notification_preferences')
    .not('notification_preferences->promotional', 'is', null);

  if (!users) return;

  // Filter users who have 'email' in their promotional preferences
  const subscribedUsers = users.filter(user => {
    const prefs = user.notification_preferences || {};
    return Array.isArray(prefs.promotional) && prefs.promotional.includes('email');
  });

  console.log(`Sending to ${subscribedUsers.length} subscribed users`);

  // Send emails (in production, use a queue system)
  for (const user of subscribedUsers) {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          ${content}
          ${generateEmailFooter(user.id, 'promotional')}
        </body>
      </html>
    `;

    await sendEmail(user.email, subject, html);

    // Add delay to avoid rate limits (in production, use a proper queue)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Example 5: Testing the unsubscribe link
 */
export async function testUnsubscribeLink() {
  const testUserId = 'test-user-123';
  const links = generateUnsubscribeLinks(testUserId);

  console.log('Test Unsubscribe Links:');
  console.log('======================');
  console.log('Unsubscribe from all:', links.unsubscribeAll);
  console.log('Unsubscribe from promotional:', links.unsubscribePromotional);
  console.log('Unsubscribe from recaps:', links.unsubscribeCategory('recaps'));
}