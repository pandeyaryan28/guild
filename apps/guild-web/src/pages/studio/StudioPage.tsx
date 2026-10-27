import * as React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaceDocuments, useWorkspaceDocument } from '../../hooks/useWorkspaceDocuments';
import { useWorkspaceIssues } from '../../hooks/useWorkspaceIssues';
import { useWorkspaceCycles } from '../../hooks/useWorkspaceCycles';
import { StudioSidebar } from './StudioSidebar';
import { StudioEditor } from './StudioEditor';
import { StudioIssuesView } from './StudioIssuesView';
import { StudioCommandPalette } from './StudioCommandPalette';
import { StudioCreateIssueModal } from './StudioCreateIssueModal';
import type { WorkspaceDocument, IssueStatus } from '@guild/types';
import { Loader2, Plus, Sparkles, BookOpen } from 'lucide-react';

export function StudioPage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Documents
  const {
    documents,
    tree,
    favorites,
    loading: docsLoading,
    createDocument,
    updateMeta,
    deleteDocument
  } = useWorkspaceDocuments(orgId);

  // Issues & Cycles
  const { cycles, activeCycle, loading: cyclesLoading } = useWorkspaceCycles(orgId);
  const {
    issues,
    loading: issuesLoading,
    createIssue,
    updateIssue,
    deleteIssue
  } = useWorkspaceIssues(orgId);

  // View & Selection States
  const [selectedView, setSelectedView] = React.useState<
    'doc' | 'cycle' | 'issues' | 'triage' | 'backlog'
  >('doc');
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Modals & Palette
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [createIssueModalOpen, setCreateIssueModalOpen] = React.useState(false);
  const [createIssueDefaultStatus, setCreateIssueDefaultStatus] = React.useState<IssueStatus>('todo');

  // Auto-select first document if none selected
  React.useEffect(() => {
    if (!selectedDocId && documents.length > 0 && selectedView === 'doc') {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId, selectedView]);

  // Active Document hook
  const {
    document: activeDoc,
    loading: activeDocLoading,
    saveStatus,
    saveContent
  } = useWorkspaceDocument(selectedDocId || undefined);

  // Keyboard Shortcuts (Linear Velocity)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts if user is typing in an input or textarea or contenteditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.studio-tiptap-content');

      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      // C: Create issue
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setCreateIssueDefaultStatus('todo');
        setCreateIssueModalOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    setSelectedView('doc');
  };

  const handleCreateDoc = async (parentId?: string | null) => {
    try {
      const newDocId = await createDocument({ parentId });
      setSelectedDocId(newDocId);
      setSelectedView('doc');
    } catch (err) {
      console.error('Failed to create doc:', err);
    }
  };

  const handleToggleFavorite = async (doc: WorkspaceDocument) => {
    await updateMeta(doc.id, { isFavorite: !doc.isFavorite });
  };

  const handleOpenCreateIssue = (status: IssueStatus = 'todo') => {
    setCreateIssueDefaultStatus(status);
    setCreateIssueModalOpen(true);
  };

  if (docsLoading || cyclesLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs font-semibold tracking-wider uppercase">Loading Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex bg-background overflow-hidden">
      {/* Studio Sidebar (Notion tree + Linear cycle shortcuts) */}
      <StudioSidebar
        tree={tree}
        favorites={favorites}
        cycles={cycles}
        activeCycle={activeCycle}
        selectedDocId={selectedDocId}
        selectedView={selectedView}
        onSelectDoc={handleSelectDoc}
        onSelectView={(v) => setSelectedView(v)}
        onCreateDoc={handleCreateDoc}
        onDeleteDoc={deleteDocument}
        onToggleFavorite={handleToggleFavorite}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 h-full overflow-y-auto relative">
        {selectedView === 'doc' ? (
          activeDoc ? (
            <StudioEditor
              key={activeDoc.id}
              document={activeDoc}
              onSaveContent={saveContent}
              onUpdateMeta={(patch) => updateMeta(activeDoc.id, patch)}
              saveStatus={saveStatus}
            />
          ) : (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-secondary/80 border border-border flex items-center justify-center text-primary mb-4 shadow-xl">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">Welcome to Studio</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Create pages, product specs, sprint cycles, and track issues at blazing speed.
              </p>
              <button
                onClick={() => handleCreateDoc(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Document</span>
              </button>
            </div>
          )
        ) : (
          /* Linear Issues / Cycle Kanban View */
          <StudioIssuesView
            issues={issues}
            activeCycle={activeCycle}
            selectedCycleId={activeCycle?.id || null}
            statusFilter={
              selectedView === 'triage'
                ? 'triage'
                : selectedView === 'backlog'
                ? 'backlog'
                : null
            }
            onCreateIssue={handleOpenCreateIssue}
            onUpdateIssue={updateIssue}
            onDeleteIssue={deleteIssue}
          />
        )}
      </div>

      {/* Cmd+K Command Palette */}
      <StudioCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        documents={documents}
        issues={issues}
        onSelectDoc={handleSelectDoc}
        onSelectIssue={(issueId) => {
          setSelectedView('issues');
        }}
        onCreateDoc={() => handleCreateDoc(null)}
        onCreateIssue={() => handleOpenCreateIssue('todo')}
      />

      {/* Issue Creation Modal */}
      <StudioCreateIssueModal
        isOpen={createIssueModalOpen}
        onClose={() => setCreateIssueModalOpen(false)}
        defaultStatus={createIssueDefaultStatus}
        onSubmit={async (data) => {
          await createIssue({
            ...data,
            cycleId: activeCycle?.id || null
          });
        }}
      />
    </div>
  );
}
