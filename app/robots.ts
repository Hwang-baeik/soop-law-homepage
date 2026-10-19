import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/mypage", "/account-settings", "/change-password"],
    },

    sitemap: "https://sooplaw.com/sitemap.xml",

    host: "https://sooplaw.com",
  };
}
