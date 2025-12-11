/**
 * Linear OAuth Callback Handler
 * Processes authorization code and stores tokens in WorkOS user metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/linear/oauth';
import { storeLinearTokens, storeOrgConfigInRedis } from '@/lib/linear/metadata';
import { config } from '@/lib/config';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { emitAuthenticationFailure } from '@/lib/datadog/events';
import { logger } from '@/lib/datadog/logger';

export async function GET(request: NextRequest) {
  const { user } = await withAuth();
  
  if (!user) {
    emitAuthenticationFailure('Linear OAuth callback without user session', {
      reason: 'session_required',
    });
    
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
    emitAuthenticationFailure('Linear OAuth error', {
      error,
      userId: user.id,
    });
    
    const errorUrl = new URL('/dashboard', config.app.url);
    errorUrl.searchParams.set('error', `linear_auth_${error}`);
    return NextResponse.redirect(errorUrl);
  }

  // Validate authorization code
  if (!code) {
    emitAuthenticationFailure('Linear OAuth missing authorization code', {
      userId: user.id,
    });
    
    const errorUrl = new URL('/dashboard', config.app.url);
    errorUrl.searchParams.set('error', 'linear_missing_code');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Exchange code for access token
    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code);

    // Calculate token expiry timestamp
    const expiresAt = Date.now() + expiresIn * 1000;

    const tokens = {
      accessToken,
      refreshToken,
      expiresAt,
    };

    // Store tokens in WorkOS user metadata
    await storeLinearTokens(user.id, tokens);

    // Store organization config in Redis
    await storeOrgConfigInRedis(user.id, tokens);

    // Redirect to original destination or dashboard
    const redirectPath = state || '/dashboard';
    const redirectUrl = new URL(redirectPath, config.app.url);
    redirectUrl.searchParams.set('success', 'linear_connected');
    
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    logger.error('Linear OAuth callback error', err instanceof Error ? err : new Error(String(err)), {
      userId: user.id,
    });
    
    emitAuthenticationFailure('Linear OAuth token exchange failed', {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    
    const errorUrl = new URL('/dashboard', config.app.url);
    errorUrl.searchParams.set('error', 'linear_auth_failed');
    return NextResponse.redirect(errorUrl);
  }
}
