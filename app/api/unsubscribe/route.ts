import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { createHmac, timingSafeEqual } from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || ''; // todo
const TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

const EMAIL_CATEGORIES = {
  promotional: ['promotional', 'recommendations', 'trending', 'recaps', 'devUpdates', 'announcements'],
  all: ['promotional', 'recommendations', 'trending', 'recaps', 'devUpdates', 'announcements', 'followedUploads', 'followers']
};

// Temporary storage for undo | todo: in production, use Redis or supabase
const undoCache = new Map<string, { userId: string; previousPrefs: any; timestamp: number }>();

function verifyToken(token: string): { userId: string; timestamp: number } | null {
  try {
    const [payload, signature] = token.split('.');

    if (!payload || !signature) return null;

    // Verify signature
    const expectedSignature = createHmac('sha256', UNSUBSCRIBE_SECRET)
      .update(payload)
      .digest('base64url');

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));

    // Check expiry
    if (Date.now() - decoded.timestamp > TOKEN_EXPIRY) {
      return null;
    }

    return { userId: decoded.userId, timestamp: decoded.timestamp };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, type, category } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const tokenData = verifyToken(token);
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // Get current preferences
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('notification_preferences')
      .eq('id', tokenData.userId)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentPrefs = userData.notification_preferences || {};

    // Store for undo (with 30-second expiry)
    undoCache.set(token, {
      userId: tokenData.userId,
      previousPrefs: { ...currentPrefs },
      timestamp: Date.now()
    });

    // Clean up expired undo cache entries
    for (const [key, value] of undoCache.entries()) {
      if (Date.now() - value.timestamp > 30000) {
        undoCache.delete(key);
      }
    }

    // Determine which categories to unsubscribe from
    let categoriesToUnsubscribe: string[] = [];

    if (category) {
      categoriesToUnsubscribe = [category];
    } else if (type === 'promotional') {
      categoriesToUnsubscribe = EMAIL_CATEGORIES.promotional;
    } else {
      categoriesToUnsubscribe = EMAIL_CATEGORIES.all;
    }

    // Update preferences - remove 'email' from each category
    const updatedPrefs = { ...currentPrefs };
    for (const cat of categoriesToUnsubscribe) {
      if (Array.isArray(updatedPrefs[cat])) {
        updatedPrefs[cat] = updatedPrefs[cat].filter((v: string) => v !== 'email');
      }
    }

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update({ notification_preferences: updatedPrefs })
      .eq('id', tokenData.userId);

    if (updateError) {
      console.error('Failed to update preferences:', updateError);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      unsubscribed: categoriesToUnsubscribe
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export function to generate unsubscribe tokens (use this when sending emails)
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

// Clear undo cache
export { undoCache };
