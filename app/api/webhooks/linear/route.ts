/**
 * Linear Webhook Handler
 * 
 * Processes incoming Linear webhook events for real-time synchronization
 */

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import crypto from 'crypto';

/**
 * Verify webhook signature using HMAC
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Check for replay attacks using timestamp
 */
function isReplayAttack(timestamp: string): boolean {
  const webhookTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  // Reject if timestamp is more than 5 minutes old
  return Math.abs(currentTime - webhookTime) > fiveMinutes;
}

/**
 * Handle Project status change events
 */
async function handleProjectStatusChange(event: any): Promise<void> {
  console.log('Project status changed:', {
    projectId: event.data?.id,
    newStatus: event.data?.state?.name,
  });
  
  // TODO: Implement cache invalidation and AI generation trigger
  // This will be implemented in task 5 (AI job description generation)
}

/**
 * Handle Project description update events
 */
async function handleProjectDescriptionUpdate(event: any): Promise<void> {
  console.log('Project description updated:', {
    projectId: event.data?.id,
  });
  
  // TODO: Implement cache invalidation
  // This will trigger job board refresh
}

/**
 * Handle Issue creation events
 */
async function handleIssueCreation(event: any): Promise<void> {
  console.log('Issue created:', {
    issueId: event.data?.id,
    projectId: event.data?.project?.id,
  });
  
  // TODO: Implement AI pre-screening trigger
  // This will be implemented in task 11 (AI pre-screening agent)
}

/**
 * Route webhook events to appropriate handlers
 */
async function routeWebhookEvent(event: any): Promise<void> {
  const eventType = event.type;
  const action = event.action;
  
  switch (eventType) {
    case 'Project':
      if (action === 'update' && event.data?.state) {
        await handleProjectStatusChange(event);
      } else if (action === 'update' && event.data?.description) {
        await handleProjectDescriptionUpdate(event);
      }
      break;
      
    case 'Issue':
      if (action === 'create') {
        await handleIssueCreation(event);
      }
      break;
      
    default:
      console.log('Unhandled webhook event type:', eventType);
  }
}

/**
 * POST /api/webhooks/linear
 * 
 * Receives and processes Linear webhook events
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Get signature from headers
    const signature = request.headers.get('linear-signature');
    const timestamp = request.headers.get('linear-timestamp');
    
    if (!signature || !timestamp) {
      console.error('Missing webhook signature or timestamp');
      return NextResponse.json(
        { error: 'Missing signature or timestamp' },
        { status: 401 }
      );
    }
    
    // Check for replay attacks
    if (isReplayAttack(timestamp)) {
      console.error('Webhook replay attack detected');
      return NextResponse.json(
        { error: 'Webhook timestamp too old' },
        { status: 401 }
      );
    }
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, config.linear.webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // Parse the webhook payload
    const event = JSON.parse(body);
    
    // Route to appropriate handler
    await routeWebhookEvent(event);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
