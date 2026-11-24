import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/intro", "/features", "/login"],
        disallow: [
          "/api/",
          "/settings/",
          "/super-admin/",
          "/dashboard",
          "/app/",
          "/finance/",
          "/masters/",
          "/accounting/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/intro", "/features", "/login"],
        disallow: ["/api/", "/settings/", "/super-admin/"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/intro", "/features", "/login"],
        disallow: ["/api/", "/settings/", "/super-admin/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/intro", "/features"],
        disallow: ["/api/", "/settings/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/intro", "/features"],
        disallow: ["/api/", "/settings/"],
      },
    ],
    sitemap: "https://myownbillbook.com/sitemap.xml",
    host: "https://myownbillbook.com",
  };
}
