/**
 * Linear Issue Candidate Information Extraction
 *
 * Handles extracting candidate information from Linear issue descriptions
 * by parsing markdown formatting.
 */

/**
 * Candidate information extracted from Linear issues
 */
export interface CandidateInfo {
  name: string;
  email: string;
}

/**
 * Extract candidate information from issue description
 * Parses markdown-formatted fields and handles Linear's markdown link format
 *
 * @param issueDescription - The issue description text
 * @returns Object with name and email, or null if not found
 */
export function extractCandidateInfo(issueDescription: string): CandidateInfo | null {
  if (!issueDescription) {
    return null;
  }

  try {
    let name = 'Candidate';
    let email: string | null = null;

    // Extract name
    const nameMatch = issueDescription.match(/\*?\*?Name:\*?\*?\s*([^\n]+)/i);
    if (nameMatch && nameMatch[1]) {
      name = nameMatch[1].trim();
    }

    // Extract email
    const emailMatch = issueDescription.match(/\*?\*?Email:\*?\*?\s*([^\s\n]+)/i);

    if (emailMatch && emailMatch[1]) {
      let emailCandidate = emailMatch[1].trim();

      // Handle markdown link format: [email@example.com](mailto:email@example.com)
      const markdownLinkMatch = emailCandidate.match(/\[([^\]]+@[^\]]+)\]/);
      if (markdownLinkMatch) {
        emailCandidate = markdownLinkMatch[1];
      }

      // Validate it's a proper email format
      const emailPatternMatch = emailCandidate.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailPatternMatch) {
        email = emailPatternMatch[1];
      }
    }

    // Fallback: look for any email-like pattern in the entire description
    if (!email) {
      const genericEmailMatch = issueDescription.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (genericEmailMatch && genericEmailMatch[1]) {
        email = genericEmailMatch[1].trim();
      }
    }

    if (!email) {
      return null;
    }

    return { name, email };
  } catch (error) {
    return null;
  }
}
