import * as React from 'react';
import { getOrCreateCanvas, listenToCanvas, updateCanvasContent } from '../lib/canvases';
import { useAuth } from './useAuth';
import type { Canvas } from '@guild/types';

export function useCanvas(chatId: string | null | undefined) {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const userName = userProfile?.fullName ?? 'User';
  
  const [canvas, setCanvas] = React.useState<Canvas | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Local state during edits so typing is fast
  const [localTitle, setLocalTitle] = React.useState('');
  const [localContent, setLocalContent] = React.useState('');

  React.useEffect(() => {
    if (!orgId || !chatId || !user) {
      setCanvas(null);
      setLocalTitle('');
      setLocalContent('');
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubListener: (() => void) | null = null;
    let isActive = true;

    getOrCreateCanvas(orgId, chatId, user.uid, userName)
      .then((canvasId) => {
        if (!isActive) return;
        
        unsubListener = listenToCanvas(canvasId, (updatedCanvas) => {
          if (!isActive) return;
          setCanvas(updatedCanvas);
          if (updatedCanvas) {
            setLocalTitle(updatedCanvas.title);
            setLocalContent(updatedCanvas.content);
          }
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error('Failed to get/create canvas:', err);
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
      if (unsubListener) unsubListener();
    };
  }, [orgId, chatId, user?.uid, userName]);

  // Debounced auto-save logic
  const saveTimeoutRef = React.useRef<any>(null);

  const saveCanvas = React.useCallback(
    async (newContent: string, newTitle: string) => {
      if (!canvas || !user) return;
      setIsSaving(true);
      try {
        await updateCanvasContent(canvas.id, newContent, newTitle, user.uid, userName);
      } catch (err) {
        console.error('Failed to auto-save canvas:', err);
      } finally {
        setIsSaving(false);
      }
    },
    [canvas, user, userName]
  );

  const handleUpdate = React.useCallback(
    (newContent: string, newTitle: string) => {
      setLocalContent(newContent);
      setLocalTitle(newTitle);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveCanvas(newContent, newTitle);
      }, 1000); // 1-second debounce
    },
    [saveCanvas]
  );

  // Force immediate save (useful on blur or when clicking checklist buttons)
  const forceSave = React.useCallback(
    async (newContent: string, newTitle: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setLocalContent(newContent);
      setLocalTitle(newTitle);
      await saveCanvas(newContent, newTitle);
    },
    [saveCanvas]
  );

  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return {
    canvas,
    loading,
    isSaving,
    localTitle,
    localContent,
    setLocalTitle,
    setLocalContent,
    updateCanvas: handleUpdate,
    forceSave
  };
}
