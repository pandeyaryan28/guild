import { Node, mergeAttributes, ReactNodeViewRenderer } from '@tiptap/react';
import { SprintCycleBlock } from './blocks/SprintCycleBlock';
import { InlineIssueBlock } from './blocks/InlineIssueBlock';
import { InlineRequestBlock } from './blocks/InlineRequestBlock';
import { DatabaseTableBlock } from './blocks/DatabaseTableBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import { SubCanvasBlock } from './blocks/SubCanvasBlock';
import { ToggleBlock } from './blocks/ToggleBlock';
import { ColumnsBlock } from './blocks/ColumnsBlock';
import { TableOfContentsBlock } from './blocks/TableOfContentsBlock';
import { BookmarkEmbedBlock } from './blocks/BookmarkEmbedBlock';

export const SubCanvasBlockNode = Node.create({
  name: 'subCanvasBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      childDocId: { default: null },
      title: { default: 'Untitled Sub-Canvas' },
      icon: { default: 'FileText' }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="sub-canvas-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'sub-canvas-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SubCanvasBlock);
  }
});

export const ToggleBlockNode = Node.create({
  name: 'toggleBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      title: { default: '' },
      body: { default: '' },
      isOpen: { default: true }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="toggle-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlock);
  }
});

export const ColumnsBlockNode = Node.create({
  name: 'columnsBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      columnCount: { default: 2 },
      items: { default: [] }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="columns-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ColumnsBlock);
  }
});

export const TableOfContentsBlockNode = Node.create({
  name: 'tableOfContentsBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-type="table-of-contents-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'table-of-contents-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsBlock);
  }
});

export const BookmarkEmbedBlockNode = Node.create({
  name: 'bookmarkEmbedBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      url: { default: '' },
      title: { default: '' },
      description: { default: '' }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="bookmark-embed-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'bookmark-embed-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(BookmarkEmbedBlock);
  }
});

export const CalloutBlockNode = Node.create({
  name: 'calloutBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      icon: { default: '💡' },
      tint: { default: 'amber' },
      title: { default: '' },
      text: { default: '' }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="callout-block"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout-block' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutBlock);
  }
});

export const SprintCycleBlockNode = Node.create({
  name: 'sprintCycleBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      title: { default: '' },
      cycleNumber: { default: null },
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
      identifier: { default: 'TASK-101' },
      title: { default: '' },
      status: { default: 'todo' },
      priority: { default: 'medium' },
      estimatePoints: { default: null },
      assigneeName: { default: '' },
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
      title: { default: '' },
      amount: { default: '' },
      department: { default: 'Engineering' },
      status: { default: 'pending' },
      requesterName: { default: '' },
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
      title: { default: '' },
      activeView: { default: 'table' },
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
