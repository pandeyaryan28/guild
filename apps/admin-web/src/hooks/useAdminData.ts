import { useState, useEffect } from 'react';
import {
  collection, getDocs, query, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  Organization, UserProfile, Task, Channel,
} from '@guild/types';

export interface AdminDashboardData {
  orgs:     Organization[];
  users:    UserProfile[];
  tasks:    Task[];
  channels: Channel[];
  loading:  boolean;
  error:    string | null;
  refresh:  () => void;
}

/**
 * One-shot fetch of all collections needed by the admin dashboard.
 * Fetches in parallel for speed. Provides a refresh() to re-fetch.
 */
export function useAdminData(): AdminDashboardData {
  const [orgs,     setOrgs]     = useState<Organization[]>([]);
  const [users,    setUsers]    = useState<UserProfile[]>([]);
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [tick,     setTick]     = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        const [orgsSnap, usersSnap, tasksSnap, channelsSnap] = await Promise.all([
          getDocs(query(collection(db, 'organizations'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'users'),         orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'tasks'),         orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'channels'),      orderBy('createdAt', 'desc'))),
        ]);

        if (cancelled) return;

        setOrgs(orgsSnap.docs.map(d => d.data() as Organization));
        setUsers(usersSnap.docs.map(d => d.data() as UserProfile));
        setTasks(tasksSnap.docs.map(d => d.data() as Task));
        setChannels(channelsSnap.docs.map(d => d.data() as Channel));
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [tick]);

  return {
    orgs, users, tasks, channels, loading, error,
    refresh: () => setTick(t => t + 1),
  };
}
