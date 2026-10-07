import { University, Department, AlumniRecord, NewsArticle, Batch, PlatformSetting } from '../types';

export const PUBLIC_UNIVERSITIES = [
  "University of Dhaka", "University of Rajshahi", "Bangladesh Agricultural University",
  "Bangladesh University of Engineering & Technology", "University of Chittagong", "Jahangirnagar University",
  "Islamic University, Bangladesh", "Shahjalal University of Science & Technology", "Khulna University",
  "National University", "Bangladesh Open University", "Bangladesh Medical University",
  "Gazipur Agricultural University", "Hajee Mohammad Danesh Science & Technology University",
  "Mawlana Bhashani Science & Technology University", "Patuakhali Science And Technology University",
  "Sher-e-Bangla Agricultural University", "Chittagong University of Engineering & Technology",
  "Rajshahi University of Engineering & Technology", "Khulna University of Engineering & Technology",
  "Dhaka University of Engineering & Technology", "Noakhali Science & Technology University",
  "Jagannath University", "Comilla University", "Jatiya Kabi Kazi Nazrul Islam University",
  "Chittagong Veterinary and Animal Sciences University", "Sylhet Agricultural University",
  "Jashore University of Science & Technology", "Pabna University of Science and Technology",
  "Begum Rokeya University, Rangpur", "Bangladesh University of Professionals",
  "Gopalganj Science & Technology University", "Bangladesh University of Textiles",
  "University of Barishal", "Rangamati Science and Technology University",
  "Bangladesh Maritime University", "Islamic Arabic University", "Chittagong Medical University",
  "Rajshahi Medical University", "Rabindra University, Bangladesh", "University of Frontier Technology, Bangladesh",
  "Netrokona University", "Khulna Agricultural University", "Jamalpur Science and Technology University",
  "Sylhet Medical University", "Aviation And Aerospace University, Bangladesh",
  "Chandpur Science and Technology University", "Kishoreganj University", "Hobiganj Agricultural University",
  "Khulna Medical University", "Kurigram Agricultural University", "Sunamganj Science and Technology University",
  "Pirojpur Science & Technology University", "Naogaon University", "Meherpur University",
  "Bogra Science and Technology University", "Dhaka Central University", "Thakurgaon University",
  "Shariatpur Agricultural University"
];

export const PRIVATE_UNIVERSITIES = [
  "North South University", "University of Science & Technology Chittagong", "Independent University, Bangladesh",
  "Central Women's University", "International University of Business Agriculture & Technology",
  "International Islamic University Chittagong", "Ahsanullah University of Science and Technology",
  "American International University-Bangladesh", "East West University", "University of Asia Pacific",
  "Gono Bishwabidyalay", "The People's University of Bangladesh", "Asian University of Bangladesh",
  "Dhaka International University", "Manarat International University", "BRAC University",
  "Bangladesh University", "Leading University", "BGC Trust University Bangladesh",
  "Sylhet International University", "University of Development Alternative", "Premier University",
  "Southeast University", "Daffodil International University", "Stamford University Bangladesh",
  "State University of Bangladesh", "City University", "Prime University", "Northern University Bangladesh",
  "Southern University Bangladesh", "Green University of Bangladesh", "Pundra University of Science & Technology",
  "World University of Bangladesh", "Shanto-Mariam University of Creative Technology",
  "The Millennium University", "Eastern University", "Metropolitan University", "Uttara University",
  "United International University", "University of South Asia", "Victoria University of Bangladesh",
  "Bangladesh University of Business & Technology", "Presidency University",
  "University of Information Technology & Sciences", "Primeasia University", "Royal University of Dhaka",
  "University of Liberal Arts Bangladesh", "Atish Dipankar University of Science & Technology",
  "Bangladesh Islami University", "ASA University Bangladesh", "East Delta University",
  "European University of Bangladesh", "Varendra University", "Hamdard University Bangladesh",
  "BGMEA University of Fashion & Technology", "North East University Bangladesh",
  "First Capital University of Bangladesh", "Ishakha International University, Bangladesh",
  "Z.H Sikder University of Science & Technology", "Exim Bank Agricultural University, Bangladesh",
  "North Western University", "Khwaja Yunus Ali University", "Sonargaon University", "Feni University",
  "Britannia University", "Port City International University", "Bangladesh University of Health Sciences",
  "Chittagong Independent University", "Notre Dame University Bangladesh", "Times University, Bangladesh",
  "North Bengal International University", "Fareast International University",
  "Rajshahi Science & Technology University, Natore", "Brahmaputra International University",
  "Cox's Bazar International University", "R. P. Shaha University", "German University Bangladesh",
  "Global University Bangladesh", "CCN University of Science & Technology",
  "Bangladesh Army University of Science and Technology, Saidpur",
  "Bangladesh Army University of Engineering and Technology, Qadirabad",
  "Bangladesh Army International University of Science & Technology, Comilla",
  "University of Scholars", "Canadian University of Bangladesh", "N.P.I University of Bangladesh",
  "Northern University of Business & Technology, Khulna", "Rabindra Maitree University, Kushtia",
  "University of Creative Technology, Chittagong", "Central University of Science and Technology",
  "Tagore University of Creative Arts", "University of Global Village",
  "Rupayan A.K.M Shamsuzzoha University", "Anwer Khan Modern University",
  "ZNRF University of Management Sciences", "Ahsania Mission University of Science and Technology",
  "Khulna Khan Bahadur Ahsanullah University", "Bandarban University",
  "Shah Makhdum Management University, Rajshahi", "Trust University, Barishal",
  "International Standard University", "University of Brahmanbaria",
  "University of Skill Enrichment and Technology", "Microland University of Science and Technology",
  "R.T.M Al-Kabir Technical University", "Dr. Momtaz Begum University of Science and Technology",
  "Chattogram BGMEA University of Fashion and Technology",
  "Bangladesh Army University of Science and Technology, Khulna", "Teesta University, Rangpur",
  "International Islami University of Science and Technology Bangladesh",
  "Lalon University of Science and Arts", "Justice Abu Zafar Siddiquie Science and Technology University, Kushtia",
  "Grameen University", "IBAIS University", "The University of Comilla", "Queens University",
  "America Bangladesh University"
];

export const INTERNATIONAL_UNIVERSITIES = [
  "Islamic University of Technology (IUT), Gazipur",
  "Asian University for Women",
  "South Asian University"
];

export const ALL_DIRECTORY_UNIVERSITIES = [
  ...PUBLIC_UNIVERSITIES.map(name => ({ name, type: 'Public' as const })),
  ...PRIVATE_UNIVERSITIES.map(name => ({ name, type: 'Private' as const })),
  ...INTERNATIONAL_UNIVERSITIES.map(name => ({ name, type: 'International' as const }))
];

export const RAW_DEPARTMENT_CATALOG = [
  { name: 'Computer Science & Engineering', group: 'Engineering' as const, aliases: ['CSE', 'Computer Science', 'Computer Engineering'] },
  { name: 'Electrical & Electronic Engineering', group: 'Engineering' as const, aliases: ['EEE', 'Electrical Engineering'] },
  { name: 'Civil Engineering', group: 'Engineering' as const, aliases: ['Civil'] },
  { name: 'Mechanical Engineering', group: 'Engineering' as const, aliases: ['ME'] },
  { name: 'Industrial & Production Engineering', group: 'Engineering' as const, aliases: ['IPE'] },
  { name: 'Architecture', group: 'Engineering' as const, aliases: ['ARCH'] },
  { name: 'Textile Engineering', group: 'Engineering' as const, aliases: ['Textile'] },
  { name: 'Information & Communication Technology', group: 'Engineering' as const, aliases: ['ICT'] },
  { name: 'Software Engineering', group: 'Engineering' as const, aliases: ['SWE'] },
  { name: 'Data Science', group: 'Engineering' as const, aliases: ['Data Analytics'] },

  { name: 'Physics', group: 'Science' as const, aliases: [] },
  { name: 'Chemistry', group: 'Science' as const, aliases: [] },
  { name: 'Mathematics', group: 'Science' as const, aliases: ['Applied Mathematics'] },
  { name: 'Statistics', group: 'Science' as const, aliases: ['Applied Statistics'] },
  { name: 'Environmental Science', group: 'Science' as const, aliases: ['Environmental Studies'] },
  { name: 'Biotechnology', group: 'Science' as const, aliases: ['Genetic Engineering'] },
  { name: 'Microbiology', group: 'Science' as const, aliases: [] },
  { name: 'Biochemistry & Molecular Biology', group: 'Science' as const, aliases: ['Biochemistry'] },

  { name: 'Business Administration', group: 'Business' as const, aliases: ['BBA', 'Management'] },
  { name: 'Accounting', group: 'Business' as const, aliases: ['Accounting & Information Systems'] },
  { name: 'Finance', group: 'Business' as const, aliases: ['Finance & Banking'] },
  { name: 'Marketing', group: 'Business' as const, aliases: [] },
  { name: 'Economics', group: 'Business' as const, aliases: [] },
  { name: 'Management Information Systems', group: 'Business' as const, aliases: ['MIS'] },
  { name: 'International Business', group: 'Business' as const, aliases: [] },

  { name: 'English', group: 'Arts' as const, aliases: ['English Language & Literature'] },
  { name: 'Bangla', group: 'Arts' as const, aliases: ['Bengali'] },
  { name: 'History', group: 'Arts' as const, aliases: [] },
  { name: 'Philosophy', group: 'Arts' as const, aliases: [] },
  { name: 'Political Science', group: 'Arts' as const, aliases: ['Government & Politics'] },
  { name: 'International Relations', group: 'Arts' as const, aliases: ['IR'] },
  { name: 'Sociology', group: 'Arts' as const, aliases: [] },
  { name: 'Mass Communication & Journalism', group: 'Arts' as const, aliases: ['Journalism', 'Media Studies'] },
  { name: 'Development Studies', group: 'Arts' as const, aliases: [] },

  { name: 'Law', group: 'Law' as const, aliases: ['LLB', 'LL.M'] },

  { name: 'Pharmacy', group: 'Health' as const, aliases: ['Pharmaceutical Sciences'] },
  { name: 'Medicine', group: 'Health' as const, aliases: ['MBBS', 'Medical Science'] },
  { name: 'Dentistry', group: 'Health' as const, aliases: ['Dental'] },
  { name: 'Public Health', group: 'Health' as const, aliases: ['MPH'] },
  { name: 'Nursing', group: 'Health' as const, aliases: ['Nursing Science'] },
  { name: 'Physiotherapy', group: 'Health' as const, aliases: [] },

  { name: 'Agriculture', group: 'Agriculture' as const, aliases: ['Agricultural Science'] },
  { name: 'Agricultural Engineering', group: 'Agriculture' as const, aliases: [] },
  { name: 'Veterinary Medicine', group: 'Agriculture' as const, aliases: ['DVM'] },
  { name: 'Animal Husbandry', group: 'Agriculture' as const, aliases: ['Animal Science'] },
  { name: 'Fisheries', group: 'Agriculture' as const, aliases: ['Fisheries Science'] },
  { name: 'Food Science & Technology', group: 'Agriculture' as const, aliases: ['Food Technology'] },
  { name: 'Forestry', group: 'Agriculture' as const, aliases: [] }
];

export const INITIAL_ALUMNI: AlumniRecord[] = [
  {
    id: 'alumni-nahian-al-mubin',
    userId: 'admin_nahianalmubin',
    name: 'Nahian Al Mubin',
    email: 'nahianalmubin2006@gmail.com',
    university: 'Bangladesh University of Professionals',
    department: 'Computer Science & Engineering',
    batch: '2026',
    graduationYear: '2026',
    studentId: '22021001',
    educationLevel: 'Undergraduate',
    jobRole: 'Software Developer & Platform Creator',
    company: 'AlumniSphere',
    country: 'Bangladesh',
    city: 'Dhaka',
    bio: 'Creator of AlumniSphere. BUP CSE student connecting students and graduates across Bangladesh and the global diaspora.',
    linkedin: 'https://linkedin.com/in/nahianalmubin',
    isVerified: true,
    status: 'APPROVED',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export const INITIAL_NEWS: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'BUP CSE Alumni Secure Top Engineering Roles in European Tech Hubs',
    content: 'Graduates from the Bangladesh University of Professionals (BUP) Department of Computer Science & Engineering have achieved remarkable milestones across Germany, the UK, and Sweden this season. Leading engineering companies praise the technical foundations, collaborative aptitude, and rigorous project background fostered at BUP FST. Platform intelligence indicates international career placements rose by 22% over the last two graduating cohorts.',
    summary: 'BUP CSE alumni achieve significant milestones across Germany, UK, and Sweden with a 22% increase in international placements.',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    category: 'Alumni achievements',
    university: 'Bangladesh University of Professionals',
    department: 'Computer Science & Engineering',
    authorId: 'admin-system',
    authorName: 'AlumniSphere Editorial',
    status: 'PUBLISHED',
    featured: true,
    trending: true,
    views: 1420,
    publishedAt: '2026-03-28T09:00:00.000Z',
    createdAt: '2026-03-28T08:00:00.000Z',
    updatedAt: '2026-03-28T09:00:00.000Z'
  },
  {
    id: 'news-2',
    title: 'University Career Outcomes & Global Alumni Intelligence Index 2026 Released',
    content: 'The UGC and AlumniSphere consortium have officially launched the 2026 Career Outcomes Index. Tracking over 178 institutions and 12,000+ graduate trajectories, the dynamic analytics reveal emerging technology, renewable energy engineering, and digital finance as the leading growth vectors for national graduates.',
    summary: 'The 2026 Career Outcomes Index tracks 178 institutions and over 12,000 graduate paths across global industries.',
    imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
    category: 'General education news',
    authorId: 'admin-system',
    authorName: 'National Intelligence Desk',
    status: 'PUBLISHED',
    featured: true,
    trending: false,
    views: 980,
    publishedAt: '2026-03-25T14:30:00.000Z',
    createdAt: '2026-03-25T14:00:00.000Z',
    updatedAt: '2026-03-25T14:30:00.000Z'
  },
  {
    id: 'news-3',
    title: 'BUET & DU Collaborative Research Grant Awarded for Autonomous Systems',
    content: 'Faculty and alumni from BUET and the University of Dhaka have secured an international research grant to spearhead edge AI and autonomous navigation robotics. Several alumni working in Silicon Valley and Europe will mentor participating student research teams.',
    summary: 'International grant awarded to BUET and DU teams for autonomous systems research, backed by global alumni mentorship.',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
    category: 'Research',
    university: 'Bangladesh University of Engineering & Technology',
    department: 'Computer Science & Engineering',
    authorId: 'admin-system',
    authorName: 'Research Bureau',
    status: 'PUBLISHED',
    featured: false,
    trending: true,
    views: 740,
    publishedAt: '2026-03-20T11:00:00.000Z',
    createdAt: '2026-03-20T10:00:00.000Z',
    updatedAt: '2026-03-20T11:00:00.000Z'
  },
  {
    id: 'news-4',
    title: 'Global Alumni Mentorship Network Opens Applications for 2026 Cohorts',
    content: 'Undergraduate students and recent graduates can now apply for 1-on-1 career guidance sessions with verified alumni located in over 30 countries. The program offers technical portfolio reviews, interview prep, and graduate admissions consultation.',
    summary: 'Students can now connect directly with verified alumni across 30+ countries for mentorship and career coaching.',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    category: 'Events',
    authorId: 'admin-system',
    authorName: 'AlumniSphere Community',
    status: 'PUBLISHED',
    featured: false,
    trending: false,
    views: 610,
    publishedAt: '2026-03-15T10:00:00.000Z',
    createdAt: '2026-03-15T09:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z'
  }
];

export const INITIAL_PLATFORM_SETTINGS: PlatformSetting = {
  id: 'global-settings',
  autoApproveStudents: false,
  autoApproveAlumni: false,
  requireAlumniProof: true,
  allowPublicNewsSubmission: true,
  maintenanceMode: false,
  updatedBy: 'system',
  updatedAt: new Date().toISOString()
};

// Seed calculation helper
export function demoSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function universityInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
