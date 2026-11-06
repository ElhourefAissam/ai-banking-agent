import { Injectable, Logger } from '@nestjs/common';
import {
  ILlmProvider,
  LlmMessage,
  LlmCompletionResponse,
} from '../interfaces/llm-provider.interface';
import { ToolDefinition, ToolCallPayload, BANKING_RULES } from '@proorga/shared-types';
import * as translationsJson from '../i18n/mock-llm.translations.json';

type SupportedLang = 'fr' | 'en' | 'ar';

function detectLanguage(prompt: string): SupportedLang {
  if (/[\u0600-\u06FF]/.test(prompt)) return 'ar';
  if (/\b(want|increase|limit|ceiling|need|days?|balance|how|much|check|my)\b/i.test(prompt)) {
    return 'en';
  }
  return 'fr';
}

function translate(lang: SupportedLang, key: string, params: Record<string, any> = {}): string {
  const dict = (translationsJson as any)[lang] || (translationsJson as any)['fr'];
  let template = dict[key] || (translationsJson as any)['fr'][key] || '';
  for (const [k, v] of Object.entries(params)) {
    template = template.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
  }
  return template;
}

@Injectable()
export class MockLlmProvider implements ILlmProvider {
  name = 'mock';
  private readonly logger = new Logger(MockLlmProvider.name);

  async generateResponse(
    messages: LlmMessage[],
    availableTools: ToolDefinition[],
  ): Promise<LlmCompletionResponse> {
    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage.content || '';
    const lowerPrompt = userPrompt.toLowerCase();
    const lang = detectLanguage(userPrompt);

    this.logger.log(`Mock LLM processing prompt [${lang}]: "${userPrompt.substring(0, 80)}..."`);

    // 1. Detect if the previous step was a tool execution output
    if (lastMessage.role === 'tool') {
      try {
        const toolOutput = JSON.parse(lastMessage.content);
        if (lastMessage.name === 'get_account_limit') {
          return {
            content: translate(lang, 'account_limit_info', {
              initialTransferLimit: toolOutput.initialTransferLimit,
              currentTransferLimit: toolOutput.currentTransferLimit,
              balance: toolOutput.balance,
              currency: toolOutput.currency,
            }),
          };
        }

        if (lastMessage.name === 'get_customer_file_status') {
          if (toolOutput.fileStatus === 'COMPLETE') {
            return {
              content: translate(lang, 'customer_file_complete'),
            };
          } else {
            return {
              content: translate(lang, 'customer_file_incomplete', {
                reason: toolOutput.incompleteReason || 'Pièces justificatives requises manquantes',
              }),
            };
          }
        }

        if (lastMessage.name === 'check_eligibility') {
          if (toolOutput.isEligible) {
            return {
              content: translate(lang, 'eligibility_eligible', {
                currentLimit: toolOutput.currentLimit,
              }),
            };
          } else {
            return {
              content: translate(lang, 'eligibility_ineligible', {
                reasons: toolOutput.reasons.join('\n- '),
              }),
            };
          }
        }

        if (lastMessage.name === 'create_limit_request_draft') {
          if (toolOutput.error) {
            return {
              content: translate(lang, 'draft_error', { error: toolOutput.error }),
            };
          }

          const docNote =
            toolOutput.requestedLimit > 50000 ? translate(lang, 'draft_doc_note') : '';
          const thresholdNote =
            toolOutput.requestedLimit > 30000
              ? translate(lang, 'draft_threshold_supervisor')
              : translate(lang, 'draft_threshold_advisor');

          return {
            content: translate(lang, 'draft_prepared', {
              reference: toolOutput.reference,
              requestedLimit: toolOutput.requestedLimit,
              durationDays: toolOutput.durationDays,
              reason: toolOutput.reason,
              docNote,
              thresholdNote,
            }),
          };
        }
      } catch (err) {
        this.logger.error('Error parsing tool output in mock provider', err);
      }
    }

    // 2. Anti-Prompt Injection & Authority Boundary Enforcement
    if (
      lowerPrompt.includes('ignore') ||
      lowerPrompt.includes('override') ||
      lowerPrompt.includes('bypass') ||
      lowerPrompt.includes('approuve directement') ||
      lowerPrompt.includes('approve directly') ||
      lowerPrompt.includes('force') ||
      lowerPrompt.includes('contourne')
    ) {
      return {
        content: translate(lang, 'anti_injection'),
      };
    }

    // 3. Draft Preparation Intent Detection (Amount, Duration, Reason)
    // Supports French, English, Arabic (e.g. 25000 DH, 25 000, 3 jours, days, etc.)
    const amountMatch = userPrompt.match(/(\d[\d\s]{2,7})\s*(dh|dirham|mad|درهم)?/i);
    const durationMatch = userPrompt.match(/(\d+)\s*(jour|jours|day|days|أيام|يوم)/i);

    if (
      (lowerPrompt.includes('augmenter') ||
        lowerPrompt.includes('plafond') ||
        lowerPrompt.includes('increase') ||
        lowerPrompt.includes('demande') ||
        lowerPrompt.includes('زيادة') ||
        lowerPrompt.includes('سقف')) &&
      amountMatch
    ) {
      const parsedAmount = parseInt(amountMatch[1].replace(/\s+/g, ''), 10);
      const parsedDuration = durationMatch ? parseInt(durationMatch[1], 10) : 3;

      // STRICT BUSINESS VALIDATION BEFORE PREPARING DRAFT OR ASKING TO SUBMIT:
      // 1. Amount validation: strictly > 10,000 DH and <= 100,000 DH
      if (
        isNaN(parsedAmount) ||
        parsedAmount <= BANKING_RULES.INITIAL_TRANSFER_LIMIT ||
        parsedAmount > BANKING_RULES.MAX_REQUESTED_LIMIT
      ) {
        return {
          content: translate(lang, 'invalid_amount', {
            minLimit:
              lang === 'en'
                ? BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('en-US')
                : BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('fr-FR'),
            maxLimit:
              lang === 'en'
                ? BANKING_RULES.MAX_REQUESTED_LIMIT.toLocaleString('en-US')
                : BANKING_RULES.MAX_REQUESTED_LIMIT.toLocaleString('fr-FR'),
            amount:
              lang === 'en'
                ? parsedAmount.toLocaleString('en-US')
                : parsedAmount.toLocaleString('fr-FR'),
          }),
        };
      }

      // 2. Duration validation: between 1 and 7 calendar days
      if (
        isNaN(parsedDuration) ||
        parsedDuration < BANKING_RULES.MIN_DURATION_DAYS ||
        parsedDuration > BANKING_RULES.MAX_DURATION_DAYS
      ) {
        return {
          content: translate(lang, 'invalid_duration', {
            minDays: BANKING_RULES.MIN_DURATION_DAYS,
            maxDays: BANKING_RULES.MAX_DURATION_DAYS,
            duration: parsedDuration,
          }),
        };
      }

      let reason = 'Augmentation temporaire de plafond pour besoin personnel';

      if (lowerPrompt.includes('voyage') || lowerPrompt.includes('vacance')) {
        reason = 'Dépenses et réservations de voyage / vacances';
      } else if (
        lowerPrompt.includes('achat') ||
        lowerPrompt.includes('véhicule') ||
        lowerPrompt.includes('voiture')
      ) {
        reason = 'Acompte / achat véhicule ou équipement';
      } else if (lowerPrompt.includes('travaux')) {
        reason = 'Règlement artisans / travaux de rénovation';
      }

      const hasDraftTool = availableTools.some((t) => t.name === 'create_limit_request_draft');
      if (hasDraftTool) {
        const toolCall: ToolCallPayload = {
          id: `call_${Date.now()}`,
          name: 'create_limit_request_draft',
          arguments: {
            accountId: 'AUTO_RESOLVED_DEFAULT_ACCOUNT',
            requestedLimit: parsedAmount,
            durationDays: parsedDuration,
            reason,
          },
        };

        return {
          content: translate(lang, 'preparing_draft', {
            amount: parsedAmount,
            duration: parsedDuration,
          }),
          toolCalls: [toolCall],
        };
      }
    }

    // 4. Consultation Intent (Account Limit, Current Status)
    if (
      lowerPrompt.includes('solde') ||
      lowerPrompt.includes('mon plafond') ||
      lowerPrompt.includes('current limit') ||
      lowerPrompt.includes('كم هو سقف') ||
      lowerPrompt.includes('combien')
    ) {
      const hasLimitTool = availableTools.some((t) => t.name === 'get_account_limit');
      if (hasLimitTool) {
        return {
          content: translate(lang, 'checking_limit'),
          toolCalls: [
            {
              id: `call_${Date.now()}`,
              name: 'get_account_limit',
              arguments: {},
            },
          ],
        };
      }
    }

    // 5. File Completeness Intent
    if (
      lowerPrompt.includes('dossier') ||
      lowerPrompt.includes('complet') ||
      lowerPrompt.includes('pièce') ||
      lowerPrompt.includes('kyc') ||
      lowerPrompt.includes('ملفي')
    ) {
      const hasFileTool = availableTools.some((t) => t.name === 'get_customer_file_status');
      if (hasFileTool) {
        return {
          content: translate(lang, 'checking_file'),
          toolCalls: [
            {
              id: `call_${Date.now()}`,
              name: 'get_customer_file_status',
              arguments: {},
            },
          ],
        };
      }
    }

    // 6. General Greeting or Assistance
    return {
      content: translate(lang, 'greeting'),
    };
  }
}
