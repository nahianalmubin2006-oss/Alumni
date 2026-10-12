import fs from 'node:fs';
import path from 'node:path';
import { ALL_DIRECTORY_UNIVERSITIES } from '../src/data/initialData';

type Uni = { name: string; type: string };
type ManifestEntry = {
  university: string;
  category: string;
  filename?: string;
  sourceUrl?: string;
  sourceFile?: string;
  license?: string;
  status: 'downloaded_candidate' | 'not_found' | 'download_failed';
  verification: 'needs_visual_review';
};

const OUT_DIR = path.resolve('public/logos/official-candidates');
const MANIFEST = path.resolve('src/data/official-logo-manifest.json');
const SOURCE_SCRIPT = path.resolve('scripts/generate_all_logos.ts');
const USER_AGENT = 'AlumniSphereLogoCollector/1.0 (university directory; respectful automated access)';
const DELAY_MS = 300;
const MAX_BYTES = 8 * 1024 * 1024;

function slugify(value: string) {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
function extractExistingSources(): Record<string, string> {
  const source = fs.readFileSync(SOURCE_SCRIPT, 'utf8');
  const start = source.indexOf('const VERIFIED_OFFICIAL_URLS');
  const open = source.indexOf('{', start);
  const end = source.indexOf('\n};', open);
  if (start < 0 || open < 0 || end < 0) return {};
  const block = source.slice(open + 1, end);
  const result: Record<string, string> = {};
  for (const match of block.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) result[match[1]] = match[2];
  return result;
}
function extFromMime(mime: string, url: string): string | undefined {
  const m = mime.toLowerCase().split(';')[0].trim();
  if (m === 'image/svg+xml') return '.svg';
  if (m === 'image/png') return '.png';
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/gif') return '.gif';
  const suffix = path.extname(new URL(url).pathname).toLowerCase();
  return ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(suffix) ? (suffix === '.jpeg' ? '.jpg' : suffix) : undefined;
}
function validImage(bytes: Buffer, ext: string) {
  if (ext === '.svg') {
    const text = bytes.toString('utf8').slice(0, 20000).toLowerCase();
    return text.includes('<svg') && !text.includes('<html') && !text.includes('<script');
  }
  if (ext === '.png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (ext === '.jpg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === '.gif') return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
  if (ext === '.webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return false;
}
async function getJson(url: string) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}
async function findCommonsCandidate(name: string): Promise<{ url: string; file: string; license?: string } | undefined> {
  const query = `${name} logo`;
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '6',
    gsrlimit: '15', prop: 'imageinfo', iiprop: 'url|mime|extmetadata', format: 'json'
  }).toString();
  const data: any = await getJson(api.toString());
  const pages = Object.values(data.query?.pages ?? {}) as any[];
  const nameTokens = slugify(name).split('-').filter(t => t.length > 3 && !['university', 'bangladesh', 'international'].includes(t));
  const candidates = pages.map(page => {
    const file = String(page.title ?? '').replace(/^File:/i, '');
    const lower = file.toLowerCase();
    let score = 0;
    if (/logo|monogram|emblem|crest|seal|coat.?of.?arms/i.test(lower)) score += 8;
    for (const token of nameTokens) if (lower.includes(token)) score += 2;
    if (/flag|building|campus|map|portrait|photo|banner|wordmark/i.test(lower)) score -= 5;
    const info = page.imageinfo?.[0];
    if (!info?.url || !String(info.mime ?? '').startsWith('image/')) score -= 20;
    return { score, file, url: info?.url as string | undefined, mime: info?.mime as string | undefined,
      license: info?.extmetadata?.LicenseShortName?.value as string | undefined };
  }).filter(c => c.url && c.score >= 8 && c.mime && /^image\/(svg\+xml|png|jpeg|webp|gif)$/i.test(c.mime));
  candidates.sort((a, b) => b.score - a.score);
  const chosen = candidates[0];
  return chosen?.url ? { url: chosen.url, file: chosen.file, license: chosen.license } : undefined;
}
async function download(url: string, destBase: string) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`image HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  const ext = extFromMime(contentType, url);
  if (!ext) throw new Error(`unsupported image type: ${contentType}`);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_BYTES) throw new Error('image empty or too large');
  const bytes = Buffer.from(arrayBuffer);
  if (!validImage(bytes, ext)) throw new Error('downloaded file failed image validation');
  const filename = `${destBase}${ext}`;
  fs.writeFileSync(path.join(OUT_DIR, filename), bytes);
  return filename;
}
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const universities = ALL_DIRECTORY_UNIVERSITIES as Uni[];
  const knownSources = extractExistingSources();
  const manifest: ManifestEntry[] = [];
  console.log(`Collecting logo candidates for ${universities.length} universities.`);
  for (let i = 0; i < universities.length; i++) {
    const uni = universities[i];
    const base = slugify(uni.name);
    const existingUrl = knownSources[uni.name];
    let source: { url: string; file: string; license?: string } | undefined;
    let status: ManifestEntry['status'] = 'not_found';
    let filename: string | undefined;
    console.log(`[${i + 1}/${universities.length}] ${uni.name}`);
    try {
      if (existingUrl) {
        source = { url: existingUrl, file: 'Existing source map (needs review)' };
      } else {
        source = await findCommonsCandidate(uni.name);
      }
      if (source) {
        try {
          filename = await download(source.url, base);
          status = 'downloaded_candidate';
        } catch (error) {
          status = 'download_failed';
          console.warn(`  Download failed: ${String(error)}`);
        }
      }
    } catch (error) {
      status = 'not_found';
      console.warn(`  Search failed: ${String(error)}`);
    }
    manifest.push({
      university: uni.name,
      category: uni.type,
      ...(filename ? { filename: `/logos/official-candidates/${filename}` } : {}),
      ...(source ? { sourceUrl: source.url, sourceFile: source.file, ...(source.license ? { license: source.license } : {}) } : {}),
      status,
      verification: 'needs_visual_review'
    });
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(MANIFEST, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceDirectory: 'https://www.ugc.gov.bd/universities',
    note: 'Downloaded candidates are not guaranteed to be official. Visually verify each image and check source/license before public use.',
    totalUniversities: universities.length,
    downloadedCandidates: manifest.filter(x => x.status === 'downloaded_candidate').length,
    notFound: manifest.filter(x => x.status === 'not_found').length,
    downloadFailed: manifest.filter(x => x.status === 'download_failed').length,
    universities: manifest
  }, null, 2) + '\n');
  console.log(`Finished. Candidate images: ${manifest.filter(x => x.filename).length}/${universities.length}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
