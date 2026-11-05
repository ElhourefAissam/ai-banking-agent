import { Module } from '@nestjs/common';
import { BankingSimulatorService } from './banking-simulator.service';
import { BankingSimulatorController } from './banking-simulator.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [BankingSimulatorService],
  controllers: [BankingSimulatorController],
  exports: [BankingSimulatorService],
})
export class BankingSimulatorModule {}
