'use server';

import { cerebras } from "./client";
import { trackAIOperation, measureDuration } from "@/lib/datadog/metrics";
import { logger } from "@/lib/datadog/logger";
import { emitAIOperationFailure } from "@/lib/datadog/events";

const systemPrompt = `You are an expert HR interviewer and conversation designer. Your task is to generate 3-5 focused conversation pointers that an AI interviewer should explore during a preliminary screening call with a candidate.

## Instructions:

1. Analyze the job description to identify:
   - Key qualifications and requirements
   - Critical technical or domain skills
   - Experience level expectations
   - Cultural fit indicators mentioned

2. Review the candidate's application to identify:
   - Relevant experience and skills they've highlighted
   - Potential gaps or areas needing clarification
   - Interesting projects or achievements to explore
   - Areas where their background aligns or diverges from requirements

3. Generate 3-5 conversation pointers that:
   - Focus on the most important qualifications for the role
   - Explore areas where the candidate's background needs clarification
   - Assess both technical competency and cultural fit
   - Are specific and actionable (not generic questions)
   - Can be covered in a 10-15 minute screening call

4. Each pointer should be:
   - Concise (1-2 sentences)
   - Specific to this candidate and role
   - Designed to elicit meaningful information
   - Focused on assessment, not just information gathering

## Output Format:

You must respond with a valid JSON object in the following format:

{
  "pointers": [
    "Specific conversation pointer 1",
    "Specific conversation pointer 2",
    "Specific conversation pointer 3"
  ]
}

Important: Return ONLY the JSON object, no additional text or formatting.`;

export interface ConversationPointers {
  pointers: string[];
}

/**
 * Generate conversation pointers for an AI screening interview
 * 
 * Requirements: 6.4
 * 
 * @param jobDescription The job description from the Linear Project
 * @param candidateApplication The candidate's application content from Linear Issue
 * @param linearOrgId Linear organization ID for logging and tracking
 * @returns Array of conversation pointers for the AI interviewer
 */
export async function generateConversationPointers(
  jobDescription: string,
  candidateApplication: string,
  linearOrgId: string
): Promise<ConversationPointers> {
  const startTime = Date.now();
  let errorType: string | undefined;

  try {
    logger.info('Starting conversation pointers generation', {
      jobDescriptionLength: jobDescription.length,
      candidateApplicationLength: candidateApplication.length,
      linearOrgId,
    });

    // Validate inputs
    if (!jobDescription || jobDescription.trim().length === 0) {
      throw new Error('Job description is required and cannot be empty');
    }

    if (!candidateApplication || candidateApplication.trim().length === 0) {
      throw new Error('Candidate application is required and cannot be empty');
    }

    const { result: completion, duration } = await measureDuration(() =>
      cerebras.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Job Description:\n\n${jobDescription}\n\n---\n\nCandidate Application:\n\n${candidateApplication}`,
          },
        ],
        model: "llama-3.3-70b",
        max_completion_tokens: 1024,
        temperature: 0.3,
        top_p: 1,
        stream: false,
        response_format: {
          type: "json_object",
        },
      })
    );

    // @ts-expect-error types don't seem to want to resolve here.
    const output = completion.choices?.[0]?.message?.content;

    if (!output) {
      throw new Error('No response from conversation pointers generation');
    }

    // Parse the JSON response
    const parsed = JSON.parse(output.trim());

    // Validate the response structure
    if (!parsed.pointers || !Array.isArray(parsed.pointers)) {
      throw new Error('Invalid response structure: missing or invalid pointers array');
    }

    if (parsed.pointers.length === 0) {
      throw new Error('No conversation pointers generated');
    }

    // Validate each pointer is a non-empty string
    const validPointers = parsed.pointers.filter(
      (pointer: any) => typeof pointer === 'string' && pointer.trim().length > 0
    );

    if (validPointers.length === 0) {
      throw new Error('No valid conversation pointers in response');
    }

    // Track successful AI operation
    trackAIOperation({
      operation: 'conversation-pointers',
      model: 'llama-3.3-70b',
      latency: duration,
      success: true,
    });

    logger.info('Conversation pointers generation completed', {
      duration,
      pointerCount: validPointers.length,
      linearOrgId,
    });

    return {
      pointers: validPointers,
    };
  } catch (error) {
    errorType = error instanceof Error ? error.name : 'UnknownError';

    const latency = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    // Track failed AI operation
    trackAIOperation({
      operation: 'conversation-pointers',
      model: 'llama-3.3-70b',
      latency,
      success: false,
      errorType,
    });

    logger.error('Error generating conversation pointers', err, {
      errorType,
      latency,
      linearOrgId,
    });

    // Emit critical failure event
    emitAIOperationFailure('conversation-pointers', err, {
      model: 'llama-3.3-70b',
      latency,
      linearOrgId,
    });

    // Fallback to generic pointers on error
    logger.warn('Falling back to generic conversation pointers', {
      linearOrgId,
    });

    return {
      pointers: [
        "Discuss the candidate's relevant experience and how it aligns with the role requirements",
        "Explore the candidate's technical skills and competencies mentioned in their application",
        "Assess the candidate's motivation for applying and interest in the position",
        "Clarify any gaps or questions about the candidate's background and qualifications",
      ],
    };
  }
}
