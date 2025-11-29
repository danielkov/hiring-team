/**
 * API Route for Completing Initiative Setup
 * 
 * Sets ATS Container and ensures Tone of Voice Document exists
 */

import { NextRequest, NextResponse } from 'next/server';
import { setATSContainer } from '@/lib/linear/initiatives';
import { ensureToneOfVoiceDocument } from '@/lib/linear/documents';
import { withAuth } from '@workos-inc/authkit-nextjs';

/**
 * POST /api/initiatives/complete-setup - Set ATS Container and create Tone of Voice Document
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await withAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { initiativeId } = body;

    if (!initiativeId || typeof initiativeId !== 'string') {
      return NextResponse.json(
        { error: 'Initiative ID is required' },
        { status: 400 }
      );
    }

    console.log({initiativeId})
    // Set the ATS Container
    await setATSContainer(initiativeId);
    
    // Ensure Tone of Voice Document exists
    const toneOfVoiceDoc = await ensureToneOfVoiceDocument(initiativeId);
    
    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully',
      toneOfVoiceDocumentId: toneOfVoiceDoc.id,
    });
  } catch (error) {
    console.error('Failed to complete setup:', error);
    return NextResponse.json(
      { error: 'Failed to complete setup' },
      { status: 500 }
    );
  }
}
