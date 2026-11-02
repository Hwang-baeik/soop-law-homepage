import type { MetadataRoute } from "next";
import { posts } from "../lib/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sooplaw.com";
  return [
    { url: baseUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/incorporation`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/board`, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${baseUrl}/board/${post.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
