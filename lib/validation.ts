/**
 * Validation utilities for application submissions
 */

import { ValidationError } from '@/types';

/**
 * Validates an application submission
 * 
 * Requirements:
 * - Name must be non-empty
 * - Email must be valid format
 * - CV file must be present
 * 
 * @param data Application data to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateApplication(data: {
  name?: string;
  email?: string;
  cvFile?: File | null;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate name
  if (!data.name || !data.name.trim()) {
    errors.push({
      field: 'name',
      message: 'Name is required'
    });
  }

  // Validate email
  if (!data.email || !data.email.trim()) {
    errors.push({
      field: 'email',
      message: 'Email is required'
    });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push({
        field: 'email',
        message: 'Please enter a valid email address'
      });
    }
  }

  // Validate CV file
  if (!data.cvFile) {
    errors.push({
      field: 'cv',
      message: 'CV is required'
    });
  }

  return errors;
}

/**
 * Validates file type and size
 * 
 * @param file File to validate
 * @param maxSizeBytes Maximum file size in bytes (default 10MB)
 * @returns Validation error or null if valid
 */
export function validateFile(
  file: File,
  maxSizeBytes: number = 10 * 1024 * 1024
): ValidationError | null {
  const acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!acceptedTypes.includes(file.type)) {
    return {
      field: 'file',
      message: 'File must be PDF, DOC, or DOCX format'
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      field: 'file',
      message: `File size must be less than ${maxSizeBytes / 1024 / 1024}MB`
    };
  }

  return null;
}
