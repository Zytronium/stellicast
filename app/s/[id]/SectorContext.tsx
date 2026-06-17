'use client';

import { createContext, useContext, useState } from 'react';

interface SectorMemberContextValue {
    memberCount: number;
    memberRole: string | null;
    handleJoin: () => void;
    handleLeave: () => void;
}

const SectorMemberContext = createContext<SectorMemberContextValue>({
    memberCount: 0,
    memberRole: null,
    handleJoin: () => {},
    handleLeave: () => {},
});

export function SectorMemberProvider({
                                         initialCount,
                                         initialRole,
                                         children,
                                     }: {
    initialCount: number;
    initialRole: string | null;
    children: React.ReactNode;
}) {
    const [memberCount, setMemberCount] = useState(initialCount);
    const [memberRole, setMemberRole] = useState(initialRole);

    function handleJoin() {
        setMemberCount(c => c + 1);
        setMemberRole('member');
    }

    function handleLeave() {
        setMemberCount(c => c - 1);
        setMemberRole(null);
    }

    return (
        <SectorMemberContext.Provider value={{ memberCount, memberRole, handleJoin, handleLeave }}>
            {children}
        </SectorMemberContext.Provider>
    );
}

export function useSectorMember() {
    return useContext(SectorMemberContext);
}
