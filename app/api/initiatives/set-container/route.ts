/**
 * API Route for Setting ATS Container Initiative
 */

import { NextRequest, NextResponse } from 'next/server';
import { setATSContainer } from '@/lib/linear/initiatives';
import { withAuth } from '@workos-inc/authkit-nextjs';

/**
 * POST /api/initiatives/set-container - Set an Initiative as the ATS Container
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

    await setATSContainer(initiativeId);
    
    return NextResponse.json({
      success: true,
      message: 'ATS Container set successfully',
    });
  } catch (error) {
    console.error('Failed to set ATS Container:', error);
    return NextResponse.json(
      { error: 'Failed to set ATS Container' },
      { status: 500 }
    );
  }
}
