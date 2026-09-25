import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateCommentDto, userId: string) {
    const taskQuery = `SELECT id FROM tasks WHERE id = $1;`;
    const taskResult = await this.db.query(taskQuery, [dto.taskId]);
    if (taskResult.rowCount === 0) {
      throw new NotFoundException(`Task with ID ${dto.taskId} not found.`);
    }

    if (dto.parentCommentId) {
      const parentQuery = `SELECT id FROM task_comments WHERE id = $1 AND task_id = $2;`;
      const parentResult = await this.db.query(parentQuery, [dto.parentCommentId, dto.taskId]);
      if (parentResult.rowCount === 0) {
        throw new NotFoundException('Parent comment not found for this task.');
      }
    }

    const insertQuery = `
      INSERT INTO task_comments (
        task_id, parent_comment_id, user_id, comment_text,
        is_internal_only, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $3, $3
      )
      RETURNING *;
    `;

    const result = await this.db.query(insertQuery, [
      dto.taskId,
      dto.parentCommentId || null,
      userId,
      dto.commentText,
      dto.isInternalOnly ?? false,
    ]);

    return result.rows[0];
  }

  async findByTask(taskId: string) {
    const query = `
      SELECT 
        c.id,
        c.task_id,
        c.parent_comment_id,
        c.comment_text,
        c.is_internal_only,
        c.created_at,
        u.id AS user_id,
        u.employee_code,
        CONCAT(u.first_name, ' ', u.last_name) AS author_name,
        u.avatar_s3_key AS author_avatar,
        des.desig_name AS author_designation
      FROM task_comments c
      INNER JOIN users u ON c.user_id = u.id
      INNER JOIN designations des ON u.designation_id = des.id
      WHERE c.task_id = $1
      ORDER BY c.created_at ASC;
    `;

    const result = await this.db.query(query, [taskId]);
    const comments = result.rows;

    // Nest replies under parent comments
    const commentMap = new Map<string, any>();
    const rootComments: any[] = [];

    for (const comment of comments) {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    }

    for (const comment of comments) {
      if (comment.parent_comment_id && commentMap.has(comment.parent_comment_id)) {
        commentMap.get(comment.parent_comment_id).replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    }

    return rootComments;
  }

  async deleteComment(id: string, userId: string, roleCode: string) {
    const checkQuery = `SELECT id, user_id FROM task_comments WHERE id = $1;`;
    const checkResult = await this.db.query(checkQuery, [id]);
    if (checkResult.rowCount === 0) {
      throw new NotFoundException(`Comment with ID ${id} not found.`);
    }

    const comment = checkResult.rows[0];
    if (comment.user_id !== userId && roleCode !== 'ROLE_SUPER_ADMIN') {
      throw new ForbiddenException('You can only delete your own comments.');
    }

    await this.db.query(`DELETE FROM task_comments WHERE id = $1;`, [id]);
    return { success: true, message: 'Comment deleted successfully' };
  }
}
