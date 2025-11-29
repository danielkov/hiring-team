/**
 * Linear OAuth Callback Handler
 * Processes authorization code and stores tokens in WorkOS user metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/linear/oauth';
import { storeLinearTokens } from '@/lib/linear/metadata';
import { config } from '@/lib/config';
import { withAuth } from '@workos-inc/authkit-nextjs';

export async function GET(request: NextRequest) {
  const { user } = await withAuth();
  
  if (!user) {
    const loginUrl = new URL('/api/auth/login', config.app.url);
    loginUrl.searchParams.set('error', 'session_required');
    return NextResponse.redirect(loginUrl);
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    const errorUrl = new URL('/dashboard', config.app.url);
    errorUrl.searchParams.set('error', `linear_auth_${error}`);
    return NextResponse.redirect(errorUrl);
  }

  // Validate authorization code
  if (!code) {
    const errorUrl = new URL('/dashboard', config.app.url);
    errorUrl.searchParams.set('error', 'linear_missing_code');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Exchange code for access token
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code);

    // Calculate token expiry timestamp
    const expiresAt = Date.now() + expiresIn * 1000;

    // Store tokens in WorkOS user metadata
    await storeLinearTokens(user.id, {
      accessToken,
      refreshToken,
      expiresAt,
    });

    // Redirect to original destination or dashboard
    const redirectPath = state || '/dashboard';
    const redirectUrl = new URL(redirectPath, config.app.url);
    redirectUrl.searchParams.set('success', 'linear_connected');
    
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Linear OAuth callback error:', err);
    const errorUrl = new URL('/dashboard', config.app.url);
    errorUrl.searchParams.set('error', 'linear_auth_failed');
    return NextResponse.redirect(errorUrl);
  }
}
