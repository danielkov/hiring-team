/**
 * Linear Token Management via WorkOS User Metadata
 * 
 * Stores Linear OAuth tokens in WorkOS user metadata instead of cookies/sessions
 * Reference: https://workos.com/docs/authkit/metadata/exposing-metadata-in-jwts
 */

import { WorkOS } from '@workos-inc/node';
import { config } from '../config';

const workos = new WorkOS(config.workos.apiKey);

export interface LinearTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * Store Linear tokens in WorkOS user metadata
 */
export async function storeLinearTokens(
  userId: string,
  tokens: LinearTokens
): Promise<void> {
  try {
    await workos.userManagement.updateUser({
      userId,
      metadata: {
        linearAccessToken: tokens.accessToken,
        linearRefreshToken: tokens.refreshToken,
        linearTokenExpiresAt: `${tokens.expiresAt}`,
      },
    });
  } catch (error) {
    console.error('Failed to store Linear tokens in WorkOS metadata:', error);
    throw new Error('Failed to save Linear authentication');
  }
}

/**
 * Get Linear tokens from WorkOS user metadata
 */
export async function getLinearTokens(userId: string): Promise<LinearTokens | null> {
  try {
    const user = await workos.userManagement.getUser(userId);
    
    const metadata = user.metadata as Record<string, unknown>;
    
    if (!metadata?.linearAccessToken || !metadata?.linearRefreshToken) {
      return null;
    }

    return {
      accessToken: metadata.linearAccessToken as string,
      refreshToken: metadata.linearRefreshToken as string,
      expiresAt: metadata.linearTokenExpiresAt as number,
    };
  } catch (error) {
    console.error('Failed to retrieve Linear tokens from WorkOS metadata:', error);
    return null;
  }
}

/**
 * Check if Linear token is expired
 */
export function isLinearTokenExpired(tokens: LinearTokens): boolean {
  // Add 5 minute buffer to refresh before actual expiry
  const bufferMs = 5 * 60 * 1000;
  return Date.now() >= tokens.expiresAt - bufferMs;
}

/**
 * Remove Linear tokens from WorkOS user metadata
 */
export async function removeLinearTokens(userId: string): Promise<void> {
  try {
    await workos.userManagement.updateUser({
      userId,
      metadata: {
        linearAccessToken: null,
        linearRefreshToken: null,
        linearTokenExpiresAt: null,
      },
    });
  } catch (error) {
    console.error('Failed to remove Linear tokens from WorkOS metadata:', error);
    throw new Error('Failed to disconnect Linear');
  }
}
