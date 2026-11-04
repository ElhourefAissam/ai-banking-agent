import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { BankingSimulatorModule } from '../banking-simulator/banking-simulator.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [BankingSimulatorModule, NotificationsModule],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
