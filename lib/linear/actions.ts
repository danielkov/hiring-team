'use server';

/**
 * Server Actions for Linear Integration
 */

import { getLinearOrgSlug, removeLinearOrgSlug } from './metadata';
import { getOrgConfig, deleteOrgConfig } from '../redis';
import { revokeLinearToken } from './oauth';

/**
 * Check if user has Linear connected
 */
export async function getLinearConnectionStatus() {
  const { withAuth } = await import('@workos-inc/authkit-nextjs');
  const { user } = await withAuth();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const orgSlug = await getLinearOrgSlug(user.id);
  return { connected: orgSlug !== null };
}

/**
 * Disconnect Linear integration
 */
export async function disconnectLinear() {
  const { withAuth } = await import('@workos-inc/authkit-nextjs');
  const { user } = await withAuth();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get org slug to find the org config
  const orgSlug = await getLinearOrgSlug(user.id);

  if (orgSlug) {
    const orgConfig = await getOrgConfig(orgSlug);

    if (orgConfig) {
      // Revoke the access token with Linear
      try {
        await revokeLinearToken(orgConfig.accessToken);
      } catch (error) {
        console.error('Failed to revoke Linear token:', error);
      }

      // Remove org config from Redis
      await deleteOrgConfig(orgSlug);
    }
  }

  // Remove org slug from WorkOS metadata
  await removeLinearOrgSlug(user.id);

  return { success: true };
}
