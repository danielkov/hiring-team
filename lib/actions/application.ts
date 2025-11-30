'use server';

/**
 * Server Actions for Application Submission
 * 
 * Handles job application submissions with validation
 * Requirements: 3.1, 3.2
 */

import { validateApplication, validateFile } from '@/lib/validation';
import { ApplicationResult } from '@/types';

/**
 * Submits a job application
 * 
 * @param formData Form data containing application details
 * @returns Application result with success status and any errors
 */
export async function submitApplication(
  formData: FormData
): Promise<ApplicationResult> {
  try {
    // Extract form data
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const jobId = formData.get('jobId') as string;
    const linearOrg = formData.get('linearOrg') as string;
    const cvFile = formData.get('cv') as File | null;
    const coverLetterFile = formData.get('coverLetter') as File | null;

    // Validate application data
    const validationErrors = validateApplication({
      name,
      email,
      cvFile
    });

    // Validate CV file if present
    if (cvFile) {
      const cvFileError = validateFile(cvFile);
      if (cvFileError) {
        validationErrors.push({
          field: 'cv',
          message: cvFileError.message
        });
      }
    }

    // Validate cover letter file if present
    if (coverLetterFile) {
      const coverLetterError = validateFile(coverLetterFile);
      if (coverLetterError) {
        validationErrors.push({
          field: 'coverLetter',
          message: coverLetterError.message
        });
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors
      };
    }

    // TODO: Task 9 will implement:
    // - Upload CV to SmartBuckets
    // - Create Linear Issue
    // - Attach documents to Issue
    // - Set Issue state to "Triage"
    
    // For now, return success response
    // This will be replaced with actual implementation in task 9
    return {
      success: true,
      // issueId will be added in task 9
    };

  } catch (error) {
    console.error('Application submission error:', error);
    return {
      success: false,
      errors: [{
        field: 'submit',
        message: 'An unexpected error occurred while processing your application'
      }]
    };
  }
}
