import { notFound } from "next/navigation";
import { posts } from "../../../lib/posts";

export function generateStaticParams() {
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata(
  props: PageProps<"/board/[slug]">
) {
  const { slug } = await props.params;
  const post = posts.find((item) => item.slug === slug);

  if (!post) {
    return {
      title: "게시글 없음 | 숲 법무사 사무소",
    };
  }

  return {
    title: `${post.title} | 숲 법무사 사무소`,
    description: post.description,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://sooplaw.com/board/${post.slug}`,
      siteName: "숲 법무사 사무소",
      locale: "ko_KR",
      type: "article",
    },
  };
}

export default async function PostDetailPage(
  props: PageProps<"/board/[slug]">
) {
  const { slug } = await props.params;
  const post = posts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-900">
      <article className="mx-auto max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-emerald-900">{post.category}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-4 leading-7 text-stone-600">{post.description}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-10 whitespace-pre-line leading-8 text-stone-800">
          {post.content}
        </div>
      </article>
    </main>
  );
}
