import { redirect } from "next/navigation";

export default async function LegacyBusinessPage({ params }: PageProps<"/centro/[slug]">) {
  const { slug } = await params;
  redirect(slug === "arena-central" ? "/canchas/arena-ciudad-quesada" : "/canchas");
}
