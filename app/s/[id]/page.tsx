import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Card from '@/components/Card';
import SectorJoinButton from '@/components/SectorJoinButton';
import Link from "next/link";
import type { Metadata } from 'next';

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
        "Do not compromise security or integrity by attempting to trick users into giving their login information or disributing harmful code.",
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
        // Fetch sector
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

    return (
        <div className="flex gap-8">
            {/* Main Content */}
            <div className="flex-1 space-y-8">
                {/* ── Sector Header ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Icon */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center border border-border">
                    {sector.icon ? (
                        <Image
                            src={sector.icon}
                            alt={`${sector.name} icon`}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <span className="text-2xl sm:text-3xl font-bold text-muted-foreground select-none">
              {sector.name[0].toUpperCase()}
            </span>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                            {sector.name}
                        </h1>
                        {!sector.star_map && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                Unlisted
                            </span>
                        )}
                        {sector.private_access && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                Private
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">s/{sector.slug}</p>
                    {sector.description && (
                        <p className="text-sm text-card-foreground max-w-2xl leading-relaxed">
                            {sector.description}
                        </p>
                    )}
                </div>

                {/* Join / Leave; not shown for s/all */}
                {authUser && !isAll && (
                    <SectorJoinButton
                        sectorId={sector.id}
                        userId={authUser.id}
                        isMember={isMember}
                        memberRole={memberRole}
                    />
                )}
                </div>

                <hr className="border-border"/>

                {/* ── Videos ── */}
                {videos.length > 0 ? (
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
                )}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-4 rounded-md overflow-hidden">
                    <div className="space-y-6 max-h-[calc(100vh-64px-2rem)] overflow-y-auto">
                    {/* Statistics Section */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-foreground">
                            Statistics
                        </h2>
                        <div className="space-y-2 text-sm text-card-foreground">
                            {sector.member_count !== null && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Members:</span>
                                <span className="font-medium">{sector.member_count.toLocaleString()}</span>
                            </div>
                            )}
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
                            {memberRole && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Your Role:</span>
                                    <span className="font-medium capitalize text-primary">{memberRole}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rules Section */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-foreground">
                            Sector Rules
                        </h2>

                        {sector.rules && sector.rules.length > 0 ? (
                            <ol className="space-y-2 text-sm text-card-foreground">
                                {sector.rules.map((rule: string, index: number) => (
                                    <li key={index} className="flex gap-2">
                                        <span className="font-semibold text-muted-foreground flex-shrink-0">
                                            {index + 1}.
                                        </span>
                                        <span className="leading-relaxed">{rule}</span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                This sector has no rules
                            </p>
                        )}
                        <hr/>
                        {isAll && (
                            <p className="text-xs text-muted-foreground">
                                For more details, read the <Link href="/rules" className="text-primary underline">full site-wide rules</Link>.
                            </p>
                        )}
                        {!isAll && (
                            <p className="text-xs text-muted-foreground">
                                * Remember to follow <Link href="/rules" className="text-primary underline">site-wide rules</Link> as well!
                            </p>
                        )}
                    </div>

                    {/* Upload Constraints Section */}
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

                    {/* Privacy & Access Section */}
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
                </div>
            </aside>
        </div>
    );
}
