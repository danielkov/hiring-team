# Dynamic Pricing Implementation

## Overview

The landing page now loads pricing information dynamically from Polar instead of using hard-coded values. This allows you to update pricing in Polar's dashboard without needing to redeploy the application.

## Changes Made

### 1. New Polar Client Method (`lib/polar/client.ts`)

Added `listProducts()` function to fetch products from Polar API:
- Supports optional organization ID filtering
- Includes retry logic for reliability
- Returns products with full pricing details

### 2. New Server Action (`lib/actions/products.ts`)

Created two new server actions:
- `fetchProducts()`: Fetches all products from Polar
- `getPricingTiers()`: Maps Polar products to Free/Pro/Enterprise tiers with graceful fallback to default pricing

### 3. Updated Landing Page (`app/page.tsx`)

- Calls `getPricingTiers()` on server-side
- Passes pricing data to `Pricing4` component

### 4. Updated Pricing Component (`components/pricing4.tsx`)

- Accepts optional `pricingTiers` prop
- Uses dynamic pricing when available
- Falls back to hard-coded defaults if Polar API fails

### 5. Configuration Updates

Added `POLAR_ORGANIZATION_ID` to:
- `lib/config.ts`: Added organizationId field
- `.env.example`: Added documentation for the new variable

## How It Works

1. When the landing page loads, it calls `getPricingTiers()`
2. This fetches all products from Polar using the configured organization ID
3. Products are matched to tiers using the product IDs from environment variables:
   - `POLAR_FREE_PRODUCT_ID` → Free tier
   - `POLAR_PRO_PRODUCT_ID` → Pro tier
   - `POLAR_ENTERPRISE_PRODUCT_ID` → Enterprise tier
4. Pricing is extracted from each product's price objects (monthly/yearly)
5. The pricing component displays the dynamic values

## Graceful Degradation

If the Polar API is unavailable or returns an error:
- The system logs the error
- Falls back to hard-coded default pricing
- Users still see pricing information (no broken page)

## Environment Variables

Add to your `.env.local`:

```bash
# Optional: Filter products by organization
POLAR_ORGANIZATION_ID=org_xxxxxxxxxxxxx

# Required: Product IDs for each tier
POLAR_FREE_PRODUCT_ID=prod_xxxxxxxxxxxxx
POLAR_PRO_PRODUCT_ID=prod_xxxxxxxxxxxxx
POLAR_ENTERPRISE_PRODUCT_ID=prod_xxxxxxxxxxxxx
```

## Benefits

- **No Redeployments**: Update pricing in Polar dashboard, changes reflect immediately
- **Single Source of Truth**: Pricing managed in one place (Polar)
- **Type Safety**: Full TypeScript support with proper types
- **Reliability**: Automatic retries and graceful fallback
- **Observability**: All API calls logged via Datadog

## Testing

To test the implementation:

1. Set up your Polar products with pricing
2. Configure the environment variables with your product IDs
3. Start the dev server: `npm run dev`
4. Visit the landing page and scroll to the pricing section
5. Verify the prices match your Polar configuration

## Future Enhancements

Possible improvements:
- Cache pricing data in Redis to reduce API calls
- Add revalidation with Next.js ISR for better performance
- Support for multiple currencies
- Display product benefits from Polar
