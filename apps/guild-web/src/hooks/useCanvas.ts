import * as React from 'react';
import { getOrCreateCanvas, listenToCanvas, updateCanvasContent } from '../lib/canvases';
import { useAuth } from './useAuth';
import type { Canvas } from '@guild/types';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'unsaved';

export function useCanvas(chatId: string | null | undefined) {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const userName = userProfile?.fullName || user?.displayName || 'User';

  const [canvas, setCanvas] = React.useState<Canvas | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('saved');

  // Local state for fast responsiveness
  const [localTitle, setLocalTitle] = React.useState('');
  const [localContent, setLocalContent] = React.useState('');

  const isInitialLoadRef = React.useRef(true);
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = React.useRef({ content: '', title: '' });

  // Keep latestStateRef in sync
  latestStateRef.current = { content: localContent, title: localTitle };

  React.useEffect(() => {
    if (!orgId || !chatId || !user) {
      setCanvas(null);
      setLocalTitle('');
      setLocalContent('');
      setLoading(false);
      return;
    }

    setLoading(true);
    isInitialLoadRef.current = true;
    let unsubListener: (() => void) | null = null;
    let isActive = true;

    getOrCreateCanvas(orgId, chatId, user.uid, userName)
      .then((canvasId) => {
        if (!isActive) return;

        unsubListener = listenToCanvas(canvasId, (updatedCanvas) => {
          if (!isActive) return;
          setCanvas(updatedCanvas);

          if (updatedCanvas) {
            const isRemoteChange = updatedCanvas.updatedBy !== user.uid;
            if (isRemoteChange || isInitialLoadRef.current) {
              setLocalTitle(updatedCanvas.title || 'Untitled Canvas');
              setLocalContent(updatedCanvas.content || '');
              isInitialLoadRef.current = false;
            }
          }
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error('Failed to get/create canvas:', err);
        if (isActive) {
          setLoading(false);
          setSaveStatus('error');
        }
      });

    return () => {
      isActive = false;
      if (unsubListener) unsubListener();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [orgId, chatId, user?.uid, userName]);

  // Actual Firestore save routine
  const performSave = React.useCallback(
    async (contentToSave: string, titleToSave: string) => {
      if (!canvas?.id || !user) return;
      try {
        setSaveStatus('saving');
        await updateCanvasContent(
          canvas.id,
          contentToSave,
          titleToSave.trim() || 'Untitled Canvas',
          user.uid,
          userName
        );
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save canvas content:', err);
        setSaveStatus('error');
      }
    },
    [canvas?.id, user, userName]
  );

  // Debounced updater
  const updateCanvas = React.useCallback(
    (newContent: string, newTitle?: string) => {
      const resolvedTitle = newTitle !== undefined ? newTitle : latestStateRef.current.title;
      setLocalContent(newContent);
      if (newTitle !== undefined) {
        setLocalTitle(newTitle);
      }
      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        performSave(newContent, resolvedTitle);
      }, 600); // 600ms debounce
    },
    [performSave]
  );

  // Force immediate save (on blur or actions)
  const forceSave = React.useCallback(
    async (content?: string, title?: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const c = content !== undefined ? content : latestStateRef.current.content;
      const t = title !== undefined ? title : latestStateRef.current.title;
      setLocalContent(c);
      setLocalTitle(t);
      await performSave(c, t);
    },
    [performSave]
  );

  // Derive last edited information
  const lastEditedInfo = React.useMemo(() => {
    if (!canvas?.updatedAt) return null;
    const date = canvas.updatedAt.toDate ? canvas.updatedAt.toDate() : new Date();
    return {
      name: canvas.updatedByName || 'Collaborator',
      time: date,
      isCurrentUser: canvas.updatedBy === user?.uid,
    };
  }, [canvas?.updatedAt, canvas?.updatedByName, canvas?.updatedBy, user?.uid]);

  return {
    canvas,
    loading,
    saveStatus,
    localTitle,
    localContent,
    setLocalTitle,
    setLocalContent,
    updateCanvas,
    forceSave,
    lastEditedInfo,
  };
}
