export type AdminAuthRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'CO_ADMIN' | 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN';

export interface AdminSessionUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'CO_ADMIN' | 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN';
  status?: string;
  university?: string;
  department?: string;
  assignedUniversity?: string;
  assignedDepartment?: string;
  lastLoginAt?: string;
}

export type Role =
  | 'SUPER_ADMIN'
  | 'UNIVERSITY_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'STUDENT'
  | 'ALUMNI';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type ProfileType = 'Student' | 'Alumni' | 'Admin';

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  profileType: ProfileType;
  university?: string;
  department?: string;
  studentId?: string;
  educationLevel?: string;
  studentYear?: string;
  expectedGraduation?: string;
  graduationYear?: string;
  jobRole?: string;
  company?: string;
  country?: string;
  city?: string;
  bio?: string;
  photoUrl?: string;
  coverUrl?: string;
  coverTheme?: 'classic' | 'modern' | 'sapphire' | 'emerald' | 'royal' | 'midnight' | 'crimson' | 'aurora' | 'cyber';
  mentorshipOpen?: boolean;
  skills?: string[];
  publicDirectoryVisible?: boolean;
  degree?: string;
  degreeTitle?: string;
  sector?: string;
  specialization?: string;
  portfolioUrl?: string;
  achievements?: string;
  linkedin?: string;
  isVerifiedAlumni?: boolean;
  assignedUniversity?: string;
  assignedDepartment?: string;
  followedUniversities?: string[];
  savedUniversities?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface University {
  id: string;
  name: string;
  shortName?: string;
  code?: string;
  type: 'Public' | 'Private' | 'International';
  location: string;
  logoUrl?: string;
  verified?: boolean;
  status?: 'Active' | 'Inactive';
  alumniCount: number;
  studentCount?: number;
  followersCount?: number;
  departmentCount: number;
  employmentRate: number;
  higherStudiesRate?: number;
  countriesCount?: number;
  companiesCount?: number;
  overview?: string;
  website?: string;
  createdAt?: string;
  updatedAt?: string;
  sourceUrl?: string;
  verifiedAt?: string;
}

export type PostReactionType = 'like' | 'love' | 'scholar' | 'insightful' | 'celebrate';

export interface UserPost {
  id: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  authorRole: Role;
  authorUniversity?: string;
  authorDepartment?: string;
  authorPhotoUrl?: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  reactions: {
    like?: string[];
    love?: string[];
    scholar?: string[];
    insightful?: string[];
    celebrate?: string[];
  };
}

export interface Department {
  id: string;
  name: string;
  university: string;
  faculty?: string;
  group: 'Engineering' | 'Science' | 'Business' | 'Arts' | 'Law' | 'Health' | 'Agriculture' | 'Other';
  status?: 'Active' | 'Inactive';
  logoUrl?: string;
  description?: string;
  alumniCount: number;
  studentCount?: number;
  employmentRate: number;
  higherStudiesRate?: number;
  countriesCount?: number;
  companiesCount?: number;
  careerScores?: {
    career: number;
    research: number;
    industry: number;
  };
  achievements?: string;
  createdAt?: string;
  updatedAt?: string;
  sourceUrl?: string;
  verifiedAt?: string;
  verified?: boolean;
}

export interface Batch {
  id: string;
  year: string;
  department: string;
  university: string;
  studentsCount: number;
  employedRate: number;
  higherStudyRate: number;
  internationalRate: number;
  entrepreneursRate: number;
  batchNumber?: number;
  batchName?: string;
  sessionName?: string;
  passingYearDisplay?: string;
  degree?: string;
  intakeCapacity?: number;
  observedSample?: number;
  historicalMilestones?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlumniRecord {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  university: string;
  department: string;
  batch: string;
  studentId?: string;
  educationLevel?: string;
  graduationYear: string;
  jobRole: string;
  company: string;
  country: string;
  city?: string;
  bio?: string;
  photoUrl?: string;
  linkedin?: string;
  isVerified: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  mentorshipOpen?: boolean;
  degree?: string;
  sector?: string;
  specialization?: string;
  careerStatus?: 'Employed' | 'Academic/Researcher' | 'Entrepreneur/Founder' | 'Pursuing Further Studies' | string;
  highestQualification?: string;
  sourceUrl?: string;
  verificationStatus?: 'Verified' | 'Community Reported' | 'Pending' | string;
  confidence?: 'High' | 'Medium' | 'Low' | string;
  notes?: string;
  dateChecked?: string;
  batchNumber?: number;
  academicSession?: string;
  passingYear?: string;
  skills?: string[];
  portfolioUrl?: string;
  achievements?: string;
  publicDirectoryVisible?: boolean;
  degreeTitle?: string;
  coverTheme?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentRecord {
  id: string;
  userId?: string;
  name: string;
  email: string;
  university: string;
  department: string;
  studentId?: string;
  educationLevel: string;
  studentYear: string;
  expectedGraduation: string;
  bio?: string;
  photoUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export type NewsStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED';

export type NewsCategory =
  | 'University announcements'
  | 'Department announcements'
  | 'Alumni achievements'
  | 'Alumni special achievements'
  | 'Events'
  | 'Scholarships'
  | 'Jobs'
  | 'Research'
  | 'General education news';

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  imageUrl?: string;
  category: NewsCategory;
  university?: string;
  department?: string;
  authorId: string;
  authorName: string;
  status: NewsStatus;
  featured?: boolean;
  trending?: boolean;
  views?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;

  // AI News Bot & 24h Rotation & 10-day TTL Lifecycle
  isHotTopic?: boolean;
  hotTopicReason?: string;
  isAiGenerated?: boolean;
  sourceUrl?: string;
  sourceName?: string;
  isPermanent?: boolean;
  permanentBy?: {
    userId: string;
    userName: string;
    role: Role;
    at: string;
  };
  expiresAt?: string; // 10 days after creation if not permanent
  rotationCycleId?: string;
  alumniPrizeName?: string;
}

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ChangeRequestTargetType = 'UNIVERSITY' | 'DEPARTMENT' | 'NEWS' | 'BATCH' | 'SETTINGS';

export interface ChangeRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: Role;
  targetType: ChangeRequestTargetType;
  targetId: string;
  targetTitle: string;
  university?: string;
  department?: string;
  oldValue: string;
  newValue: string;
  reason?: string;
  status: ChangeRequestStatus;
  reviewedBy?: string;
  reviewerComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileClaimRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  targetAlumniId: string;
  university: string;
  department: string;
  studentId: string;
  graduationYear: string;
  proofUrl: string;
  notes: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewerComment?: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  university: string;
  department: string;
  batch: string;
  studentId?: string;
  proofUrl?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewerComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  recipientId: string; // or 'ADMIN'
  recipientRole?: Role;
  title: string;
  message: string;
  type:
    | 'ACCOUNT'
    | 'VERIFICATION'
    | 'CHANGE_REQUEST'
    | 'PROFILE_CLAIM'
    | 'NEWS'
    | 'ADMIN_ASSIGNMENT'
    | 'SYSTEM'
    | 'CONNECTION'
    | 'MENTORSHIP';
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  details: string;
  createdAt: string;
  severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  metadata?: Record<string, any>;
}

export interface AdminAssignment {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: 'UNIVERSITY_ADMIN' | 'DEPARTMENT_ADMIN';
  university: string;
  department?: string;
  assignedBy: string;
  createdAt: string;
}

export interface PlatformSetting {
  id: string;
  autoApproveStudents: boolean;
  autoApproveAlumni: boolean;
  requireAlumniProof: boolean;
  allowPublicNewsSubmission: boolean;
  maintenanceMode: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface ConnectionRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole?: Role;
  senderPhotoUrl?: string;
  senderUniversity?: string;
  senderDepartment?: string;
  senderJobRole?: string;
  senderCompany?: string;
  senderAlumniId?: string;

  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientRole?: Role;
  recipientPhotoUrl?: string;
  recipientUniversity?: string;
  recipientDepartment?: string;
  recipientJobRole?: string;
  recipientCompany?: string;
  recipientAlumniId?: string;

  status: ConnectionStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

export type MentorshipStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';

export type MentorshipTopic =
  | 'Career Path Guidance'
  | 'Resume & Portfolio Review'
  | 'Job Search & Referrals'
  | 'Technical Interview Prep'
  | 'Higher Studies & Research'
  | 'Industry Transition'
  | 'General Mentorship';

export interface MentorshipRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentRole?: Role;
  studentPhotoUrl?: string;
  studentUniversity?: string;
  studentDepartment?: string;
  studentGraduation?: string;
  studentBio?: string;

  mentorId: string;
  mentorName: string;
  mentorEmail?: string;
  mentorRole?: Role;
  mentorPhotoUrl?: string;
  mentorUniversity?: string;
  mentorDepartment?: string;
  mentorJobRole?: string;
  mentorCompany?: string;
  mentorAlumniId?: string;

  topic: MentorshipTopic;
  message: string;
  preferredSchedule?: string;
  status: MentorshipStatus;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  respondedAt?: string;
}

export type AlumniConnectionStatus = 'NOT_CONNECTED' | 'SENDING' | 'PENDING' | 'CONNECTED';

export interface AlumniConnectionRecord {
  alumniId: string;
  alumniName: string;
  status: AlumniConnectionStatus;
  sentAt?: string;
  connectedAt?: string;
  message?: string;
  senderName?: string;
  senderRole?: string;
}

export interface StorageReceipt {
  recordId: string;
  email: string;
  name: string;
  profileType: string;
  role: string;
  status?: string;
  university: string;
  department: string;
  studentId: string;
  educationLevel: string;
  storageEngine: string;
  hashAlgorithm: string;
  storageStatus: string;
  createdAt: string;
  lastUpdated?: string;
  syncedToFirestore: boolean;
}

export interface AccountOpeningPresets {
  educationLevels: string[];
  studentYears: string[];
  defaultAvatars: Array<{ id: string; name: string; url: string }>;
  totalAccountsStored: number;
  persistenceEngine: string;
  storageVersion: string;
}
