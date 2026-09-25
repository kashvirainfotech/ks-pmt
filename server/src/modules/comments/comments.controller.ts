import { ParseUUIDPipe } from '../../common/validators/record-id';
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Task Comments & Discussions')
@ApiBearerAuth('JWT-auth')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a comment or reply to a task' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  async create(
    @Body() dto: CreateCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.commentsService.create(dto, userId);
    return {
      message: 'Comment posted successfully',
      data,
    };
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get threaded comments for a task' })
  async findByTask(@Param('taskId', ParseUUIDPipe) taskId: string) {
    const data = await this.commentsService.findByTask(taskId);
    return {
      message: 'Comments retrieved successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('roleCode') roleCode: string,
  ) {
    const data = await this.commentsService.deleteComment(id, userId, roleCode);
    return {
      message: data.message,
      data: { success: data.success },
    };
  }
}
