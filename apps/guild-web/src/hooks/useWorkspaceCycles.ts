import * as React from 'react';
import {
  listenToWorkspaceCycles,
  createWorkspaceCycle,
  updateWorkspaceCycle,
  deleteWorkspaceCycle
} from '../lib/workspaceCycles';
import type { WorkspaceCycle, CycleStatus } from '@guild/types';
import { useAuth } from './useAuth';

export function useWorkspaceCycles(orgId: string | undefined) {
  const { userProfile } = useAuth();
  const [cycles, setCycles] = React.useState<WorkspaceCycle[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId) {
      setCycles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToWorkspaceCycles(orgId, (data) => {
      setCycles(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  const activeCycle = React.useMemo(
    () => cycles.find((c) => c.status === 'active') || cycles[0] || null,
    [cycles]
  );

  const handleCreate = React.useCallback(
    async (params: { title?: string; startDate: Date; endDate: Date; status?: CycleStatus }) => {
      if (!orgId) throw new Error('Not authenticated');
      return await createWorkspaceCycle({
        orgId,
        title: params.title || '',
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status
      });
    },
    [orgId]
  );

  const handleUpdate = React.useCallback(
    async (cycleId: string, patch: Partial<WorkspaceCycle>) => {
      await updateWorkspaceCycle(cycleId, patch);
    },
    []
  );

  const handleDelete = React.useCallback(async (cycleId: string) => {
    await deleteWorkspaceCycle(cycleId);
  }, []);

  return {
    cycles,
    activeCycle,
    loading,
    createCycle: handleCreate,
    updateCycle: handleUpdate,
    deleteCycle: handleDelete
  };
}
