import { PartialType } from '@nestjs/mapped-types';
import { CreateProductIdeaDto } from './create-product-idea.dto';

export class UpdateProductIdeaDto extends PartialType(CreateProductIdeaDto) {}
