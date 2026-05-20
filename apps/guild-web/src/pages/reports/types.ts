import type { TaskActivity } from '../../lib/tasks';

export type ReportScope = 'my' | 'team' | 'project';
export type DatePreset = '7d' | '30d' | '90d' | 'custom';

export interface ReportFiltersState {
  datePreset: DatePreset;
  customFrom: Date | null;
  customTo: Date | null;
  status: 'all' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'all' | 'none' | 'low' | 'medium' | 'high' | 'urgent';
}

export const DEFAULT_FILTERS: ReportFiltersState = {
  datePreset: '30d',
  customFrom: null,
  customTo: null,
  status: 'all',
  priority: 'all',
};
