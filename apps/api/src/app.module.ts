import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { BankingSimulatorModule } from './modules/banking-simulator/banking-simulator.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { RequestsModule } from './modules/requests/requests.module';
import { AiModule } from './modules/ai/ai.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    CustomersModule,
    AccountsModule,
    DocumentsModule,
    BankingSimulatorModule,
    WorkflowModule,
    RequestsModule,
    AiModule,
    HealthModule,
    NotificationsModule,
  ],
})
export class AppModule {}
