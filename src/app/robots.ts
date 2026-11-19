import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/intro", "/features", "/login"],
      disallow: ["/api/", "/settings/", "/super-admin/"],
    },
    sitemap: "https://www.myownbillbook.com/sitemap.xml",
  };
}
