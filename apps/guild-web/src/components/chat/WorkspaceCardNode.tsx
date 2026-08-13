import * as React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
// We will export WorkspaceCard from CanvasPanel
import { WorkspaceCard } from './CanvasPanel';

export interface CanvasContextType {
  orgId: string;
  actor: { uid: string; name: string };
  tasks: any[];
  goals: any[];
  requests: any[];
  onOpenCard: (paramKey: string, val: string) => void;
}

export const CanvasContext = React.createContext<CanvasContextType | null>(null);

export function WorkspaceCardNodeView({ node }: any) {
  const { type, id, title } = node.attrs;
  const context = React.useContext(CanvasContext);

  if (!context) {
    return (
      <NodeViewWrapper className="inline-block align-middle my-1">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
          {type}: {title}
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="inline-block align-middle my-1 w-full max-w-[400px]">
      <WorkspaceCard
        type={type}
        id={id}
        title={title}
        orgId={context.orgId}
        actor={context.actor}
        tasks={context.tasks}
        goals={context.goals}
        requests={context.requests}
        onOpenCard={context.onOpenCard}
      />
    </NodeViewWrapper>
  );
}

export const WorkspaceCardNode = Node.create({
  name: 'workspaceCard',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      type: { default: 'Task' },
      id: { default: '' },
      title: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-workspace-card]',
        getAttrs: dom => {
          if (typeof dom === 'string') return {};
          const el = dom as HTMLElement;
          return {
            type: el.getAttribute('data-type') || 'Task',
            id: el.getAttribute('data-id') || '',
            title: el.getAttribute('data-title') || el.textContent || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-workspace-card': '',
        'data-type': HTMLAttributes.type,
        'data-id': HTMLAttributes.id,
        'data-title': HTMLAttributes.title,
        href: `/chat?${HTMLAttributes.type.toLowerCase()}=${HTMLAttributes.id}`,
      }),
      `${HTMLAttributes.type}: ${HTMLAttributes.title}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WorkspaceCardNodeView);
  },
});
