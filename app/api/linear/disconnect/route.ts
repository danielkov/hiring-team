/**
 * Linear Disconnect Route
 * Removes Linear tokens from WorkOS user metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { removeLinearTokens, getLinearTokens } from '@/lib/linear/metadata';
import { revokeLinearToken } from '@/lib/linear/oauth';
import { withAuth } from '@workos-inc/authkit-nextjs';

export async function POST(request: NextRequest) {
  const { user } = await withAuth();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get current tokens to revoke them
    const tokens = await getLinearTokens(user.id);
    
    if (tokens) {
      // Revoke the access token with Linear
      try {
        await revokeLinearToken(tokens.accessToken);
      } catch (error) {
        console.error('Failed to revoke Linear token:', error);
        // Continue with removal even if revocation fails
      }
    }

    // Remove tokens from WorkOS metadata
    await removeLinearTokens(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Linear disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Linear' },
      { status: 500 }
    );
  }
}
