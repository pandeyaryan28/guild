import * as React from 'react';
import { 
  Paperclip, Loader2, X, File, FileText, 
  FileAudio, FileVideo, Download, ExternalLink, Trash2 
} from 'lucide-react';
import { type MessageAttachment } from '@guild/types';
import { uploadEntityAttachment } from '../../lib/storage';
import { cn } from '@/lib/utils';

interface AttachmentSectionProps {
  entityType: 'tasks' | 'goals' | 'projects';
  entityId: string;
  files?: MessageAttachment[];
  onAttachmentsChanged: (updatedFiles: MessageAttachment[]) => Promise<void>;
  editable?: boolean;
}

export function AttachmentSection({
  entityType,
  entityId,
  files = [],
  onAttachmentsChanged,
  editable = true
}: AttachmentSectionProps) {
  const [uploadingFiles, setUploadingFiles] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);
    
    // Add to uploading list
    const newUploadingNames = selectedFiles.map(f => f.name);
    setUploadingFiles(prev => [...prev, ...newUploadingNames]);

    const uploadedRefs: MessageAttachment[] = [];
    try {
      for (const file of selectedFiles) {
        if (file.size > 50 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds the 50MB limit.`);
          // Remove from uploading list
          setUploadingFiles(prev => prev.filter(name => name !== file.name));
          continue;
        }
        
        try {
          const attachment = await uploadEntityAttachment(entityType, entityId, file);
          uploadedRefs.push(attachment);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
        } finally {
          setUploadingFiles(prev => prev.filter(name => name !== file.name));
        }
      }
      
      if (uploadedRefs.length > 0) {
        await onAttachmentsChanged([...files, ...uploadedRefs]);
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  const handleRemoveAttachment = async (indexToRemove: number) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    const updated = files.filter((_, idx) => idx !== indexToRemove);
    await onAttachmentsChanged(updated);
  };

  const images = files.filter(f => f.type.startsWith('image/'));
  const nonImages = files.filter(f => !f.type.startsWith('image/'));

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          <span>Attachments ({files.length})</span>
        </label>
        {editable && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-black uppercase tracking-wider text-accent hover:text-accent/80 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>+ Attach Files</span>
          </button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
      </div>

      {/* Uploading indicator cards */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-1.5">
          {uploadingFiles.map((filename, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-dashed border-accent/20 bg-accent/[0.02] px-3.5 py-2.5 animate-fluid-pop"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Loader2 className="h-3.5 w-3.5 text-accent animate-spin shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate font-bold">Uploading {filename}...</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && uploadingFiles.length === 0 && (
        <div className="py-6 text-center text-xs text-neutral-400 italic bg-neutral-50/20 dark:bg-neutral-850/5 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
          No files attached.
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className={cn(
          "grid gap-2",
          images.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2 sm:grid-cols-3"
        )}>
          {files.map((file, idx) => {
            if (!file.type.startsWith('image/')) return null;
            return (
              <div
                key={idx}
                className="group/img relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-850 bg-neutral-50/50 dark:bg-neutral-850/10 shadow-sm aspect-video max-h-40 transition-all hover:shadow-md hover:border-accent/30"
              >
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-102"
                  loading="lazy"
                />
                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:scale-105 transition-all shadow"
                    title="View Original"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:scale-105 transition-all shadow"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-650 hover:scale-105 transition-all shadow cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Non-Images List */}
      {nonImages.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, idx) => {
            if (file.type.startsWith('image/')) return null;
            let FileIcon = File;
            if (file.type.startsWith('text/') || file.type.includes('pdf')) {
              FileIcon = FileText;
            } else if (file.type.startsWith('audio/')) {
              FileIcon = FileAudio;
            } else if (file.type.startsWith('video/')) {
              FileIcon = FileVideo;
            }

            return (
              <div
                key={idx}
                className="group/file flex items-center gap-3 rounded-xl border border-neutral-100 dark:border-neutral-850 bg-neutral-50/50 dark:bg-neutral-850/5 hover:bg-neutral-50 dark:hover:bg-neutral-850/25 px-3 py-2.5 shadow-sm transition-all hover:border-accent/25"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/5 text-accent border border-accent/15">
                  <FileIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-250 truncate group-hover/file:text-accent transition-colors">
                    {file.name}
                  </p>
                  <p className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB · {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-550 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
