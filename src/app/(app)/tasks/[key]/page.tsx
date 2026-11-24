import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/server/session";
import { loadTaskDetail } from "@/server/task-detail";
import { TaskView } from "@/components/task/task-view";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: key.toUpperCase() };
}

export default async function TaskPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const me = await requireMember();
  const task = await loadTaskDetail(key, me);
  if (!task) notFound();
  if (task.key !== key.toUpperCase()) redirect(`/tasks/${task.key}`);
  return <TaskView task={task} />;
}
