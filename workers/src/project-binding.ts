import type { Db } from "@gtm/db";

export class ProjectMismatchError extends Error {
  constructor(readonly boundTo: string, readonly requested: string) {
    super(`This database belongs to project "${boundTo}", not "${requested}". Each project has its own database: check DATABASE_URL.`);
    this.name = "ProjectMismatchError";
  }
}

/**
 * One database per project. The first job binds the database to its project_id; every later job must
 * carry the same id, so a wrong DATABASE_URL fails before anything is written.
 */
export async function bindProject(db: Db, projectId: string): Promise<void> {
  await db.$executeRaw`INSERT INTO project (id, project_id) VALUES (1, ${projectId}) ON CONFLICT (id) DO NOTHING`;
  const bound = await db.project.findUniqueOrThrow({ where: { id: 1 } });
  if (bound.projectId !== projectId) throw new ProjectMismatchError(bound.projectId, projectId);
}
