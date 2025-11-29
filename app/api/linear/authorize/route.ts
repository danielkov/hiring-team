/**
 * Linear OAuth Authorization Route
 * Redirects to Linear OAuth authorization page
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLinearAuthorizationUrl } from '@/lib/linear/oauth';
import { config } from '@/lib/config';
import { withAuth } from '@workos-inc/authkit-nextjs';

export async function GET(request: NextRequest) {
  const { user } = await withAuth();
  
  if (!user) {
    const loginUrl = new URL('/api/auth/login', config.app.url);
    loginUrl.searchParams.set('error', 'session_required');
    return NextResponse.redirect(loginUrl);
  }

  // Get redirect destination from query params
  const searchParams = request.nextUrl.searchParams;
  const redirect = searchParams.get('redirect') || '/dashboard';

  // Generate Linear OAuth URL with state parameter
  const authUrl = getLinearAuthorizationUrl(redirect);

  return NextResponse.redirect(authUrl);
}
