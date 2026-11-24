import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/how-it-works", "/sample-report", "/privacy", "/terms"],
      disallow: ["/result/", "/preview/", "/construction", "/api/", "/dashboard", "/sign-in", "/callback"],
    },
    sitemap: "https://www.plainterms.us/sitemap.xml",
  };
}
