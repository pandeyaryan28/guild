import type { Project, Task, Team, WorkspaceIssue } from '@guild/types';

export function getTeamWorkScope(teams: Team[], projects: Project[], userId: string) {
  const teamIds = new Set(teams
    .filter((team) => userId && (team.managerId === userId || team.memberIds?.includes(userId)))
    .map((team) => team.id));
  const projectIds = new Set(projects
    .filter((project) => project.teamIds?.some((id) => teamIds.has(id)))
    .map((project) => project.id));

  return {
    includesTask: (task?: Task) => !!task?.projectId && projectIds.has(task.projectId),
    includesIssue: (issue?: WorkspaceIssue) => {
      if (issue?.teamId) return teamIds.has(issue.teamId);
      return !!issue?.projectId && projectIds.has(issue.projectId);
    },
  };
}
