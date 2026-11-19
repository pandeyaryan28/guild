import { Navigate, useLocation } from 'react-router-dom';

export function WorkspaceRedirect({ destination }: { destination: 'home' | 'tasks' | 'requests' | 'canvases' | 'studio' }) {
  const { search, hash } = useLocation();
  const params = new URLSearchParams(search);
  const section = destination === 'canvases' && (params.get('tab') === 'tasks' || params.has('task')) ? 'tasks' : destination;
  params.delete('tab');
  if (section === 'requests') params.set('view', 'requests');
  if (section === 'studio') params.set('view', 'studio');
  const path = section === 'home' ? '/workspace'
    : section === 'canvases' ? '/workspace/canvases' : '/workspace/tasks';
  return <Navigate replace to={{ pathname: path, search: params.toString(), hash }} />;
}
