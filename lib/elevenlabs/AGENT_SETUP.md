# ElevenLabs Agent Setup Guide

This guide walks you through configuring the ElevenLabs conversational AI agent for candidate screening interviews.

## Prerequisites

- ElevenLabs account with API access
- Access to ElevenLabs dashboard at https://elevenlabs.io/app
- Your ElevenLabs API key (from Settings > API Keys)

## Agent Configuration Steps

### 1. Create a New Agent

1. Navigate to https://elevenlabs.io/app/conversational-ai
2. Click "Create Agent" or "New Agent"
3. Give your agent a descriptive name (e.g., "Candidate Screening Agent")

### 2. Configure System Prompt with Dynamic Variables

In the agent's system prompt configuration, use the following template with dynamic variables:

```
You are an AI interviewer for {{company_name}} conducting a preliminary screening call for the {{candidate_name}} position.

Job Description:
{{job_description}}

Candidate Application:
{{job_application}}

Conversation Focus Areas:
{{conversation_pointers}}

Your role is to:
1. Welcome {{candidate_name}} warmly and professionally
2. Ask relevant questions based on the job requirements and their application
3. Assess their qualifications, experience, and cultural fit
4. Provide a positive candidate experience regardless of the outcome
5. Keep the conversation focused and efficient (10-15 minutes)

Be conversational, empathetic, and professional throughout the interview.
```

**Important:** The variables in double curly braces `{{variable_name}}` will be dynamically replaced when the session is created.

### 3. Configure First Message

Set the agent's first message to greet the candidate:

```
Hi {{candidate_name}}! Thank you for applying to {{company_name}}. I'm an AI interviewer here to conduct a preliminary screening for the position you applied for. This should take about 10-15 minutes. Are you ready to begin?
```

### 4. Voice and Model Settings

Configure the following settings:

- **Voice:** Select an appropriate professional voice (recommended: a clear, friendly voice)
- **Model:** Choose `eleven_turbo_v2_5` for low latency and good quality
- **Language:** Set to "en" (English) or your preferred language
- **Response Latency:** Set to "Low" for natural conversation flow

### 5. Configure Webhook

1. In the agent settings, find the "Webhooks" section
2. Add a webhook URL: `https://yourdomain.com/api/webhooks/elevenlabs`
   - Replace `yourdomain.com` with your actual domain
   - For local development: Use a tool like ngrok to expose your local server
3. Select the event type: `conversation.completed`
4. Save the webhook configuration
5. Copy the webhook secret and add it to your `.env.local` file as `ELEVENLABS_WEBHOOK_SECRET`

### 6. Publish the Agent

1. Review all settings to ensure they're correct
2. Click "Publish" or "Save" to make the agent live
3. Copy the Agent ID from the URL or settings page
4. Add the Agent ID to your `.env.local` file as `ELEVENLABS_AGENT_ID`

## Dynamic Variables Reference

The following variables will be passed when creating a session link:

| Variable | Description | Example |
|----------|-------------|---------|
| `company_name` | Organization name from Linear | "Acme Corp" |
| `candidate_name` | Candidate's first name | "John" |
| `job_description` | Full job description from Linear Project | "We are looking for a Senior Engineer..." |
| `job_application` | Complete Linear Issue content (candidate's application) | "I am excited to apply..." |
| `conversation_pointers` | AI-generated conversation focus areas from Cerebras | "1. Discuss React experience\n2. Ask about team leadership..." |

## Testing the Agent

After configuration:

1. Create a test session link using the ElevenLabs client service
2. Open the link in a browser
3. Verify that the dynamic variables are correctly replaced
4. Test a complete conversation flow
5. Verify that the webhook is triggered when the conversation completes

## Environment Variables

Add these to your `.env.local` file:

```bash
ELEVENLABS_API_KEY=el_xxxxxxxxxxxxx
ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxxx
ELEVENLABS_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Troubleshooting

### Variables Not Replacing

- Ensure variables are wrapped in double curly braces: `{{variable_name}}`
- Check that variable names match exactly (case-sensitive)
- Verify the session link includes the base64-encoded variables

### Webhook Not Firing

- Verify the webhook URL is publicly accessible
- Check that the webhook secret matches your environment variable
- Ensure the `conversation.completed` event is selected
- Check ElevenLabs dashboard for webhook delivery logs

### Agent Not Responding

- Verify the agent is published (not in draft mode)
- Check voice and model settings are configured
- Ensure API key has proper permissions
- Review agent logs in ElevenLabs dashboard

## Next Steps

Once the agent is configured:

1. Test the integration with a sample candidate application
2. Monitor webhook deliveries in the ElevenLabs dashboard
3. Review conversation transcripts for quality
4. Adjust the system prompt based on feedback
5. Fine-tune conversation pointers generation in Cerebras
