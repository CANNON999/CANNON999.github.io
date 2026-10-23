import { getProjects, projectPath } from '../lib/content';
export async function GET() {
  const paths = ['/', '/about/', '/works/', ...(await getProjects()).map(projectPath)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>https://cannon999.github.io${path}</loc></url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
