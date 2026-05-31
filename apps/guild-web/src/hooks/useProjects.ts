import * as React from 'react';
import { listenToProjects, listenToProject, listenToProjectComments } from '../lib/projects';
import type { Project, ProjectComment } from '../lib/projects';
import { useAuth } from './useAuth';

export function useProjects(orgId: string | undefined) {
  const { userProfile } = useAuth();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId || !userProfile?.uid) return;
    setLoading(true);
    return listenToProjects(orgId, userProfile.uid, (p) => {
      setProjects(p);
      setLoading(false);
    });
  }, [orgId, userProfile?.uid]);

  return { projects, loading };
}

export function useProject(projectId: string | undefined) {
  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    return listenToProject(projectId, (p) => {
      setProject(p);
      setLoading(false);
    });
  }, [projectId]);

  return { project, loading };
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
