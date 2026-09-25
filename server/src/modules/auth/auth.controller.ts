import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginPasswordDto } from './dto/login-password.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { LoginOtpDto } from './dto/login-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public, JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate employee using official Email and Password',
    description: 'Validates employee credentials and returns JWT access/refresh tokens alongside role & permissions.',
  })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  async loginWithPassword(
    @Body() dto: LoginPasswordDto,
    @Ip() ipAddress: string,
  ) {
    const result = await this.authService.loginWithPassword(dto, ipAddress);
    return {
      message: 'Login successful',
      data: result,
    };
  }

  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request 6-digit OTP for Mobile Login',
    description: 'Generates a secure 6-digit cryptographic OTP valid for 5 minutes and dispatches via SMS.',
  })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully' })
  @ApiResponse({ status: 400, description: 'Mobile number not found or inactive' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    const result = await this.authService.requestOtp(dto);
    return {
      message: result.message,
      data: { success: result.success },
    };
  }

  @Public()
  @Post('login-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate employee using Mobile Number and OTP',
    description: 'Validates the 6-digit OTP and returns JWT tokens with dynamic permissions.',
  })
  @ApiResponse({ status: 200, description: 'OTP verified and login successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async loginWithOtp(@Body() dto: LoginOtpDto, @Ip() ipAddress: string) {
    const result = await this.authService.loginWithOtp(dto, ipAddress);
    return {
      message: 'Mobile authentication successful',
      data: result,
    };
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh expired JWT access token',
    description: 'Rotates refresh tokens and returns a new access token pair.',
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshToken(dto);
    return {
      message: 'Tokens refreshed successfully',
      data: tokens,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: 'Get current authenticated employee profile and effective permissions',
    description: 'Returns profile details, branch mapping, and dynamically compiled permissions.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(
    @CurrentUser('id') userId: string,
    @Headers('x-branch-id') activeBranchId?: string,
  ) {
    const result = await this.authService.getProfile(userId, activeBranchId);
    return {
      message: 'Profile retrieved successfully',
      data: result,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout current employee session',
    description: 'Invalidates client token session.',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout() {
    return {
      message: 'Logged out successfully',
      data: { success: true },
    };
  }
}
