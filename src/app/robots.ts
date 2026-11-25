import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/tools", "/templates", "/privacy", "/terms"],
      disallow: ["/result/", "/preview/", "/construction", "/api/", "/dashboard", "/documents", "/sign-in", "/callback"],
    },
    sitemap: "https://www.plainterms.us/sitemap.xml",
  };
}
