import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { UsersModule } from './modules/users/users.module';
import { TaskTypesModule } from './modules/task-types/task-types.module';
import { TaskWorkflowsModule } from './modules/task-workflows/task-workflows.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VersionsModule } from './modules/versions/versions.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TimeLogsModule } from './modules/time-logs/time-logs.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { CalendarsModule } from './modules/calendars/calendars.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { DependenciesModule } from './modules/dependencies/dependencies.module';
import { BlockersModule } from './modules/blockers/blockers.module';
import { SavedViewsModule } from './modules/saved-views/saved-views.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { TeamsModule } from './modules/teams/teams.module';
import { HandoffsModule } from './modules/handoffs/handoffs.module';
import { ClientPortalModule } from './modules/client-portal/client-portal.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { ChangeRequestsModule } from './modules/change-requests/change-requests.module';
import { UatPackagesModule } from './modules/uat-packages/uat-packages.module';
import { ClientReportsModule } from './modules/client-reports/client-reports.module';
import { RaidModule } from './modules/raid/raid.module';
import { ProductIdeasModule } from './modules/product-ideas/product-ideas.module';
import { QaModule } from './modules/qa/qa.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { DynamicRbacGuard } from './modules/rbac/rbac.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    RbacModule,
    AuthModule,
    BranchesModule,
    DepartmentsModule,
    DesignationsModule,
    UsersModule,
    TaskTypesModule,
    TaskWorkflowsModule,
    ClientsModule,
    ProductsModule,
    ProjectsModule,
    VersionsModule,
    AssignmentModule,
    TasksModule,
    TimeLogsModule,
    CommentsModule,
    AttachmentsModule,
    NotificationsModule,
    AuditLogsModule,
    CalendarsModule,
    SprintsModule,
    MilestonesModule,
    DependenciesModule,
    BlockersModule,
    SavedViewsModule,
    TimesheetsModule,
    TeamsModule,
    HandoffsModule,
    ClientPortalModule,
    RequirementsModule,
    ChangeRequestsModule,
    UatPackagesModule,
    ClientReportsModule,
    RaidModule,
    ProductIdeasModule,
    QaModule,
    KnowledgeModule,
    TemplatesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: DynamicRbacGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
