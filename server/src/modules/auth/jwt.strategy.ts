import { SessionService } from './session.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../database/database.service';

export interface JwtPayload {
  sub: string;
  sid?: string;
  jti?: string;
  email: string;
  employeeCode: string;
  primaryBranchId: string;
  roleCode: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
    private readonly sessions: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_ACCESS_SECRET',
        'ks_pmt_jwt_super_secret_access_key_2026_change_in_prod',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    // Verify user is still active in database
    const userQuery = `
      SELECT u.id, u.employee_code, u.first_name, u.last_name, u.email, 
             u.mobile_number, u.primary_branch_id, u.department_id, 
             u.designation_id, u.role_id, r.role_code, u.is_active
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id AND r.is_active = TRUE
      WHERE u.id = $1;
    `;
    const result = await this.db.query(userQuery, [payload.sub]);

    if (result.rowCount === 0 || !result.rows[0].is_active) {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    if (payload.sid) await this.sessions.validate(payload.sid, payload.sub);
    const row = result.rows[0];
    return {
      sessionId: payload.sid,
      id: row.id,
      employeeCode: row.employee_code,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      mobileNumber: row.mobile_number,
      primaryBranchId: row.primary_branch_id,
      departmentId: row.department_id,
      designationId: row.designation_id,
      roleId: row.role_id,
      roleCode: row.role_code,
    };
  }
}
