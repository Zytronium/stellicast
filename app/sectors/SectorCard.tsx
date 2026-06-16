'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Users, Video, Lock } from 'lucide-react';
import SectorJoinButton from '@/components/SectorJoinButton';

interface SectorCardProps {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    member_count: number;
    video_count: number;
    private_access: boolean;
    isMember: boolean;
    role: string | null;
    userId: string | null;
}

export default function SectorCard({
                                       id, slug, name, description, icon,
                                       member_count, video_count, private_access,
                                       isMember, role, userId,
                                   }: SectorCardProps) {
    const router = useRouter();
    const [count, setCount] = useState(member_count);

    return (
        <div
            onClick={() => router.push(`/s/${slug}`)}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
        >
            {/* Icon + name row */}
            <div className="flex items-center gap-3">
                {icon ? (
                    <Image
                        src={icon}
                        alt={name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                            {name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}

                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-card-foreground truncate">
                        s/{slug}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{name}</span>
                </div>

                {private_access && (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-auto" />
                )}
            </div>

            {/* Description */}
            {description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {description}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
                <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {count.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" />
                    {video_count.toLocaleString()}
                </span>
                {isMember && role && (
                    <span className="ml-auto text-xs font-medium text-primary capitalize">{role}</span>
                )}
            </div>

            {/* Join / Leave */}
            {userId && (
                <div onClick={(e) => e.stopPropagation()}>
                    <SectorJoinButton
                        sectorId={id}
                        userId={userId}
                        isMember={isMember}
                        memberRole={role}
                        onJoin={() => setCount(c => c + 1)}
                        onLeave={() => setCount(c => c - 1)}
                    />
                </div>
            )}
        </div>
    );
}
