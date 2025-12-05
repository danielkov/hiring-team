/**
 * Token Refresh Cron Job
 * 
 * Refreshes Linear access tokens for all organizations stored in Redis
 * Called daily by Vercel Cron Job
 */

import { NextRequest, NextResponse } from 'next/server';
import { LinearOrgConfig, redis } from '@/lib/redis';
import { refreshLinearToken } from '@/lib/linear/oauth';

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[refresh-tokens] Starting token refresh job');

    // Get all Linear org config keys from Redis
    const keys = await redis.keys('linear:org:*:config');
    console.log(`[refresh-tokens] Found ${keys.length} organizations to refresh`);

    const results = {
      total: keys.length,
      refreshed: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ org: string; error: string }>,
    };

    // Process each organization
    for (const key of keys) {
      try {
        const config = await redis.get<LinearOrgConfig>(key);
        
        if (!config) {
          console.log(`[refresh-tokens] Config not found for key: ${key}`);
          results.skipped++;
          continue;
        }

        const orgName = config.orgName || key.split(':')[2];
        console.log(`[refresh-tokens] Processing org: ${orgName}`);

        // Check if token needs refresh (expires within 24 hours)
        const now = Date.now();
        const bufferTime = 24 * 60 * 60 * 1000; // 24 hours
        const needsRefresh = config.expiresAt <= now + bufferTime;

        if (!needsRefresh) {
          console.log(`[refresh-tokens] Token for ${orgName} is still valid, skipping`);
          results.skipped++;
          continue;
        }

        // Refresh the token
        const refreshedTokens = await refreshLinearToken(config.refreshToken);
        const newExpiresAt = Date.now() + refreshedTokens.expiresIn * 1000;

        // Update config in Redis
        const updatedConfig: LinearOrgConfig = {
          ...config,
          accessToken: refreshedTokens.accessToken,
          refreshToken: refreshedTokens.refreshToken,
          expiresAt: newExpiresAt,
        };

        await redis.set(key, updatedConfig);
        console.log(`[refresh-tokens] Successfully refreshed token for ${orgName}`);
        results.refreshed++;

      } catch (error) {
        const orgName = key.split(':')[2];
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[refresh-tokens] Failed to refresh token for ${orgName}:`, error);
        results.failed++;
        results.errors.push({ org: orgName, error: errorMessage });
      }
    }

    console.log('[refresh-tokens] Job completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Token refresh completed',
      results,
    });

  } catch (error) {
    console.error('[refresh-tokens] Job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
