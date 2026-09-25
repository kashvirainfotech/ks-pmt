import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskWorkflowsModule } from '../task-workflows/task-workflows.module';
import { AssignmentModule } from '../assignment/assignment.module';

@Module({
  imports: [TaskWorkflowsModule, AssignmentModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
