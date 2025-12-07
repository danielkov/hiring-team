# ElevenLabs Integration

This module provides integration with ElevenLabs Conversational AI for automated candidate screening interviews.

## Overview

The ElevenLabs integration enables AI-powered voice screening interviews with candidates. The system:

1. Creates personalized agent session links with dynamic context
2. Sends invitation emails to candidates with the session link
3. Receives webhook notifications when conversations complete
4. Evaluates transcripts using Cerebras AI
5. Updates candidate status based on evaluation results

## Components

### `client.ts`

Core ElevenLabs client service that handles:

- **Agent Management**: Retrieve agent configuration
- **Session Link Generation**: Create public talk-to page URLs with dynamic variables
- **Webhook Verification**: Verify webhook signatures using the ElevenLabs SDK
- **Event Parsing**: Parse and validate webhook events
- **Transcript Formatting**: Format transcripts for display or storage

### `AGENT_SETUP.md`

Comprehensive guide for configuring the ElevenLabs agent in the dashboard, including:

- System prompt configuration with dynamic variables
- First message setup
- Voice and model settings
- Webhook configuration
- Testing procedures

## Usage

### Creating an Agent Session Link

```typescript
import { createAgentSessionLink } from '@/lib/elevenlabs/client';
import { config } from '@/lib/config';

const sessionLink = await createAgentSessionLink(
  config.elevenlabs.agentId,
  {
    company_name: 'Acme Corp',
    candidate_name: 'John',
    job_description: 'We are looking for a Senior Engineer...',
    job_application: 'I am excited to apply for this position...',
    conversation_pointers: '1. Discuss React experience\n2. Ask about team leadership...',
  }
);

// Send sessionLink to candidate via email
```

### Verifying Webhook Signatures

```typescript
import { verifyElevenLabsWebhook } from '@/lib/elevenlabs/client';
import { config } from '@/lib/config';

// In your webhook handler
const rawBody = await request.text();
const signature = request.headers.get('x-elevenlabs-signature');

const event = await verifyElevenLabsWebhook(
  rawBody,
  signature!,
  config.elevenlabs.webhookSecret
);

// Process the verified event
if (event.type === 'conversation.completed') {
  // Handle completed conversation
}
```

### Formatting Transcripts

```typescript
import { formatTranscript } from '@/lib/elevenlabs/client';

const formattedTranscript = formatTranscript(event.data.transcript);

// Add to Linear Issue or store in database
```

## Dynamic Variables

The agent session link supports the following dynamic variables:

| Variable | Description | Source |
|----------|-------------|--------|
| `company_name` | Organization name | Linear organization |
| `candidate_name` | Candidate's first name | Parsed from application |
| `job_description` | Full job description | Linear Project content |
| `job_application` | Complete application | Linear Issue content |
| `conversation_pointers` | AI-generated focus areas | Cerebras API |

These variables are:
1. Encoded as base64 JSON
2. Passed via URL parameter
3. Automatically replaced in the agent's system prompt and first message

## Webhook Events

The integration handles the following webhook events:

### `conversation.completed`

Triggered when a candidate completes a screening session.

**Event Structure:**
```typescript
{
  type: 'conversation.completed',
  data: {
    conversation_id: string,
    agent_id: string,
    transcript: Array<{
      role: 'agent' | 'user',
      message: string,
      timestamp: string
    }>,
    duration_seconds: number,
    ended_at: string,
    metadata: Record<string, any>
  }
}
```

**Processing Flow:**
1. Verify webhook signature
2. Parse event data
3. Retrieve session metadata from Redis
4. Evaluate transcript using Cerebras
5. Update Linear Issue state
6. Attach transcript to Linear Issue
7. Add evaluation summary comment

## Error Handling

The client implements comprehensive error handling:

- **Missing Variables**: Throws error if required variables are missing
- **Invalid Signatures**: Throws error if webhook signature is invalid
- **API Failures**: Logs errors and throws with context
- **Malformed Events**: Validates event structure before processing

All errors are logged with full context for debugging.

## Security

- **Webhook Verification**: All webhooks are verified using HMAC-SHA256 signatures
- **API Key Protection**: API keys are stored in environment variables
- **Signature Validation**: Uses ElevenLabs SDK's built-in verification
- **Event Validation**: Validates event structure before processing

## Configuration

Required environment variables:

```bash
ELEVENLABS_API_KEY=el_xxxxxxxxxxxxx
ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxxx
ELEVENLABS_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

See `.env.example` for complete configuration details.

## Testing

### Unit Tests

Test the following scenarios:

1. Session link generation with valid variables
2. Session link generation with missing variables
3. Webhook signature verification (valid and invalid)
4. Event parsing and validation
5. Transcript formatting

### Integration Tests

Test the complete flow:

1. Create session link
2. Simulate conversation completion
3. Verify webhook delivery
4. Validate transcript evaluation
5. Confirm Linear Issue updates

### Manual Testing

1. Create a test agent in ElevenLabs dashboard
2. Generate a session link
3. Complete a test conversation
4. Verify webhook is received
5. Check transcript attachment in Linear

## Monitoring

Key metrics to track:

- Session links created
- Conversations completed
- Webhook delivery success rate
- Transcript evaluation time
- Webhook signature failures

## Troubleshooting

### Session Link Not Working

- Verify agent ID is correct
- Check that agent is published (not draft)
- Ensure variables are properly encoded
- Verify agent has dynamic variables configured

### Webhook Not Received

- Check webhook URL is publicly accessible
- Verify webhook secret matches environment variable
- Ensure `conversation.completed` event is selected
- Check ElevenLabs dashboard for delivery logs

### Signature Verification Failing

- Verify webhook secret is correct
- Ensure raw body is used (not parsed JSON)
- Check signature header name is correct
- Review ElevenLabs documentation for signature format

## References

- [ElevenLabs Conversational AI Documentation](https://elevenlabs.io/docs/conversational-ai)
- [ElevenLabs API Reference](https://elevenlabs.io/docs/api-reference)
- [ElevenLabs Webhooks Guide](https://elevenlabs.io/docs/webhooks)
- [Agent Setup Guide](./AGENT_SETUP.md)
