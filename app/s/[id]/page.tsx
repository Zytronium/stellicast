import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Card from '@/components/Card';
import SectorJoinButton from '@/components/SectorJoinButton';
import Link from "next/link";

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

export default async function SectorPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Fetch sector
    const { data: sector, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('slug', id.toLowerCase())
        .single();

    if (error || !sector)
        notFound();

    // Fetch sector videos via API route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/videos?sectors=${encodeURIComponent(id.toLowerCase())}`, {
        cache: 'no-store',
    });
    const { videos } = await res.json() as { videos: SectorVideo[] };

    // Get current user for join state
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let isMember = false;
    let memberRole: string | null = null;
    if (authUser) {
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
    const sectorCreatedDate = new Date(sector.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - sectorCreatedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffYears = Math.floor(diffDays / 365);
    const diffMonths = Math.floor((diffDays % 365) / 30);
    const remainingDays = diffDays % 30;

    let sectorAge = '';
    if (diffYears > 0) {
        sectorAge = `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
        if (diffMonths > 0) sectorAge += `, ${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    } else if (diffMonths > 0) {
        sectorAge = `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
        if (remainingDays > 0) sectorAge += `, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    } else {
        sectorAge = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
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

                {/* Join / Leave */}
                {authUser && (
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
                <div className="sticky top-4 space-y-6">
                    {/* Statistics Section */}
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                        <h2 className="text-lg font-semibold text-foreground">
                            Statistics
                        </h2>
                        <div className="space-y-2 text-sm text-card-foreground">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Members:</span>
                                <span className="font-medium">{sector.member_count.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Videos:</span>
                                <span className="font-medium">{sector.video_count.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Age:</span>
                                <span className="font-medium">{sectorAge}</span>
                            </div>
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
                        <p className="text-xs text-muted-foreground">
                            * Remember to follow <Link href="/rules" className="text-primary underline">site-wide rules</Link> as well!
                        </p>
                    </div>
                </div>
            </aside>
        </div>
    );
}
