import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Globe, ExternalLink, Trash2, Link2, Check } from 'lucide-react';
import { useCanvasEditorContext } from '../CanvasEditorContext';

export function BookmarkEmbedBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { canEdit } = useCanvasEditorContext();

  const url: string = node.attrs.url ?? '';
  const title: string = node.attrs.title ?? '';
  const description: string = node.attrs.description ?? '';

  const [isEditing, setIsEditing] = React.useState(!url);
  const [urlDraft, setUrlDraft] = React.useState(url);
  const [titleDraft, setTitleDraft] = React.useState(title);
  const [descDraft, setDescDraft] = React.useState(description);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlDraft.trim()) return;
    let normalizedUrl = urlDraft.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    let derivedTitle = titleDraft.trim();
    if (!derivedTitle) {
      try {
        const parsed = new URL(normalizedUrl);
        derivedTitle = parsed.hostname.replace(/^www\./, '');
      } catch {
        derivedTitle = normalizedUrl;
      }
    }
    updateAttributes({
      url: normalizedUrl,
      title: derivedTitle,
      description: descDraft.trim()
    });
    setUrlDraft(normalizedUrl);
    setTitleDraft(derivedTitle);
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="my-3 not-prose">
      {isEditing && canEdit ? (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-border dark:border-border-strong bg-surface/90 dark:bg-surface/55 backdrop-blur-xl p-4 shadow-md space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              Embed Web Bookmark or Reference Link
            </span>
            <button
              type="button"
              onClick={() => deleteNode()}
              className="p-1 text-muted-foreground hover:text-rose-500 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              autoFocus
              placeholder="https://figma.com/file/... or github.com/..."
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-secondary/70 border border-border text-xs text-foreground outline-none focus:border-primary"
            />
            <input
              type="text"
              placeholder="Bookmark Title (optional)"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-secondary/70 border border-border text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Brief description or note (optional)..."
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl bg-secondary/70 border border-border text-xs text-foreground outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </form>
      ) : (
        <div className="group/bookmark relative flex items-center justify-between gap-4 p-4 rounded-2xl border border-border dark:border-border-strong bg-surface/85 dark:bg-surface/50 backdrop-blur-xl hover:border-primary/40 shadow-xs transition-all">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3.5 min-w-0 flex-1"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground group-hover/bookmark:text-primary transition-colors truncate">
                  {title || url}
                </span>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
              </div>
              {description && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{description}</p>
              )}
              <span className="text-[10px] font-mono text-muted-foreground/70 truncate block mt-0.5">
                {url}
              </span>
            </div>
          </a>

          {canEdit && (
            <div className="flex items-center gap-1 opacity-0 group-hover/bookmark:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 rounded-lg bg-secondary text-[11px] font-medium text-foreground hover:bg-secondary/80 cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteNode()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}
