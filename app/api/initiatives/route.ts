/**
 * API Routes for Initiative Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchInitiatives, createInitiative } from '@/lib/linear/initiatives';
import { withAuth } from '@workos-inc/authkit-nextjs';

/**
 * GET /api/initiatives - Fetch all Initiatives from user's Linear workspace
 */
export async function GET() {
  try {
    const { user } = await withAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const initiatives = await fetchInitiatives();
    
    return NextResponse.json({
      initiatives: initiatives.map(i => ({
        id: i.id,
        name: i.name,
        description: i.description,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch initiatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch initiatives' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/initiatives - Create a new Initiative
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
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Initiative name is required' },
        { status: 400 }
      );
    }

    const initiative = await createInitiative(name.trim(), description);
    
    return NextResponse.json({
      initiative: {
        id: initiative.id,
        name: initiative.name,
        description: initiative.description,
      },
    });
  } catch (error) {
    console.error('Failed to create initiative:', error);
    return NextResponse.json(
      { error: 'Failed to create initiative' },
      { status: 500 }
    );
  }
}
