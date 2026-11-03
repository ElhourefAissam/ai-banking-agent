import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { MockLlmProvider } from './providers/mock-llm.provider';
import { OpenAiLlmProvider } from './providers/openai-llm.provider';
import { AccountsModule } from '../accounts/accounts.module';
import { CustomersModule } from '../customers/customers.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { RequestsModule } from '../requests/requests.module';

@Module({
  imports: [
    AccountsModule,
    CustomersModule,
    WorkflowModule,
    RequestsModule,
  ],
  providers: [AiService, MockLlmProvider, OpenAiLlmProvider],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
