import { notFound } from "next/navigation";
import { serialize } from "next-mdx-remote/serialize";
import { getDocPage, generateStaticDocParams, NAV_SECTIONS, extractToc } from "@/lib/docs";
import { DocLayout } from "@/components/docs/DocLayout";
import { DocContent } from "@/components/docs/DocContent";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export async function generateStaticParams() {
  return generateStaticDocParams();
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getDocPage(slug);
  if (!page) return {};
  return {
    title: `${page.title} — SkillMall Docs`,
    description: page.description,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const page = getDocPage(slug);
  if (!page) notFound();

  const source = await serialize(page.content, {
    mdxOptions: {
      development: process.env.NODE_ENV === "development",
    },
  });

  const toc = extractToc(page.content);

  return (
    <DocLayout navSections={NAV_SECTIONS} toc={toc}>
      <DocContent source={source} />
    </DocLayout>
  );
}
