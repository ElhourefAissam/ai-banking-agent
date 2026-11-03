import { Injectable, Logger } from '@nestjs/common';
import {
  ILlmProvider,
  LlmMessage,
  LlmCompletionResponse,
} from '../interfaces/llm-provider.interface';
import { ToolDefinition, ToolCallPayload } from '@proorga/shared-types';

@Injectable()
export class OpenAiLlmProvider implements ILlmProvider {
  name = 'openai';
  private readonly logger = new Logger(OpenAiLlmProvider.name);
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
  }

  async generateResponse(
    messages: LlmMessage[],
    availableTools: ToolDefinition[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<LlmCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured on the server');
    }

    const formattedTools = availableTools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const formattedMessages = messages.map((m) => {
      const msgObj: any = {
        role: m.role,
        content: m.content || '',
      };
      if (m.name) msgObj.name = m.name;
      if (m.toolCallId) msgObj.tool_call_id = m.toolCallId;
      if (m.toolCalls && m.toolCalls.length > 0) {
        msgObj.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
      }
      return msgObj;
    });

    const body: any = {
      model: this.model,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 1000,
    };

    if (formattedTools.length > 0) {
      body.tools = formattedTools;
      body.tool_choice = 'auto';
    }

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`OpenAI API error (${res.status}): ${errorText}`);
        throw new Error(`OpenAI API returned status ${res.status}`);
      }

      const data = await res.json();
      const choice = data.choices[0];
      const assistantMessage = choice.message;

      const toolCalls: ToolCallPayload[] = [];
      if (assistantMessage.tool_calls) {
        for (const tc of assistantMessage.tool_calls) {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}'),
          });
        }
      }

      return {
        content: assistantMessage.content || '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: choice.finish_reason,
      };
    } catch (err) {
      this.logger.error(`LLM completion failed: ${err.message}`, err.stack);
      throw err;
    }
  }
}
