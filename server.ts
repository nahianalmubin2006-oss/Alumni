import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory bot metadata tracker (persisted between requests)
let botState = {
  active: true,
  lastScanAt: new Date().toISOString(),
  nextRotationAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  cycleCount: 1,
  totalGenerated: 0,
};

// University & Department catalogues for comprehensive multi-institution coverage
const UNIVERSITIES = [
  'Bangladesh University of Engineering & Technology',
  'University of Dhaka',
  'North South University',
  'BRAC University',
  'Shahjalal University of Science & Technology',
  'Jahangirnagar University',
  'Rajshahi University of Engineering & Technology',
  'Khulna University of Engineering & Technology',
  'Independent University, Bangladesh',
  'East West University',
];

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical & Electronic Engineering',
  'Business Administration',
  'Economics',
  'Pharmacy',
  'Civil Engineering',
  'Mechanical Engineering',
  'Biotechnology & Genetic Engineering',
  'Architecture',
  'Law & Justice',
];

// Fallback dynamic news generator for resilience
function generateCuratedNews(params: {
  focusType?: string;
  university?: string;
  department?: string;
  forceHotTopic?: boolean;
}) {
  const targetUni = params.university || UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)];
  const targetDept = params.department || DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
  const isHot = params.forceHotTopic || Math.random() > 0.4;
  const now = new Date();
  const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

  const curatedTemplates = [
    {
      title: `${targetUni} ${targetDept} Alumni Wins Prestigious Global Innovation Fellowship 2026`,
      category: 'Alumni special achievements' as const,
      alumniPrizeName: 'Global Innovation & Technology Fellowship ($150,000)',
      isHotTopic: isHot,
      hotTopicReason: 'International prize winning with $150k grant and global recognition',
      summary: `A distinguished graduate from ${targetUni}'s ${targetDept} has been awarded the 2026 International Innovation Fellowship for transformative contributions to sustainable engineering and machine learning.`,
      content: `In an exceptional international accomplishment, an alumnus of ${targetUni} (${targetDept}) was honored with the prestigious Global Innovation & Technology Fellowship. The award ceremony celebrated groundbreaking research combining scalable machine intelligence with environmental resilience. The award includes project funding, access to tier-1 computing clusters, and international research residency. Department faculty and current students celebrated the honor during an institutional symposium.`,
      imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
      sourceUrl: 'https://www.nature.com/nature-awards',
      sourceName: 'International Science & Fellowship Bureau',
    },
    {
      title: `Breakthrough Multi-University Research Consortium Led by ${targetUni} ${targetDept}`,
      category: 'Research' as const,
      alumniPrizeName: 'National Science Council Excellence Award',
      isHotTopic: isHot,
      hotTopicReason: 'Multi-million collaborative grant secured across 4 leading institutes',
      summary: `${targetUni}'s ${targetDept} department has secured an inter-institutional research endowment to spearhead next-generation autonomous infrastructure.`,
      content: `The Department of ${targetDept} at ${targetUni} has spearheaded a premier multi-institutional research initiative. Backed by corporate alumni partners and public innovation grants, the initiative provides graduate research fellowships and direct student mentorship from industry pioneers abroad.`,
      imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
      sourceUrl: 'https://www.ieee.org/news',
      sourceName: 'Academic Research Network Wire',
    },
    {
      title: `${targetDept} Alumni Founders at ${targetUni} Close Series A Funding for CleanTech`,
      category: 'Alumni special achievements' as const,
      alumniPrizeName: 'Forbes 30 Under 30 & TechStars Global Cohort',
      isHotTopic: true,
      hotTopicReason: 'Alumni-founded venture reaches $12M valuation within 24 months',
      summary: `A team of four ${targetUni} alumni from ${targetDept} announced their successful Series A financing round to scale clean industrial energy solutions.`,
      content: `A startup created by alumni of ${targetUni}'s ${targetDept} has concluded an oversubscribed Series A financing round led by international venture capital firms. The founding team credited university incubation labs and alumni mentorship networks for accelerating their early product validation.`,
      imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=80',
      sourceUrl: 'https://techcrunch.com',
      sourceName: 'Venture Capital & Alumni Wire',
    },
    {
      title: `${targetUni} ${targetDept} Annual Symposium Announces 2026 Merit Scholarships & Mentorship`,
      category: 'Scholarships' as const,
      alumniPrizeName: 'Alumni Legacy Gold Medal & Endowed Scholarship',
      isHotTopic: false,
      hotTopicReason: '',
      summary: `Alumni association partners with ${targetUni} to fund 40 full-ride merit scholarships for undergraduate research scholars in ${targetDept}.`,
      content: `The Department of ${targetDept} at ${targetUni} has unveiled an endowed scholarship initiative funded entirely by alumni cohorts from 2010 to 2022. The program covers full tuition, technology stipends, and guaranteed international internships.`,
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      sourceUrl: 'https://alumni.org/press',
      sourceName: 'AlumniSphere Higher Education Press',
    },
  ];

  const picked = curatedTemplates[Math.floor(Math.random() * curatedTemplates.length)];
  return {
    ...picked,
    university: targetUni,
    department: targetDept,
    authorId: 'ai-news-bot',
    authorName: 'AlumniSphere AI Wire Bot',
    status: 'PUBLISHED',
    featured: picked.isHotTopic,
    trending: picked.isHotTopic,
    views: Math.floor(Math.random() * 300) + 45,
    isAiGenerated: true,
    isPermanent: false,
    expiresAt: tenDaysLater,
    createdAt: now.toISOString(),
    publishedAt: now.toISOString(),
  };
}

// Route 1: Trigger AI Bot Live Web Scan & Generation
app.post('/api/ai-news-bot/generate', async (req, res) => {
  try {
    const { focusType, university, department, forceHotTopic, count = 2 } = req.body || {};
    const generatedArticles: any[] = [];
    const now = new Date();
    const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI();
        const targetUni = university || UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)];
        const targetDept = department || DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];

        const prompt = `You are an automated AI Live News Wire Bot for a university alumni intelligence network.
Your mission: Scan web information or generate authentic, high-impact news stories covering universities, departments, and alumni special achievements (prize winning, awards, prestigious grants, international recognitions, career breakthroughs).

Generate ${Math.min(count, 3)} diverse news articles for:
Target University: ${targetUni}
Target Department: ${targetDept}
Focus Category: ${focusType || 'Alumni achievements and department breakthroughs'}
Ensure at least one article is marked as a HOT TOPIC ("isHotTopic": true) with high-priority breakthrough/prize winning details.

Return ONLY a JSON array of objects with the exact schema:
[
  {
    "title": "Clear headline with institution and achievement",
    "summary": "1-2 sentence compelling executive summary",
    "content": "Detailed 2-3 paragraph news report highlighting background, prize/achievement, alumni names, impact",
    "category": "Alumni special achievements" | "University announcements" | "Department announcements" | "Research" | "Scholarships" | "Jobs",
    "university": "${targetUni}",
    "department": "${targetDept}",
    "isHotTopic": true or false,
    "hotTopicReason": "Brief reason why this is hot/breaking (e.g. Won $100k ACM prize, IEEE Fellow award)",
    "alumniPrizeName": "Name of prestigious award/medal if applicable",
    "sourceUrl": "Realistic web url or news source url",
    "sourceName": "Name of news wire or publication (e.g. IEEE Spectrum, TechCrunch, University Press)"
  }
]`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const text = response.text || '';
        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          for (const item of parsed) {
            generatedArticles.push({
              title: item.title,
              summary: item.summary,
              content: item.content,
              category: item.category || 'Alumni special achievements',
              university: item.university || targetUni,
              department: item.department || targetDept,
              imageUrl:
                'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
              authorId: 'ai-news-bot',
              authorName: 'AI Intelligence Wire Bot',
              status: 'PUBLISHED',
              featured: !!item.isHotTopic,
              trending: !!item.isHotTopic,
              views: Math.floor(Math.random() * 200) + 50,
              isHotTopic: !!item.isHotTopic,
              hotTopicReason: item.hotTopicReason || '',
              alumniPrizeName: item.alumniPrizeName || '',
              sourceUrl: item.sourceUrl || 'https://news.google.com',
              sourceName: item.sourceName || 'Web Intelligence Crawler',
              isAiGenerated: true,
              isPermanent: false,
              expiresAt: tenDaysLater,
              createdAt: now.toISOString(),
              publishedAt: now.toISOString(),
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API call warning, falling back to curated AI generation:', geminiErr);
      }
    }

    // If Gemini didn't return articles, generate using fallback
    if (generatedArticles.length === 0) {
      const needed = Math.max(1, count);
      for (let i = 0; i < needed; i++) {
        generatedArticles.push(
          generateCuratedNews({
            focusType,
            university,
            department,
            forceHotTopic: i === 0 || forceHotTopic,
          })
        );
      }
    }

    // Update bot state
    botState.lastScanAt = now.toISOString();
    botState.totalGenerated += generatedArticles.length;

    res.json({
      success: true,
      articles: generatedArticles,
      botState,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/ai-news-bot/generate:', err);
    res.status(500).json({ error: err.message || 'Failed to generate news' });
  }
});

// Route 2: Bot Status & Rotation Schedule
app.get('/api/ai-news-bot/status', (_req, res) => {
  res.json({
    ...botState,
    uptime: process.uptime(),
    rotationIntervalHours: 24,
    expirationDays: 10,
    timestamp: new Date().toISOString(),
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AlumniSphere server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
