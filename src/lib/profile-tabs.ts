export const profileSections = [
  { id: 'info', label: '个人信息' }, { id: 'experience', label: '工作经历' },
  { id: 'projects', label: '项目经历' }, { id: 'games', label: '游戏经历' },
] as const;
/** Existing shared chapter links still open the matching part of personal info. */
export function profileAnchor(hash: string) {
  const id = hash.replace(/^#/, '');
  return ['education', 'campus', 'skills'].includes(id) ? id : undefined;
}
export function profileSection(hash: string, ids: readonly string[]) {
  const id = profileAnchor(hash) && ids.includes('info') ? 'info' : hash.replace(/^#/, '');
  return ids.includes(id) ? id : ids[0];
}
export function profileKeyIndex(key: string, current: number, count: number) {
  if (!count) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowLeft') return (current + count - 1) % count;
  return null;
}
