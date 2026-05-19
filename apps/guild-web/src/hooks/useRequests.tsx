import * as React from 'react';
import { useAuth } from './useAuth';
import {
  listenToSentRequests,
  listenToReceivedRequests,
  type OrgRequest,
} from '../lib/requests';

export function useRequests(orgId: string | undefined) {
  const { user } = useAuth();
  const [sent, setSent] = React.useState<OrgRequest[]>([]);
  const [received, setReceived] = React.useState<OrgRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId || !user) { setLoading(false); return; }
    setLoading(true);
    let loaded = 0;
    const done = () => { loaded++; if (loaded >= 2) setLoading(false); };

    const unsubSent = listenToSentRequests(orgId, user.uid, (reqs) => {
      setSent(reqs); done();
    });
    const unsubReceived = listenToReceivedRequests(orgId, user.uid, (reqs) => {
      setReceived(reqs); done();
    });

    return () => { unsubSent(); unsubReceived(); };
  }, [orgId, user?.uid]);

  const pendingCount = received.filter((r) => r.status === 'pending').length;

  return { sent, received, pendingCount, loading };
}
