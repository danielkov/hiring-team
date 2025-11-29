/**
 * Linear Connection Status Route
 * Returns whether the user has Linear connected
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLinearTokens } from '@/lib/linear/metadata';
import { withAuth } from '@workos-inc/authkit-nextjs';

export async function GET(request: NextRequest) {
  const { user } = await withAuth();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const tokens = await getLinearTokens(user.id);
    
    return NextResponse.json({
      connected: tokens !== null,
    });
  } catch (error) {
    console.error('Linear status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check Linear status' },
      { status: 500 }
    );
  }
}
