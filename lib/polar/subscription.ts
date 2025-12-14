/**
 * Subscription Management Functions
 * 
 * Handles subscription lifecycle operations including tier definitions,
 * checkout session creation, subscription retrieval, upgrades, and cancellations.
 * 
 * Requirements: 1.1, 1.2, 1.5
 */

import { config } from '../config';
import { redis } from '../redis';
import { logger } from '../datadog/logger';
import { createPolarCheckout, listProducts } from './client';
import { StoredSubscription } from '../../types/polar';

/**
 * Subscription tier definition
 * Requirements: 4.1, 4.2, 4.3
 */
export interface SubscriptionTier {
  id: string;
  name: string;
  price: number; // Monthly price in cents (0 for free)
  currency: 'usd';
  polarProductId: string;
  description: string;
  features: string[];
}

/**
 * Get all available subscription tiers
 * Requirements: 1.1, 4.1, 4.2, 4.3
 * 
 * Fetches products from Polar and extracts meter credits from benefits
 * to populate allowances and features dynamically.
 * 
 * @returns Array of subscription tiers with pricing and allowances
 */
export async function getTiers(): Promise<SubscriptionTier[]> {
  logger.info('Fetching subscription tiers from Polar');

  // Fetch products from Polar - only pass organizationId if it's defined
  const orgId = config.polar.organizationId || undefined;
  const products = await listProducts(orgId);

  if (!products || products.length === 0) {
    logger.warn('No products found in Polar, returning empty tiers');
    return [];
  }

  const tierNameToId = {
    [config.polar.products.free]: 'free',
    [config.polar.products.pro]: 'pro',
    [config.polar.products.enterprise]: 'enterprise',
  };

  // Map products to tiers
  const tiers = products.map((product) => {
    const price = product.prices.at(0);
    const features = product.benefits.map((benefit) => benefit.description);
    // Extract price information
    let priceAmount = 0;
    let currency: 'usd' = 'usd';

    if (price && price.type === 'recurring') {
      // Handle different price types
      if ('priceAmount' in price && price.priceAmount) {
        priceAmount = price.priceAmount;
      }
      if ('priceCurrency' in price && price.priceCurrency) {
        currency = price.priceCurrency as 'usd';
      }
    }
    return {
      id: tierNameToId[product.id] || 'custom',
      name: product.name,
      price: priceAmount,
      currency,
      polarProductId: product.id,
      description: product.description ?? '',
      features,
    };
  });

  // Sort tiers in order: free, pro, enterprise
  const tierOrder = ['free', 'pro', 'enterprise'];
  tiers.sort((a, b) => {
    const indexA = tierOrder.indexOf(a.id);
    const indexB = tierOrder.indexOf(b.id);
    // If tier not in order list, put it at the end
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  logger.info('Successfully fetched subscription tiers', {
    tierCount: tiers.length,
  });

  return tiers;
}

/**
 * Create a Polar checkout session for subscription purchase
 * Requirements: 1.2
 * 
 * @param linearOrgId - Linear organization ID (used as external customer ID)
 * @param tierId - Subscription tier ID ('free', 'pro', 'enterprise')
 * @param successUrl - URL to redirect after successful checkout
 * @param cancelUrl - URL to redirect if checkout is cancelled
 * @param customerEmail - Optional customer email
 * @param customerName - Optional customer name
 * @returns Checkout session with redirect URL
 * @throws Error if tier not found or checkout creation fails
 */
export async function createCheckoutSession(
  linearOrgId: string,
  tierId: string,
  successUrl: string,
  cancelUrl?: string,
  customerEmail?: string,
  customerName?: string
) {
  logger.info('Creating checkout session', {
    linearOrgId,
    tierId,
  });

  // Find the tier
  const tiers = await getTiers();
  const tier = tiers.find((t) => t.id === tierId);

  if (!tier) {
    throw new Error(`Invalid tier ID: ${tierId}`);
  }

  // Free tier doesn't need checkout
  if (tier.id === 'free') {
    throw new Error('Free tier does not require checkout');
  }

  if (!tier.polarProductId) {
    throw new Error(`Polar product ID not configured for tier: ${tierId}`);
  }

  try {
    // Create checkout session using Polar client
    const checkout = await createPolarCheckout({
      productPriceId: tier.polarProductId,
      linearOrgId,
      successUrl,
      customerEmail,
      customerName,
    });

    logger.info('Checkout session created successfully', {
      linearOrgId,
      tierId,
      checkoutId: checkout.id,
    });

    return checkout;
  } catch (error) {
    logger.error('Failed to create checkout session', error as Error, {
      linearOrgId,
      tierId,
    });
    throw error;
  }
}

/**
 * Get subscription for a Linear organization from Redis
 * Requirements: 1.1, 7.1, 7.3
 * 
 * @param linearOrgId - Linear organization ID
 * @returns Subscription data or null if not found
 */
export async function getSubscription(
  linearOrgId: string
): Promise<StoredSubscription | null> {
  const key = `subscription:${linearOrgId}`;

  try {
    logger.info('Retrieving subscription from Redis', {
      linearOrgId,
      key,
    });

    const data = await redis.get<StoredSubscription>(key);

    if (!data) {
      logger.info('No subscription found', {
        linearOrgId,
      });
      return null;
    }

    // Parse dates if they're stored as strings
    const subscription: StoredSubscription = {
      ...data,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      updatedAt: new Date(data.updatedAt),
    };

    logger.info('Subscription retrieved successfully', {
      linearOrgId,
      productId: subscription.productId,
      status: subscription.status,
    });

    return subscription;
  } catch (error) {
    logger.error('Failed to retrieve subscription from Redis', error as Error, {
      linearOrgId,
    });
    throw error;
  }
}

/**
 * Upgrade subscription to a higher tier
 * Requirements: 1.2
 * 
 * Note: This function creates a new checkout session for the upgraded tier.
 * The actual subscription update happens via Polar webhooks after checkout completion.
 * 
 * @param linearOrgId - Linear organization ID
 * @param newTierId - New subscription tier ID
 * @param successUrl - URL to redirect after successful checkout
 * @param cancelUrl - URL to redirect if checkout is cancelled
 * @param customerEmail - Optional customer email
 * @param customerName - Optional customer name
 * @returns Checkout session for the new tier
 * @throws Error if upgrade fails or tier is invalid
 */
export async function upgradeSubscription(
  linearOrgId: string,
  newTierId: string,
  successUrl: string,
  cancelUrl?: string,
  customerEmail?: string,
  customerName?: string
) {
  logger.info('Upgrading subscription', {
    linearOrgId,
    newTierId,
  });

  // Validate tier exists
  const tiers = await getTiers();
  const newTier = tiers.find((t) => t.id === newTierId);

  if (!newTier) {
    throw new Error(`Invalid tier ID: ${newTierId}`);
  }

  // Get current subscription
  const currentSubscription = await getSubscription(linearOrgId);

  if (!currentSubscription) {
    throw new Error(`No active subscription found for organization: ${linearOrgId}`);
  }

  try {
    // Create a new checkout session for the upgraded tier
    // The subscription will be updated via webhook after successful checkout
    const checkout = await createCheckoutSession(
      linearOrgId,
      newTierId,
      successUrl,
      cancelUrl,
      customerEmail,
      customerName
    );

    logger.info('Upgrade checkout session created successfully', {
      linearOrgId,
      oldProductId: currentSubscription.productId,
      newTierId,
      checkoutId: checkout.id,
    });

    return checkout;
  } catch (error) {
    logger.error('Failed to create upgrade checkout session', error as Error, {
      linearOrgId,
      newTierId,
    });
    throw error;
  }
}

/**
 * Cancel subscription (effective at period end)
 * Requirements: 1.5
 * 
 * Note: This marks the subscription for cancellation in Redis.
 * The actual cancellation in Polar should be handled via their dashboard or API.
 * The webhook will update the final state when cancellation is processed.
 * 
 * @param linearOrgId - Linear organization ID
 * @throws Error if cancellation fails or no subscription found
 */
export async function cancelSubscription(linearOrgId: string): Promise<void> {
  logger.info('Cancelling subscription', {
    linearOrgId,
  });

  // Get current subscription
  const currentSubscription = await getSubscription(linearOrgId);

  if (!currentSubscription) {
    throw new Error(`No active subscription found for organization: ${linearOrgId}`);
  }

  if (currentSubscription.cancelAtPeriodEnd) {
    logger.info('Subscription already marked for cancellation', {
      linearOrgId,
    });
    return;
  }

  try {
    // Update Redis to mark subscription as cancelled at period end
    // The actual cancellation in Polar will be handled via webhook
    const updatedData: StoredSubscription = {
      ...currentSubscription,
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    };

    const key = `subscription:${linearOrgId}`;
    await redis.set(key, updatedData);

    logger.info('Subscription marked for cancellation', {
      linearOrgId,
      currentPeriodEnd: currentSubscription.currentPeriodEnd,
    });
  } catch (error) {
    logger.error('Failed to mark subscription for cancellation', error as Error, {
      linearOrgId,
    });
    throw error;
  }
}

/**
 * Check if organization has a specific benefit in their subscription
 * Requirements: Custom tone of voice feature gating
 * 
 * @param linearOrgId - Linear organization ID
 * @param benefitId - Polar benefit ID to check for
 * @returns True if the organization has the benefit, false otherwise
 */
export async function hasBenefit(
  linearOrgId: string,
  benefitId: string
): Promise<boolean> {
  try {
    logger.info('Checking if organization has benefit', {
      linearOrgId,
      benefitId,
    });

    // Import here to avoid circular dependency
    const { getCustomerState } = await import('./client');
    
    // Get customer state from Polar
    const customerState = await getCustomerState(linearOrgId);
    
    if (!customerState) {
      logger.info('No customer state found, benefit not available', {
        linearOrgId,
        benefitId,
      });
      return false;
    }
    
    // Check if the benefit is in the granted benefits list
    const hasActiveBenefit = customerState.grantedBenefits?.some(
      (grant) => grant.benefitId === benefitId
    ) ?? false;
    
    logger.info('Benefit check completed', {
      linearOrgId,
      benefitId,
      hasActiveBenefit,
      grantedBenefitCount: customerState.grantedBenefits?.length || 0,
    });
    
    return hasActiveBenefit;
  } catch (error) {
    logger.error('Failed to check benefit', error as Error, {
      linearOrgId,
      benefitId,
    });
    
    // Return false on error to gracefully degrade to default behavior
    return false;
  }
}
