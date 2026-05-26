import Link from "next/link";
import { posts } from "../lib/posts";

export const metadata = {
  title: "실무 자료실 | 숲 법무사 사무소",
  description:
    "법인등기 절차, 민사서류 절차, 민사집행 절차, 실무사례, 자주 묻는 질문을 정리한 숲 법무사 사무소 실무 자료실입니다.",
};

export default function BoardPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const selectedCategory = searchParams?.category;

  const categories = [
    "전체",
    "법인등기 절차",
    "민사서류 절차",
    "민사집행 절차",
    "실무사례",
    "자주묻는 질문",
  ];

  const filteredPosts =
    selectedCategory && selectedCategory !== "전체"
      ? posts.filter((post) => post.category === selectedCategory)
      : posts;

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-900">
      <div className="mx-auto max-w-7xl">
        <p className="font-semibold text-emerald-900">SOOP Practical Archive</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">실무 자료실</h1>
        <p className="mt-4 max-w-2xl leading-7 text-stone-600">
          법인등기, 민사서류, 민사집행, 실무사례, 자주 묻는 질문을 하나의 자료실에서 분류하여 제공합니다.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {categories.map((category) => {
            const href =
              category === "전체"
                ? "/board"
                : `/board?category=${encodeURIComponent(category)}`;

            const active =
              category === "전체"
                ? !selectedCategory
                : selectedCategory === category;

            return (
              <Link
                key={category}
                href={href}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-emerald-900 text-white"
                    : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                }`}
              >
                {category}
              </Link>
            );
          })}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/board/${post.slug}`}
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-sm font-semibold text-emerald-900">
                {post.category}
              </div>
              <h2 className="mt-3 text-xl font-bold">{post.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                {post.description}
              </p>
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
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}