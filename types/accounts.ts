import {Ad, Video} from "./content";

export interface User {
    id: string;
    // email: string; // maybe omit this for privacy reasons
    username: string;
    displayName?: string | null;
    createdAt: Date;
    updatedAt: Date;
    // base user fields
}

export interface Follower {
    userId: string;
    notify: "none" | "trending" | "all"; // no "personalized" to respect privacy
    followingSince: Date;
}

export interface Channel {
    id: string;
    ownerId: string; // User UUID
    channelType: 'creator' | 'studio';
    displayName: string;
    handle: string; // unique @handle
    description?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    videoCount: number;
    videos: Video[];
    followerCount: number;
    followers: Follower[]; // we can iterate through this to notify followers of new uploads
    createdAt: Date;
    updatedAt: Date;
}

export interface Creator extends Channel {
    channelType: 'creator';
    website?: string;
    socialLinks?: string[];
    // more creator-specific fields
}

export interface Studio extends Channel {
    channelType: 'studio';
    companyName: string;
    verified: boolean;
    teamSize: number;
    team: string[]; // list of User UUIDs
    currentAds: Ad[];
    businessEmail?: string;
    // more studio-specific fields
}

export type ChannelType = Creator | Studio;
