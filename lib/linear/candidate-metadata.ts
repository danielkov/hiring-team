/**
 * Linear Issue Candidate Metadata Management
 * 
 * Handles storing and retrieving structured candidate metadata from Linear issue descriptions
 * using HTML comments to avoid parsing fragile markdown formatting.
 */

import { randomUUID } from 'crypto';

/**
 * Candidate metadata stored in Linear issues
 */
export interface CandidateMetadata {
  email: string;
  name: string;
  threadId: string; // Stable ID for email threading
  createdAt: string; // ISO timestamp
  version: number; // For future schema migrations
}

/**
 * Generate metadata for a new candidate issue
 */
export function generateCandidateMetadata(name: string, email: string): CandidateMetadata {
  return {
    email,
    name,
    threadId: randomUUID(),
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

/**
 * Embed metadata as HTML comment in issue description
 */
export function embedCandidateMetadata(description: string, metadata: CandidateMetadata): string {
  const metadataComment = `<!-- candidate-metadata:${JSON.stringify(metadata)} -->`;
  return `${metadataComment}\n\n${description}`;
}

/**
 * Extract candidate metadata from issue description
 */
export function extractCandidateMetadata(description: string): CandidateMetadata | null {
  if (!description) {
    return null;
  }

  try {
    // Look for candidate metadata comment pattern
    const metadataMatch = description.match(/<!-- candidate-metadata:(.+?) -->/);
    
    if (!metadataMatch || !metadataMatch[1]) {
      return null;
    }

    const metadata = JSON.parse(metadataMatch[1]) as CandidateMetadata;
    
    // Validate required fields
    if (!metadata.email || !metadata.name || !metadata.threadId) {
      return null;
    }

    return metadata;
  } catch (error) {
    // Invalid JSON or parsing error
    return null;
  }
}

/**
 * Update candidate metadata in existing issue description
 */
export function updateCandidateMetadata(description: string, newMetadata: Partial<CandidateMetadata>): string {
  const existingMetadata = extractCandidateMetadata(description);
  
  if (!existingMetadata) {
    throw new Error('No existing candidate metadata found in description');
  }

  const updatedMetadata = { ...existingMetadata, ...newMetadata };
  
  // Remove old metadata comment
  const descriptionWithoutMetadata = description.replace(/<!-- candidate-metadata:.+? -->\n?\n?/, '');
  
  // Add updated metadata
  return embedCandidateMetadata(descriptionWithoutMetadata, updatedMetadata);
}

/**
 * Get clean description without candidate metadata comment
 */
export function getCleanDescription(description: string): string {
  return description.replace(/<!-- candidate-metadata:.+? -->\n?\n?/, '').trim();
}
