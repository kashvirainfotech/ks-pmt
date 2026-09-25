import { Module } from '@nestjs/common';
import { TaskWorkflowsController } from './task-workflows.controller';
import { TaskWorkflowsService } from './task-workflows.service';

@Module({
  controllers: [TaskWorkflowsController],
  providers: [TaskWorkflowsService],
  exports: [TaskWorkflowsService],
})
export class TaskWorkflowsModule {}
