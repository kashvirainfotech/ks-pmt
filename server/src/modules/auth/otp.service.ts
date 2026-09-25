import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpCache = new Map<string, OtpRecord>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate a 6-digit cryptographic OTP and store with expiration
   */
  async generateAndSendOtp(mobileNumber: string): Promise<{ success: boolean; message: string }> {
    const expirySeconds = this.configService.get<number>('OTP_EXPIRY_SECONDS', 300);
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + expirySeconds * 1000;

    this.otpCache.set(mobileNumber, {
      code,
      expiresAt,
      attempts: 0,
    });

    // Dispatch OTP
    const isMock = this.configService.get<string>('OTP_MOCK_DISPATCH', 'true') === 'true';

    if (isMock) {
      this.logger.log(`[MOCK SMS] OTP for ${mobileNumber} is: [ ${code} ] (Expires in ${expirySeconds}s)`);
    } else {
      // In production, invoke third-party SMS gateway (AWS SNS, Twilio, MSG91, etc.)
      this.logger.log(`Dispatching live SMS OTP to ${mobileNumber}...`);
    }

    return {
      success: true,
      message: `OTP sent successfully to registered mobile number. Valid for ${Math.floor(expirySeconds / 60)} minutes.`,
    };
  }

  /**
   * Verify provided OTP against stored record
   */
  async verifyOtp(mobileNumber: string, enteredOtp: string): Promise<boolean> {
    const record = this.otpCache.get(mobileNumber);

    if (!record) {
      throw new BadRequestException('No active OTP found for this mobile number. Please request a new one.');
    }

    if (Date.now() > record.expiresAt) {
      this.otpCache.delete(mobileNumber);
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);
    record.attempts += 1;

    if (record.attempts > maxAttempts) {
      this.otpCache.delete(mobileNumber);
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    if (record.code !== enteredOtp) {
      throw new BadRequestException(
        `Invalid OTP entered. ${maxAttempts - record.attempts} attempt(s) remaining.`,
      );
    }

    // OTP verified successfully; invalidate it
    this.otpCache.delete(mobileNumber);
    return true;
  }
}
