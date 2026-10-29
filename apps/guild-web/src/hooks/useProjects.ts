import * as React from 'react';
import { listenToProjects, listenToProject, listenToProjectComments } from '../lib/projects';
import type { Project, ProjectComment } from '../lib/projects';
import { useAuth } from './useAuth';
import { useWorkspaceData } from '../context/WorkspaceDataContext';

export function useProjects(orgId: string | undefined) {
  const { userProfile } = useAuth();
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackProjects, setFallbackProjects] = React.useState<Project[]>([]);
  const [fallbackLoading, setFallbackLoading] = React.useState(true);

  React.useEffect(() => {
    if (canUseContext || !orgId || !userProfile?.uid) {
      if (!orgId || !userProfile?.uid) setFallbackLoading(false);
      return;
    }
    setFallbackLoading(true);
    return listenToProjects(orgId, userProfile.uid, (p) => {
      setFallbackProjects(p);
      setFallbackLoading(false);
    });
  }, [canUseContext, orgId, userProfile?.uid]);

  if (canUseContext && workspace) {
    return { projects: workspace.projects, loading: workspace.projectsLoading };
  }
  return { projects: fallbackProjects, loading: fallbackLoading };
}

export function useProject(projectId: string | undefined) {
  const workspace = useWorkspaceData();
  const cachedProject = React.useMemo(
    () => (projectId && workspace ? workspace.projects.find((p) => p.id === projectId) ?? null : null),
    [projectId, workspace],
  );
  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    if (cachedProject) {
      setProject(cachedProject);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToProject(projectId, (p) => {
      setProject(p);
      setLoading(false);
    });
  }, [projectId, cachedProject]);

  return { project: cachedProject ?? project, loading: cachedProject ? false : loading };
}

export function useProjectComments(projectId: string | null) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [comments, setComments] = React.useState<ProjectComment[]>([]);
  React.useEffect(() => {
    if (!projectId || !orgId) { setComments([]); return; }
    return listenToProjectComments(orgId, projectId, setComments);
  }, [projectId, orgId]);
  return comments;
}

export type { Project, ProjectComment };
