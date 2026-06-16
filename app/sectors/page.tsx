import Link from 'next/link';
import { Map, Plus } from 'lucide-react';
import { getPageMetadata } from '@/../lib/page-metadata';
import { createSupabaseServerClient } from '@/../lib/supabase-server';
import SectorCard from './SectorCard';

export const metadata = getPageMetadata('/sectors');

interface Sector {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    member_count: number;
    video_count: number;
    private_access: boolean;
    star_map: boolean;
}

export default async function SectorsPage() {
    const supabase = await createSupabaseServerClient();

    const [
        { data: { user } },
        { data: sectors },
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
            .from('sectors')
            .select('id, slug, name, description, icon, member_count, video_count, private_access, star_map')
            .order('member_count', { ascending: false }),
    ]);

    // Fetch which sectors the current user has joined
    let memberSectorIds = new Set<string>();
    let memberRoles: Record<string, string> = {};
    if (user) {
        const { data: memberships } = await supabase
            .from('sector_members')
            .select('sector_id, roles')
            .eq('user_id', user.id);

        if (memberships) {
            for (const m of memberships) {
                memberSectorIds.add(m.sector_id);
                const roles: string[] = m.roles ?? [];
                memberRoles[m.sector_id] = roles.includes('owner')
                    ? 'owner'
                    : roles.includes('moderator')
                        ? 'moderator'
                        : 'member';
            }
        }
    }

    const list: Sector[] = sectors ?? [];

    return (
        <div className="flex flex-col gap-8 py-6 animate-[fade-in-up_0.5s_ease-out_forwards]">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Sectors</h1>
                    <p className="text-sm text-muted-foreground">
                        Browse communities and find your corner of the galaxy.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                        href="/star-map"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        <Map className="w-4 h-4" />
                        Star Map
                    </Link>

                    <Link
                        href="/new-sector"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 hover:brightness-110 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        New Sector
                    </Link>
                </div>
            </div>

            <hr className="border-border -mt-4" />

            {/* Grid */}
            {list.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-24 text-center">
                    <p className="text-lg font-semibold text-foreground">No sectors yet</p>
                    <p className="text-sm text-muted-foreground">Be the first to found one.</p>
                    <Link
                        href="/new-sector"
                        className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 hover:brightness-110 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Found a Sector
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {list.map((sector) => (
                        <SectorCard
                            key={sector.id}
                            id={sector.id}
                            slug={sector.slug}
                            name={sector.name}
                            description={sector.description}
                            icon={sector.icon}
                            member_count={sector.member_count}
                            video_count={sector.video_count}
                            private_access={sector.private_access}
                            isMember={memberSectorIds.has(sector.id)}
                            role={memberRoles[sector.id] ?? null}
                            userId={user?.id ?? null}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
