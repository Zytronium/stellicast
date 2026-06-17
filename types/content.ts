export interface Video {
  id: string;
  slug: string;
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
    avatar_url?: string;
  };
}

export type CommentWithChildren = Comment & { children?: CommentWithChildren[] };

export type SectorRole = 'owner' | 'admin' | 'moderator' | 'contributor' | 'member';

export type SectorPermission =
  | 'delete_sector'
  | 'edit_sector_settings'
  | 'manage_member_roles'
  | 'ban_members'
  | 'approve_posts'
  | 'pin_posts'
  | 'post_without_approval';

export interface SectorMember {
  sector_id: string;
  user_id: string;
  roles: SectorRole[];
  permissions: SectorPermission[];
  joined_at: Date;
  // Join these from users table
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface SectorBan {
  id: string;
  sector_id: string;
  user_id: string;
  banned_by_id: string;
  ban_reason?: string;
  banned_until?: Date; // null = permanent
  created_at: Date;
  // Join from users table
  username?: string;
  display_name?: string;
  avatar_url?: string;
  banned_by_username?: string;
}

export interface SectorVideo {
  video_id: string;
  sector_id: string;
  // added_at: Date; // When the video was added to the Sector, not when it was published. Potential future metric if videos can be added to Sectors after upload, which oculd be a useful feature.
}

export interface Sector {
  id: string;               // A UUID that uniquely identifies the sector in the database
  slug: string;             // A URL-friendly unique slug for the sector (i.e. rc_planes instead of RC Planes)
  name: string;             // A unique human-friendly name for the sector (i.e. RC Planes)
  description?: string;     // An optional description for the sector (i.e. "The place to post videos of your RC planes")
  icon?: string;            // Optional URL to the icon for this sector
  member_count: number;     // Total number of members/followers of this sector
  video_count: number;      // An array of videos associated with this sector
  star_map: boolean;        // Whether this sector will appear publicly on the star map
  private_access: boolean;  // Whether only approved members can join and upload/view content
  allow_ai: boolean;        // Whether AI-generated content is allowed in this sector
  min_video_length: number; // Minimum video length allowed in this sector
  max_video_length: number; // Maximum video length allowed in this sector
  rules: string[];          // Sector rules
  createdAt: Date;          // Timestamp of this sector's creation
  updatedAt: Date;          // Timestamp of the last update to this sector aside from its videos
}
