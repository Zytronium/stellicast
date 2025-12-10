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
    isPromotional: boolean; // must be false on Studio channels
}

export interface Ad extends Video {
    budget: number;
    budgetLeft: number;
    EndsAt: Date;
    clicks: number;
}

export interface Comment {
    id: string;
    userId: string;
    videoId: string;
    createdAt: Date;
    updatedAt: Date;
    message: string;
    likes: number;
    dislikes: number;
    parentCommentId?: string;
    visible: boolean;
}