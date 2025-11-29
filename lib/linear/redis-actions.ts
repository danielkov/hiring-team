/**
 * Server Actions for Redis Config Management
 */

"use server";

import { withAuth } from '@workos-inc/authkit-nextjs';
import { getLinearClient } from './client';
import { getLinearTokens, getATSContainerInitiativeId } from './metadata';
import { storeOrgConfig } from '../redis';

export async function saveOrgConfigToRedis() {
  try {
    const { user } = await withAuth();
    
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Get Linear client and tokens
    const client = await getLinearClient();
    const tokens = await getLinearTokens(user.id);

    if (!tokens) {
      return {
        success: false,
        error: 'Linear not connected',
      };
    }

    // Get organization info
    const organization = await client.organization;

    // Get ATS Container Initiative ID
    const atsContainerInitiativeId = await getATSContainerInitiativeId(user.id);

    if (!atsContainerInitiativeId) {
      return {
        success: false,
        error: 'ATS Container not configured. Please complete onboarding.',
      };
    }

    // Store full config in Redis
    await storeOrgConfig(organization.name, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      orgId: organization.id,
      orgName: organization.name,
      atsContainerInitiativeId,
    });

    return {
      success: true,
      orgId: organization.id,
      orgName: organization.name,
    };
  } catch (error) {
    console.error('Failed to save org config:', error);
    return {
      success: false,
      error: 'Failed to save organization configuration',
    };
  }
}
