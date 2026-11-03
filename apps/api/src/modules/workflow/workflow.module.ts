import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { BankingSimulatorModule } from '../banking-simulator/banking-simulator.module';

@Module({
  imports: [BankingSimulatorModule],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
