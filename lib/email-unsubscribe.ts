import { createHmac } from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'your-secret-key-here';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Generate a secure unsubscribe token for a user
 * @param userId - The user's ID
 * @returns A signed token that can be used in unsubscribe links
 */
export function generateUnsubscribeToken(userId: string): string {
  const payload = JSON.stringify({
    userId,
    timestamp: Date.now()
  });

  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = createHmac('sha256', UNSUBSCRIBE_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Generate unsubscribe URLs for different types of emails
 * @param userId - The user's ID
 * @param type - Type of unsubscribe: 'all', 'promotional', or specific category
 * @returns Object with formatted unsubscribe URLs
 */
export function generateUnsubscribeLinks(userId: string) {
  const token = generateUnsubscribeToken(userId);

  return {
    // Unsubscribe from all marketing/non-transactional emails
    unsubscribeAll: `${BASE_URL}/unsubscribe?token=${token}&type=all`,

    // Unsubscribe from promotional emails only
    unsubscribePromotional: `${BASE_URL}/unsubscribe?token=${token}&type=promotional`,

    // Unsubscribe from specific category
    unsubscribeCategory: (category: string) =>
      `${BASE_URL}/unsubscribe?token=${token}&type=category&category=${category}`,
  };
}

/**
 * Example usage in your email templates:
 *
 * ```typescript
 * import { generateUnsubscribeLinks } from '@/../lib/email-unsubscribe';
 *
 * // When sending a promotional email:
 * const links = generateUnsubscribeLinks(user.id);
 * const emailHtml = `
 *   <html>
 *     <body>
 *       <p>Your promotional content here...</p>
 *       <footer>
 *         <a href="${links.unsubscribePromotional}">Unsubscribe from promotional emails</a>
 *       </footer>
 *     </body>
 *   </html>
 * `;
 *
 * // When sending weekly recaps:
 * const emailHtml = `
 *   <html>
 *     <body>
 *       <p>Your weekly recap...</p>
 *       <footer>
 *         <a href="${links.unsubscribeCategory('recaps')}">Unsubscribe from weekly recaps</a>
 *         <br>
 *         <a href="${links.unsubscribeAll}">Unsubscribe from all emails</a>
 *       </footer>
 *     </body>
 *   </html>
 * `;
 * ```
 */

/**
 * Email footer template with proper unsubscribe links
 * @param userId - The user's ID
 * @param emailType - Type of email being sent ('promotional', 'recaps', etc.)
 * @returns HTML footer with compliant unsubscribe links
 */
export function generateEmailFooter(userId: string, emailType: 'promotional' | 'recaps' | 'recommendations' | 'trending' | 'devUpdates' | 'announcements' | 'followedUploads' | 'followers'): string {
  const links = generateUnsubscribeLinks(userId);

  const categoryLabels: Record<string, string> = {
    promotional: 'promotional emails',
    recaps: 'weekly recaps',
    recommendations: 'video recommendations',
    trending: 'trending videos notifications',
    devUpdates: 'development updates',
    announcements: 'site-wide announcements',
    followedUploads: 'followed channel uploads',
    followers: 'new follower notifications'
  };

  return `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      <p style="margin: 0 0 8px 0;">
        You received this email because you're subscribed to ${categoryLabels[emailType]}.
      </p>
      <p style="margin: 0;">
        <a href="${links.unsubscribeCategory(emailType)}" style="color: #3b82f6; text-decoration: underline;">
          Unsubscribe from ${categoryLabels[emailType]}
        </a>
        |
        <a href="${links.unsubscribePromotional}" style="color: #3b82f6; text-decoration: underline;">
          Unsubscribe from all promotional emails
        </a>
        |
        <a href="${BASE_URL}/settings" style="color: #3b82f6; text-decoration: underline;">
          Manage preferences
        </a>
      </p>
    </div>
  `;
}
