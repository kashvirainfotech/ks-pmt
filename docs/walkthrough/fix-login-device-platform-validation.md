# Walkthrough - Fix devicePlatform Validation Error on Login

## Issue Summary
When submitting the login form on the Web application (`http://localhost:3000`), the API returned HTTP 400:
```json
{
    "success": false,
    "statusCode": 400,
    "error": "Bad Request",
    "message": [
        "property devicePlatform should not exist"
    ],
    "path": "/api/v1/auth/login-password",
    "timestamp": "2026-09-25T14:09:20.735Z"
}
```

## Root Cause
1. In [`server/src/main.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/main.ts), NestJS's `ValidationPipe` is configured with `forbidNonWhitelisted: true`.
2. Both the Web client (`AuthContext.tsx`) and the Mobile application (`auth_repository.dart`) include `devicePlatform: 'WEB'` or `'ANDROID' | 'IOS'` in the authentication payload.
3. However, [`server/src/modules/auth/dto/login-password.dto.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/dto/login-password.dto.ts) and [`server/src/modules/auth/dto/login-otp.dto.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/dto/login-otp.dto.ts) had not declared `devicePlatform` (and in `login-otp.dto.ts`, `otpCode` alias was missing). Because `forbidNonWhitelisted` was active, class-validator rejected the request.

## Changes Applied

1. **[`server/src/modules/auth/dto/login-password.dto.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/dto/login-password.dto.ts)**:
   - Added `@IsOptional() @IsString() devicePlatform?: string;` with Swagger `@ApiPropertyOptional`.

2. **[`server/src/modules/auth/dto/login-otp.dto.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/dto/login-otp.dto.ts)**:
   - Added `@IsOptional() @IsString() devicePlatform?: string;`.
   - Added support for both `otp` and `otpCode` fields.

3. **[`server/src/modules/auth/auth.service.ts`](file:///c:/Projects/KashviraInfotech/ks-pmt/server/src/modules/auth/auth.service.ts)**:
   - Updated `loginWithPassword` and `loginWithOtp` to return flat `accessToken` and `refreshToken` properties alongside the `tokens` object to match the client context expectations in Web and Mobile.
   - Handled both `dto.otp` and `dto.otpCode` in `loginWithOtp`.

## Verification
- Sent a test request with `{ email, password, devicePlatform: "WEB" }` to `http://localhost:3000/api/v1/auth/login-password`.
- The request passed validation cleanly and reached the authentication service without any DTO whitelist errors.
