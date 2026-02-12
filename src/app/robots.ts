import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/analyze", "/privacy", "/terms"],
      disallow: ["/result/", "/api/"],
    },
    sitemap: "https://plainterms.vercel.app/sitemap.xml",
  };
}
