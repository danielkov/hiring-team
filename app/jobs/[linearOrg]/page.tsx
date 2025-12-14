/**
 * Public Job Board - Organization Listings
 *
 * Server-side rendered page showing all published job listings for a Linear organization
 */

import Link from 'next/link';
import Image from 'next/image';

import { getPublishedJobsByOrg, getOrgInfo } from '@/lib/linear/projects';
import { JobListing } from '@/types';
import { SparklesIcon, BriefcaseIcon, CalendarIcon, ArrowRightIcon } from 'lucide-react';

interface JobBoardPageProps {
  params: Promise<{
    linearOrg: string;
  }>;
}

export default async function JobBoardPage({ params }: JobBoardPageProps) {
  const { linearOrg } = await params;

  console.log('[JobBoardPage] Starting, linearOrg:', linearOrg);

  let jobs: JobListing[] = [];
  let error: string | null = null;
  let orgInfo = null;

  try {
    console.log('[JobBoardPage] About to call getPublishedJobsByOrg');
    [jobs, orgInfo] = await Promise.all([
      getPublishedJobsByOrg(linearOrg),
      getOrgInfo(linearOrg),
    ]);
    console.log('[JobBoardPage] getPublishedJobsByOrg returned', jobs.length, 'jobs');
    console.log('[JobBoardPage] getOrgInfo returned:', orgInfo?.name);
  } catch (err) {
    console.error('[JobBoardPage] Failed to fetch jobs:', err);
    error = 'Failed to load job listings. Please try again later.';
  }

  const jsonLd = jobs.length > 0 && orgInfo ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": jobs.map((job, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "JobPosting",
        "title": job.title,
        "description": job.description,
        "datePosted": job.createdAt.toISOString(),
        "hiringOrganization": {
          "@type": "Organization",
          "name": orgInfo.name,
          ...(orgInfo.logoUrl && { "logo": orgInfo.logoUrl }),
        },
        "url": `${process.env.NEXT_PUBLIC_APP_URL || ''}/jobs/${linearOrg}/${job.id}`
      }
    }))
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-16 text-center">
          {orgInfo?.logoUrl ? (
            <div className="inline-flex items-center justify-center mb-6">
              <Image
                src={orgInfo.logoUrl}
                alt={`${orgInfo.name} logo`}
                width={80}
                height={80}
                className="rounded-xl"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center p-2 bg-blue-50 rounded-xl mb-6">
              <BriefcaseIcon className="w-8 h-8 text-blue-600" />
            </div>
          )}
          {orgInfo && (
            <p className="text-lg font-medium text-gray-600 mb-3">
              {orgInfo.name}
            </p>
          )}
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            Open Positions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join our team and help us build something amazing
          </p>
          {!error && jobs.length > 0 && (
            <p className="mt-4 text-sm text-gray-500">
              {jobs.length} {jobs.length === 1 ? 'position' : 'positions'} available
            </p>
          )}
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <p className="text-red-800 text-center font-medium">{error}</p>
          </div>
        )}

        {!error && jobs.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <BriefcaseIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 text-xl font-semibold mb-2">
              No open positions
            </p>
            <p className="text-gray-600">
              Check back soon for new opportunities!
            </p>
          </div>
        )}

        {!error && jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${linearOrg}/${job.id}`}
                className="group block bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                          <BriefcaseIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                            {job.title}
                          </h2>
                          {job.isAIGenerated && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200">
                              <SparklesIcon className="w-3 h-3" />
                              AI Enhanced
                            </span>
                          )}
                        </div>
                      </div>

                      {job.description && (
                        <p className="text-gray-600 line-clamp-2 mb-4 text-base leading-relaxed">
                          {job.description.substring(0, 200)}
                          {job.description.length > 200 ? '...' : ''}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4" />
                          Posted {new Date(job.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                        <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {orgInfo && (
          <div className="mt-16 pt-12 border-t border-gray-200">
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
                    We're hiring talented people to join our team. Explore our open positions above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: JobBoardPageProps) {
  const { linearOrg } = await params;

  const orgInfo = await getOrgInfo(linearOrg);
  const orgName = orgInfo?.name || linearOrg;

  return {
    title: `Careers - ${orgName}`,
    description: `View open positions at ${orgName} and join our team`,
  };
}
