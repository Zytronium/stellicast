import type { Metadata } from 'next';

const metadataMap: Record<string, Metadata> = {
    "/": {
        title: "Home | Stellicast",
        description: "Explore videos curated for you or be the star of your own show."
    },
    "/about": {
        title: "About | Stellicast - Be the Star of Your Own Show",
        description: "Learn more about Stellicast and its goal. Stellicast is a work-in-progress, open-source, privacy‑first video platform that doesn't sell user data, doesn't bombard you with ads, listens to user feedback, and promotes non-corporate, human-made content."
    },
    "/account": {
        title: "Account | Stellicast",
        description: "Manage your Stellicast account."
    },
    "/auth": {
        title: "Login Portal | Stellicast",
        description: "Log in or create a new account with Stellicast."
    },
    "/channels/apply": {
        title: "Apply for Channels Early Access | Stellicast",
        description: "Apply to become an early access creator on Stellicast."
    },
    "/channel-early-access-agreement": {
        title: "Channel Early Access Agreement | Stellicast",
        description: "Read the agreement required before being allowed to create a channel and upload content."
    },
    "/complete-signup": {
        title: "Complete Signup | Stellicast",
        description: "Finish creating your Stellicast account."
    },
    "/consent": {
        title: "Parental Consent | Stellicast",
        description: "Parental consent and account approval information."
    },
    "/consent/reject": {
        title: "Consent Rejected | Stellicast",
        description: "Parental consent request rejected."
    },
    "/explore": {
        title: "Explore | Stellicast",
        description: "Discover videos, creators, and sectors on Stellicast."
    },
    "/more": {
        title: "More | Stellicast",
        description: "Additional Stellicast pages and options. Sector-related pages can be found here."
    },
    "/new-sector": {
        title: "Create Sector | Stellicast",
        description: "Found a new Stellicast sector."
    },
    "/offline": {
        title: "Offline | Stellicast",
        description: "You are currently offline."
    },
    "/privacy-policy": {
        title: "Privacy Policy | Stellicast",
        description: "Read the Stellicast privacy policy."
    },
    "/profile": {
        title: "Profile | Stellicast",
        description: "View and manage your Stellicast profile."
    },
    "/rules": {
        title: "Rules | Stellicast",
        description: "Community rules and platform guidelines."
    },
    "/sectors": {
        title: "Sectors | Stellicast",
        description: "Browse Stellicast sectors."
    },
    "/settings": {
        title: "Settings | Stellicast",
        description: "Manage Stellicast settings and preferences."
    },
    "/star-map": {
        title: "Star Map | Stellicast",
        description: "Explore the interactive Stellicast sector map."
    },
    "/terms-of-use": {
        title: "Terms of Use | Stellicast",
        description: "Read the Stellicast terms of use."
    },
    "/upload": {
        title: "Upload | Stellicast",
        description: "Upload a video to Stellicast."
    },
};

export function getPageMetadata(page: string): Metadata {
    return metadataMap[page] ?? { title: "Stellicast" };
}