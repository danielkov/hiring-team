import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import Image from "next/image";

interface Feature {
  id: string;
  heading: string;
  description: string;
  image: string;
  url: string;
}

interface Feature73Props {
  title?: string;
  description?: string;
  buttonUrl?: string;
  buttonText?: string;
  features?: Feature[];
}

const Feature73 = ({
  title = "Key Features",
  description = "Discover the powerful features that make our platform stand out from the rest. Built with the latest technology and designed for maximum productivity.",
  buttonUrl = "#",
  buttonText = "See all features",
  features = [
    {
      id: "feature-2",
      heading: "Intelligent Candidate Screening",
      description:
        "AI automatically evaluates candidates against job requirements, moving top matches to screening and filtering out poor fits—saving hours of manual review.",
      image: "/linear-issues.png",
      url: "#",
    },
    {
      id: "feature-1",
      heading: "AI-Powered Job Descriptions",
      description:
        "Generate compelling, structured job descriptions in seconds using AI. Just add the enhance label to your Linear project and watch the magic happen.",
      image: "/listings.png",
      url: "#",
    },
    {
      id: "feature-3",
      heading: "Linear-Native Experience",
      description:
        "No context switching. Manage your entire hiring pipeline where your team already works. Projects become jobs, issues become candidates.",
      image: "/linear-initiative.png",
      url: "#",
    },
  ],
}: Feature73Props) => {
  return (
    <section className="py-32">
      <div className="container">
        <div className="mb-8 lg:max-w-sm">
          <h2 className="mb-3 text-3xl font-semibold md:mb-4 md:text-4xl lg:mb-6">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground mb-8 lg:text-lg">
              {description}
            </p>
          )}
          {buttonUrl && (
            <Button variant="link" asChild>
              <a
                href={buttonUrl}
                className="group flex items-center font-medium md:text-base lg:text-lg"
              >
                {buttonText}
                <ArrowRight />
              </a>
            </Button>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="border-border flex flex-col overflow-clip rounded-xl border"
            >
              <a href={feature.url}>
                <Image
                  src={feature.image}
                  alt={feature.heading}
                  width={400}
                  height={600}
                  className="aspect-16/9 h-full w-full object-cover object-center transition-opacity hover:opacity-80"
                />
              </a>
              <div className="px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
                <h3 className="mb-3 text-lg font-semibold md:mb-4 md:text-2xl lg:mb-6">
                  {feature.heading}
                </h3>
                <p className="text-muted-foreground lg:text-lg">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Feature73 };
