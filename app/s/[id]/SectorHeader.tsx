'use client';

import Image from 'next/image';
import Link from 'next/link';
import SectorJoinButton from '@/components/SectorJoinButton';
import { useSectorMember } from './SectorContext';

interface Props {
    sectorId: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    starMap: boolean;
    privateAccess: boolean;
    authUserId: string | null;
    isMember: boolean;
    memberRole: string | null;
    isAll: boolean;
}

export default function SectorHeader({
                                         sectorId, slug, name, description, icon,
                                         starMap, privateAccess, authUserId, isMember, memberRole, isAll,
                                     }: Props) {
    const { handleJoin, handleLeave } = useSectorMember();
    const canManage = authUserId && !isAll && (memberRole === 'owner' || memberRole === 'moderator');

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 bg-muted flex items-center justify-center border border-border">
                {icon ? (
                    <Image
                        src={icon}
                        alt={`${name} icon`}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                    />
                ) : (
                    <span className="text-2xl sm:text-3xl font-bold text-muted-foreground select-none">
                        {name[0].toUpperCase()}
                    </span>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                        {name}
                    </h1>
                    {!starMap && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            Unlisted
                        </span>
                    )}
                    {privateAccess && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            Private
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">s/{slug}</p>
                {description && (
                    <p className="text-sm text-card-foreground max-w-2xl leading-relaxed">
                        {description}
                    </p>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
                {canManage && (
                    <Link
                        href={`/s/${slug}/manage`}
                        className="h-9 px-5 rounded-full border border-border bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors flex items-center"
                    >
                        Manage
                    </Link>
                )}
            {authUserId && !isAll && (
                <SectorJoinButton
                    sectorId={sectorId}
                    userId={authUserId}
                    isMember={isMember}
                    memberRole={memberRole}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                />
            )}
        </div>
        </div>
    );
}
