# Linear Integration Module

This directory contains Linear SDK integration for managing ATS data, using WorkOS user metadata for secure token storage.

## Architecture

Linear OAuth tokens are stored in WorkOS user metadata instead of cookies or sessions. This provides:
- Secure server-side storage
- No cookie size limitations
- Centralized user data management
- Easy token access across API routes

Reference: https://workos.com/docs/authkit/metadata/exposing-metadata-in-jwts

## Implemented Files

- `client.ts` - Linear SDK client factory with automatic token refresh
- `oauth.ts` - OAuth 2.0 authorization flow implementation
- `metadata.ts` - WorkOS user metadata management for Linear tokens

## Usage

### Authenticating Users

```typescript
import { getLinearAuthorizationUrl } from '@/lib/linear/oauth';

// Redirect user to Linear OAuth page
const authUrl = getLinearAuthorizationUrl('/dashboard');
```

### Getting Linear Client

```typescript
import { getLinearClient } from '@/lib/linear/client';

// Get authenticated client (automatically refreshes token if needed)
const linear = await getLinearClient();

// Use the client
const issues = await linear.issues();
```

### Checking Connection Status

```typescript
import { hasLinearConnected } from '@/lib/linear/client';

const isConnected = await hasLinearConnected();
```

### Managing Tokens

```typescript
import { getLinearTokens, storeLinearTokens, removeLinearTokens } from '@/lib/linear/metadata';

// Get tokens for a user
const tokens = await getLinearTokens(userId);

// Store new tokens
await storeLinearTokens(userId, {
  accessToken: 'token',
  refreshToken: 'refresh',
  expiresAt: Date.now() + 3600000,
});

// Remove tokens (disconnect)
await removeLinearTokens(userId);
```

## OAuth Flow

1. User clicks "Connect Linear" button
2. Redirect to `/api/linear/authorize`
3. User authorizes on Linear
4. Linear redirects to `/api/linear/callback` with code
5. Exchange code for access token
6. Store tokens in WorkOS user metadata
7. Redirect user back to app

## API Routes

- `GET /api/linear/authorize` - Initiates OAuth flow
- `GET /api/linear/callback` - Handles OAuth callback
- `POST /api/linear/disconnect` - Disconnects Linear and revokes tokens
- `GET /api/linear/status` - Returns connection status

## Token Management

- Access tokens are stored in WorkOS user metadata
- Tokens are automatically refreshed when expired (5 min buffer)
- Refresh tokens are used to obtain new access tokens
- Token expiry is tracked and checked before each request
- Tokens are revoked on disconnect

## Files to be implemented:
- `initiatives.ts` - Initiative management functions
- `projects.ts` - Project synchronization and management
- `issues.ts` - Issue (candidate) management
- `documents.ts` - Document attachment handling
- `webhooks.ts` - Webhook event handlers

## Related Tasks:
- Task 2.3: Implement Linear OAuth integration ✅
- Task 3: Implement onboarding and Linear setup
- Task 7: Implement Linear webhook handling
