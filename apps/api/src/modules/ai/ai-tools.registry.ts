import { ToolDefinition, Role } from '@proorga/shared-types';

export const AI_TOOLS: Record<string, ToolDefinition & { allowedRoles: Role[] }> = {
  get_account_limit: {
    name: 'get_account_limit',
    description: 'Retrieve the current transfer limit, initial base limit, and account details for the customer.',
    allowedRoles: [Role.CLIENT, Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN],
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'The unique account ID (optional if client has only one account).',
        },
      },
    },
  },

  get_customer_file_status: {
    name: 'get_customer_file_status',
    description: 'Check if the customer file is COMPLETE or INCOMPLETE, and retrieve any blocking KYC/document reasons.',
    allowedRoles: [Role.CLIENT, Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN],
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  check_eligibility: {
    name: 'check_eligibility',
    description: 'Verify if the customer is eligible to request a limit increase (checks file completeness and active requests).',
    allowedRoles: [Role.CLIENT, Role.CONSEILLER, Role.ADMIN],
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'The target account ID.',
        },
      },
      required: ['accountId'],
    },
  },

  create_limit_request_draft: {
    name: 'create_limit_request_draft',
    description: 'Prepare and save a persistent draft for a temporary transfer limit increase.',
    allowedRoles: [Role.CLIENT, Role.ADMIN],
    parameters: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'The account ID to apply the limit to.',
        },
        requestedLimit: {
          type: 'number',
          description: 'Requested transfer limit amount in DH (must be strictly > 10000 and <= 100000).',
        },
        durationDays: {
          type: 'integer',
          description: 'Duration of the increase in calendar days (1 to 7 days).',
        },
        reason: {
          type: 'string',
          description: 'Mandatory justification motive for the temporary increase.',
        },
      },
      required: ['accountId', 'requestedLimit', 'durationDays', 'reason'],
    },
  },

  get_request_details: {
    name: 'get_request_details',
    description: 'Fetch the latest status, version, and details of an existing limit increase request.',
    allowedRoles: [Role.CLIENT, Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN],
    parameters: {
      type: 'object',
      properties: {
        requestId: {
          type: 'string',
          description: 'The request ID or reference.',
        },
      },
      required: ['requestId'],
    },
  },
};
