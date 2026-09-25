import { ParseUUIDPipe } from '../../common/validators/record-id';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Clients & Prospects (CRM)')
@ApiBearerAuth('JWT-auth')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new client or sales prospect' })
  @ApiResponse({
    status: 201,
    description: 'Client record created successfully',
  })
  async create(
    @Body() dto: CreateClientDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.clientsService.create(dto, userId);
    return {
      message: 'Client record created successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List clients and prospects with search and filtering',
  })
  async findAll(@Query() query: QueryClientDto) {
    const result = await this.clientsService.findAll(query);
    return {
      message: 'Clients retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get client details by ID including mapped products/licenses and projects',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.clientsService.findOne(id);
    return {
      message: 'Client profile retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client profile' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.clientsService.update(id, dto, userId);
    return {
      message: 'Client updated successfully',
      data,
    };
  }

  @Post(':id/convert-to-active')
  @ApiOperation({
    summary: 'Convert a sales prospect into an active paying client',
  })
  async convertToActive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.clientsService.convertToActive(id, userId);
    return {
      message: 'Prospect successfully converted to Active Client',
      data,
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle client active status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.clientsService.toggleActive(id, isActive, userId);
    return {
      message: `Client status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }
}
