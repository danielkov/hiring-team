/**
 * Resend Email Templates Service
 * 
 * Uses Resend's built-in template feature for email content.
 * Templates are created and managed in the Resend dashboard.
 * 
 * Each template function sends an email using a pre-configured template
 * with dynamic variables.
 */

import { Resend } from 'resend';
import { config } from '@/lib/config';
import { logger } from '@/lib/datadog/logger';
import { trackEmailSend } from '@/lib/datadog/metrics';

// Initialize Resend client
const resend = new Resend(config.resend.apiKey);

// Template IDs from configuration
const TEMPLATE_IDS = {
  CONFIRMATION: config.resend.templates.confirmation,
  REJECTION: config.resend.templates.rejection,
  SCREENING_INVITATION: config.resend.templates.screeningInvitation,
  COMMENT: config.resend.templates.comment,
};

/**
 * Confirmation email parameters
 */
export interface ConfirmationEmailParams {
  to: string;
  candidateName: string;
  organizationName: string;
  positionTitle: string;
  replyTo?: string;
  messageId?: string;
  organizationId?: string; // For metrics tracking
}

/**
 * Send confirmation email using Resend template
 * This template is used if: email feature is on,
 * but ran out of AI pre-screening credits OR
 * pre-screening is inconclusive
 * 
 * Template variables:
 * - candidate_name: Candidate's full name
 * - organization_name: Organization name
 * - position_title: Job position title
 * 
 * Requirements: 1.1, 1.4
 * 
 * @param params - Confirmation email parameters
 * @returns Email send response with message ID
 * @throws Error if email sending fails after retries
 */
export async function sendConfirmationEmail(params: ConfirmationEmailParams) {
  const startTime = Date.now();
  
  try {
    // Validate required parameters
    if (!params.to || !params.candidateName || !params.organizationName || !params.positionTitle) {
      const error = new Error('Missing required email parameters');
      logger.error('Email validation failed', error, {
        hasTo: !!params.to,
        hasCandidateName: !!params.candidateName,
        hasOrganizationName: !!params.organizationName,
        hasPositionTitle: !!params.positionTitle,
      });
      throw error;
    }

    const headers: Record<string, string> = {
      'X-Email-Type': 'confirmation',
    };

    if (params.messageId) {
      headers['Message-ID'] = `<${params.messageId}>`;
    }

    const { data, error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to: params.to,
      subject: `Application Received - ${params.positionTitle}`,
      template: {
        id: TEMPLATE_IDS.CONFIRMATION,
        variables: {
          candidate_name: params.candidateName,
          organization_name: params.organizationName,
          position_title: params.positionTitle,
        },
      },
      replyTo: params.replyTo,
      headers,
      tags: [
        { name: 'type', value: 'confirmation' },
      ],
    });

    if (error) {
      const err = new Error(`Failed to send confirmation email: ${error.message}`);
      logger.error('Resend API returned error', err, {
        to: params.to,
        candidateName: params.candidateName,
        organizationName: params.organizationName,
        positionTitle: params.positionTitle,
        errorName: error.name,
        errorMessage: error.message,
        duration: Date.now() - startTime,
      });
      throw err;
    }

    const duration = Date.now() - startTime;
    logger.info('Confirmation email sent successfully', {
      emailId: data?.id,
      to: params.to,
      candidateName: params.candidateName,
      organizationName: params.organizationName,
      positionTitle: params.positionTitle,
      duration,
    });

    // Track email send metrics
    if (params.organizationId) {
      trackEmailSend({
        emailType: 'confirmation',
        organizationId: params.organizationId,
        duration,
        success: true,
      });
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error('Failed to send confirmation email', err, {
      to: params.to,
      candidateName: params.candidateName,
      organizationName: params.organizationName,
      positionTitle: params.positionTitle,
      errorType: err.name,
      duration,
    });
    
    // Track email send failure metrics
    if (params.organizationId) {
      trackEmailSend({
        emailType: 'confirmation',
        organizationId: params.organizationId,
        duration,
        success: false,
        errorType: err.name,
      });
    }
    
    throw err;
  }
}

/**
 * Rejection email parameters
 */
export interface RejectionEmailParams {
  to: string;
  candidateName: string;
  positionTitle: string;
  organizationName: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  idempotencyKey?: string;
  organizationId?: string; // For metrics tracking
}

/**
 * Send rejection email using Resend template
 * 
 * Template variables:
 * - candidate_name: Candidate's full name
 * - position_title: Job position title
 * - organization_name: Name of the organization
 * 
 * Requirements: 4.1, 4.4
 * 
 * @param params - Rejection email parameters
 * @returns Email send response with message ID
 * @throws Error if email sending fails after retries
 */
export async function sendRejectionEmail(params: RejectionEmailParams) {
  const startTime = Date.now();
  
  try {
    // Validate required parameters
    if (!params.to || !params.candidateName || !params.positionTitle || !params.organizationName) {
      const error = new Error('Missing required email parameters');
      logger.error('Email validation failed', error, {
        hasTo: !!params.to,
        hasCandidateName: !!params.candidateName,
        hasPositionTitle: !!params.positionTitle,
        hasOrganizationName: !!params.organizationName,
      });
      throw error;
    }

    const headers: Record<string, string> = {
      'X-Email-Type': 'rejection',
    };

    if (params.inReplyTo) {
      headers['In-Reply-To'] = `<${params.inReplyTo}>`;
    }

    if (params.references && params.references.length > 0) {
      headers['References'] = params.references.map(id => `<${id}>`).join(' ');
    }

    const { data, error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to: params.to,
      subject: `Update on your application for ${params.positionTitle}`,
      template: {
        id: TEMPLATE_IDS.REJECTION,
        variables: {
          candidate_name: params.candidateName,
          position_title: params.positionTitle,
          organization_name: params.organizationName,
        },
      },
      replyTo: params.replyTo,
      headers,
      tags: [
        { name: 'type', value: 'rejection' },
      ],
    }, {
      idempotencyKey: params.idempotencyKey,
    });

    if (error) {
      const err = new Error(`Failed to send rejection email: ${error.message}`);
      logger.error('Resend API returned error', err, {
        to: params.to,
        candidateName: params.candidateName,
        positionTitle: params.positionTitle,
        errorName: error.name,
        errorMessage: error.message,
        idempotencyKey: params.idempotencyKey,
        duration: Date.now() - startTime,
      });
      throw err;
    }

    const duration = Date.now() - startTime;
    logger.info('Rejection email sent successfully', {
      emailId: data?.id,
      to: params.to,
      candidateName: params.candidateName,
      positionTitle: params.positionTitle,
      idempotencyKey: params.idempotencyKey,
      duration,
    });

    // Track email send metrics
    if (params.organizationId) {
      trackEmailSend({
        emailType: 'rejection',
        organizationId: params.organizationId,
        duration,
        success: true,
      });
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error('Failed to send rejection email', err, {
      to: params.to,
      candidateName: params.candidateName,
      positionTitle: params.positionTitle,
      errorType: err.name,
      idempotencyKey: params.idempotencyKey,
      duration,
    });
    
    // Track email send failure metrics
    if (params.organizationId) {
      trackEmailSend({
        emailType: 'rejection',
        organizationId: params.organizationId,
        duration,
        success: false,
        errorType: err.name,
      });
    }
    
    throw err;
  }
}

/**
 * Screening invitation email parameters
 */
export interface ScreeningInvitationEmailParams {
  to: string;
  candidateName: string;
  organizationName: string;
  positionTitle: string;
  sessionLink: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  organizationId?: string; // For metrics tracking
}

/**
 * Send screening invitation email using Resend template
 * 
 * Template variables:
 * - candidate_name: Candidate's full name
 * - organization_name: Organization name
 * - position_title: Job position title
 * - session_link: ElevenLabs agent session URL
 * 
 * Requirements: 5.1, 5.4, 5.5
 * 
 * @param params - Screening invitation email parameters
 * @returns Email send response with message ID
 * @throws Error if email sending fails after retries
 */
export async function sendScreeningInvitationEmail(params: ScreeningInvitationEmailParams) {
  const startTime = Date.now();
  
  try {
    // Validate required parameters
    if (!params.to || !params.candidateName || !params.organizationName || !params.positionTitle || !params.sessionLink) {
      const error = new Error('Missing required email parameters');
      logger.error('Email validation failed', error, {
        hasTo: !!params.to,
        hasCandidateName: !!params.candidateName,
        hasOrganizationName: !!params.organizationName,
        hasPositionTitle: !!params.positionTitle,
        hasSessionLink: !!params.sessionLink,
      });
      throw error;
    }

    const headers: Record<string, string> = {
      'X-Email-Type': 'screening_invitation',
    };

    if (params.inReplyTo) {
      headers['In-Reply-To'] = `<${params.inReplyTo}>`;
    }

    if (params.references && params.references.length > 0) {
      headers['References'] = params.references.map(id => `<${id}>`).join(' ');
    }

    const { data, error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to: params.to,
      subject: `AI Screening Interview - ${params.positionTitle}`,
      template: {
        id: TEMPLATE_IDS.SCREENING_INVITATION,
        variables: {
          candidate_name: params.candidateName,
          organization_name: params.organizationName,
          position_title: params.positionTitle,
          session_link: params.sessionLink,
        },
      },
      replyTo: params.replyTo,
      headers,
      tags: [
        { name: 'type', value: 'screening_invitation' },
      ],
    });

    if (error) {
      const err = new Error(`Failed to send screening invitation email: ${error.message}`);
      logger.error('Resend API returned error', err, {
        to: params.to,
        candidateName: params.candidateName,
        organizationName: params.organizationName,
        positionTitle: params.positionTitle,
        errorName: error.name,
        errorMessage: error.message,
        duration: Date.now() - startTime,
      });
      throw err;
    }

    const duration = Date.now() - startTime;
    logger.info('Screening invitation email sent successfully', {
      emailId: data?.id,
      to: params.to,
      candidateName: params.candidateName,
      organizationName: params.organizationName,
      positionTitle: params.positionTitle,
      duration,
    });

    // Track email send metrics
    if (params.organizationId) {
      trackEmailSend({
        emailType: 'screening_invitation',
        organizationId: params.organizationId,
        duration,
        success: true,
      });
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error('Failed to send screening invitation email', err, {
      to: params.to,
      candidateName: params.candidateName,
      organizationName: params.organizationName,
      positionTitle: params.positionTitle,
      errorType: err.name,
      duration,
    });
    
    // Track email send failure metrics
    if (params.organizationId) {
      trackEmailSend({
        emailType: 'screening_invitation',
        organizationId: params.organizationId,
        duration,
        success: false,
        errorType: err.name,
      });
    }
    
    throw err;
  }
}

/**
 * Comment email parameters
 */
export interface CommentEmailParams {
  to: string;
  candidateName: string;
  positionTitle: string;
  commenterName: string;
  commentBody: string;
  organizationName: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  organizationId?: string; // For metrics tracking
}

/**
 * Send comment as email using Resend template
 * 
 * Template variables:
 * - candidate_name: Candidate's full name
 * - position_title: Job position title
 * - comment_body: The comment content
 * - commenter_name: The name of the person who posted the comment in Linear
 * 
 * Requirements: 2.1, 2.3
 * 
 * @param params - Comment email parameters
 * @returns Email send response with message ID
 * @throws Error if email sending fails after retries
 */
export async function sendCommentEmail(params: CommentEmailParams) {
  const startTime = Date.now();
  
  try {
    // Validate required parameters
    if (!params.to || !params.candidateName || !params.positionTitle || !params.commentBody || !params.commenterName) {
      const error = new Error('Missing required email parameters');
      logger.error('Email validation failed', error, {
        hasTo: !!params.to,
        hasCandidateName: !!params.candidateName,
        hasPositionTitle: !!params.positionTitle,
        hasCommentBody: !!params.commentBody,
        hasCommenterName: !!params.commenterName,
      });
      throw error;
    }

    const headers: Record<string, string> = {
      'X-Email-Type': 'comment',
    };

    if (params.inReplyTo) {
      headers['In-Reply-To'] = `<${params.inReplyTo}>`;
    }

    if (params.references && params.references.length > 0) {
      headers['References'] = params.references.map(id => `<${id}>`).join(' ');
    }

    const { data, error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to: params.to,
      subject: `Update on your application for ${params.positionTitle}`,
      template: {
        id: TEMPLATE_IDS.COMMENT,
        variables: {
          candidate_name: params.candidateName,
          position_title: params.positionTitle,
          comment_body: params.commentBody,
          commenter_name: params.commenterName,
          organization_name: params.organizationName,
        },
      },
      replyTo: params.replyTo,
      headers,
      tags: [
        { name: 'type', value: 'comment' },
      ],
    });

    if (error) {
      const err = new Error(`Failed to send comment email: ${error.message}`);
      logger.error('Resend API returned error', err, {
        to: params.to,
        candidateName: params.candidateName,
        positionTitle: params.positionTitle,
        errorName: error.name,
        errorMessage: error.message,
        duration: Date.now() - startTime,
      });
      throw err;
    }

    const duration = Date.now() - startTime;
    logger.info('Comment email sent successfully', {
      emailId: data?.id,
      to: params.to,
      candidateName: params.candidateName,
      positionTitle: params.positionTitle,
      commenterName: params.commenterName,
      duration,
    });

    // Track email send metrics
    if (params.organizationId) {
      trackEmailSend({
        emailType: 'comment',
        organizationId: params.organizationId,
        duration,
        success: true,
      });
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error('Failed to send comment email', err, {
      to: params.to,
      candidateName: params.candidateName,
      positionTitle: params.positionTitle,
      errorType: err.name,
      duration,
    });
    
    // Track email send failure metrics
    if (params.organizationId) {
      trackEmailSend({
        emailType: 'comment',
        organizationId: params.organizationId,
        duration,
        success: false,
        errorType: err.name,
      });
    }
    
    throw err;
  }
}
