import { useState, useEffect } from 'react';
import {
  collection, getDocs, query, orderBy, limit, doc, getDoc, where,
} from 'firebase/firestore';
import { db } from '@guild/firebase';
import type {
  Organization, UserProfile, Task, Channel, Team, Goal, TaskActivity, Project
} from '@guild/types';

export interface AdminDashboardData {
  orgs:       Organization[];
  users:      UserProfile[];
  tasks:      Task[];
  channels:   Channel[];
  teams:      Team[];
  goals:      Goal[];
  activities: TaskActivity[];
  projects:   Project[];
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
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [projects,   setProjects]   = useState<Project[]>([]);
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
          activitiesSnap,
          projectsSnap
        ] = await Promise.all([
          getDoc(orgDocRef),
          getDocs(query(collection(db, 'users'),         where('organizationId', '==', organizationId), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'tasks'),         where('orgId', '==', organizationId), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'channels'),      where('orgId', '==', organizationId), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'teams'),         where('orgId', '==', organizationId), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'goals'),         where('orgId', '==', organizationId), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'taskActivities'), where('orgId', '==', organizationId), orderBy('createdAt', 'desc'), limit(200))),
          getDocs(query(collection(db, 'projects'),       where('orgId', '==', organizationId), orderBy('createdAt', 'desc'))),
        ]);

        if (cancelled) return;

        const orgsList: Organization[] = orgSnap.exists()
          ? [{ ...orgSnap.data(), id: orgSnap.id } as Organization]
          : [];

        setOrgs(orgsList);
        setUsers(usersSnap.docs.map(d => d.data() as UserProfile));
        setTasks(tasksSnap.docs.map(d => d.data() as Task));
        setChannels(channelsSnap.docs.map(d => d.data() as Channel));
        setTeams(teamsSnap.docs.map(d => d.data() as Team));
        setGoals(goalsSnap.docs.map(d => d.data() as Goal));
        setActivities(activitiesSnap.docs.map(d => d.data() as TaskActivity));
        setProjects(projectsSnap.docs.map(d => d.data() as Project));
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
    orgs, users, tasks, channels, teams, goals, activities, projects, loading, error,
    refresh: () => setTick(t => t + 1),
  };
}
