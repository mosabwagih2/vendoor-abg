import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { ProjectsSettings } from "./projects-settings";

export const metadata = { title: "Projects settings" };

export default async function ProjectsSettingsPage() {
  await requireMember();
  const projects = await db.project.findMany({ where: { archivedAt: null }, orderBy: { position: "asc" }, include: { categories: { where: { archivedAt: null }, orderBy: { position: "asc" } } } });
  return (
    <ProjectsSettings
      projects={projects.map((p) => ({ id: p.id, key: p.key, name: p.name, description: p.description ?? "", health: p.health, vendoorLeadId: p.vendoorLeadId, abgLeadId: p.abgLeadId, categories: p.categories.map((c) => c.name) }))}
    />
  );
}
