import { notFound } from "next/navigation";
import { posts } from "../../../lib/posts";

type ContentBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "ordered-list";
      items: string[];
    };

type PostSection = {
  title: string;
  blocks: ContentBlock[];
};

function parseBlocks(lines: string[]) {
  const blocks: ContentBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push({
      type: "ordered-list",
      items: listItems,
    });
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const orderedItem = trimmedLine.match(/^\d+\.\s+(.+)$/);

    if (!trimmedLine) {
      flushParagraph();
      flushList();
      return;
    }

    if (orderedItem) {
      flushParagraph();
      listItems.push(orderedItem[1]);
      return;
    }

    flushList();
    paragraphLines.push(trimmedLine);
  });

  flushParagraph();
  flushList();

  return blocks;
}

function parsePostSections(content: string) {
  const sections: PostSection[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const flushSection = () => {
    if (!currentTitle) {
      return;
    }

    sections.push({
      title: currentTitle,
      blocks: parseBlocks(currentLines),
    });
    currentLines = [];
  };

  content
    .trim()
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((line) => {
      const sectionHeading = line.match(/^##\s+(.+)$/);

      if (sectionHeading) {
        flushSection();
        currentTitle = sectionHeading[1].trim();
        return;
      }

      currentLines.push(line);
    });

  flushSection();

  return sections;
}

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

  const sections = parsePostSections(post.content);

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-stone-900">
      <article className="mx-auto max-w-4xl">
        <header className="border-b border-stone-200 pb-8">
          <p className="text-sm font-semibold text-emerald-900">
            {post.category}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-stone-600">
            {post.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        </header>

        <div className="mt-8 space-y-4">
          {sections.map((section, sectionIndex) => (
            <section
              key={section.title}
              className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-sm font-semibold text-white">
                  {sectionIndex + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-stone-950">
                    {section.title}
                  </h2>

                  <div className="mt-4 space-y-4 text-[15px] leading-8 text-stone-700">
                    {section.blocks.map((block, blockIndex) => {
                      if (block.type === "ordered-list") {
                        return (
                          <ol
                            key={blockIndex}
                            className="grid gap-3 sm:grid-cols-2"
                          >
                            {block.items.map((item, itemIndex) => (
                              <li
                                key={item}
                                className="flex gap-3 rounded-md bg-stone-50 px-4 py-3 leading-7 text-stone-700"
                              >
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-emerald-900 ring-1 ring-stone-200">
                                  {itemIndex + 1}
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ol>
                        );
                      }

                      return <p key={blockIndex}>{block.text}</p>;
                    })}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
