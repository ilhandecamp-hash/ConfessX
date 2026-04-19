import type {
  Category,
  CommentVoteType,
  PostMode,
  PostStatus,
  ReportReason,
  VoteType,
} from "@/types/post";

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
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
          created_at: string;
          updated_at: string | null;
          author_token: string | null;
        };
        Insert: {
          id?: string;
          content: string;
          category: Category;
          mode: PostMode;
          status?: PostStatus;
          author_token?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          post_id: string;
          fingerprint: string;
          reason: ReportReason | null;
          created_at: string;
        };
        Insert: { post_id: string; fingerprint: string; reason?: ReportReason | null };
        Update: never;
      };
      votes: {
        Row: {
          id: string;
          post_id: string;
          fingerprint: string;
          vote_type: VoteType;
          created_at: string;
        };
        Insert: { post_id: string; fingerprint: string; vote_type: VoteType };
        Update: never;
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          content: string;
          author_token: string | null;
          status: PostStatus;
          funny_count: number;
          awkward_count: number;
          serious_count: number;
          report_count: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          post_id: string;
          content: string;
          author_token?: string | null;
          status?: PostStatus;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
      };
      comment_votes: {
        Row: {
          id: string;
          comment_id: string;
          fingerprint: string;
          vote_type: CommentVoteType;
          created_at: string;
        };
        Insert: { comment_id: string; fingerprint: string; vote_type: CommentVoteType };
        Update: never;
      };
      comment_reports: {
        Row: {
          id: string;
          comment_id: string;
          fingerprint: string;
          reason: ReportReason | null;
          created_at: string;
        };
        Insert: { comment_id: string; fingerprint: string; reason?: ReportReason | null };
        Update: never;
      };
    };
    Functions: {
      increment_vote: {
        Args: { p_post_id: string; p_vote_type: VoteType; p_fingerprint: string };
        Returns: boolean;
      };
      increment_view: { Args: { p_post_id: string }; Returns: void };
      report_post: {
        Args: { p_post_id: string; p_fingerprint: string; p_reason?: ReportReason | null };
        Returns: boolean;
      };
      report_comment: {
        Args: { p_comment_id: string; p_fingerprint: string; p_reason?: ReportReason | null };
        Returns: boolean;
      };
      delete_post: { Args: { p_post_id: string; p_author_token: string }; Returns: boolean };
      update_post: {
        Args: { p_post_id: string; p_author_token: string; p_content: string };
        Returns: boolean;
      };
      add_comment: {
        Args: { p_post_id: string; p_content: string; p_author_token: string };
        Returns: string;
      };
      delete_comment: {
        Args: { p_comment_id: string; p_author_token: string };
        Returns: boolean;
      };
      increment_comment_vote: {
        Args: { p_comment_id: string; p_vote_type: CommentVoteType; p_fingerprint: string };
        Returns: boolean;
      };
      search_posts: { Args: { p_query: string; p_limit?: number }; Returns: unknown };
      recalc_trending_scores: { Args: Record<string, never>; Returns: void };
      pick_daily_highlight: { Args: Record<string, never>; Returns: void };
    };
  };
}
