import { requireMember } from "@/server/session";
import { db } from "@/server/db";
import { getTranslations } from "next-intl/server";
import { SettingsHeader } from "@/components/layout/settings-header";
import { ProjectsSettings } from "./projects-settings";

export const metadata = { title: "Projects settings" };

export default async function ProjectsSettingsPage() {
  await requireMember();
  const t = await getTranslations("settings.tags");
  const projects = await db.project.findMany({ where: { archivedAt: null }, orderBy: { position: "asc" }, include: { categories: { where: { archivedAt: null }, orderBy: { position: "asc" } } } });
  return (
    <>
      <SettingsHeader title={t("title")} hint={t("hint")} />
      <ProjectsSettings
      projects={projects.map((p) => ({ id: p.id, key: p.key, name: p.name, description: p.description ?? "", health: p.health, vendoorLeadId: p.vendoorLeadId, abgLeadId: p.abgLeadId, categories: p.categories.map((c) => c.name) }))}
    />
    </>
  );
}
