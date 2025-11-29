# Redis Configuration Refactoring

## Overview
Refactored the app to store a complete Linear organization configuration object in Redis instead of just the access token. This enables the public job board to access all necessary information without requiring user authentication.

## Changes Made

### 1. Redis Storage (`lib/redis.ts`)
- **New Interface**: `LinearOrgConfig` containing:
  - `accessToken`: Linear API access token
  - `refreshToken`: Linear API refresh token
  - `expiresAt`: Token expiration timestamp
  - `orgId`: Linear organization ID
  - `orgName`: Linear organization name
  - `atsContainerInitiativeId`: The initiative ID for filtering jobs

- **New Functions**:
  - `storeOrgConfig()`: Store complete config object
  - `getOrgConfig()`: Retrieve config object
  - `hasOrgConfig()`: Check if config exists
  - `deleteOrgConfig()`: Remove config

- **Legacy Functions**: Kept old token-only functions as deprecated for backward compatibility

### 2. Redis Actions (`lib/linear/redis-actions.ts`)
- Renamed `saveOrgTokenToRedis()` → `saveOrgConfigToRedis()`
- Now stores complete config including:
  - Access and refresh tokens
  - Organization details
  - ATS Container Initiative ID
- Returns error if ATS Container is not configured

### 3. Projects API (`lib/linear/projects.ts`)
- Updated `getPublishedJobsByOrg()`:
  - Now takes only `linearOrg` parameter (removed `initiativeId`)
  - Retrieves initiative ID from Redis config
  - Uses config object instead of just token
  - Better error messaging

- **New Function**: `getJobListingByIdForOrg()`:
  - Unauthenticated version of `getJobListingById()`
  - Takes `linearOrg` and `projectId` parameters
  - Uses Redis config to access Linear API
  - Verifies project belongs to the ATS Container Initiative
  - Only returns projects with "In Progress" status
  - Used by public job detail page

### 4. Dashboard Widget (`components/redis-token-status.tsx`)
- Updated UI text from "Token" to "Configuration"
- Changed button text to "Sync Configuration to Redis"
- Updated status messages to reflect full config sync
- Calls new `saveOrgConfigToRedis()` action

### 5. Dashboard Page (`app/dashboard/page.tsx`)
- Updated to use `hasOrgConfig()` instead of `hasOrgToken()`
- Passes `initialHasConfig` prop to widget

### 6. OAuth Callback (`app/api/linear/callback/route.ts`)
- Removed automatic Redis storage during OAuth
- Config is now synced manually from dashboard
- Cleaner separation of concerns

### 7. Job Detail Page (`app/jobs/[linearOrg]/[id]/page.tsx`)
- Updated to use `getJobListingByIdForOrg()` instead of `getJobListingById()`
- Now works for unauthenticated external users
- Uses Redis config to fetch job details
- Properly scoped to organization and initiative

## Benefits

1. **Complete Context**: Public job board has all necessary information
2. **No Initiative Parameter**: Initiative ID stored in config, cleaner API
3. **Better UX**: Clear "sync configuration" action in dashboard
4. **Flexibility**: Easy to add more config fields in the future
5. **Backward Compatible**: Legacy functions still available

## Migration Path

Users need to:
1. Complete Linear OAuth (if not already done)
2. Complete onboarding (set ATS Container Initiative)
3. Click "Sync Configuration to Redis" in dashboard
4. Public job board at `/jobs/{orgName}` will then work

## Public vs Authenticated Functions

### Authenticated (requires user session):
- `getJobListingById()` - Uses user's Linear connection
- `getPublishedJobs()` - Uses user's Linear connection
- `syncProjects()` - Uses user's Linear connection

### Unauthenticated (uses Redis config):
- `getJobListingByIdForOrg(linearOrg, projectId)` - For public job detail page
- `getPublishedJobsByOrg(linearOrg)` - For public job listings page

## Key Files Modified

- `lib/redis.ts`
- `lib/linear/redis-actions.ts`
- `lib/linear/projects.ts`
- `components/redis-token-status.tsx`
- `app/dashboard/page.tsx`
- `app/api/linear/callback/route.ts`
- `app/jobs/[linearOrg]/[id]/page.tsx`
