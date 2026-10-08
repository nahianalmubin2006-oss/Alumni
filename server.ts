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
  'University of Rajshahi',
  'University of Chittagong',
  'Rajshahi University of Engineering & Technology',
  'Khulna University of Engineering & Technology',
  'Chittagong University of Engineering & Technology',
  'Dhaka University of Engineering & Technology',
  'Independent University, Bangladesh',
  'East West University',
  'United International University',
  'American International University-Bangladesh',
  'Ahsanullah University of Science and Technology',
  'Daffodil International University',
  'Bangladesh University of Professionals',
  'Bangladesh University of Textiles',
  'Sher-e-Bangla Agricultural University',
  'Bangladesh Agricultural University',
  'Islamic University of Technology (IUT), Gazipur',
  'Khulna University',
  'Jagannath University',
  'Comilla University',
  'Patuakhali Science And Technology University',
  'Noakhali Science & Technology University',
  'Jashore University of Science & Technology',
  'Begum Rokeya University, Rangpur',
  'University of Liberal Arts Bangladesh',
  'Asian University for Women',
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
  'Software Engineering',
  'Information & Communication Technology',
  'Data Science',
  'Industrial & Production Engineering',
  'Textile Engineering',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Statistics',
  'Biochemistry & Molecular Biology',
  'Microbiology',
  'Accounting',
  'Finance',
  'Marketing',
  'Management Information Systems',
  'English',
  'Public Administration',
  'International Relations',
  'Environmental Science',
  'Agricultural Engineering',
  'Food Engineering & Technology',
  'Aerospace & Aviation Engineering',
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
  const isHot = params.forceHotTopic !== undefined ? params.forceHotTopic : Math.random() > 0.35;
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
      hotTopicReason: 'Multi-million collaborative grant secured across leading research institutes',
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
      title: `${targetUni} ${targetDept} Alumnus Awarded ACM Young Investigator Recognition`,
      category: 'Alumni special achievements' as const,
      alumniPrizeName: 'ACM SIGCOMM Outstanding Doctoral Thesis & Young Investigator Prize',
      isHotTopic: isHot,
      hotTopicReason: 'Global ACM recognition for foundational work in resilient decentralized networks',
      summary: `An alumnus of ${targetUni} from the ${targetDept} cohort has received the ACM Outstanding Young Investigator Prize for breakthroughs in high-throughput network topologies.`,
      content: `In a landmark tribute to university academic pedigree, a graduate of ${targetUni} (${targetDept}) received the prestigious Association for Computing Machinery (ACM) Young Investigator Recognition. The research, focused on fault-tolerant distributed networks, has been adopted across premier cloud computing platforms globally.`,
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      sourceUrl: 'https://awards.acm.org',
      sourceName: 'ACM Computing News Wire',
    },
    {
      title: `${targetUni} ${targetDept} Graduate Receives International Climate Resilience Medal`,
      category: 'Alumni special achievements' as const,
      alumniPrizeName: 'United Nations Earthshot Innovation Medal ($250,000)',
      isHotTopic: true,
      hotTopicReason: 'Top international climate innovation medal awarded for delta restoration systems',
      summary: `Alumnus from ${targetUni}'s ${targetDept} honored at the World Climate Summit for deploying low-cost hydrological sensor networks across coastal deltas.`,
      content: `A distinguished graduate from ${targetUni} (${targetDept}) was decorated with the United Nations Earthshot Innovation Medal. The project delivers real-time flood warning telemetry and agricultural soil restoration frameworks deployed across vulnerable river deltas.`,
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      sourceUrl: 'https://unep.org/awards',
      sourceName: 'UN Global Environmental Wire',
    },
    {
      title: `${targetUni} ${targetDept} Annual Symposium Announces 2026 Merit Scholarships & Mentorship`,
      category: 'Scholarships' as const,
      alumniPrizeName: 'Alumni Legacy Gold Medal & Endowed Scholarship',
      isHotTopic: false,
      hotTopicReason: '',
      summary: `Alumni association partners with ${targetUni} to fund 40 full-ride merit scholarships for undergraduate research scholars in ${targetDept}.`,
      content: `The Department of ${targetDept} at ${targetUni} has unveiled an endowed scholarship initiative funded entirely by alumni cohorts from 2010 to 2024. The program covers full tuition, technology stipends, and guaranteed international internships.`,
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

// Reusable function to generate news with Gemini 3.8 Flash web browsing or curated fallback
async function generateArticlesWithAi(params: {
  focusType?: string;
  university?: string;
  department?: string;
  forceHotTopic?: boolean;
  count?: number;
}) {
  const { focusType, university, department, forceHotTopic, count = 2 } = params;
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
Your mission: Scan web information or generate authentic, high-impact news stories covering universities, departments, and alumni special achievements (prize winning, awards, prestigious grants, international recognitions, career breakthroughs, startup funding).

Generate ${Math.min(count, 4)} diverse news articles for:
Target University: ${targetUni}
Target Department: ${targetDept}
Focus Category: ${focusType || 'Alumni special achievements, prize winnings, and department breakthroughs'}
Ensure at least one article is marked as a HOT TOPIC ("isHotTopic": true) with high-priority breakthrough/prize winning details and a compelling "hotTopicReason".

Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "title": "Clear headline with institution and alumni achievement",
    "summary": "1-2 sentence compelling executive summary",
    "content": "Detailed 2-3 paragraph news report highlighting background, prize/achievement name, alumni names, impact, and future work",
    "category": "Alumni special achievements" | "University announcements" | "Department announcements" | "Research" | "Scholarships" | "Jobs",
    "university": "${targetUni}",
    "department": "${targetDept}",
    "isHotTopic": true or false,
    "hotTopicReason": "Brief reason why this is hot/breaking (e.g. Won $150k International Prize, Forbes 30 Under 30 selection, IEEE Fellow award)",
    "alumniPrizeName": "Name of prestigious award/medal/grant if applicable",
    "sourceUrl": "Realistic web url or news source url",
    "sourceName": "Name of news wire or publication (e.g. IEEE Spectrum, TechCrunch, University Press, Nature Awards)"
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || '';
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
            hotTopicReason: item.hotTopicReason || (item.isHotTopic ? 'Breaking alumni achievement' : ''),
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

  return generatedArticles;
}

// Route 1: Trigger AI Bot Live Web Scan & Generation
app.post('/api/ai-news-bot/generate', async (req, res) => {
  try {
    const { focusType, university, department, forceHotTopic, count = 2 } = req.body || {};
    const articles = await generateArticlesWithAi({
      focusType,
      university,
      department,
      forceHotTopic,
      count,
    });

    res.json({
      success: true,
      articles,
      botState,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/ai-news-bot/generate:', err);
    res.status(500).json({ error: err.message || 'Failed to generate news' });
  }
});

// Route 2: 24-Hour Automated Rotation Cycle Trigger
app.post('/api/ai-news-bot/rotate', async (req, res) => {
  try {
    const now = new Date();
    botState.cycleCount += 1;
    botState.lastScanAt = now.toISOString();
    botState.nextRotationAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Pick 3 diverse institutions and departments for the new 24h cycle
    const batchArticles: any[] = [];
    const targetCount = 3;

    // Pick randomized distinct universities
    const shuffledUnis = [...UNIVERSITIES].sort(() => 0.5 - Math.random()).slice(0, targetCount);
    const shuffledDepts = [...DEPARTMENTS].sort(() => 0.5 - Math.random()).slice(0, targetCount);

    for (let i = 0; i < targetCount; i++) {
      const generated = await generateArticlesWithAi({
        university: shuffledUnis[i],
        department: shuffledDepts[i],
        forceHotTopic: i === 0, // Ensure at least 1 instant hot topic
        focusType: 'Alumni special achievements, prize winnings, and international research',
        count: 1,
      });
      batchArticles.push(...generated);
    }

    res.json({
      success: true,
      cycleCount: botState.cycleCount,
      articles: batchArticles,
      botState,
      nextRotationAt: botState.nextRotationAt,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('Error during 24h rotation cycle:', err);
    res.status(500).json({ error: err.message || 'Failed to rotate news cycle' });
  }
});

// Route 3: Bot Status & Rotation Schedule
app.get('/api/ai-news-bot/status', (_req, res) => {
  const isRotationDue = new Date().getTime() >= new Date(botState.nextRotationAt).getTime();
  res.json({
    ...botState,
    uptime: process.uptime(),
    rotationIntervalHours: 24,
    expirationDays: 10,
    isRotationDue,
    timestamp: new Date().toISOString(),
  });
});

// Background 24-Hour Cycle Watcher (checks every 10 minutes)
setInterval(async () => {
  const now = Date.now();
  const nextTime = new Date(botState.nextRotationAt).getTime();
  if (now >= nextTime) {
    console.log(`[AI News Bot] 24-hour cycle elapsed. Commencing Cycle #${botState.cycleCount + 1} rotation...`);
    try {
      botState.cycleCount += 1;
      botState.lastScanAt = new Date().toISOString();
      botState.nextRotationAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      await generateArticlesWithAi({
        forceHotTopic: true,
        count: 2,
      });
      console.log(`[AI News Bot] 24h rotation cycle #${botState.cycleCount} completed successfully.`);
    } catch (err) {
      console.warn('[AI News Bot] Automated background rotation encountered an error:', err);
    }
  }
}, 10 * 60 * 1000);

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
