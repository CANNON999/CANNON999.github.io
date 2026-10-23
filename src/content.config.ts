import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(1),
    english: z.string().min(1),
    short: z.string().min(1),
    category: z.enum(['level', 'game', 'art', 'notes']),
    order: z.number(),
    draft: z.boolean().default(false),
    year: z.string().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    cover: z.string().startsWith('/images/').optional(),
    summary: z.string().min(1),
    tagline: z.string().min(1),
    role: z.string().min(1),
    tools: z.array(z.string()).min(1),
    tags: z.array(z.string()).min(1),
    resources: z.array(z.object({
      label: z.string().min(1),
      url: z.url().refine(value => new URL(value).protocol === 'https:', '资源链接请使用 HTTPS'),
      kind: z.enum(['document', 'video', 'download', 'source']).default('document'),
      code: z.string().optional(),
    })).default([]),
    legacy: z.array(z.string().startsWith('/')).default([]),
  }).refine(data => data.draft || data.category === 'notes' || Boolean(data.cover), {
    message: '公开作品需要封面：请填写 /images/ 下的图片路径，或先保留 draft: true。',
    path: ['cover'],
  }),
});

export const collections = { projects };
