import { redirect } from "next/navigation";

// Phase 1: the project page is the pre-filtered task list. Overview and updates tabs come in Phase 2 (FR-8.2).
export default async function ProjectPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  redirect(`/tasks?project=${key.toUpperCase()}`);
}
