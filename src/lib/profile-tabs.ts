export const profileSections = [
  { id: 'education', label: '教育背景' }, { id: 'experience', label: '工作经历' },
  { id: 'projects', label: '项目经历' }, { id: 'campus', label: '在校经历' },
  { id: 'skills', label: '个人技能' }, { id: 'games', label: '游戏经历' },
] as const;
export function profileSection(hash: string, ids: readonly string[]) {
  const id = hash.replace(/^#/, '');
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
