export type DuolingoConfig = {
  jwt?: string;
  userId?: string;
  username?: string;
  syncSecret?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
};

export type DuolingoCourseSummary = {
  id: string;
  title: string;
  fromLanguage: string;
  learningLanguage: string;
  xp: number;
  crowns?: number;
};

export type DuolingoUserData = {
  streak: number;
  totalXp: number;
  dailyXp: number;
  currentCourseId?: string;
  courses: DuolingoCourseSummary[];
  xpGains: Array<{ time: number; xp: number; skillId?: string; courseId?: string }>;
};
