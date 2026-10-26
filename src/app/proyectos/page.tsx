import { listProjects, getProjectCounters } from "@/queries";
import { ProjectsScreen } from "./ProjectsScreen";

export const dynamic = "force-dynamic";

export default async function Page() {
  const projects = await listProjects(true);
  const withCounters = projects.map((p) => ({
    ...p,
    counters: getProjectCounters(p),
  }));

  return <ProjectsScreen initialProjects={withCounters} />;
}
