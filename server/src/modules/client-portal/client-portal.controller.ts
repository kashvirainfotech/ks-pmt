import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClientPortalService } from './client-portal.service';
import { ChangeRequestsService } from '../change-requests/change-requests.service';
import { ClientDecisionDto } from '../change-requests/dto/client-decision.dto';
import { UatPackagesService } from '../uat-packages/uat-packages.service';
import { ClientUatDecisionDto } from '../uat-packages/dto/client-uat-decision.dto';
import { RecordChecklistProgressDto } from '../uat-packages/dto/record-checklist-progress.dto';
import { Public } from '../../common/guards/jwt-auth.guard';
import { ClientContactGuard } from '../../common/guards/client-contact.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ParseUUIDPipe } from '../../common/validators/record-id';
import { InviteContactDto } from './dto/invite-contact.dto';
import { AcceptInviteDto, ClientLoginDto, UpdateContactDto } from './dto/accept-invite.dto';
import { UpdateProjectGrantsDto } from './dto/project-grants.dto';
import { CreateIntakeRequestDto } from './dto/create-intake-request.dto';
import { TriageRequestDto } from './dto/triage-request.dto';
import { CreateRequestMessageDto, QueryRequestsDto } from './dto/request-message.dto';

@ApiTags('Client Portal & Customer Intake (CLIENT-001, CLIENT-002, CLIENT-003, CLIENT-004, CLIENT-005)')
@Controller()
export class ClientPortalController {
  constructor(
    private readonly clientPortalService: ClientPortalService,
    private readonly changeRequestsService: ChangeRequestsService,
    private readonly uatPackagesService: UatPackagesService,
  ) {}

  // ========================================================
  // 1. Client Portal Public Authentication (CLIENT-001)
  // ========================================================

  @Public()
  @Post('client-portal/auth/accept-invite')
  @ApiOperation({ summary: 'Activate client contact portal account using invitation token' })
  @ApiResponse({ status: 200, description: 'Account activated successfully' })
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.clientPortalService.acceptInvite(dto);
  }

  @Public()
  @Post('client-portal/auth/login')
  @ApiOperation({ summary: 'Authenticate client contact with email and password' })
  @ApiResponse({ status: 200, description: 'Client portal tokens issued' })
  async login(@Body() dto: ClientLoginDto, @Ip() ipAddress: string) {
    return this.clientPortalService.login(dto, ipAddress || '127.0.0.1');
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/auth/me')
  @ApiOperation({ summary: 'Get current authenticated client contact profile' })
  async getMe(@Req() req: any) {
    return {
      message: 'Client profile retrieved successfully',
      contact: req.user,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/context')
  @ApiOperation({ summary: 'Get customer-safe portal context (client info, permitted projects, licensed products)' })
  async getPortalContext(@Req() req: any) {
    const data = await this.clientPortalService.getPortalContext(req.user);
    return {
      message: 'Portal context retrieved successfully',
      data,
    };
  }

  // ========================================================
  // 2. Client Portal Requests & Clarifications (CLIENT-002)
  // ========================================================

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Post('client-portal/requests')
  @ApiOperation({ summary: 'Submit a private bug, support, or change request' })
  @ApiResponse({ status: 201, description: 'Request submitted successfully' })
  async createRequest(
    @Body() dto: CreateIntakeRequestDto,
    @Req() req: any,
  ) {
    return this.clientPortalService.createRequest(dto, req.user);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/requests')
  @ApiOperation({ summary: 'List customer-safe requests for current client organization' })
  async getClientRequests(
    @Req() req: any,
    @Query() query: QueryRequestsDto,
  ) {
    const result = await this.clientPortalService.getClientRequests(req.user, query);
    return {
      message: 'Requests retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/requests/:id')
  @ApiOperation({ summary: 'Get request detail with customer-facing progress and public messages' })
  async getClientRequestById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const data = await this.clientPortalService.getClientRequestById(id, req.user);
    return {
      message: 'Request detail retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Post('client-portal/requests/:id/messages')
  @ApiOperation({ summary: 'Send clarification message / reply from client contact' })
  async addClientMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRequestMessageDto,
    @Req() req: any,
  ) {
    return this.clientPortalService.addClientMessage(id, dto, req.user);
  }

  // ========================================================
  // 3. Internal Contact Management (CLIENT-001)
  // ========================================================

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_PORTAL:READ')
  @Get('client-portal/contacts')
  @ApiOperation({ summary: 'List all client contacts with project grants (Internal)' })
  async getContacts(
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.clientPortalService.getContacts({ clientId, status, search });
    return {
      message: 'Client contacts retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_PORTAL:READ')
  @Get('client-portal/contacts/:id')
  @ApiOperation({ summary: 'Get client contact profile and project grants by ID (Internal)' })
  async getContactById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.clientPortalService.getContactById(id);
    return {
      message: 'Contact profile retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_PORTAL:MANAGE')
  @Post('client-portal/contacts/invite')
  @ApiOperation({ summary: 'Invite a new client contact with project access grants (Internal)' })
  async inviteContact(
    @Body() dto: InviteContactDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.clientPortalService.inviteContact(dto, { userId });
    return {
      message: 'Client contact invited successfully',
      data: result,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_PORTAL:MANAGE')
  @Put('client-portal/contacts/:id')
  @ApiOperation({ summary: 'Update client contact details and role (Internal)' })
  async updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.clientPortalService.updateContact(id, dto, userId);
    return {
      message: 'Client contact updated successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_PORTAL:MANAGE')
  @Post('client-portal/contacts/:id/revoke')
  @ApiOperation({ summary: 'Revoke client contact access immediately (Internal)' })
  async revokeContact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientPortalService.revokeContact(id, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_PORTAL:MANAGE')
  @Post('client-portal/contacts/:id/resend-invite')
  @ApiOperation({ summary: 'Resend invitation email and token to client contact (Internal)' })
  async resendInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientPortalService.resendInvite(id, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_PORTAL:MANAGE')
  @Post('client-portal/contacts/:id/projects')
  @ApiOperation({ summary: 'Update project access grants for client contact (Internal)' })
  async updateProjectGrants(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectGrantsDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.clientPortalService.updateProjectGrants(id, dto, userId);
    return {
      message: 'Project grants updated successfully',
      data,
    };
  }

  // ========================================================
  // 4. Internal Intake Triage & Task Linking (CLIENT-002)
  // ========================================================

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_INTAKE:READ')
  @Get('client-intake/requests')
  @ApiOperation({ summary: 'List client intake requests for internal triage (Internal)' })
  async getInternalRequests(@Query() query: QueryRequestsDto) {
    const result = await this.clientPortalService.getInternalRequests(query);
    return {
      message: 'Intake requests retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_INTAKE:READ')
  @Get('client-intake/requests/:id')
  @ApiOperation({ summary: 'Get internal intake request details including private messages (Internal)' })
  async getInternalRequestById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.clientPortalService.getInternalRequestById(id);
    return {
      message: 'Intake request retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_INTAKE:TRIAGE')
  @Patch('client-intake/requests/:id/triage')
  @ApiOperation({ summary: 'Triage request: update status, severity, internal priority (Internal)' })
  async triageRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TriageRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.clientPortalService.triageRequest(id, dto, userId);
    return {
      message: 'Request triaged successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_INTAKE:TRIAGE')
  @Post('client-intake/requests/:id/link-task')
  @ApiOperation({ summary: 'Link request to existing internal development task (Internal)' })
  async linkTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientPortalService.linkTask(id, taskId, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_INTAKE:TRIAGE')
  @Post('client-intake/requests/:id/convert-to-task')
  @ApiOperation({ summary: 'Create new internal delivery task from intake request and link atomically (Internal)' })
  async createTaskFromRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      projectId: string;
      taskTypeId?: string;
      title?: string;
      priority?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.clientPortalService.createTaskFromRequest(id, body, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_INTAKE:TRIAGE')
  @Post('client-intake/requests/:id/messages')
  @ApiOperation({ summary: 'Add message to request (can be client-visible or internal-only) (Internal)' })
  async addInternalMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRequestMessageDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.clientPortalService.addInternalMessage(id, dto, userId);
    return {
      message: 'Message added successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('CLIENT_INTAKE:READ')
  @Get('client-intake/analytics/impact-summary')
  @ApiOperation({ summary: 'Get aggregated impact metrics and breakdown (Internal)' })
  async getImpactSummary() {
    const data = await this.clientPortalService.getImpactSummary();
    return {
      message: 'Customer impact summary retrieved successfully',
      data,
    };
  }

  // ========================================================
  // 6. Client Portal Requirements & Acceptance (CLIENT-003)
  // ========================================================

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/requirements')
  @ApiOperation({ summary: 'List baselined and client-visible requirements for permitted projects' })
  async getClientRequirements(
    @Req() req: any,
    @Query('projectId') projectId?: string,
  ) {
    const data = await this.clientPortalService.getClientPortalRequirements(req.user.contactId, projectId);
    return {
      message: 'Client requirements retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/requirements/:id')
  @ApiOperation({ summary: 'Get requirement detail and criteria with sign-off statuses' })
  async getClientRequirementDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const data = await this.clientPortalService.getClientPortalRequirementDetail(id, req.user.contactId);
    return {
      message: 'Requirement details retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Post('client-portal/requirements/criteria/:criterionId/sign-off')
  @ApiOperation({ summary: 'Submit client sign-off decision on acceptance criterion' })
  async recordClientSignoff(
    @Param('criterionId', ParseUUIDPipe) criterionId: string,
    @Body() dto: { signoffStatus: 'ACCEPTED' | 'REJECTED' | 'WAIVED'; notes?: string },
    @Req() req: any,
  ) {
    const data = await this.clientPortalService.recordClientSignoff(criterionId, dto, req.user);
    return {
      message: 'Client sign-off recorded successfully',
      data,
    };
  }

  // ========================================================
  // 7. Client Portal Change Requests & Scope Approvals (CLIENT-004)
  // ========================================================

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/change-requests')
  @ApiOperation({ summary: 'List published change requests for permitted projects' })
  async getClientChangeRequests(
    @Req() req: any,
    @Query('projectId') projectId?: string,
  ) {
    const data = await this.changeRequestsService.getClientPortalChangeRequests(req.user, projectId);
    return {
      message: 'Change requests retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/change-requests/:id')
  @ApiOperation({ summary: 'Get change request quotation details and customer-safe revisions' })
  async getClientChangeRequestDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const data = await this.changeRequestsService.getClientPortalChangeRequestDetail(id, req.user);
    return {
      message: 'Change request details retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Post('client-portal/change-requests/:id/revisions/:rev/decision')
  @ApiOperation({ summary: 'Client approver records approval, changes requested, or rejection for revision' })
  async submitClientDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rev', ParseIntPipe) rev: number,
    @Body() dto: ClientDecisionDto,
    @Req() req: any,
  ) {
    const data = await this.changeRequestsService.recordClientDecision(id, rev, dto, req.user);
    return {
      message: 'Client decision recorded successfully',
      data,
    };
  }

  // ========================================================
  // 8. Client Portal UAT Packages & Milestone Sign-Off (CLIENT-005)
  // ========================================================

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/uat-packages')
  @ApiOperation({ summary: 'List customer-safe UAT packages for permitted projects' })
  async getClientUatPackages(
    @Req() req: any,
    @Query('projectId') projectId?: string,
  ) {
    const data = await this.uatPackagesService.getClientPortalUatPackages(req.user, projectId);
    return {
      message: 'UAT packages retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Get('client-portal/uat-packages/:id')
  @ApiOperation({ summary: 'Get UAT package details with customer-safe checklist and revisions' })
  async getClientUatPackageDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const data = await this.uatPackagesService.getClientPortalUatPackageDetail(id, req.user);
    return {
      message: 'UAT package details retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Patch('client-portal/uat-packages/checklist-items/:itemId/test')
  @ApiOperation({ summary: 'Client tester updates checklist item test status and feedback' })
  async testChecklistItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RecordChecklistProgressDto,
    @Req() req: any,
  ) {
    const data = await this.uatPackagesService.updateChecklistItem(
      itemId,
      dto,
      undefined,
      req.user.contactId,
    );
    return {
      message: 'Checklist item test status recorded successfully',
      data,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(ClientContactGuard)
  @Post('client-portal/uat-packages/:id/revisions/:rev/decision')
  @ApiOperation({ summary: 'Client approver records milestone acceptance, changes requested, or rejection on UAT package' })
  async submitClientUatDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rev', ParseIntPipe) rev: number,
    @Body() dto: ClientUatDecisionDto,
    @Req() req: any,
  ) {
    const data = await this.uatPackagesService.recordClientDecision(id, rev, dto, req.user);
    return {
      message: 'Client UAT sign-off decision recorded successfully',
      data,
    };
  }
}

