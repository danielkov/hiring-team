/**
 * ElevenLabs Client Service
 * 
 * Handles all ElevenLabs API interactions for AI-powered voice screening interviews.
 * Uses the official ElevenLabs JS SDK for agent session management and webhook verification.
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { config } from '@/lib/config';
import { logger } from '@/lib/datadog/logger';

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: config.elevenlabs.apiKey,
});

/**
 * Dynamic variables that can be passed to the ElevenLabs agent
 * These variables are defined in the agent's system prompt and first message
 */
export interface AgentSessionVariables {
  company_name: string;
  candidate_name: string;
  job_description: string;
  job_application: string;
  conversation_pointers: string;
}

/**
 * Get agent details to verify agent exists and get configuration
 * 
 * @param agentId - The ElevenLabs agent ID
 * @returns Agent configuration details
 */
export async function getAgent(agentId: string) {
  try {
    const agent = await elevenlabs.conversationalAi.agents.get(agentId);
    logger.info('Retrieved ElevenLabs agent', { agentId });
    return agent;
  } catch (error) {
    logger.error('Failed to get ElevenLabs agent', error as Error, { agentId });
    throw new Error(`Failed to get agent: ${(error as Error).message}`);
  }
}

/**
 * Create a public talk-to page URL with dynamic variables
 * 
 * ElevenLabs supports passing variables via base64-encoded JSON in the 'vars' parameter.
 * Variables are defined in the agent's configuration using double curly braces {{variable_name}}
 * and are automatically replaced when the conversation starts.
 * 
 * Requirements: 5.5, 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @param agentId - The ElevenLabs agent ID
 * @param variables - Dynamic variables to pass to the agent
 * @returns Public URL for the agent session
 * @throws Error if validation fails or URL generation fails
 */
export async function createAgentSessionLink(
  agentId: string,
  variables: AgentSessionVariables
): Promise<string> {
  const startTime = Date.now();
  
  try {
    // Validate agent ID
    if (!agentId || agentId.trim() === '') {
      throw new Error('Agent ID is required and cannot be empty');
    }

    // Validate that all required variables are provided
    const requiredVars: (keyof AgentSessionVariables)[] = [
      'company_name',
      'candidate_name',
      'job_description',
      'job_application',
      'conversation_pointers',
    ];

    const missingVars = requiredVars.filter(
      (key) => !variables[key] || variables[key].trim() === ''
    );

    if (missingVars.length > 0) {
      const error = new Error(
        `Missing required variables: ${missingVars.join(', ')}`
      );
      logger.error('Session link validation failed', error, {
        agentId,
        missingVars,
        providedVars: Object.keys(variables).filter(key => variables[key as keyof AgentSessionVariables]),
      });
      throw error;
    }

    // Validate variable content lengths to prevent URL length issues
    const maxVarLength = 10000; // Reasonable limit for URL parameters
    const oversizedVars = requiredVars.filter(
      (key) => variables[key].length > maxVarLength
    );

    if (oversizedVars.length > 0) {
      logger.warn('Some variables exceed recommended length', {
        agentId,
        oversizedVars: oversizedVars.map(key => ({
          name: key,
          length: variables[key].length,
        })),
      });
    }

    // Encode variables as base64 JSON
    const encodedVars = Buffer.from(JSON.stringify(variables)).toString('base64');
    
    // Construct the public talk-to page URL
    const url = `https://elevenlabs.io/app/talk-to?agent_id=${agentId}&vars=${encodedVars}`;
    
    const duration = Date.now() - startTime;
    
    logger.info('Created ElevenLabs agent session link successfully', {
      agentId,
      candidateName: variables.candidate_name,
      companyName: variables.company_name,
      urlLength: url.length,
      duration,
    });

    return url;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error('Failed to create agent session link', err, {
      agentId,
      candidateName: variables?.candidate_name,
      errorType: err.name,
      duration,
    });
    
    throw new Error(`Failed to create session link: ${err.message}`);
  }
}

/**
 * Verify webhook signature using ElevenLabs SDK
 * 
 * ElevenLabs uses standard webhook signature verification to ensure
 * that webhook events are genuinely from ElevenLabs.
 * 
 * @param payload - Raw webhook payload as string
 * @param signature - Signature from webhook headers
 * @param secret - Webhook secret from environment
 * @returns Parsed and verified webhook event
 * @throws Error if signature is invalid
 */
export async function verifyElevenLabsWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<any> {
  try {
    // Use the ElevenLabs SDK's constructEvent method for webhook verification
    const event = await elevenlabs.webhooks.constructEvent(
      payload,
      signature,
      secret
    );
    
    logger.info('Verified ElevenLabs webhook', {
      eventType: event.type,
      conversationId: event.data?.conversation_id,
    });

    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed', error as Error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * ElevenLabs webhook event types
 */
export interface ElevenLabsWebhookEvent {
  type: 'conversation.completed' | 'conversation.started' | 'conversation.error';
  data: {
    conversation_id: string;
    agent_id: string;
    transcript?: Array<{
      role: 'agent' | 'user';
      message: string;
      timestamp: string;
    }>;
    duration_seconds?: number;
    ended_at?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Parse and validate ElevenLabs webhook event
 * 
 * @param payload - Raw webhook payload
 * @returns Typed webhook event
 */
export function parseWebhookEvent(payload: string): ElevenLabsWebhookEvent {
  try {
    const event = JSON.parse(payload) as ElevenLabsWebhookEvent;

    // Validate required fields
    if (!event.type || !event.data) {
      throw new Error('Invalid webhook event structure');
    }

    if (!event.data.conversation_id || !event.data.agent_id) {
      throw new Error('Missing required event data fields');
    }

    return event;
  } catch (error) {
    logger.error('Failed to parse webhook event', error as Error);
    throw new Error(`Invalid webhook payload: ${(error as Error).message}`);
  }
}

/**
 * Format transcript for display or storage
 * 
 * @param transcript - Array of transcript messages
 * @returns Formatted transcript string
 */
export function formatTranscript(
  transcript: Array<{
    role: 'agent' | 'user';
    message: string;
    timestamp: string;
  }>
): string {
  return transcript
    .map((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const speaker = entry.role === 'agent' ? 'AI Interviewer' : 'Candidate';
      return `[${time}] ${speaker}: ${entry.message}`;
    })
    .join('\n\n');
}
