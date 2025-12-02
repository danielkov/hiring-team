import React from "react";

const DATA = [
  {
    id: 1,
    icon: "https://cdn.simpleicons.org/linear/5E6AD2",
    title: "Linear",
    description:
      "Native integration with Linear. Your projects become jobs, issues become candidates.",
  },
  {
    id: 2,
    icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/slack-icon.svg",
    title: "Slack",
    description:
      "Get instant notifications when candidates apply or move through your pipeline.",
  },
  {
    id: 3,
    icon: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/google-icon.svg",
    title: "Google Jobs",
    description:
      "SEO-friendly job listings that appear in Google search results automatically.",
  },
  {
    id: 4,
    icon: "https://s.magecdn.com/social/tc-linkedin.svg",
    title: "LinkedIn",
    description: "Automatically post jobs to LinkedIn (Coming Soon)",
  },
  {
    id: 5,
    icon: "https://cdn.simpleicons.org/indeed/003A9B",
    title: "Indeed",
    description:
      "Sync your job postings to Indeed for maximum reach (Coming Soon)",
  },
  {
    id: 6,
    icon: "https://cdn.simpleicons.org/greenhouse/00A878",
    title: "Greenhouse",
    description:
      "Import candidates from Greenhouse or sync your hiring data (Coming Soon)",
  },
];

const Integration3 = () => {
  return (
    <section className="py-32">
      <div className="container">
        <div className="mx-auto flex flex-col items-center text-center">
          <div className="flex max-w-5xl flex-col items-center text-center">
            <h1 className="my-6 text-pretty text-4xl font-bold lg:text-6xl">
              Integrations
            </h1>
            <h2 className="text-muted-foreground mb-8 max-w-3xl lg:text-2xl">
              Connect your hiring workflow with the tools you already use.
            </h2>
          </div>

          <div className="flex flex-col justify-center gap-4">
            {DATA.map(({ id, icon, title, description }) => (
              <div key={id} className="flex items-center gap-4 py-4">
                <div className="h-12 w-12 flex-shrink-0">
                  <img
                    src={icon}
                    alt={title}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold">{title}</div>
                  <div className="text-muted-foreground text-sm">
                    {description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Integration3 };
