import * as React from 'react';
import { MessageSquare, Users, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type UserProfile } from '../../lib/firestore';
import { cn } from '@/lib/utils';

interface MemberPanelProps {
  members: UserProfile[];
  currentUserId: string;
  onStartDM: (member: UserProfile) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function MemberPanel({ members, currentUserId, onStartDM, isCollapsed = false, onToggle }: MemberPanelProps) {
  return (
    <aside className={cn(
      "flex h-full flex-col bg-surface transition-all duration-300 ease-in-out shrink-0 overflow-hidden w-full h-full",
      isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      <div className="flex items-center gap-2 border-b border-border-default px-4 py-4 shrink-0">
        <Users className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Members
        </span>
        <span className="text-[10px] text-text-muted ml-2">{members.length}</span>
        {onToggle && (
          <button
            onClick={onToggle}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer shrink-0"
            title="Collapse Members Panel"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-3">
          {members.map((m) => {
            const isYou = m.uid === currentUserId;
            const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div
                key={m.uid}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  !isYou && 'hover:bg-bg-tertiary cursor-pointer',
                )}
                onClick={() => !isYou && onStartDM(m)}
              >
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary border border-primary/15">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {m.fullName}
                    {isYou && <span className="ml-1 text-text-muted font-normal">(you)</span>}
                  </p>
                  <p className="text-[10px] text-text-muted truncate">@{m.username}</p>
                </div>

                {!isYou && (
                  <MessageSquare className="h-3.5 w-3.5 text-text-muted group-hover:text-primary/60 transition-colors shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
