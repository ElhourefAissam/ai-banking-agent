import { ToolDefinition, ToolCallPayload } from '@proorga/shared-types';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCallPayload[];
}

export interface LlmCompletionResponse {
  content: string;
  toolCalls?: ToolCallPayload[];
  finishReason?: string;
}

export interface ILlmProvider {
  name: string;
  generateResponse(
    messages: LlmMessage[],
    availableTools: ToolDefinition[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LlmCompletionResponse>;
}
