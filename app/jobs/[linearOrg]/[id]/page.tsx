/**
 * Public Job Board - Job Details
 *
 * Server-side rendered page showing detailed information for a specific job listing
 */

import { Card, CardTitle } from "@/components/ui/card";
import { ApplicationForm } from "@/components/application-form";
import { getJobListingByIdForOrg } from "@/lib/linear/projects";
import Link from "next/link";
import { notFound } from "next/navigation";

interface JobDetailsPageProps {
  params: Promise<{
    linearOrg: string;
    id: string;
  }>;
}

export default async function JobDetailsPage({ params }: JobDetailsPageProps) {
  const { linearOrg, id } = await params;

  let job;

  try {
    job = await getJobListingByIdForOrg(linearOrg, id);
  } catch (err) {
    console.error("Failed to fetch job:", err);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Error Loading Job
            </h2>
            <p className="text-red-700">
              Failed to load job details. Please try again later.
            </p>
            <Link
              href={`/jobs/${linearOrg}`}
              className="inline-block mt-4 text-red-800 hover:text-red-900 underline"
            >
              Back to all jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-6">
        {/* Back link */}
        <Link
          href={`/jobs/${linearOrg}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to all jobs
        </Link>

        {/* Job header */}
        <Card className="px-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">{job.title}</h1>
            {job.isAIGenerated && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 inline-flex items-center">
                AI Enhanced
              </span>
            )}
          </div>
          {job.description ? (
            <div className="prose prose-gray max-w-none">
              {job.description.split("\n").map(
                (paragraph, index) =>
                  paragraph.trim() && (
                    <p key={index} className="text-gray-700 mb-4">
                      {paragraph}
                    </p>
                  )
              )}
            </div>
          ) : null}

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
            <span>Updated {new Date(job.updatedAt).toLocaleDateString()}</span>
          </div>
        </Card>

        {/* Job description */}
        <Card className="px-6">
          <CardTitle>About this role</CardTitle>

          {job.content ? (
            <div
              className="prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: job.content }}
            />
          ) : (
            <p className="text-gray-500 italic">
              No description available for this position.
            </p>
          )}
        </Card>

        {/* Application Form */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Ready to apply?
          </h2>
          <p className="text-gray-600 mb-6">
            Submit your application and we'll get back to you as soon as
            possible.
          </p>

          <ApplicationForm jobId={id} linearOrg={linearOrg} />
        </div>
      </div>
    </div>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: JobDetailsPageProps) {
  const { linearOrg, id } = await params;

  try {
    const job = await getJobListingByIdForOrg(linearOrg, id);

    if (!job) {
      return {
        title: "Job Not Found",
      };
    }

    return {
      title: `${job.title} - Careers`,
      description:
        job.description?.substring(0, 160) || "View job details and apply",
    };
  } catch {
    return {
      title: "Job Details",
    };
  }
}
