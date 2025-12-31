/**
 * Server Actions for Redis Config Management
 */

"use server";

import { getOrgConfig } from '../redis';

/**
 * Check if Redis config exists and is valid (not expired)
 */
export async function checkRedisConfigStatus(orgName: string) {
  try {
    const config = await getOrgConfig(orgName);

    if (!config) {
      return {
        hasConfig: false,
        isExpired: false,
      };
    }

    // Check if token is expired (with 5 minute buffer)
    const isExpired = config.expiresAt < Date.now() + 5 * 60 * 1000;

    return {
      hasConfig: true,
      isExpired,
    };
  } catch (error) {
    console.error('Failed to check Redis config status:', error);
    return {
      hasConfig: false,
      isExpired: false,
    };
  }
}
