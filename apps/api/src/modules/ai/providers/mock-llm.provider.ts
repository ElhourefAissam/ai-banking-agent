import { Injectable, Logger } from '@nestjs/common';
import { ILlmProvider, LlmMessage, LlmCompletionResponse } from '../interfaces/llm-provider.interface';
import { ToolDefinition, ToolCallPayload, BANKING_RULES } from '@proorga/shared-types';

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

    this.logger.log(`Mock LLM processing prompt: "${userPrompt.substring(0, 80)}..."`);

    // 1. Detect if the previous step was a tool execution output
    if (lastMessage.role === 'tool') {
      try {
        const toolOutput = JSON.parse(lastMessage.content);
        if (lastMessage.name === 'get_account_limit') {
          return {
            content: `Voici les informations de votre compte bancaire :\n- **Plafond initial standard :** ${toolOutput.initialTransferLimit} DH\n- **Plafond de virement actuel :** ${toolOutput.currentTransferLimit} DH\n- **Solde disponible :** ${toolOutput.balance} DH (${toolOutput.currency})\n\nSouhaitez-vous préparer une demande d'augmentation temporaire de votre plafond ? (Montant possible de 10 001 à 100 000 DH, pour 1 à 7 jours).`,
          };
        }

        if (lastMessage.name === 'get_customer_file_status') {
          if (toolOutput.fileStatus === 'COMPLETE') {
            return {
              content: `Votre dossier client est **Complet et conforme**. Vous êtes pleinement éligible pour soumettre une demande d'augmentation de plafond de virement.`,
            };
          } else {
            return {
              content: `⚠️ **Attention : Votre dossier client est incomplet.**\nMotif : ${toolOutput.incompleteReason || 'Pièces justificatives requises manquantes'}.\n\nTant que votre dossier n'est pas régularisé en agence ou auprès de votre conseiller, le système bancaire ne permet pas la soumission d'une demande de plafond.`,
            };
          }
        }

        if (lastMessage.name === 'check_eligibility') {
          if (toolOutput.isEligible) {
            return {
              content: `✅ Votre compte est parfaitement éligible pour une augmentation temporaire de plafond. Votre plafond actuel est de ${toolOutput.currentLimit} DH.`,
            };
          } else {
            return {
              content: `❌ Votre compte n'est pas éligible actuellement pour la raison suivante :\n- ${toolOutput.reasons.join('\n- ')}`,
            };
          }
        }

        if (lastMessage.name === 'create_limit_request_draft') {
          if (toolOutput.error) {
            return {
              content: `⚠️ **Impossible de préparer la demande** : ${toolOutput.error}\n\nVeuillez vérifier vos paramètres et vous assurer que le montant est strictement compris entre 10 001 DH et 100 000 DH et la durée entre 1 et 7 jours.`,
            };
          }

          const docNote = toolOutput.requestedLimit > 50000
            ? `\n> ⚠️ *Note réglementaire : Le montant demandé dépassant 50 000 DH, un justificatif (bon de commande, facture) sera obligatoire avant la soumission formelle.*`
            : '';
          const thresholdNote = toolOutput.requestedLimit > 30000
            ? `\n> ℹ️ *Circuit de validation : Cette demande supérieure à 30 000 DH nécessitera une recommandation de votre conseiller puis la validation d'un superviseur.*`
            : `\n> ℹ️ *Circuit de validation : Cette demande (≤ 30 000 DH) relève de la délégation directe de votre conseiller.*`;

          return {
            content: `J'ai préparé votre brouillon de demande avec les paramètres suivants :\n- **Référence :** ${toolOutput.reference}\n- **Nouveau plafond souhaité :** ${toolOutput.requestedLimit} DH\n- **Durée :** ${toolOutput.durationDays} jour(s)\n- **Motif :** ${toolOutput.reason}${docNote}${thresholdNote}\n\nVeuillez vérifier attentivement ces données ci-dessus et confirmer la soumission via le formulaire dédié. Une simple conversation ne vaut pas engagement.`,
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
        content: `Je suis l'assistant bancaire PROORGA et je respecte strictement les règles de conformité et de séparation des tâches. Je ne dispose d'aucun pouvoir de décision ou d'approbation directe, et les plafonds sont octroyés exclusivement par votre conseiller et la hiérarchie bancaire après examen de votre dossier.`,
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

      const isEnglish = /\b(want|increase|limit|ceiling|need|days?)\b/i.test(userPrompt);
      const isArabic = /[\u0600-\u06FF]/.test(userPrompt);

      // STRICT BUSINESS VALIDATION BEFORE PREPARING DRAFT OR ASKING TO SUBMIT:
      // 1. Amount validation: strictly > 10,000 DH and <= 100,000 DH
      if (
        isNaN(parsedAmount) ||
        parsedAmount <= BANKING_RULES.INITIAL_TRANSFER_LIMIT ||
        parsedAmount > BANKING_RULES.MAX_REQUESTED_LIMIT
      ) {
        if (isEnglish) {
          return {
            content: `⚠️ **Invalid Requested Limit**:\nRequested limit must be strictly between ${BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('en-US')} DH and ${BANKING_RULES.MAX_REQUESTED_LIMIT.toLocaleString('en-US')} DH (your standard base limit is already ${BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('en-US')} DH).\n\nYour request for **${parsedAmount.toLocaleString('en-US')} DH** cannot be prepared. Please specify an amount strictly greater than ${BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('en-US')} DH and up to ${BANKING_RULES.MAX_REQUESTED_LIMIT.toLocaleString('en-US')} DH.`,
          };
        } else if (isArabic) {
          return {
            content: `⚠️ **المبلغ المطلوب غير مطابق للضوابط البنكية**:\nيجب أن يكون سقف التحويل المؤقت أكبر قطعا من ${BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('fr-FR')} درهم وبحد أقصى ${BANKING_RULES.MAX_REQUESTED_LIMIT.toLocaleString('fr-FR')} درهم (سقفكم الحالي هو ${BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('fr-FR')} درهم).\n\nطلبكم لمبلغ **${parsedAmount.toLocaleString('fr-FR')} درهم** لا يمكن إعداده. يرجى تحديد مبلغ بين 10,001 درهم و 100,000 درهم.`,
          };
        }

        return {
          content: `⚠️ **Montant non conforme aux règles bancaires** :\nLe montant d'un relèvement temporaire de plafond doit être **strictement supérieur à ${BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('fr-FR')} DH** et **au maximum de ${BANKING_RULES.MAX_REQUESTED_LIMIT.toLocaleString('fr-FR')} DH** (votre plafond standard de base étant déjà de ${BANKING_RULES.INITIAL_TRANSFER_LIMIT.toLocaleString('fr-FR')} DH).\n\nVotre demande pour **${parsedAmount.toLocaleString('fr-FR')} DH** ne peut pas être enregistrée. Veuillez indiquer un montant valide compris entre 10 001 DH et 100 000 DH.`,
        };
      }

      // 2. Duration validation: between 1 and 7 calendar days
      if (
        isNaN(parsedDuration) ||
        parsedDuration < BANKING_RULES.MIN_DURATION_DAYS ||
        parsedDuration > BANKING_RULES.MAX_DURATION_DAYS
      ) {
        if (isEnglish) {
          return {
            content: `⚠️ **Invalid Duration**:\nTemporary limit duration must be between ${BANKING_RULES.MIN_DURATION_DAYS} and ${BANKING_RULES.MAX_DURATION_DAYS} calendar days.\n\nYour request for **${parsedDuration} days** cannot be prepared. Please specify a duration between ${BANKING_RULES.MIN_DURATION_DAYS} and ${BANKING_RULES.MAX_DURATION_DAYS} days.`,
          };
        } else if (isArabic) {
          return {
            content: `⚠️ **المدة المطلوبة غير مطابقة للضوابط البنكية**:\nيجب أن تكون مدة الرفع المؤقت بين ${BANKING_RULES.MIN_DURATION_DAYS} و ${BANKING_RULES.MAX_DURATION_DAYS} أيام.\n\nطلبكم لمدة **${parsedDuration} أيام** لا يمكن إعداده. يرجى تحديد مدة بين 1 و 7 أيام.`,
          };
        }

        return {
          content: `⚠️ **Durée non conforme aux règles bancaires** :\nLa durée d'un relèvement temporaire de plafond doit être comprise **entre ${BANKING_RULES.MIN_DURATION_DAYS} et ${BANKING_RULES.MAX_DURATION_DAYS} jours** consécutifs.\n\nVotre demande pour **${parsedDuration} jours** ne peut pas être enregistrée. Veuillez indiquer une durée valide comprise entre 1 et 7 jours.`,
        };
      }

      let reason = 'Augmentation temporaire de plafond pour besoin personnel';

      if (lowerPrompt.includes('voyage') || lowerPrompt.includes('vacance')) {
        reason = 'Dépenses et réservations de voyage / vacances';
      } else if (lowerPrompt.includes('achat') || lowerPrompt.includes('véhicule') || lowerPrompt.includes('voiture')) {
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
          content: `Je consulte les informations de votre compte et prépare votre demande de plafond de ${parsedAmount} DH pour ${parsedDuration} jours...`,
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
          content: 'Je consulte votre plafond actuel...',
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
          content: 'Je vérifie l’état de complétude de votre dossier client...',
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
      content: `Bonjour ! Je suis l'assistant bancaire PROORGA. Je peux vous renseigner sur vos plafonds de virement actuels, vérifier la complétude de votre dossier, ou vous aider à préparer une demande d'augmentation temporaire de plafond (jusqu'à 100 000 DH pour 1 à 7 jours). Que puis-je faire pour vous aujourd'hui ?`,
    };
  }
}
