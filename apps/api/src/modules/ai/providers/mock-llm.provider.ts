import { Injectable, Logger } from '@nestjs/common';
import { ILlmProvider, LlmMessage, LlmCompletionResponse } from '../interfaces/llm-provider.interface';
import { ToolDefinition, ToolCallPayload } from '@proorga/shared-types';

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
    const amountMatch = userPrompt.match(/(\d[\d\s]{3,6})\s*(dh|dirham|mad|درهم)?/i);
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
