export type Resource = { label: string; url: string; kind: 'document' | 'video' | 'download' | 'source'; code?: string };

/** Preserve every existing resource, including multiple videos and source archives. */
export function hubResources(resources: Resource[], projectId: string) {
  const story = { label: '查看作品介绍', url: `/works/${projectId}/#project-story`, kind: 'document' as const };
  const primary = resources.find(r => r.kind === 'document')
    || resources.find(r => r.kind === 'download') || resources.find(r => r.kind === 'video') || resources[0] || story;
  return {
    primary,
    groups: [
      { id: 'document', title: '设计文档', english: 'DOCUMENTS', icon: 'document', resources: resources.filter(r => r.kind === 'document') },
      { id: 'video', title: '演示视频', english: 'VIDEOS', icon: 'video', resources: resources.filter(r => r.kind === 'video') },
      { id: 'download', title: '下载与工程', english: 'DOWNLOADS', icon: 'download', resources: resources.filter(r => r.kind === 'download' || r.kind === 'source') },
    ],
  };
}

export const isPersonalScene = (id: string) => id === 'welcome' || id === 'profile';

/** Keep both personal scenes shareable; empty/unknown routes open the welcome scene. */
export function consoleRoute(hash: string, projectIds: string[]) {
  const value = hash.replace(/^#/, '');
  const hubId = value.startsWith('hub-') ? value.slice(4) : null;
  if (hubId && projectIds.includes(hubId)) return { selected: hubId, hub: hubId };
  return { selected: isPersonalScene(value) || projectIds.includes(value) ? value : 'welcome', hub: null };
}

export function canOpenHub(event: { button?: number; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }) {
  return (event.button === undefined || event.button === 0) && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
