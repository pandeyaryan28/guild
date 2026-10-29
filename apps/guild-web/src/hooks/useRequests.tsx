import * as React from 'react';
import { useAuth } from './useAuth';
import {
  listenToSentRequests,
  listenToReceivedRequests,
  listenToRequest,
  type OrgRequest,
} from '../lib/requests';
import { useWorkspaceData } from '../context/WorkspaceDataContext';

export function useRequests(orgId: string | undefined) {
  const { user } = useAuth();
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackSent, setFallbackSent] = React.useState<OrgRequest[]>([]);
  const [fallbackReceived, setFallbackReceived] = React.useState<OrgRequest[]>([]);
  const [fallbackLoading, setFallbackLoading] = React.useState(true);

  React.useEffect(() => {
    if (canUseContext || !orgId || !user) {
      if (!orgId || !user) setFallbackLoading(false);
      return;
    }
    setFallbackLoading(true);
    let loaded = 0;
    const done = () => { loaded++; if (loaded >= 2) setFallbackLoading(false); };

    const unsubSent = listenToSentRequests(orgId, user.uid, (reqs) => {
      setFallbackSent(reqs); done();
    });
    const unsubReceived = listenToReceivedRequests(orgId, user.uid, (reqs) => {
      setFallbackReceived(reqs); done();
    });

    return () => { unsubSent(); unsubReceived(); };
  }, [canUseContext, orgId, user?.uid]);

  const sent = canUseContext && workspace ? workspace.sentRequests : fallbackSent;
  const received = canUseContext && workspace ? workspace.receivedRequests : fallbackReceived;
  const loading = canUseContext && workspace ? workspace.requestsLoading : fallbackLoading;
  const pendingCount = received.filter((r) => r.status === 'pending').length;

  return { sent, received, pendingCount, loading };
}

export function useRequest(requestId: string | null | undefined) {
  const workspace = useWorkspaceData();
  const cachedRequest = React.useMemo(() => {
    if (!requestId || !workspace) return null;
    return (
      workspace.receivedRequests.find((r) => r.id === requestId) ??
      workspace.sentRequests.find((r) => r.id === requestId) ??
      null
    );
  }, [requestId, workspace]);

  const [request, setRequest] = React.useState<OrgRequest | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!requestId) {
      setRequest(null);
      setLoading(false);
      return;
    }
    if (cachedRequest) {
      setRequest(cachedRequest);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToRequest(requestId, (r) => {
      setRequest(r);
      setLoading(false);
    });
  }, [requestId, cachedRequest]);

  return { request: cachedRequest ?? request, loading: cachedRequest ? false : loading };
}
