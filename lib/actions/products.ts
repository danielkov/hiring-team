'use server';

/**
 * Server actions for fetching product information from Polar
 */

import { listProducts } from '../polar/client';
import { config } from '../config';

export interface ProductPrice {
  id: string;
  type: 'recurring' | 'one_time';
  recurringInterval?: 'month' | 'year';
  priceAmount?: number;
  priceCurrency?: string;
  amountType: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  prices: ProductPrice[];
  isRecurring: boolean;
}

/**
 * Fetch products from Polar for display on the landing page
 * Returns products with their pricing information
 */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const organizationId = config.polar.organizationId || undefined;
    const products = await listProducts(organizationId);
    
    // Map Polar products to our simplified format
    return products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      prices: product.prices || [],
      isRecurring: product.isRecurring,
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    // Return empty array on error to allow graceful degradation
    return [];
  }
}

/**
 * Get pricing tiers mapped to our application's tier structure
 * Maps Polar products to Free, Pro, and Enterprise tiers
 */
export async function getPricingTiers() {
  try {
    const products = await fetchProducts();
    
    // Map products by their IDs from config
    const freeProduct = products.find(p => p.id === config.polar.products.free);
    const proProduct = products.find(p => p.id === config.polar.products.pro);
    const enterpriseProduct = products.find(p => p.id === config.polar.products.enterprise);
    
    // Helper to get price for a specific interval
    const getPrice = (product: Product | undefined, interval: 'month' | 'year') => {
      if (!product) return null;
      const price = product.prices.find(p => 
        p.type === 'recurring' && p.recurringInterval === interval
      );
      if (!price || !price.priceAmount) return null;
      return `$${(price.priceAmount / 100).toFixed(0)}`;
    };
    
    return {
      free: {
        name: freeProduct?.name || 'Starter',
        description: freeProduct?.description || 'Start free and scale as you grow',
        monthlyPrice: '$0',
        yearlyPrice: '$0',
      },
      pro: {
        name: proProduct?.name || 'Professional',
        description: proProduct?.description || 'For growing teams',
        monthlyPrice: getPrice(proProduct, 'month') || '$99',
        yearlyPrice: getPrice(proProduct, 'year') || '$999',
      },
      enterprise: {
        name: enterpriseProduct?.name || 'Enterprise',
        description: enterpriseProduct?.description || 'For large organizations',
        monthlyPrice: getPrice(enterpriseProduct, 'month') || 'Custom',
        yearlyPrice: getPrice(enterpriseProduct, 'year') || 'Custom',
      },
    };
  } catch (error) {
    console.error('Failed to get pricing tiers:', error);
    // Return default pricing on error
    return {
      free: {
        name: 'Starter',
        description: 'Start free and scale as you grow',
        monthlyPrice: '$0',
        yearlyPrice: '$0',
      },
      pro: {
        name: 'Professional',
        description: 'For growing teams',
        monthlyPrice: '$49',
        yearlyPrice: '$499',
      },
      enterprise: {
        name: 'Enterprise',
        description: 'For large organizations',
        monthlyPrice: 'Custom',
        yearlyPrice: 'Custom',
      },
    };
  }
}
