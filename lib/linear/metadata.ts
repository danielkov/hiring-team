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

/**
 * Store ATS Container Initiative ID in WorkOS user metadata
 */
export async function storeATSContainerInitiativeId(
  userId: string,
  initiativeId: string
): Promise<void> {
  try {
    await workos.userManagement.updateUser({
      userId,
      metadata: {
        atsContainerInitiativeId: initiativeId,
      },
    });
  } catch (error) {
    console.error('Failed to store ATS Container Initiative ID in WorkOS metadata:', error);
    throw new Error('Failed to save ATS Container configuration');
  }
}

/**
 * Get ATS Container Initiative ID from WorkOS user metadata
 */
export async function getATSContainerInitiativeId(userId: string): Promise<string | null> {
  try {
    const user = await workos.userManagement.getUser(userId);
    
    const metadata = user.metadata as Record<string, unknown>;
    
    if (!metadata?.atsContainerInitiativeId) {
      return null;
    }

    return metadata.atsContainerInitiativeId as string;
  } catch (error) {
    console.error('Failed to retrieve ATS Container Initiative ID from WorkOS metadata:', error);
    return null;
  }
}

/**
 * Store organization config in Redis
 * Should be called after storeLinearTokens to sync org data to Redis
 */
export async function storeOrgConfigInRedis(
  userId: string,
  tokens: LinearTokens
): Promise<void> {
  try {
    const { LinearClient } = await import('@linear/sdk');
    const { storeOrgConfig } = await import('@/lib/redis');
    const { logger } = await import('@/lib/datadog/logger');
    
    const linearClient = new LinearClient({ accessToken: tokens.accessToken });
    const organization = await linearClient.organization;
    
    // Get ATS container initiative ID if it exists
    const atsContainerInitiativeId = await getATSContainerInitiativeId(userId) || '';
    
    // Store org config in Redis
    await storeOrgConfig(organization.name, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      orgId: organization.id,
      orgName: organization.name,
      atsContainerInitiativeId,
    });
    
    logger.info('Linear organization config stored in Redis', {
      userId,
      orgId: organization.id,
      orgName: organization.name,
    });
  } catch (error) {
    // Log but don't fail if Redis storage fails
    const { logger } = await import('@/lib/datadog/logger');
    logger.error('Failed to store org config in Redis', error instanceof Error ? error : new Error(String(error)), {
      userId,
    });
  }
}
