// ============================================================
// Comprehensive Personal Learning Management System (LMS) Types
// ============================================================

export type SkillProficiency = "novice" | "competent" | "proficient" | "mastered";

export type TaskStatus = "todo" | "in_progress" | "completed";

export interface ResourceItem {
  id: string;
  title: string;
  url?: string | null;
  type: "book" | "paper" | "course" | "doc" | "repo";
  status: "unread" | "reading" | "completed";
}

export interface LearningTask {
  id: string;
  title: string;
  completed: boolean;
  status?: TaskStatus;
  type?: "theory" | "lab" | "reading" | "project";
  notes?: string | null;
  next_action?: string | null;
  minutes_spent?: number;
  deadline?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface LearningModule {
  id: string;
  title: string;
  description?: string;
  tasks: LearningTask[];
}

export interface KeyInsight {
  id: string;
  title: string;
  takeaway: string; // Markdown supported
  url?: string | null; // Optional external URL (Notion, GitHub, docs, paper)
  created_at: string;
  updated_at?: string;
}

export interface StudySessionLog {
  id: string;
  duration_minutes: number;
  notes: string;
  date: string;
  task_id?: string | null;
}

export interface DetailedLearningContent {
  target_goal?: string;
  proficiency?: SkillProficiency;
  hours_spent?: number;
  target_hours?: number;
  active_task_id?: string | null;
  modules?: LearningModule[];
  resources?: ResourceItem[];
  insights?: KeyInsight[];
  study_sessions?: StudySessionLog[];
  // Backwards compatibility for flat legacy tasks:
  tasks?: LearningTask[];
  roadmap?: string;
}

export interface LearningTrack {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  status: "planned" | "in_progress" | "completed";
  content: DetailedLearningContent | null;
  created_at: string;
  updated_at: string;
}
