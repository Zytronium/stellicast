export interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  channel: string; // channel id
  views: number;
  contentSrc: string;
  uploadedAt: Date;
  updatedAt: Date;
  stars: number; // when you REALLY like what you watched, you can award a star for free (must have seen at least 20% of the video)
  likes: number;
  dislikes: number;
  comments: number;
  duration: number;
  visibility: "public" | "unlisted" | "private";
  tags: string[];
  isAI: boolean;
  isPromotional: boolean; // must be false on Studio channels; they can do ads instead
}

export interface Ad extends Video {
  budget: number;
  budgetSpent: number;
  EndsAt: Date;
  impressions: number;
  clicks: number;
}

export interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  message: string;
  like_count: number;
  dislike_count: number;
  created_at: string;
  updated_at?: string;
  parent_comment_id?: string;
  user?: {
    id: string;
    username: string;
    display_name?: string;
  };
}

export type CommentWithChildren = Comment & { children?: CommentWithChildren[] };
