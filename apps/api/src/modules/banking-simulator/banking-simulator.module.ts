import { Module } from '@nestjs/common';
import { BankingSimulatorService } from './banking-simulator.service';
import { BankingSimulatorController } from './banking-simulator.controller';

@Module({
  providers: [BankingSimulatorService],
  controllers: [BankingSimulatorController],
  exports: [BankingSimulatorService],
})
export class BankingSimulatorModule {}
