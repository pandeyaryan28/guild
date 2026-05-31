import { useState, useEffect } from 'react';
import {
  collection, getDocs, query, orderBy, limit, doc, getDoc, where,
} from 'firebase/firestore';
import { db } from '@guild/firebase';
import type {
  Organization, UserProfile, Task, Channel, Team, Goal, Project, OrgRequest
} from '@guild/types';

export interface AdminDashboardData {
  orgs:       Organization[];
  users:      UserProfile[];
  tasks:      Task[];
  channels:   Channel[];
  teams:      Team[];
  goals:      Goal[];
  projects:   Project[];
  requests:   OrgRequest[];
  loading:    boolean;
  error:      string | null;
  refresh:    () => void;
}

/**
 * One-shot fetch of all collections needed by the admin HQ dashboard.
 * Fetches in parallel for speed. Provides a refresh() to re-fetch.
 */
export function useAdminData(organizationId?: string): AdminDashboardData {
  const [orgs,       setOrgs]       = useState<Organization[]>([]);
  const [users,      setUsers]      = useState<UserProfile[]>([]);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [channels,   setChannels]   = useState<Channel[]>([]);
  const [teams,      setTeams]      = useState<Team[]>([]);
  const [goals,      setGoals]      = useState<Goal[]>([]);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [requests,   setRequests]   = useState<OrgRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [tick,       setTick]       = useState(0);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        const orgDocRef = doc(db, 'organizations', organizationId);
        const [
          orgSnap,
          usersSnap,
          tasksSnap,
          channelsSnap,
          teamsSnap,
          goalsSnap,
          projectsSnap,
          requestsSnap
        ] = await Promise.all([
          getDoc(orgDocRef),
          getDocs(query(collection(db, 'users'),         where('organizationId', '==', organizationId))),
          getDocs(query(collection(db, 'tasks'),         where('orgId', '==', organizationId))),
          getDocs(query(collection(db, 'channels'),      where('orgId', '==', organizationId))),
          getDocs(query(collection(db, 'teams'),         where('orgId', '==', organizationId))),
          getDocs(query(collection(db, 'goals'),         where('orgId', '==', organizationId))),
          getDocs(query(collection(db, 'projects'),       where('orgId', '==', organizationId))),
          getDocs(query(collection(db, 'requests'),       where('orgId', '==', organizationId))),
        ]);

        if (cancelled) return;

        const orgsList: Organization[] = orgSnap.exists()
          ? [{ ...orgSnap.data(), id: orgSnap.id } as Organization]
          : [];

        const getMillis = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.toMillis === 'function') return ts.toMillis();
          if (typeof ts.toDate === 'function') return ts.toDate().getTime();
          if (ts.seconds) return ts.seconds * 1000;
          return 0;
        };

        const sortByCreatedAtDesc = <T extends { createdAt?: any }>(items: T[]): T[] => {
          return [...items].sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        };

        setOrgs(orgsList);
        setUsers(sortByCreatedAtDesc(usersSnap.docs.map(d => d.data() as UserProfile)));
        setTasks(sortByCreatedAtDesc(tasksSnap.docs.map(d => d.data() as Task)));
        setChannels(sortByCreatedAtDesc(channelsSnap.docs.map(d => d.data() as Channel)));
        setTeams(sortByCreatedAtDesc(teamsSnap.docs.map(d => d.data() as Team)));
        setGoals(sortByCreatedAtDesc(goalsSnap.docs.map(d => d.data() as Goal)));
        setProjects(sortByCreatedAtDesc(projectsSnap.docs.map(d => d.data() as Project)));
        setRequests(sortByCreatedAtDesc(requestsSnap.docs.map(d => d.data() as OrgRequest)));
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [tick, organizationId]);

  return {
    orgs, users, tasks, channels, teams, goals, projects, requests, loading, error,
    refresh: () => setTick(t => t + 1),
  };
}

