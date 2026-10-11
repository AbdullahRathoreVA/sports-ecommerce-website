import { notFound } from "next/navigation";
import { RenderStudio } from "./studio";

// Development tool only: never served in production.
export default async function RenderStudioPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return (
    <div style={{ background: "transparent", padding: 0, margin: 0 }}>
      <RenderStudio params={params} />
    </div>
  );
}
