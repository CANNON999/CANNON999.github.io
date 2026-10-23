import { getCollection, type CollectionEntry } from 'astro:content';

export const categories = {
  level: { label: '关卡设计', english: 'LEVEL DESIGN' },
  game: { label: '游戏开发', english: 'GAME DEVELOPMENT' },
  art: { label: '视觉作品', english: 'VISUAL EXPLORATION' },
  notes: { label: '游戏拆解', english: 'DESIGN NOTES' },
} as const;

export type Project = CollectionEntry<'projects'>;
export async function getProjects() {
  return (await getCollection('projects', ({ data }) => !data.draft))
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}
export const projectPath = (project: Project) => `/works/${project.id}/`;
