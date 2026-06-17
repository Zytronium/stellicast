import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound } from 'next/navigation';
import Card from '@/components/Card';
import Link from "next/link";
import Image from 'next/image';
import type { Metadata } from 'next';
import { SectorMemberProvider } from './SectorContext';
import SectorHeader from './SectorHeader';
import SectorMemberCount from './SectorMemberCount';
import SectorMobileTabs from './SectorMobileTabs';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const isAll = id.toLowerCase() === 'all';

    let name = 'All';
    let description: string | null = 'All videos across every sector.';

    if (!isAll) {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from('sectors')
            .select('name, description')
            .eq('slug', id.toLowerCase())
            .single();

        if (error || !data) return { title: 'Not Found - Stellicast' };

        name = data.name;
        description = data.description ?? null;
    }

    const metaDescription = [
        `Browse videos on the '${name}' sector on Stellicast.`,
        description,
    ].filter(Boolean).join(' ');

    return {
        title: `S/${name} - Stellicast`,
        description: metaDescription,
    };
}

function formatSectorDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(' ') || '0s';
}

// Returns the single highest role to display for a member
const ROLE_PRIORITY = ['owner', 'admin', 'moderator'] as const;
type StaffRole = typeof ROLE_PRIORITY[number];

function topRole(roles: string[]): StaffRole | null {
    for (const r of ROLE_PRIORITY) {
        if (roles.includes(r)) return r;
    }
    return null;
}

const ROLE_STYLES: Record<StaffRole, string> = {
    owner:     'text-red-500',
    admin:     'text-orange-500',
    moderator: 'text-green-400',
};

type PageProps = {
    params: Promise<{ id: string }>;
};

type SectorVideo = {
    id: string;
    slug: string;
    title: string;
    thumbnail_url: string | null;
    duration: number | null;
    view_count: number;
    created_at: string;
    is_ai: boolean;
    channels: { display_name: string } | null;
};

type StaffMember = {
    user_id: string;
    roles: string[];
    users: {
        display_name: string | null;
        username: string;
        avatar_url: string | null;
    } | null;
};

const ALL_SECTOR = {
    id: null,
    slug: 'all',
    name: 'All',
    description: 'All videos across every sector.',
    icon: null,
    star_map: true,
    private_access: false,
    rules: [
        "Do not break the law.",
        "Do not upload harmful, abusive, or explicit content.",
        "Do not exploit or harm others.",
        "Do not compromise security or integrity by attempting to trick users into giving their login information or distributing harmful code.",
        "Do not circumvent technical measures or spam content to burden our systems.",
        "Do not misuse AI content or misrepresent it as entirely human-made.",
    ],
    member_count: null,
    video_count: null,
    created_at: null,
};

export default async function SectorPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const isAll = id.toLowerCase() === "all";
    let sector;

    if (isAll) {
        sector = ALL_SECTOR;
    } else {
        const {data, error} = await supabase
            .from('sectors')
            .select('*')
            .eq('slug', id.toLowerCase())
            .single();

        if (error || !data)
            notFound();

        sector = data;
    }

    // Fetch sector videos via API route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const fullUrl = `${baseUrl}/api/videos${!isAll ? `?sectors=${encodeURIComponent(id.toLowerCase())}` : ""}`;
    const res = await fetch(fullUrl, { cache: 'no-store' });
    const { videos } = await res.json() as { videos: SectorVideo[] };

    // Get current user for join state
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let isMember = false;
    let memberRole: string | null = null;
    if (authUser && !isAll) {
        const { data: membership } = await supabase
            .from('sector_members')
            .select('roles')
            .eq('sector_id', sector.id)
            .eq('user_id', authUser.id)
            .single();
        if (membership) {
            isMember = true;
            memberRole = membership.roles?.[0] ?? 'member';
        }
    }

    // Fetch staff (owners, admins, moderators) - not relevant for the "All" pseudo-sector
    let staff: StaffMember[] = [];
    if (!isAll && sector.id) {
        const { data: staffData } = await supabase
            .from('sector_members')
            .select('user_id, roles, users(display_name, username, avatar_url)')
            .eq('sector_id', sector.id)
            .overlaps('roles', ['owner', 'admin', 'moderator']);

        if (staffData) {
            // Sort by role priority: owner -> admin -> moderator
            staff = (staffData as unknown as StaffMember[]).sort((a, b) => {
                const pa = ROLE_PRIORITY.findIndex(r => a.roles.includes(r));
                const pb = ROLE_PRIORITY.findIndex(r => b.roles.includes(r));
                return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
            });
        }
    }

    // Calculate sector age
    let sectorAge = '';
    if (sector.created_at) {
        const sectorCreatedDate = new Date(sector.created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - sectorCreatedDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffYears = Math.floor(diffDays / 365);
        const diffMonths = Math.floor((diffDays % 365) / 30);
        const remainingDays = diffDays % 30;

        if (diffYears > 0) {
            sectorAge = `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
            if (diffMonths > 0) sectorAge += `, ${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
        } else if (diffMonths > 0) {
            sectorAge = `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
            if (remainingDays > 0) sectorAge += `, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
        } else {
            sectorAge = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
        }
    }

    // -------- Shared JSX - rendered in both the mobile About tab and desktop sidebar --------

    const videoGrid = videos.length > 0 ? (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map(video => (
                <Card
                    key={video.id}
                    slug={video.slug}
                    duration={video.duration}
                    title={video.title}
                    creator_name={video.channels?.display_name || 'Unknown Creator'}
                    views={video.view_count}
                    date={video.created_at}
                    thumbnail_src={video.thumbnail_url ?? '/Stellicast404Thumbnail.png'}
                    is_ai={video.is_ai}
                />
            ))}
        </section>
    ) : (
        <div className="py-20 text-center">
            <p className="text-muted-foreground text-sm">
                No videos in this Sector yet. Be the first to post!
            </p>
        </div>
    );

    const sidebarPanels = (
        <div className="space-y-6">
            {/* Statistics */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Statistics</h2>
                <div className="space-y-2 text-sm text-card-foreground">
                    {!isAll && <SectorMemberCount />}
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Videos:</span>
                        <span className="font-medium">
                            {sector.video_count !== null
                                ? sector.video_count.toLocaleString()
                                : videos.length.toLocaleString()}
                        </span>
                    </div>
                    {sectorAge && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Age:</span>
                            <span className="font-medium">{sectorAge}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Rules */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Sector Rules</h2>
                {sector.rules && sector.rules.length > 0 ? (
                    <ol className="space-y-2 text-sm text-card-foreground">
                        {sector.rules.map((rule: string, index: number) => (
                            <li key={index} className="flex gap-2">
                                <span className="font-semibold text-muted-foreground shrink-0">
                                    {index + 1}.
                                </span>
                                <span className="leading-relaxed">{rule}</span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="text-sm text-muted-foreground">This sector has no rules</p>
                )}
                <hr />
                {isAll ? (
                    <p className="text-xs text-muted-foreground">
                        For more details, read the <Link href="/rules" className="text-primary underline">full site-wide rules</Link>.
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        * Remember to follow <Link href="/rules" className="text-primary underline">site-wide rules</Link> as well!
                    </p>
                )}
            </div>

            {/* Staff */}
            {staff.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Moderators</h2>
                    <ul className="space-y-3">
                        {staff.map(member => {
                            const user = member.users;
                            const role = topRole(member.roles);
                            if (!user || !role) return null;
                            const initial = user.display_name?.[0]?.toUpperCase() ?? user.username[0].toUpperCase();
                            return (
                                <li key={member.user_id} className="flex items-center gap-2.5">
                                    {/* Avatar */}
                                    <div className="w-7 h-7 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                                        {user.avatar_url ? (
                                            <Image
                                                src={user.avatar_url}
                                                alt={user.display_name ?? ""}
                                                width={28}
                                                height={28}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-muted-foreground select-none">
                                                {initial}
                                            </span>
                                        )}
                                    </div>
                                    {/* Name + handle */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate leading-none">
                                            {user.display_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                                            @{user.username}
                                        </p>
                                    </div>
                                    {/* Role badge */}
                                    <span className={`text-xs font-semibold capitalize shrink-0 ${ROLE_STYLES[role]}`}>
                                        {role}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Upload Constraints */}
            {!isAll && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Upload Constraints</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Allows AI Content</span>
                            <span className={`font-medium ${sector.allow_ai ? 'text-green-500' : 'text-destructive'}`}>
                                {sector.allow_ai ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Min Duration</span>
                            <span className="font-medium text-card-foreground">
                                {sector.min_video_length === 0 ? 'None' : formatSectorDuration(sector.min_video_length)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Max Duration</span>
                            <span className="font-medium text-card-foreground">
                                {formatSectorDuration(sector.max_video_length)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy & Access */}
            {!isAll && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Privacy & Access</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Appears on Star Map</span>
                            <span className={`font-medium ${sector.star_map ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {sector.star_map ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Anyone Can Post</span>
                            <span className={`font-medium ${sector.open_posting ? 'text-green-500' : 'text-destructive'}`}>
                                {sector.open_posting ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Approval Required</span>
                            <span className={`font-medium ${sector.approval_for_posting ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                                {sector.approval_for_posting ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <SectorMemberProvider
            initialCount={sector.member_count ?? 0}
            initialRole={memberRole}
        >
            <div className="flex gap-8">
                {/* Main Content */}
                <div className="flex-1 space-y-8">
                    {/* -------- Sector Header -------- */}
                    <SectorHeader
                        sectorId={sector.id ?? ''}
                        slug={sector.slug}
                        name={sector.name}
                        description={sector.description}
                        icon={sector.icon}
                        starMap={sector.star_map}
                        privateAccess={sector.private_access}
                        authUserId={authUser?.id ?? null}
                        isMember={isMember}
                        memberRole={memberRole}
                        isAll={isAll}
                    />

                    <hr className="border-border" />

                    {/* -------- Mobile: tabbed videos + about -------- */}
                    <SectorMobileTabs
                        videosContent={videoGrid}
                        sidebarContent={sidebarPanels}
                    />

                    {/* -------- Desktop: video grid only -------- */}
                    <div className="hidden lg:block">
                        {videoGrid}
                    </div>
                </div>

                {/* -------- Desktop Sidebar -------- */}
                <aside className="hidden lg:block w-80 shrink-0">
                    <div className="sticky top-4 rounded-md overflow-hidden">
                        <div className="max-h-[calc(100vh-64px-2rem)] overflow-y-auto">
                            {sidebarPanels}
                        </div>
                    </div>
                </aside>
            </div>
        </SectorMemberProvider>
    );
}
