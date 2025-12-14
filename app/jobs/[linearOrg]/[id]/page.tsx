/**
 * Public Job Board - Job Details
 *
 * Server-side rendered page showing detailed information for a specific job listing
 */

import { Card, CardTitle } from "@/components/ui/card";
import { ApplicationForm } from "@/components/application-form";
import { getJobListingByIdForOrg, getOrgInfo } from "@/lib/linear/projects";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, ClockIcon, SparklesIcon, BriefcaseIcon } from "lucide-react";

interface JobDetailsPageProps {
  params: Promise<{
    linearOrg: string;
    id: string;
  }>;
}

export default async function JobDetailsPage({ params }: JobDetailsPageProps) {
  const { linearOrg, id } = await params;

  let job;
  let orgInfo = null;

  try {
    [job, orgInfo] = await Promise.all([
      getJobListingByIdForOrg(linearOrg, id),
      getOrgInfo(linearOrg),
    ]);
  } catch (err) {
    console.error("Failed to fetch job:", err);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-red-900 mb-3">
              Error Loading Job
            </h2>
            <p className="text-red-700 mb-6">
              Failed to load job details. Please try again later.
            </p>
            <Link
              href={`/jobs/${linearOrg}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-900 font-medium rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
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

  const jsonLd = orgInfo ? {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.content || job.description,
    "datePosted": job.createdAt.toISOString(),
    "hiringOrganization": {
      "@type": "Organization",
      "name": orgInfo.name,
      ...(orgInfo.logoUrl && { "logo": orgInfo.logoUrl }),
    }
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-8">
        <Link
          href={`/jobs/${linearOrg}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group w-fit"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to all jobs
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8 sm:p-10 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
                {job.title}
              </h1>
              {job.isAIGenerated && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 flex-shrink-0">
                  <SparklesIcon className="w-4 h-4" />
                  AI Enhanced
                </span>
              )}
            </div>

            {job.description && (
              <div className="prose prose-gray max-w-none mb-6">
                {job.description.split("\n").map(
                  (paragraph, index) =>
                    paragraph.trim() && (
                      <p key={index} className="text-lg text-gray-700 leading-relaxed mb-3">
                        {paragraph}
                      </p>
                    )
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span>
                  Posted{" "}
                  {new Date(job.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 text-gray-600">
                <ClockIcon className="w-4 h-4 text-gray-400" />
                <span>
                  Updated{" "}
                  {new Date(job.updatedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">About this role</h2>

            {job.content ? (
              <div
                className="prose prose-lg prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
                dangerouslySetInnerHTML={{ __html: job.content }}
              />
            ) : (
              <p className="text-gray-500 italic text-center py-8">
                No description available for this position.
              </p>
            )}
          </div>
        </div>

        {orgInfo && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {orgInfo.logoUrl ? (
                <div className="flex-shrink-0">
                  <Image
                    src={orgInfo.logoUrl}
                    alt={`${orgInfo.name} logo`}
                    width={96}
                    height={96}
                    className="rounded-2xl"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                  <BriefcaseIcon className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  About {orgInfo.name}
                </h2>
                <p className="text-gray-600 text-lg">
                  We're hiring talented people to join our team.{' '}
                  <Link href={`/jobs/${linearOrg}`} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                    Explore our open positions
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to apply?</h2>
          <p className="text-gray-700 mb-6 text-lg">
            Submit your application and we'll get back to you as soon as possible.
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
    const [job, orgInfo] = await Promise.all([
      getJobListingByIdForOrg(linearOrg, id),
      getOrgInfo(linearOrg),
    ]);

    if (!job) {
      return {
        title: "Job Not Found",
      };
    }

    const orgName = orgInfo?.name || linearOrg;

    return {
      title: `${job.title} - ${orgName}`,
      description:
        job.description?.substring(0, 160) || "View job details and apply",
    };
  } catch {
    return {
      title: "Job Details",
    };
  }
}
