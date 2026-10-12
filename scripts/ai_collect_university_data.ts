import fs from 'node:fs';
import path from 'node:path';
import { ALL_DIRECTORY_UNIVERSITIES } from '../src/data/initialData';

type Uni = { name: string; type: string };
type Candidate = {
  university: string;
  category: string;
  officialWebsite: string | null;
  departments: { name: string; sourceUrl: string | null }[];
  officialLogoPage: string | null;
  sources: { url: string; title: string; supports: string }[];
  collectedAt: string;
  status: 'needs_manual_verification';
  notes: string[];
};

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OUT = path.resolve('src/data/research-candidates/university-data-candidates.json');
const OFFSET = Math.max(0, Number(process.env.UNIVERSITY_OFFSET || 0));
const LIMIT = Math.max(1, Math.min(30, Number(process.env.UNIVERSITY_BATCH_SIZE || 10)));

function extractJson(text: string): any {
  const cleaned = text.trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI response did not contain a JSON object');
  return JSON.parse(cleaned.slice(start, end + 1));
}
async function research(uni: Uni): Promise<Candidate> {
  const prompt = `Research the real-world university named "${uni.name}" in Bangladesh (directory category: ${uni.type}). Use Google Search to find primary sources, prioritizing the institution's official website and official department/faculty pages, then Bangladesh UGC or government sources. Return ONE JSON object only with this schema: {"officialWebsite": string|null, "departments":[{"name":string,"sourceUrl":string|null}], "officialLogoPage":string|null, "sources":[{"url":string,"title":string,"supports":string}], "notes":[string]}. List only departments that you can support with cited pages; do not guess or fill missing data. Use absolute URLs. Include source URLs for the official site, department list, and logo page where available. If identity is ambiguous or sources disagree, explain that in notes. This is a research candidate, not a verified record.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1 }
    }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(`Gemini API HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload: any = await response.json();
  const text = (payload.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text || '').join('');
  const parsed = extractJson(text);
  const modelSources = Array.isArray(parsed.sources) ? parsed.sources.filter((s: any) => typeof s.url === 'string' && /^https?:\/\//i.test(s.url)).map((s: any) => ({
    url: s.url, title: String(s.title || 'Untitled source'), supports: String(s.supports || '')
  })) : [];
  const groundedChunks = payload.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const groundedSources = groundedChunks.map((chunk: any) => chunk.web).filter((web: any) => typeof web?.uri === 'string' && /^https?:\/\//i.test(web.uri)).map((web: any) => ({
    url: web.uri, title: String(web.title || 'Google Search source'), supports: 'Returned by Gemini Google Search grounding; inspect page to confirm support.'
  }));
  const sourceMap = new Map<string, { url: string; title: string; supports: string }>();
  for (const source of [...groundedSources, ...modelSources]) if (!sourceMap.has(source.url)) sourceMap.set(source.url, source);
  const sources = [...sourceMap.values()];
  const departments = Array.isArray(parsed.departments) ? parsed.departments.filter((d: any) => typeof d.name === 'string' && d.name.trim()).map((d: any) => ({
    name: d.name.trim(), sourceUrl: typeof d.sourceUrl === 'string' && /^https?:\/\//i.test(d.sourceUrl) ? d.sourceUrl : null
  })) : [];
  const website = typeof parsed.officialWebsite === 'string' && /^https?:\/\//i.test(parsed.officialWebsite) ? parsed.officialWebsite : null;
  const logoPage = typeof parsed.officialLogoPage === 'string' && /^https?:\/\//i.test(parsed.officialLogoPage) ? parsed.officialLogoPage : null;
  return {
    university: uni.name,
    category: uni.type,
    officialWebsite: website,
    departments,
    officialLogoPage: logoPage,
    sources,
    collectedAt: new Date().toISOString(),
    status: 'needs_manual_verification',
    notes: Array.isArray(parsed.notes) ? parsed.notes.map((n: unknown) => String(n)) : []
  };
}
async function main() {
  if (!API_KEY) throw new Error('Missing GEMINI_API_KEY. Add it as a GitHub Actions repository secret.');
  const universities = ALL_DIRECTORY_UNIVERSITIES as Uni[];
  const batch = universities.slice(OFFSET, OFFSET + LIMIT);
  if (!batch.length) throw new Error(`No universities at offset ${OFFSET}; directory contains ${universities.length} entries.`);
  const prior = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { generatedAt: null, candidates: [] };
  const byName = new Map<string, Candidate>((prior.candidates || []).map((x: Candidate) => [x.university, x]));
  for (let i = 0; i < batch.length; i++) {
    const uni = batch[i];
    console.log(`[${OFFSET + i + 1}/${universities.length}] Researching ${uni.name}`);
    try {
      byName.set(uni.name, await research(uni));
    } catch (error) {
      const old = byName.get(uni.name);
      byName.set(uni.name, {
        university: uni.name, category: uni.type,
        officialWebsite: old?.officialWebsite ?? null,
        departments: old?.departments ?? [],
        officialLogoPage: old?.officialLogoPage ?? null,
        sources: old?.sources ?? [],
        collectedAt: new Date().toISOString(),
        status: 'needs_manual_verification',
        notes: [...(old?.notes ?? []), `Latest collection attempt failed: ${String(error)}`]
      });
      console.error(`Research failed for ${uni.name}: ${String(error)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  const candidates = [...byName.values()].sort((a, b) => a.university.localeCompare(b.university));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    directorySource: 'src/data/initialData.ts → ALL_DIRECTORY_UNIVERSITIES',
    totalDirectoryUniversities: universities.length,
    collectedCandidateCount: candidates.length,
    warning: 'AI research output is unverified. Review source URLs and department lists before using it in the live directory.',
    candidates
  }, null, 2) + '\n');
  console.log(`Saved ${candidates.length} research candidates to ${OUT}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
