import * as React from 'react';
import { useAuth } from '../hooks/useAuth';
import { listenToTasks, listenToLabels, type Task, type TaskLabel } from '../lib/tasks';
import { listenToProjects, type Project } from '../lib/projects';
import { listenToGoals, type Goal } from '../lib/goals';
import {
  listenToChannels,
  listenToUserDMs,
  type Channel,
  type DirectMessageThread,
} from '../lib/chat';
import { type UserProfile, type Organization } from '../lib/firestore';
import { listenToOrgTeams } from '../lib/teams';
import { listenToSentRequests, listenToReceivedRequests, type OrgRequest } from '../lib/requests';
import {
  listenToNotifications,
  listenToArchivedNotifications,
} from '../lib/notifications';
import type { Team, Notification } from '@guild/types';
import { collection, doc, query, where, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface WorkspaceDataContextValue {
  orgId: string | undefined;
  org: Organization | null;
  orgLoading: boolean;
  allTasks: Task[];
  tasksLoading: boolean;
  labels: TaskLabel[];
  projects: Project[];
  projectsLoading: boolean;
  goals: Goal[];
  goalsLoading: boolean;
  channels: Channel[];
  memberships: Set<string>;
  lastReads: Map<string, Timestamp>;
  channelsLoading: boolean;
  threads: DirectMessageThread[];
  dmReads: Map<string, Timestamp>;
  members: UserProfile[];
  teams: Team[];
  teamsLoading: boolean;
  sentRequests: OrgRequest[];
  receivedRequests: OrgRequest[];
  requestsLoading: boolean;
  notifications: Notification[];
  archivedNotifications: Notification[];
  notificationsLoading: boolean;
  activeToasts: Notification[];
  dismissToast: (id: string) => void;
  clearActiveToasts: () => void;
}

const WorkspaceDataContext = React.createContext<WorkspaceDataContextValue | null>(null);

export function WorkspaceDataProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const uid = user?.uid ?? userProfile?.uid;

  const [org, setOrg] = React.useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = React.useState(true);

  const [allTasks, setAllTasks] = React.useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = React.useState(true);
  const [labels, setLabels] = React.useState<TaskLabel[]>([]);

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = React.useState(true);

  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = React.useState(true);

  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [memberships, setMemberships] = React.useState<Set<string>>(new Set());
  const [lastReads, setLastReads] = React.useState<Map<string, Timestamp>>(new Map());
  const [channelsLoading, setChannelsLoading] = React.useState(true);

  const [threads, setThreads] = React.useState<DirectMessageThread[]>([]);
  const [dmReads, setDmReads] = React.useState<Map<string, Timestamp>>(new Map());

  const [members, setMembers] = React.useState<UserProfile[]>([]);

  const [teams, setTeams] = React.useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = React.useState(true);

  const [sentRequests, setSentRequests] = React.useState<OrgRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = React.useState<OrgRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(true);

  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [archivedNotifications, setArchivedNotifications] = React.useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = React.useState(true);
  const [activeToasts, setActiveToasts] = React.useState<Notification[]>([]);

  const seenNotifIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstNotifRun = React.useRef(true);

  // 0. Organization Document
  React.useEffect(() => {
    if (!orgId) {
      setOrg(null);
      setOrgLoading(false);
      return;
    }
    setOrgLoading(true);
    return onSnapshot(
      doc(db, 'organizations', orgId),
      (snap) => {
        if (snap.exists()) {
          setOrg({ ...snap.data(), id: snap.id } as Organization);
        } else {
          setOrg(null);
        }
        setOrgLoading(false);
      },
      (err) => {
        console.error('Failed to load organization in WorkspaceDataContext:', err);
        setOrg(null);
        setOrgLoading(false);
      },
    );
  }, [orgId]);

  // 1. Tasks & Task Labels
  React.useEffect(() => {
    if (!orgId) {
      setAllTasks([]);
      setLabels([]);
      setTasksLoading(false);
      return;
    }
    setTasksLoading(true);
    const unsubTasks = listenToTasks(orgId, (t) => {
      setAllTasks(t);
      setTasksLoading(false);
    });
    const unsubLabels = listenToLabels(orgId, setLabels);
    return () => {
      unsubTasks();
      unsubLabels();
    };
  }, [orgId]);

  // 2. Projects
  React.useEffect(() => {
    if (!orgId || !uid) {
      setProjects([]);
      setProjectsLoading(false);
      return;
    }
    setProjectsLoading(true);
    return listenToProjects(orgId, uid, (p) => {
      setProjects(p);
      setProjectsLoading(false);
    });
  }, [orgId, uid]);

  // 3. Goals
  React.useEffect(() => {
    if (!orgId) {
      setGoals([]);
      setGoalsLoading(false);
      return;
    }
    setGoalsLoading(true);
    return listenToGoals(orgId, (g) => {
      setGoals(g);
      setGoalsLoading(false);
    });
  }, [orgId]);

  // 4. Channels & DMs
  React.useEffect(() => {
    if (!orgId || !uid) {
      setChannels([]);
      setMemberships(new Set());
      setLastReads(new Map());
      setThreads([]);
      setDmReads(new Map());
      setChannelsLoading(false);
      return;
    }
    setChannelsLoading(true);
    const unsubChannels = listenToChannels(orgId, uid, (chs, mems, reads) => {
      setChannels(chs);
      setMemberships(mems);
      setLastReads(reads);
      setChannelsLoading(false);
    });
    const unsubDMs = listenToUserDMs(uid, orgId, (newThreads, newReads) => {
      setThreads(newThreads);
      setDmReads(newReads);
    });
    return () => {
      unsubChannels();
      unsubDMs();
    };
  }, [orgId, uid]);

  // 5. Organization Members
  React.useEffect(() => {
    if (!orgId) {
      setMembers([]);
      return;
    }
    const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
    return onSnapshot(q, (snap) => {
      setMembers(snap.docs.map((d) => d.data() as UserProfile));
    });
  }, [orgId]);

  // 6. Teams
  React.useEffect(() => {
    if (!orgId) {
      setTeams([]);
      setTeamsLoading(false);
      return;
    }
    setTeamsLoading(true);
    return listenToOrgTeams(orgId, (t) => {
      setTeams(t);
      setTeamsLoading(false);
    });
  }, [orgId]);

  // 7. Operational Requests
  React.useEffect(() => {
    if (!orgId || !uid) {
      setSentRequests([]);
      setReceivedRequests([]);
      setRequestsLoading(false);
      return;
    }
    setRequestsLoading(true);
    let loaded = 0;
    const done = () => {
      loaded++;
      if (loaded >= 2) setRequestsLoading(false);
    };
    const unsubSent = listenToSentRequests(orgId, uid, (reqs) => {
      setSentRequests(reqs);
      done();
    });
    const unsubReceived = listenToReceivedRequests(orgId, uid, (reqs) => {
      setReceivedRequests(reqs);
      done();
    });
    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [orgId, uid]);

  // 8. Notifications
  React.useEffect(() => {
    if (!orgId || !uid) {
      setNotifications([]);
      setArchivedNotifications([]);
      setNotificationsLoading(false);
      return;
    }
    setNotificationsLoading(true);
    seenNotifIdsRef.current.clear();
    isFirstNotifRun.current = true;

    const unsubActive = listenToNotifications(orgId, uid, (notifs) => {
      const newNotifs = notifs.filter((n) => !seenNotifIdsRef.current.has(n.id));
      notifs.forEach((n) => seenNotifIdsRef.current.add(n.id));

      if (!isFirstNotifRun.current) {
        const freshUnread = newNotifs.filter((n) => !n.read && !n.archived);
        if (freshUnread.length > 0) {
          setActiveToasts((prev) => [...prev, ...freshUnread]);
        }
      } else {
        isFirstNotifRun.current = false;
      }

      setNotifications(notifs);
      setNotificationsLoading(false);
    });

    const unsubArchived = listenToArchivedNotifications(orgId, uid, (notifs) => {
      setArchivedNotifications(notifs);
    });

    return () => {
      unsubActive();
      unsubArchived();
    };
  }, [orgId, uid]);

  // Auto-dismiss notification toasts after 5 seconds
  React.useEffect(() => {
    if (activeToasts.length === 0) return;
    const oldest = activeToasts[0];
    const timer = setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== oldest.id));
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeToasts]);

  const dismissToast = React.useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearActiveToasts = React.useCallback(() => {
    setActiveToasts([]);
  }, []);

  const value = React.useMemo<WorkspaceDataContextValue>(
    () => ({
      orgId,
      org,
      orgLoading,
      allTasks,
      tasksLoading,
      labels,
      projects,
      projectsLoading,
      goals,
      goalsLoading,
      channels,
      memberships,
      lastReads,
      channelsLoading,
      threads,
      dmReads,
      members,
      teams,
      teamsLoading,
      sentRequests,
      receivedRequests,
      requestsLoading,
      notifications,
      archivedNotifications,
      notificationsLoading,
      activeToasts,
      dismissToast,
      clearActiveToasts,
    }),
    [
      orgId,
      org,
      orgLoading,
      allTasks,
      tasksLoading,
      labels,
      projects,
      projectsLoading,
      goals,
      goalsLoading,
      channels,
      memberships,
      lastReads,
      channelsLoading,
      threads,
      dmReads,
      members,
      teams,
      teamsLoading,
      sentRequests,
      receivedRequests,
      requestsLoading,
      notifications,
      archivedNotifications,
      notificationsLoading,
      activeToasts,
      dismissToast,
      clearActiveToasts,
    ],
  );

  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

export function useWorkspaceData() {
  return React.useContext(WorkspaceDataContext);
}
