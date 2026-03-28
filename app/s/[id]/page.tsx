// app/s/[id]/page.tsx
import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Card from '@/components/Card';
import SectorJoinButton from '@/components/SectorJoinButton';

type PageProps = {
    params: Promise<{ id: string }>;
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

    // Fetch videos in this sector with channel info
    const { data: sectorVideos } = await supabase
        .from('sector_videos')
        .select(`
    video:videos (
      id,
      slug,
      title,
      thumbnail_url,
      duration,
      view_count,
      created_at,
      is_ai,
      channels ( display_name )
    )
  `)
        .eq('sector_id', sector.id);

    const videos = (sectorVideos ?? [])
        .map(row => row.video as unknown as {
            id: string;
            slug: string;
            title: string;
            thumbnail_url: string | null;
            duration: number | null;
            view_count: number;
            created_at: string;
            is_ai: boolean;
            channels: { display_name: string } | null;
        } | null)
        .filter((v): v is NonNullable<typeof v> => !!v && !!v.slug)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

    return (
        <div className="space-y-8">
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
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                        <span>{sector.member_count.toLocaleString()} member{sector.member_count !== 1 ? 's' : ''}</span>
                        <span className="text-border">•</span>
                        <span>{sector.video_count.toLocaleString()} video{sector.video_count !== 1 ? 's' : ''}</span>
                        {memberRole && (
                            <>
                                <span className="text-border">•</span>
                                <span className="capitalize text-primary">{memberRole}</span>
                            </>
                        )}
                    </div>
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

            <hr className="border-border" />

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
    );
}
