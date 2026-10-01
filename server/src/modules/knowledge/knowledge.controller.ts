import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../rbac/rbac.decorator';
import { DynamicRbacGuard } from '../rbac/rbac.guard';
import { ParseUUIDPipe } from '../../common/validators/record-id';
import { KnowledgeService } from './knowledge.service';
import {
  CreateKnowledgeDocDto,
  UpdateKnowledgeDocDto,
} from './dto/create-knowledge-doc.dto';
import { CreateKnowledgeRevisionDto } from './dto/create-revision.dto';
import { LinkKnowledgeEntityDto } from './dto/link-entity.dto';
import { AddKnowledgeAttachmentDto } from './dto/attachment.dto';
import { QueryKnowledgeDto } from './dto/query-knowledge.dto';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, DynamicRbacGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  // ========================================================
  // Documents Master
  // ========================================================

  @Post('documents')
  @Permissions('KNOWLEDGE:MANAGE')
  async createDocument(@Body() dto: CreateKnowledgeDocDto, @Req() req: any) {
    return await this.knowledgeService.createDocument(dto, req.user.id);
  }

  @Get('documents')
  @Permissions('KNOWLEDGE:READ')
  async getDocuments(@Query() query: QueryKnowledgeDto) {
    return await this.knowledgeService.getDocuments(query);
  }

  @Get('documents/:id')
  @Permissions('KNOWLEDGE:READ')
  async getDocumentById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.knowledgeService.getDocumentById(id);
  }

  @Patch('documents/:id')
  @Permissions('KNOWLEDGE:MANAGE')
  async updateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKnowledgeDocDto,
    @Req() req: any,
  ) {
    return await this.knowledgeService.updateDocument(id, dto, req.user.id);
  }

  @Delete('documents/:id')
  @Permissions('KNOWLEDGE:ARCHIVE')
  async deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return await this.knowledgeService.deleteDocument(id, req.user.id);
  }

  // ========================================================
  // Revisions & Diffs
  // ========================================================

  @Post('documents/:id/revisions')
  @Permissions('KNOWLEDGE:MANAGE')
  async addRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateKnowledgeRevisionDto,
    @Req() req: any,
  ) {
    return await this.knowledgeService.addRevision(id, dto, req.user.id);
  }

  @Get('documents/:id/revisions/:rev')
  @Permissions('KNOWLEDGE:READ')
  async getRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rev', ParseIntPipe) rev: number,
  ) {
    return await this.knowledgeService.getRevision(id, rev);
  }

  @Get('documents/:id/diff')
  @Permissions('KNOWLEDGE:READ')
  async getRevisionDiff(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('base', ParseIntPipe) base: number,
    @Query('target', ParseIntPipe) target: number,
  ) {
    return await this.knowledgeService.getRevisionDiff(id, base, target);
  }

  // ========================================================
  // Work Item Links
  // ========================================================

  @Post('documents/:id/links')
  @Permissions('KNOWLEDGE:MANAGE')
  async addLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkKnowledgeEntityDto,
    @Req() req: any,
  ) {
    return await this.knowledgeService.addLink(id, dto, req.user.id);
  }

  @Delete('documents/:id/links/:linkId')
  @Permissions('KNOWLEDGE:MANAGE')
  async removeLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    return await this.knowledgeService.removeLink(id, linkId);
  }

  // ========================================================
  // Attachments
  // ========================================================

  @Post('documents/:id/attachments')
  @Permissions('KNOWLEDGE:MANAGE')
  async addAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddKnowledgeAttachmentDto,
    @Req() req: any,
  ) {
    return await this.knowledgeService.addAttachment(id, dto, req.user.id);
  }

  @Delete('documents/:id/attachments/:attachmentId')
  @Permissions('KNOWLEDGE:MANAGE')
  async deleteAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return await this.knowledgeService.deleteAttachment(id, attachmentId);
  }
}
