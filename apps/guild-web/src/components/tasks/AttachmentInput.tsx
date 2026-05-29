import * as React from 'react';
import { Paperclip, X, File, FileImage } from 'lucide-react';

interface AttachmentInputProps {
  selectedFiles: File[];
  onRemove: (idx: number) => void;
  onAdd: (files: FileList) => void;
}

export function AttachmentInput({ selectedFiles, onRemove, onAdd }: AttachmentInputProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-neutral-50/50 dark:bg-neutral-850/10 border border-neutral-100 dark:border-neutral-850 max-h-24 overflow-y-auto animate-fluid-pop">
          {selectedFiles.map((file, idx) => {
            const isImage = file.type.startsWith('image/');
            return (
              <div 
                key={idx} 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 text-[10px] text-neutral-750 dark:text-neutral-300 max-w-[160px]"
              >
                {isImage ? <FileImage className="w-3 h-3 text-accent shrink-0" /> : <File className="w-3 h-3 text-neutral-405 shrink-0" />}
                <span className="truncate flex-1 font-semibold">{file.name}</span>
                <button 
                  type="button" 
                  onClick={() => onRemove(idx)}
                  className="text-neutral-400 hover:text-red-400 shrink-0 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
