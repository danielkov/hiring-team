/**
 * Linear SDK Client
 *
 * Provides authenticated Linear SDK client instances using Redis for tokens
 */

import { LinearClient } from '@linear/sdk';
import { getLinearOrgSlug } from './metadata';
import { getOrgConfig } from '../redis';

/**
 * Get authenticated Linear client for current user
 * Tokens are fetched from Redis (which handles auto-refresh)
 */
export async function getLinearClient(): Promise<LinearClient> {
  const { withAuth } = await import('@workos-inc/authkit-nextjs');
  const { user } = await withAuth();

  if (!user) {
    throw new Error('No active session');
  }

  // Get org slug from WorkOS metadata
  const orgSlug = await getLinearOrgSlug(user.id);

  if (!orgSlug) {
    throw new Error('Linear not connected. Please authorize Linear integration.');
  }

  // Get tokens from Redis (auto-refreshes if expired)
  const orgConfig = await getOrgConfig(orgSlug);

  if (!orgConfig) {
    throw new Error('Linear organization config not found. Please re-authorize Linear integration.');
  }

  return new LinearClient({
    accessToken: orgConfig.accessToken,
  });
}

/**
 * Get Linear client with specific access token (for testing or admin operations)
 */
export function createLinearClient(accessToken: string): LinearClient {
  console.log('[createLinearClient] Creating client with token');
  
  const client = new LinearClient({
    accessToken,
  });
  console.log('[createLinearClient] Client created');
  return client;
}

/**
 * Check if user has Linear connected
 */
export async function hasLinearConnected(): Promise<boolean> {
  try {
    const { withAuth } = await import('@workos-inc/authkit-nextjs');
    const { user } = await withAuth();
    if (!user) return false;

    const orgSlug = await getLinearOrgSlug(user.id);
    return orgSlug !== null;
  } catch {
    return false;
  }
}

/**
 * Get Linear client using app credentials (for public/unauthenticated access)
 * This requires LINEAR_API_KEY to be set in environment variables
 */
export function getLinearAppClient(): LinearClient {
  const apiKey = process.env.LINEAR_API_KEY;
  
  if (!apiKey) {
    throw new Error('LINEAR_API_KEY not configured. Please add it to your environment variables.');
  }
  
  return new LinearClient({
    apiKey,
  });
}
