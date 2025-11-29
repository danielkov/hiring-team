/**
 * Linear Project Management
 * 
 * Handles fetching and managing Linear Projects for job listings
 */

import { createLinearClient, getLinearClient } from './client';
import { Project } from '@linear/sdk';
import { getATSContainerInitiativeId } from './metadata';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { JobListing } from '@/types';
import { getOrgConfig } from '../redis';
import { remark } from 'remark';
import html from 'remark-html';

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
      content: project.content || '',
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
    content: project.content || '',
    status: 'In Progress',
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    isAIGenerated: hasAIGeneratedLabel,
  };
}

/**
 * Get a specific job listing by ID for a specific organization (unauthenticated)
 * This is used for the public job board and uses the org config from Redis
 */
export async function getJobListingByIdForOrg(linearOrg: string, projectId: string): Promise<JobListing | null> {
  
  // Get the org config from Redis
  const config = await getOrgConfig(linearOrg);
  
  if (!config) {
    throw new Error('Organization configuration not found. Please sync your configuration to Redis first.');
  }
  
  // Create Linear client with org token
  const client = createLinearClient(config.accessToken);
  
  try {
    // Fetch the project
    const project = await client.project(projectId);
    
    if (!project) {
      return null;
    }

    // Check if project is published (In Progress status)
    const inProgress = await isProjectInProgress(project);
    
    if (!inProgress) {
      return null;
    }

    // Verify the project belongs to the correct initiative
    const projectInitiatives = await project.initiatives();
    const belongsToAtsContainer = projectInitiatives.nodes.some(
      (initiative) => initiative.id === config.atsContainerInitiativeId
    );

    if (!belongsToAtsContainer) {
      return null;
    }

    // Check for ai-generated label
    const labels = await project.labels();
    const hasAIGeneratedLabel = labels.nodes.some(
      (label) => label.name === 'ai-generated'
    );

    const processedContent = await remark()
      .use(html)
      .process(project.content || '');
    const contentHtml = processedContent.toString();

    return {
      id: project.id,
      title: project.name,
      description: project.description || '',
      // when we fetch the job using this utility, we also convert markdown to HTML
      content: contentHtml,
      status: 'In Progress',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isAIGenerated: hasAIGeneratedLabel,
    };
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return null;
  }
}

/**
 * Get published jobs for a specific Linear organization
 * This is used for the public job board and uses the org config from Redis
 */
export async function getPublishedJobsByOrg(linearOrg: string): Promise<JobListing[]> {
  
  // Get the org config from Redis
  const config = await getOrgConfig(linearOrg);
  
  if (!config) {
    throw new Error('Organization configuration not found. Please sync your configuration to Redis first.');
  }
  
  // Create Linear client with org token
  const client = createLinearClient(config.accessToken);
  
  // Fetch the organization
  const organization = await client.organization;
  
  // Verify we're accessing the correct organization
  if (organization.name !== linearOrg) {
    throw new Error('Organization mismatch');
  }
  
  // Fetch all projects with "In Progress" status using the initiative ID from config
  const projectsConnection = await client.projects({
    filter: {
      status: {
        name: {
          eq: "In Progress"
        },
      },
      initiatives: {
        id: {
          eq: config.atsContainerInitiativeId,
        },
      },
    },
  });
  
  const projects = projectsConnection.nodes;
  
  // Transform to JobListing format
  const jobListings: JobListing[] = [];
  
  for (const project of projects) {
    // Check for ai-generated label
    const labels = await project.labels();
    const hasAIGeneratedLabel = labels.nodes.some(
      (label) => label.name === 'ai-generated'
    );

    jobListings.push({
      id: project.id,
      title: project.name,
      description: project.description || '',
      content: project.content || '',
      status: 'In Progress',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isAIGenerated: hasAIGeneratedLabel,
    });
  }

  return jobListings;
}
