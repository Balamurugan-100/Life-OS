export type LearningItemState = "not_started" | "in_progress" | "completed" | "skipped";

export type LearningPathSummary = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  weekly_minutes_target: number | null;
  version: number;
  completedItems: number;
  totalItems: number;
  progressPercent: number;
  nextItem: LearningNextItem | null;
};

export type LearningNextItem = {
  id: string;
  title: string;
  instructions: string | null;
  estimated_minutes: number | null;
  state: LearningItemState;
  pathId: string;
  pathTitle: string;
  moduleTitle: string;
};
