'use client';

import { useSectorMember } from './SectorContext';

export default function SectorMemberCount() {
    const { memberCount, memberRole } = useSectorMember();

    return (
        <>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Members:</span>
                <span className="font-medium">{memberCount.toLocaleString()}</span>
            </div>
            {memberRole && (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Role:</span>
                    <span className="font-medium capitalize text-primary">{memberRole}</span>
                </div>
            )}
        </>
    );
}
