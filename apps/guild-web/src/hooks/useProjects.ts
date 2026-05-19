import * as React from 'react';
import { listenToProjects, listenToProject } from '../lib/projects';
import type { Project } from '../lib/projects';

export function useProjects(orgId: string | undefined) {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    return listenToProjects(orgId, (p) => {
      setProjects(p);
      setLoading(false);
    });
  }, [orgId]);

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

export type { Project };
