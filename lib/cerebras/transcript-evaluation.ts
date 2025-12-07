'use server';

import { cerebras } from "./client";
import { trackAIOperation, measureDuration } from "@/lib/datadog/metrics";
import { logger } from "@/lib/datadog/logger";
import { emitAIOperationFailure } from "@/lib/datadog/events";
import { TranscriptEvaluation } from "@/types";

const systemPrompt = `You are an expert HR evaluator specializing in analyzing screening call transcripts. Your task is to evaluate a transcript from an AI-conducted preliminary screening interview and determine if the candidate should pass, fail, or if the result is inconclusive.

## Instructions:

1. Carefully analyze the transcript, looking for:
   - Alignment with job requirements and qualifications
   - Communication skills and professionalism
   - Technical competency (if applicable to the role)
   - Cultural fit indicators
   - Red flags or concerns (e.g., unprofessional behavior, major skill gaps)
   - Candidate engagement and interest level

2. Compare the candidate's responses against:
   - Job description requirements
   - Qualifications mentioned in their application
   - Expected competency level for the role
   - Professional communication standards

3. Determine the evaluation result:
   - **PASS**: Candidate demonstrates strong alignment with requirements, good communication skills, and should advance to the next stage
   - **FAIL**: Candidate shows clear disqualifying factors, major skill gaps, or significant concerns that warrant rejection
   - **INCONCLUSIVE**: Insufficient information to make a clear determination, or candidate shows mixed signals requiring human review

4. Assess your confidence level:
   - **HIGH**: Clear evidence supports the decision, minimal ambiguity
   - **MEDIUM**: Reasonable evidence supports the decision, some ambiguity exists
   - **LOW**: Limited evidence, significant ambiguity, or borderline case

5. Provide specific reasoning:
   - List key points that support your decision with specific evidence from the transcript
   - Highlight strengths and weaknesses observed
   - Note any red flags or exceptional qualities
   - Be objective and evidence-based

## Output Format:

You must respond with a valid JSON object in the following format:

{
  "result": "pass" | "fail" | "inconclusive",
  "reasoning": "A clear explanation of your evaluation with specific evidence",
  "confidence": "high" | "medium" | "low",
  "keyPoints": [
    "Specific observation 1 with evidence from transcript",
    "Specific observation 2 with evidence from transcript",
    "Specific observation 3 with evidence from transcript"
  ]
}

Important: Return ONLY the JSON object, no additional text or formatting.`;

/**
 * Evaluate a screening transcript to determine pass/fail/inconclusive
 * 
 * Requirements: 7.2
 * 
 * @param transcript The complete transcript from the ElevenLabs screening session
 * @param jobDescription The job description from the Linear Project
 * @param candidateApplication The candidate's application content from Linear Issue
 * @param linearOrgId Linear organization ID for logging and tracking
 * @returns Evaluation result with pass/fail/inconclusive determination
 */
export async function evaluateTranscript(
  transcript: string,
  jobDescription: string,
  candidateApplication: string,
  linearOrgId: string
): Promise<TranscriptEvaluation> {
  const startTime = Date.now();
  let errorType: string | undefined;

  try {
    logger.info('Starting transcript evaluation', {
      transcriptLength: transcript.length,
      jobDescriptionLength: jobDescription.length,
      candidateApplicationLength: candidateApplication.length,
      linearOrgId,
    });

    // Validate inputs
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript is required and cannot be empty');
    }

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
            content: `Job Description:\n\n${jobDescription}\n\n---\n\nCandidate Application:\n\n${candidateApplication}\n\n---\n\nTranscript:\n\n${transcript}`,
          },
        ],
        model: "llama-3.3-70b",
        max_completion_tokens: 2048,
        temperature: 0.2,
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
      throw new Error('No response from transcript evaluation');
    }

    // Parse the JSON response
    const parsed = JSON.parse(output.trim());

    // Validate the response structure
    if (!parsed.result || !['pass', 'fail', 'inconclusive'].includes(parsed.result)) {
      throw new Error('Invalid result in AI response: must be pass, fail, or inconclusive');
    }

    if (!parsed.confidence || !['high', 'medium', 'low'].includes(parsed.confidence)) {
      throw new Error('Invalid confidence level in AI response: must be high, medium, or low');
    }

    // Validate keyPoints is an array
    if (!parsed.keyPoints || !Array.isArray(parsed.keyPoints)) {
      logger.warn('Missing or invalid keyPoints in response, using empty array', {
        linearOrgId,
      });
      parsed.keyPoints = [];
    }

    // Filter out invalid key points
    const validKeyPoints = parsed.keyPoints.filter(
      (point: any) => typeof point === 'string' && point.trim().length > 0
    );

    // Track successful AI operation
    trackAIOperation({
      operation: 'transcript-evaluation',
      model: 'llama-3.3-70b',
      latency: duration,
      success: true,
    });

    logger.info('Transcript evaluation completed', {
      duration,
      result: parsed.result,
      confidence: parsed.confidence,
      keyPointsCount: validKeyPoints.length,
      linearOrgId,
    });

    return {
      result: parsed.result,
      reasoning: parsed.reasoning || 'No reasoning provided',
      confidence: parsed.confidence,
      keyPoints: validKeyPoints,
    };
  } catch (error) {
    errorType = error instanceof Error ? error.name : 'UnknownError';

    const latency = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    // Track failed AI operation
    trackAIOperation({
      operation: 'transcript-evaluation',
      model: 'llama-3.3-70b',
      latency,
      success: false,
      errorType,
    });

    logger.error('Error evaluating transcript', err, {
      errorType,
      latency,
      linearOrgId,
    });

    // Emit critical failure event
    emitAIOperationFailure('transcript-evaluation', err, {
      model: 'llama-3.3-70b',
      latency,
      linearOrgId,
    });

    // Fallback to inconclusive on error - requires human review
    logger.warn('Falling back to inconclusive result due to evaluation error', {
      linearOrgId,
      error: err.message,
    });

    return {
      result: 'inconclusive',
      reasoning: `Transcript evaluation failed: ${err.message}. Manual review required.`,
      confidence: 'low',
      keyPoints: ['AI evaluation service error - system defaulting to manual review'],
    };
  }
}
