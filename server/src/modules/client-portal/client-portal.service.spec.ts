import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientPortalService, ClientContactUser } from './client-portal.service';

describe('ClientPortalService (CLIENT-001 & CLIENT-002)', () => {
  let service: ClientPortalService;
  let db: { query: jest.Mock };
  let jwt: { sign: jest.Mock };
  let config: { get: jest.Mock };

  const mockClientUser: ClientContactUser = {
    id: 'contact-uuid-1',
    contactId: 'contact-uuid-1',
    clientId: 'client-uuid-1',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@acme.com',
    portalRole: 'CLIENT_USER',
    isApprover: false,
    companyName: 'Acme Corp',
    clientCode: 'CLI-ACME',
    isClientContact: true,
  };

  beforeEach(() => {
    db = { query: jest.fn() };
    jwt = { sign: jest.fn().mockReturnValue('mock-jwt-token') };
    config = { get: jest.fn().mockReturnValue('mock-secret') };

    service = new ClientPortalService(
      db as unknown as DatabaseService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  describe('CLIENT-001: Contact Invitation & Activation', () => {
    it('should throw NotFoundException if client does not exist', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.inviteContact(
          {
            clientId: 'non-existent-client',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          { userId: 'admin-1' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if contact email is already registered', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'c1', is_active: true }] }) // client check
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing' }] }); // email check

      await expect(
        service.inviteContact(
          {
            clientId: 'c1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          { userId: 'admin-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate an invitation token and store contact with project grants', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'c1', is_active: true }] })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'contact-1',
              email: 'john@example.com',
              status: 'INVITED',
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // project grant insert

      const res = await service.inviteContact(
        {
          clientId: 'c1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          projectGrants: [{ projectId: 'proj-1', canCreateRequests: true }],
        },
        { userId: 'admin-1' },
      );

      expect(res.contact.id).toBe('contact-1');
      expect(res.invitationToken).toBeDefined();
      expect(res.invitationLink).toContain('/client-portal/activate?token=');
    });

    it('should accept invite, hash password, and activate contact', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'contact-1', status: 'INVITED', is_active: true }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'contact-1', status: 'ACTIVE' }],
        });

      const res = await service.acceptInvite({
        invitationToken: 'valid-token',
        password: 'Password123!',
      });

      expect(res.contact.status).toBe('ACTIVE');
    });

    it('should reject login for inactive contact or wrong password', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        service.login(
          { email: 'wrong@example.com', password: 'pass' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should login active contact and return signed JWT with isClientContact: true', async () => {
      const hash = await bcrypt.hash('CorrectPassword!', 10);
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'contact-1',
              client_id: 'client-1',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
              password_hash: hash,
              portal_role: 'CLIENT_ADMIN',
              is_approver: true,
              status: 'ACTIVE',
              is_active: true,
              client_is_active: true,
              company_name: 'Acme Corp',
              client_code: 'ACME',
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // update last login

      const res = await service.login(
        { email: 'john@example.com', password: 'CorrectPassword!' },
        '127.0.0.1',
      );

      expect(res.accessToken).toBe('mock-jwt-token');
      expect(res.contact.portalRole).toBe('CLIENT_ADMIN');
      expect(res.contact.isApprover).toBe(true);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          isClientContact: true,
          clientId: 'client-1',
        }),
        expect.any(Object),
      );
    });
  });

  describe('CLIENT-002: Customer Intake & Progress Triage', () => {
    it('should prevent client contact from submitting request to unauthorized project', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // project grant check fails

      await expect(
        service.createRequest(
          {
            requestType: 'BUG',
            title: 'Crash on load',
            description: 'Details',
            projectId: 'unauthorized-proj',
          },
          mockClientUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should submit intake request with customer priority and single user impact', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'grant-1', can_create_requests: true }],
        }) // grant check
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ cnt: 3 }] }) // sequence count
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'req-1',
              request_number: 'REQ-2026-0004',
              request_type: 'BUG',
              title: 'Crash on load',
              status: 'SUBMITTED',
              client_priority: 'HIGH',
              business_impact: 'OPERATIONS',
              impact_breadth: 'SINGLE_USER',
            },
          ],
        }); // insert request

      const res = await service.createRequest(
        {
          requestType: 'BUG',
          title: 'Crash on load',
          description: 'Details',
          projectId: 'proj-1',
          clientPriority: 'HIGH',
        },
        mockClientUser,
      );

      expect(res.request.requestNumber).toBe('REQ-2026-0004');
      expect(res.request.customerStatus).toBe('Received');
    });

    it('should filter client requests strictly by contact client_id and map status', async () => {
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ total: 1 }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'req-1',
              request_number: 'REQ-2026-0001',
              request_type: 'BUG',
              title: 'Bug 1',
              status: 'ACCEPTED',
              linked_task_status_name: 'In Progress',
              linked_task_status_category: 'IN_PROGRESS',
            },
          ],
        });

      const res = await service.getClientRequests(mockClientUser, {});
      expect(res.data[0].customerStatus).toBe('In progress');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE r.client_id = $1'),
        expect.arrayContaining(['client-uuid-1']),
      );
    });

    it('should require decline reason when triaging to DECLINED', async () => {
      db.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'req-1', is_active: true }],
      }); // get request
      db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // messages

      await expect(
        service.triageRequest(
          'req-1',
          { status: 'DECLINED' },
          'staff-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should triage request and update internal priority and severity', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'req-1', is_active: true }],
        })
        .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // messages
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'req-1',
              status: 'UNDER_REVIEW',
              internal_priority: 'HIGH',
              technical_severity: 'MAJOR',
            },
          ],
        });

      const res = await service.triageRequest(
        'req-1',
        {
          status: 'UNDER_REVIEW',
          internalPriority: 'HIGH',
          technicalSeverity: 'MAJOR',
        },
        'staff-1',
      );

      expect(res.status).toBe('UNDER_REVIEW');
      expect(res.internal_priority).toBe('HIGH');
      expect(res.technical_severity).toBe('MAJOR');
    });

    it('should transition request from NEEDS_INFORMATION to UNDER_REVIEW when client replies', async () => {
      db.query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'req-1', status: 'NEEDS_INFORMATION' }],
        })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'msg-1', message: 'Here is the info' }],
        })
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // update request status

      const res = await service.addClientMessage(
        'req-1',
        { message: 'Here is the info' },
        mockClientUser,
      );

      expect(res.message).toBe('Message added successfully');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE client_intake_requests SET status = 'UNDER_REVIEW'"),
        ['req-1'],
      );
    });
  });
});
