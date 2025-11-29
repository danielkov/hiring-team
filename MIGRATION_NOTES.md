# Linear Integration Migration to WorkOS Metadata

## Summary

The Linear integration has been rewritten to use WorkOS user metadata for storing OAuth tokens instead of cookies/sessions.

## Changes Made

### New Files Created

1. **lib/linear/metadata.ts** - WorkOS metadata management
   - `storeLinearTokens()` - Store tokens in user metadata
   - `getLinearTokens()` - Retrieve tokens from user metadata
   - `isLinearTokenExpired()` - Check token expiration
   - `removeLinearTokens()` - Remove tokens (disconnect)

2. **app/api/linear/disconnect/route.ts** - Disconnect endpoint
   - Revokes Linear tokens
   - Removes tokens from WorkOS metadata

3. **app/api/linear/status/route.ts** - Connection status endpoint
   - Returns whether user has Linear connected

### Modified Files

1. **lib/linear/client.ts**
   - Removed session dependencies
   - Now uses WorkOS metadata via `getLinearTokens()`
   - Added `hasLinearConnected()` helper function

2. **app/api/linear/callback/route.ts**
   - Removed session update logic
   - Now stores tokens in WorkOS metadata via `storeLinearTokens()`

3. **app/api/linear/authorize/route.ts**
   - Removed session dependencies
   - Uses `withAuth()` directly for user authentication

4. **lib/linear/README.md**
   - Updated documentation to reflect new architecture
   - Added usage examples for metadata functions

## Benefits

- **No cookie size limits** - Tokens stored server-side in WorkOS
- **Centralized user data** - All user metadata in one place
- **Better security** - Tokens never exposed to client
- **Simpler architecture** - No session management needed
- **Scalable** - Works across multiple servers/instances

## API Endpoints

- `GET /api/linear/authorize` - Start OAuth flow
- `GET /api/linear/callback` - OAuth callback handler
- `POST /api/linear/disconnect` - Disconnect Linear
- `GET /api/linear/status` - Check connection status

## Testing

To test the integration:

1. Ensure WorkOS credentials are configured in `.env`
2. Start the dev server: `npm run dev`
3. Navigate to `/api/linear/authorize`
4. Complete Linear OAuth flow
5. Tokens will be stored in WorkOS user metadata
6. Check status at `/api/linear/status`

## Migration Steps (if upgrading)

1. No database migration needed
2. Existing session-based tokens will be ignored
3. Users will need to reconnect Linear (one-time)
4. Old session code can be safely removed

## Dependencies

- `@workos-inc/node` - Already installed (v7.74.2)
- `@workos-inc/authkit-nextjs` - Already installed (v2.11.1)

## Reference

WorkOS Metadata Documentation: https://workos.com/docs/authkit/metadata/exposing-metadata-in-jwts
