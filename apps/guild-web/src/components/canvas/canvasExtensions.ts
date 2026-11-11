import { Node, mergeAttributes, ReactNodeViewRenderer } from '@tiptap/react';
import { SprintCycleBlock } from './blocks/SprintCycleBlock';
import { InlineIssueBlock } from './blocks/InlineIssueBlock';
import { InlineRequestBlock } from './blocks/InlineRequestBlock';
import { DatabaseTableBlock } from './blocks/DatabaseTableBlock';

export const SprintCycleBlockNode = Node.create({
  name: 'sprintCycleBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      title: { default: 'Sprint Cycle 24: Core Platform & Speed' },
      cycleNumber: { default: 24 },
      tasks: { default: [] },
      totalPoints: { default: 0 },
      completedPoints: { default: 0 }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="sprint-cycle-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'sprint-cycle-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SprintCycleBlock);
  }
});

export const InlineIssueBlockNode = Node.create({
  name: 'inlineIssueBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      issueId: { default: null },
      identifier: { default: 'ORB-108' },
      title: { default: 'Interactive UI Task' },
      status: { default: 'todo' },
      priority: { default: 'medium' },
      estimatePoints: { default: 3 },
      assigneeName: { default: 'Assignee' },
      assigneeAvatar: { default: '' }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="inline-issue-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-issue-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(InlineIssueBlock);
  }
});

export const InlineRequestBlockNode = Node.create({
  name: 'inlineRequestBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      requestId: { default: null },
      type: { default: 'equipment' },
      title: { default: 'Hardware & Infrastructure Requisition' },
      amount: { default: '$3,499.00 USD' },
      department: { default: 'Engineering' },
      status: { default: 'pending' },
      requesterName: { default: 'Sarah Lin' },
      requesterAvatar: { default: '' },
      reviewerName: { default: '' },
      reviewerNotes: { default: null },
      submittedAt: { default: 'Today' }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="inline-request-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-request-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(InlineRequestBlock);
  }
});

export const DatabaseTableBlockNode = Node.create({
  name: 'databaseTableBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      title: { default: 'Interactive Workspace Database' },
      columns: { default: [] },
      rows: { default: [] }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="database-table-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'database-table-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DatabaseTableBlock);
  }
});
