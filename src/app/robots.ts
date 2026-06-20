import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/analyze", "/sample-report", "/privacy", "/terms"],
      disallow: ["/result/", "/preview/", "/construction", "/api/"],
    },
    sitemap: "https://www.plainterms.us/sitemap.xml",
  };
}
