import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SavedViewsService } from './saved-views.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';
import { QuerySavedViewDto } from './dto/query-saved-view.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/validators/record-id';

@ApiTags('Saved Views & Attention Workspaces (PLAN-003)')
@ApiBearerAuth('JWT-auth')
@Controller('saved-views')
export class SavedViewsController {
  constructor(private readonly savedViewsService: SavedViewsService) {}

  @Post()
  @RequirePermissions('SAVED_VIEWS:MANAGE')
  @ApiOperation({ summary: 'Create a new personal or team saved view' })
  async create(
    @Body() dto: CreateSavedViewDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.savedViewsService.createView(dto, userId) };
  }

  @Get('presets')
  @RequirePermissions('SAVED_VIEWS:READ')
  @ApiOperation({ summary: 'Get built-in view presets (My Work, Blocked, Awaiting QA, etc.)' })
  async getPresets(@CurrentUser('id') userId: string) {
    return { data: this.savedViewsService.getPresets(userId) };
  }

  @Get()
  @RequirePermissions('SAVED_VIEWS:READ')
  @ApiOperation({ summary: 'List saved views available to the current user' })
  async findAll(
    @Query() query: QuerySavedViewDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.savedViewsService.findAllViews(userId, query) };
  }

  @Get(':id')
  @RequirePermissions('SAVED_VIEWS:READ')
  @ApiOperation({ summary: 'Get saved view by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.savedViewsService.findOneView(id, userId) };
  }

  @Put(':id')
  @RequirePermissions('SAVED_VIEWS:MANAGE')
  @ApiOperation({ summary: 'Update an existing saved view' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedViewDto,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.savedViewsService.updateView(id, dto, userId) };
  }

  @Patch(':id/favorite')
  @RequirePermissions('SAVED_VIEWS:MANAGE')
  @ApiOperation({ summary: 'Toggle favorite status on a saved view' })
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.savedViewsService.toggleFavorite(id, userId) };
  }

  @Delete(':id')
  @RequirePermissions('SAVED_VIEWS:MANAGE')
  @ApiOperation({ summary: 'Delete a saved view' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return { data: await this.savedViewsService.deleteView(id, userId) };
  }
}
