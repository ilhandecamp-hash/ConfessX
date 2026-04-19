export type Category = "ecole" | "amour" | "famille" | "argent";
export type PostMode = "confession" | "judgment";
export type PostStatus = "pending" | "published" | "rejected";
export type VoteType = "funny" | "awkward" | "serious" | "yes" | "no";
export type CommentVoteType = "funny" | "awkward" | "serious";
export type FeedTab = "trending" | "recent";
export type TimeRange = "day" | "week" | "all";
export type ReportReason = "spam" | "hate" | "sexual" | "illegal" | "harassment" | "other";

export interface Post {
  id: string;
  content: string;
  category: Category;
  mode: PostMode;
  status: PostStatus;
  funny_count: number;
  awkward_count: number;
  serious_count: number;
  yes_count: number;
  no_count: number;
  report_count: number;
  view_count: number;
  is_highlight: boolean;
  trending_score: number;
  hot_score: number;
  nsfw: boolean;
  user_id: string | null;
  author?: Profile | null; // joint côté API
  created_at: string;
  updated_at: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  status: PostStatus;
  funny_count: number;
  awkward_count: number;
  serious_count: number;
  report_count: number;
  user_id: string | null;
  author?: Profile | null; // joint côté API
  created_at: string;
  updated_at: string | null;
}

export interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_seed: string;
  bio: string | null;
  created_at: string;
}

export interface Karma {
  posts_count: number;
  votes_received: number;
  views_received: number;
  comments_count: number;
}

export type CommentSort = "top" | "new";

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "ecole",   label: "École",   emoji: "🎓" },
  { id: "amour",   label: "Amour",   emoji: "❤️" },
  { id: "famille", label: "Famille", emoji: "👨‍👩‍👧" },
  { id: "argent",  label: "Argent",  emoji: "💸" },
];

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "spam",       label: "Spam ou contenu commercial" },
  { id: "hate",       label: "Haine / discrimination" },
  { id: "sexual",     label: "Contenu sexuel / inapproprié" },
  { id: "harassment", label: "Harcèlement / menaces" },
  { id: "illegal",    label: "Contenu illégal" },
  { id: "other",      label: "Autre" },
];

export const MAX_CONTENT_LENGTH = 280;
export const MAX_COMMENT_LENGTH = 500;
export const EDIT_WINDOW_MINUTES = 5;
