import * as React from 'react';
import { listenToOrgTeams, listenToManagedTeams } from '../lib/teams';
import type { Team } from '@guild/types';

export function useTeams(orgId: string | undefined) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToOrgTeams(orgId, (t) => {
      setTeams(t);
      setLoading(false);
    });
  }, [orgId]);

  return { teams, loading };
}

export function useManagedTeams(orgId: string | undefined, managerId: string | undefined) {
  const [managedTeams, setManagedTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId || !managerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToManagedTeams(orgId, managerId, (t) => {
      setManagedTeams(t);
      setLoading(false);
    });
  }, [orgId, managerId]);

  return { managedTeams, loading };
}

export type { Team };
