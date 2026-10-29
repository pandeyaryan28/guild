import * as React from 'react';
import { listenToOrgTeams, listenToManagedTeams } from '../lib/teams';
import type { Team } from '@guild/types';
import { useWorkspaceData } from '../context/WorkspaceDataContext';

export function useTeams(orgId: string | undefined) {
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackTeams, setFallbackTeams] = React.useState<Team[]>([]);
  const [fallbackLoading, setFallbackLoading] = React.useState(true);

  React.useEffect(() => {
    if (canUseContext || !orgId) {
      if (!orgId) setFallbackLoading(false);
      return;
    }
    setFallbackLoading(true);
    return listenToOrgTeams(orgId, (t) => {
      setFallbackTeams(t);
      setFallbackLoading(false);
    });
  }, [canUseContext, orgId]);

  if (canUseContext && workspace) {
    return { teams: workspace.teams, loading: workspace.teamsLoading };
  }
  return { teams: fallbackTeams, loading: fallbackLoading };
}

export function useManagedTeams(orgId: string | undefined, managerId: string | undefined) {
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackManagedTeams, setFallbackManagedTeams] = React.useState<Team[]>([]);
  const [fallbackLoading, setFallbackLoading] = React.useState(true);

  React.useEffect(() => {
    if (canUseContext || !orgId || !managerId) {
      if (!orgId || !managerId) setFallbackLoading(false);
      return;
    }
    setFallbackLoading(true);
    return listenToManagedTeams(orgId, managerId, (t) => {
      setFallbackManagedTeams(t);
      setFallbackLoading(false);
    });
  }, [canUseContext, orgId, managerId]);

  const managedTeams = React.useMemo(() => {
    if (!canUseContext || !workspace) return fallbackManagedTeams;
    if (!managerId) return [];
    return workspace.teams.filter((t) => t.managerId === managerId);
  }, [canUseContext, workspace, fallbackManagedTeams, managerId]);

  const loading = canUseContext && workspace ? workspace.teamsLoading : fallbackLoading;
  return { managedTeams, loading };
}

export type { Team };
