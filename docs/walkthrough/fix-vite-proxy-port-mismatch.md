# Walkthrough - Fix Vite Proxy ECONNREFUSED on Login

## Issue Summary
When attempting to log in on the Web frontend (`http://localhost:3000`), the following error was logged in the Vite console:
```
[vite] http proxy error: /api/v1/auth/login-password
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1139:18)
    at afterConnectMultiple (node:net:1712:7)
```

## Root Cause
- The Backend server (NestJS) runs on port **`5000`** by default (`PORT=5000`).
- The Vite configuration in [`web/vite.config.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/vite.config.ts) was configured with `proxy.target: 'http://localhost:4000'`.
- Because no service was listening on port `4000`, the connection was refused (`ECONNREFUSED`) whenever the frontend made API requests to `/api/v1/*`.

## Solution Applied
Updated [`web/vite.config.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/web/vite.config.ts#L17-L25) to forward `/api` requests to `http://localhost:5000`:

```ts
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
```

## Verification
- Sent a test POST request directly through the Vite proxy to `http://localhost:3000/api/v1/auth/login-password`.
- The request was successfully received and handled by the NestJS backend, returning standard HTTP validation responses with no connection errors.
