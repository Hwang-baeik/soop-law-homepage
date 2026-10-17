import Link from "next/link";
import { posts } from "../../lib/posts";

export const metadata = {
  alternates: { canonical: "/board" },
  openGraph: {
    title: "실무 자료실 | 숲 법무사 사무소",
    description: "법인등기, 민사서류, 민사집행의 절차와 준비서류 안내",
    url: "https://sooplaw.com/board",
    type: "website",
    locale: "ko_KR",
  },
  title: "실무 자료실 | 숲 법무사 사무소",
  description:
    "법인등기 절차, 민사서류 절차, 민사집행 절차, 실무사례, 자주 묻는 질문을 정리한 숲 법무사 사무소 실무 자료실입니다.",
};

function getCategoryParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BoardPage(props: PageProps<"/board">) {
  const searchParams = await props.searchParams;
  const requestedCategory = getCategoryParam(searchParams.category);
  const query = (getCategoryParam(searchParams.q) ?? "").trim().slice(0, 100);

  const categories = [
    "전체",
    "법인등기 절차",
    "민사서류 절차",
    "민사집행 절차",
    "실무사례",
    "자주묻는 질문",
  ];

  const selectedCategory = categories.includes(requestedCategory ?? "") ? requestedCategory : undefined;
  const filteredPosts = posts.filter((post) => {
    const inCategory = !selectedCategory || selectedCategory === "전체" || post.category === selectedCategory;
    const text = [post.title, post.description, ...post.tags].join(" ").toLocaleLowerCase("ko-KR");
    return inCategory && (!query || text.includes(query.toLocaleLowerCase("ko-KR")));
  });

  return (
    <main id="main-content" className="min-h-screen bg-stone-50 px-6 py-16 text-stone-900">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-6 inline-block text-sm font-semibold text-emerald-900">숲 법무사 사무소 홈</Link>
        <p className="font-semibold text-emerald-900">SOOP Practical Archive</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">실무 자료실</h1>
        <p className="mt-4 max-w-2xl leading-7 text-stone-600">
          법인등기, 민사서류, 민사집행, 실무사례, 자주 묻는 질문에 대하여 확인해보세요.
        </p>

        <form action="/board" method="get" role="search" className="mt-8 flex flex-wrap items-end gap-3">
          {selectedCategory && selectedCategory !== "전체" && <input type="hidden" name="category" value={selectedCategory} />}
          <label className="grid min-w-0 flex-1 gap-2 text-sm font-semibold sm:max-w-md">
            자료 검색
            <input type="search" name="q" maxLength={100} defaultValue={query} placeholder="제목·설명·태그로 검색" className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4" />
          </label>
          <button type="submit" className="h-12 rounded-xl bg-emerald-900 px-6 font-semibold text-white">검색</button>
          {query && <Link href={selectedCategory ? `/board?category=${encodeURIComponent(selectedCategory)}` : "/board"} className="inline-flex h-12 items-center px-3 text-sm underline">검색 초기화</Link>}
        </form>
        <nav aria-label="자료 분류" className="mt-8 flex flex-wrap gap-3">
          {categories.map((category) => {
            const params = new URLSearchParams();
            if (category !== "전체") params.set("category", category);
            if (query) params.set("q", query);
            const href = params.size ? `/board?${params.toString()}` : "/board";
            const active = category === "전체" ? !selectedCategory || selectedCategory === "전체" : selectedCategory === category;

            return (
              <Link
                key={category}
                href={href}
                aria-current={active ? "page" : undefined}
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
        </nav>
        <p className="mt-6 text-sm text-stone-600">총 {filteredPosts.length}개의 안내글</p>
        {filteredPosts.length === 0 && <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8"><p>검색 조건에 맞는 안내글이 없습니다.</p><Link href="/board" className="mt-4 inline-block font-semibold text-emerald-900 underline">전체 자료 보기</Link></div>}

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
