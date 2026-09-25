import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MapProductClientDto } from './dto/map-product-client.dto';
import { UpdateProductClientDto } from './dto/update-product-client.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products & Licensing')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('PRODUCTS:MANAGE')
  @ApiOperation({ summary: 'Create a new proprietary software product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.productsService.create(dto, userId);
    return {
      message: 'Product created successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List products with commercial and license metrics' })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    const data = await this.productsService.findAll(includeInactive);
    return {
      message: 'Products retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details by ID with active client licenses and versions' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productsService.findOne(id);
    return {
      message: 'Product retrieved successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('PRODUCTS:MANAGE')
  @ApiOperation({ summary: 'Update product properties and pricing' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.productsService.update(id, dto, userId);
    return {
      message: 'Product updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('PRODUCTS:MANAGE')
  @ApiOperation({ summary: 'Toggle product active status' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.productsService.toggleActive(id, isActive, userId);
    return {
      message: `Product status updated to ${isActive ? 'Active' : 'Inactive'}`,
      data,
    };
  }

  // ----------------------------------------------------
  // Product Client Mapping Endpoints
  // ----------------------------------------------------

  @Post(':id/clients')
  @RequirePermissions('PRODUCTS:MANAGE')
  @ApiOperation({ summary: 'Map a client purchase/license to this product' })
  async mapClient(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: MapProductClientDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.productsService.mapClient(productId, dto, userId);
    return {
      message: 'Client mapped to product successfully',
      data,
    };
  }

  @Get(':id/clients')
  @ApiOperation({ summary: 'List all client licenses and subscriptions for this product' })
  async findMappedClients(@Param('id', ParseUUIDPipe) productId: string) {
    const data = await this.productsService.findMappedClients(productId);
    return {
      message: 'Product client licenses retrieved successfully',
      data,
    };
  }

  @Put('clients/:mappingId')
  @RequirePermissions('PRODUCTS:MANAGE')
  @ApiOperation({ summary: 'Update client license terms, AMC, or dates' })
  async updateClientMapping(
    @Param('mappingId', ParseUUIDPipe) mappingId: string,
    @Body() dto: UpdateProductClientDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.productsService.updateClientMapping(mappingId, dto, userId);
    return {
      message: 'License details updated successfully',
      data,
    };
  }

  @Delete('clients/:mappingId')
  @RequirePermissions('PRODUCTS:MANAGE')
  @ApiOperation({ summary: 'Terminate a client license mapping' })
  async removeClientMapping(@Param('mappingId', ParseUUIDPipe) mappingId: string) {
    const data = await this.productsService.removeClientMapping(mappingId);
    return {
      message: 'Client license terminated',
      data,
    };
  }
}
