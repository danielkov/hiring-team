/**
 * Linear Project Management
 * 
 * Handles fetching and managing Linear Projects for job listings
 */

import { getLinearClient } from './client';
import { Project, ProjectStatus } from '@linear/sdk';
import { getATSContainerInitiativeId } from './metadata';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { JobListing } from '@/types';

/**
 * Fetch all Projects from the ATS Container Initiative
 */
export async function syncProjects(): Promise<Project[]> {
  const { user } = await withAuth();
  
  if (!user) {
    throw new Error('No active session');
  }

  // Get the ATS Container Initiative ID
  const initiativeId = await getATSContainerInitiativeId(user.id);
  
  if (!initiativeId) {
    throw new Error('ATS Container not configured. Please complete onboarding.');
  }

  const client = await getLinearClient();
  
  // Fetch the Initiative
  const initiative = await client.initiative(initiativeId);
  
  if (!initiative) {
    throw new Error('ATS Container Initiative not found');
  }

  // Fetch all Projects within this Initiative
  const projects = await initiative.projects();
  
  return projects.nodes;
}

/**
 * Check if a project has "In Progress" status
 * In Linear, we check the project's status
 */
async function isProjectInProgress(project: Project): Promise<boolean> {
  // Check if project has started and is not completed
  const status = await project.status;
  
  // A project is "In Progress" if it has some progress but is not complete
  // progress is a number between 0 and 1
  return status?.name === "In Progress";
}

/**
 * Get published job listings (Projects with "In Progress" status)
 */
export async function getPublishedJobs(): Promise<JobListing[]> {
  const projects = await syncProjects();
  
  // Transform to JobListing format and filter for "In Progress" status
  const jobListings: JobListing[] = [];
  
  for (const project of projects) {
    // Check if project is in progress
    const inProgress = await isProjectInProgress(project);
    
    if (!inProgress) {
      continue;
    }
    
    // Check for ai-generated label
    const labels = await project.labels();
    const hasAIGeneratedLabel = labels.nodes.some(
      (label) => label.name === 'ai-generated'
    );

    jobListings.push({
      id: project.id,
      title: project.name,
      description: project.description || '',
      status: 'In Progress',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isAIGenerated: hasAIGeneratedLabel,
    });
  }

  return jobListings;
}

/**
 * Get a specific Project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  const client = await getLinearClient();
  
  try {
    const project = await client.project(projectId);
    return project;
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return null;
  }
}

/**
 * Get a specific job listing by ID
 */
export async function getJobListingById(projectId: string): Promise<JobListing | null> {
  const project = await getProjectById(projectId);
  
  if (!project) {
    return null;
  }

  // Check if project is published (In Progress status)
  const inProgress = await isProjectInProgress(project);
  
  if (!inProgress) {
    return null;
  }

  // Check for ai-generated label
  const labels = await project.labels();
  const hasAIGeneratedLabel = labels.nodes.some(
    (label) => label.name === 'ai-generated'
  );

  return {
    id: project.id,
    title: project.name,
    description: project.description || '',
    status: 'In Progress',
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    isAIGenerated: hasAIGeneratedLabel,
  };
}

/**
 * Get published jobs for a specific Linear organization
 * This is used for the public job board
 */
export async function getPublishedJobsByOrg(_linearOrgId: string): Promise<JobListing[]> {
  // For now, we'll use the authenticated user's context
  // In a production system, you might want to cache this data
  // or use a different approach for public access
  return await getPublishedJobs();
}
