import * as React from 'react';
import { listenToMilestones } from '../lib/projects';
import type { Milestone } from '../lib/projects';

export function useMilestones(projectId: string | undefined) {
  const [milestones, setMilestones] = React.useState<Milestone[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    return listenToMilestones(projectId, (m) => {
      setMilestones(m);
      setLoading(false);
    });
  }, [projectId]);

  return { milestones, loading };
}

export type { Milestone };
