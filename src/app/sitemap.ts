import type { MetadataRoute } from "next";

const SITE_URL = "https://www.plainterms.us";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...["/tools", "/tools/write-a-letter", "/tools/explain-a-letter", "/tools/compare-versions", "/tools/ask", "/tools/check-a-contractor", "/templates"].map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
