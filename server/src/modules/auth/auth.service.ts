import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import { RbacService } from '../rbac/rbac.service';
import { LoginPasswordDto } from './dto/login-password.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { LoginOtpDto } from './dto/login-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OtpService } from './otp.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rbacService: RbacService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Method 1: Email + Password Authentication
   */
  async loginWithPassword(dto: LoginPasswordDto, ipAddress: string) {
    const userQuery = `
      SELECT u.id, u.employee_code, u.first_name, u.last_name, u.email, 
             u.mobile_number, u.password_hash, u.primary_branch_id, 
             u.department_id, u.designation_id, u.role_id, 
             u.is_email_login_allowed, u.is_active,
             r.role_code, r.role_name,
             b.branch_name, b.branch_code,
             d.dept_name,
             des.desig_name
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      INNER JOIN branches b ON u.primary_branch_id = b.id
      INNER JOIN departments d ON u.department_id = d.id
      INNER JOIN designations des ON u.designation_id = des.id
      WHERE LOWER(u.email) = LOWER($1);
    `;
    const result = await this.db.query(userQuery, [dto.email]);

    if (result.rowCount === 0) {
      throw new UnauthorizedException('Invalid email credentials or user not registered');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new UnauthorizedException('Your account is deactivated. Please contact your administrator.');
    }

    if (!user.is_email_login_allowed) {
      throw new UnauthorizedException('Email/Password login is not enabled for this account. Please use Mobile OTP.');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException('Password not set for this account. Please login using Mobile OTP.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email credentials');
    }

    // Update login audit info
    await this.db.query(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
      [ipAddress, user.id],
    );

    // Generate tokens & fetch permissions
    const tokens = await this.generateTokens(user);
    const permissions = await this.rbacService.getEffectivePermissions(user.id, user.primary_branch_id);

    return {
      tokens,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
      permissions: Array.from(permissions.permissions),
    };
  }

  /**
   * Request OTP for Mobile Login
   */
  async requestOtp(dto: RequestOtpDto) {
    const userQuery = `
      SELECT id, mobile_number, is_otp_login_allowed, is_active
      FROM users
      WHERE mobile_number = $1;
    `;
    const result = await this.db.query(userQuery, [dto.mobileNumber]);

    if (result.rowCount === 0) {
      throw new BadRequestException('Mobile number is not registered in KS-PMT.');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new BadRequestException('Account is inactive. Please contact your administrator.');
    }

    if (!user.is_otp_login_allowed) {
      throw new BadRequestException('Mobile OTP login is disabled for this account.');
    }

    return await this.otpService.generateAndSendOtp(user.mobile_number);
  }

  /**
   * Method 2: Mobile Number + OTP Authentication
   */
  async loginWithOtp(dto: LoginOtpDto, ipAddress: string) {
    const otpValue = dto.otp || dto.otpCode;
    if (!otpValue) {
      throw new BadRequestException('OTP code is required');
    }

    // 1. Verify OTP first
    await this.otpService.verifyOtp(dto.mobileNumber, otpValue);

    // 2. Fetch user profile
    const userQuery = `
      SELECT u.id, u.employee_code, u.first_name, u.last_name, u.email, 
             u.mobile_number, u.primary_branch_id, u.department_id, 
             u.designation_id, u.role_id, u.is_otp_login_allowed, u.is_active,
             r.role_code, r.role_name,
             b.branch_name, b.branch_code,
             d.dept_name,
             des.desig_name
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      INNER JOIN branches b ON u.primary_branch_id = b.id
      INNER JOIN departments d ON u.department_id = d.id
      INNER JOIN designations des ON u.designation_id = des.id
      WHERE u.mobile_number = $1;
    `;
    const result = await this.db.query(userQuery, [dto.mobileNumber]);

    if (result.rowCount === 0) {
      throw new UnauthorizedException('User account not found');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new UnauthorizedException('Your account is deactivated.');
    }

    // Update login audit info
    await this.db.query(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
      [ipAddress, user.id],
    );

    // Generate tokens & fetch permissions
    const tokens = await this.generateTokens(user);
    const permissions = await this.rbacService.getEffectivePermissions(user.id, user.primary_branch_id);

    return {
      tokens,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
      permissions: Array.from(permissions.permissions),
    };
  }

  /**
   * Refresh Token rotation
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const refreshSecret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'ks_pmt_jwt_super_secret_refresh_key_2026_change_in_prod',
      );
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });

      const userQuery = `
        SELECT u.id, u.employee_code, u.first_name, u.last_name, u.email, 
               u.mobile_number, u.primary_branch_id, u.department_id, 
               u.designation_id, u.role_id, u.is_active, r.role_code
        FROM users u
        INNER JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1;
      `;
      const result = await this.db.query(userQuery, [payload.sub]);

      if (result.rowCount === 0 || !result.rows[0].is_active) {
        throw new UnauthorizedException('Session expired or account deactivated');
      }

      const user = result.rows[0];
      return await this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Get current authenticated user profile and permissions
   */
  async getProfile(userId: string, activeBranchId?: string) {
    const userQuery = `
      SELECT u.id, u.employee_code, u.first_name, u.last_name, u.email, 
             u.mobile_number, u.avatar_s3_key, u.primary_branch_id, 
             u.department_id, u.designation_id, u.role_id,
             r.role_code, r.role_name,
             b.branch_name, b.branch_code,
             d.dept_name,
             des.desig_name, des.hierarchy_level
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      INNER JOIN branches b ON u.primary_branch_id = b.id
      INNER JOIN departments d ON u.department_id = d.id
      INNER JOIN designations des ON u.designation_id = des.id
      WHERE u.id = $1 AND u.is_active = TRUE;
    `;
    const result = await this.db.query(userQuery, [userId]);

    if (result.rowCount === 0) {
      throw new UnauthorizedException('User not found');
    }

    const user = result.rows[0];
    const permissions = await this.rbacService.getEffectivePermissions(
      user.id,
      activeBranchId || user.primary_branch_id,
    );

    return {
      user: this.sanitizeUser(user),
      permissions: Array.from(permissions.permissions),
    };
  }

  /**
   * Helper: Generate Access and Refresh Tokens
   */
  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      employeeCode: user.employee_code,
      primaryBranchId: user.primary_branch_id,
      roleCode: user.role_code,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'ks_pmt_jwt_super_secret_access_key_2026_change_in_prod',
    );
    const accessExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m');

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'ks_pmt_jwt_super_secret_refresh_key_2026_change_in_prod',
    );
    const refreshExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiration,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiration,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiration,
    };
  }

  /**
   * Helper: Remove sensitive fields from user response
   */
  private sanitizeUser(user: any) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}
