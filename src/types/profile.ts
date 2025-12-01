// src/types/profile.ts
// Profile-related types shared between server and client components

export interface UserPreferences {
  digestFrequency?: "daily" | "weekly" | "never";
  digestEnabled?: boolean;
  preferredTopics?: string[];
  emailNotifications?: boolean;
}

export interface UsageLimits {
  summariesToday: number;
  summariesLimit: number;
  savedPapers: number;
  savedPapersLimit: number;
  topicsFollowed: number;
  topicsLimit: number;
}

export interface ProfileUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  plan: string;
  preferences: UserPreferences | null;
  createdAt: Date;
}

export interface AvailableTopic {
  id: string;
  name: string;
  slug: string;
}
