import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { CertificateService } from './certificate.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WorkflowModule, NotificationsModule],
  providers: [RequestsService, CertificateService],
  controllers: [RequestsController],
  exports: [RequestsService, CertificateService],
})
export class RequestsModule {}
