'use client';

import {useEffect, useState} from 'react';
import Image from 'next/image';
import { AlertCircle, Loader2, Shield, Ban, Clock, Trash2, ChevronDown } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SectorMember, SectorRole, SectorBan } from '@/../types';
import { hasPermission, canManageMember, getHighestRole } from '@/../lib/sector-utils';

interface Props {
    sectorId: string;
    currentUserRole: SectorRole[];
}

interface TabState {
    members: SectorMember[];
    bans: SectorBan[];
    loading: boolean;
    error: string;
    success: string;
}

function RoleIcon({ role }: { role: SectorRole }) {
    if (role === 'owner') return <Shield className="w-4 h-4 text-red-400" />;
    if (role === 'admin') return <Shield className="w-4 h-4 text-orange-400" />;
    if (role === 'moderator') return <Shield className="w-4 h-4 text-green-300" />;
    return null;
}

function RoleBadge({ role }: { role: SectorRole }) {
    const colors: Record<SectorRole, string> = {
        owner: 'bg-red-500/20 text-red-300',
        admin: 'bg-orange-500/20 text-orange-300',
        moderator: 'bg-green-500/20 text-green-300',
        contributor: 'bg-blue-500/20 text-blue-300',
        member: 'bg-muted text-muted-foreground',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[role]}`}>
      <RoleIcon role={role} />
            {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
    );
}

function MemberRow({
                       member,
                       currentUserRole,
                       onRoleChange,
                       onBan,
                       loading,
                   }: {
    member: SectorMember;
    currentUserRole: SectorRole[];
    onRoleChange: (userId: string, newRole: SectorRole) => Promise<void>;
    onBan: (userId: string, reason?: string) => Promise<void>;
    loading: string | null;
}) {
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const canManage = canManageMember(currentUserRole, member.roles);
    const isCurrentUser = false; // Would need to pass in actual user ID
    const highestRole = getHighestRole(member.roles);

    const availableRoles: SectorRole[] = ['member', 'contributor', 'moderator', 'admin', 'owner'].filter(
        role => canManageMember(currentUserRole, [role as SectorRole])
    ) as SectorRole[];

    return (
        <div key={member.user_id} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50 border border-border hover:border-muted-foreground transition">
            {/* User info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                    {member.avatar_url ? (
                        <Image src={member.avatar_url} alt={member.username || ''} width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                            {member.display_name?.charAt(0) || member.username?.charAt(0) || '?'}
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{member.display_name || member.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                </div>
            </div>

            {/* Roles */}
            <div className="flex flex-wrap gap-2 justify-end">
                {member.roles.map(role => (
                    <RoleBadge key={role} role={role} />
                ))}
            </div>

            {/* Actions */}
            {canManage && !isCurrentUser && (
                <div className="flex items-center gap-2 shrink-0">
                    {/* Role selector */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowRoleMenu(!showRoleMenu)}
                            disabled={loading === member.user_id}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground hover:border-muted-foreground transition disabled:opacity-50"
                        >
                            {loading === member.user_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Change
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </>
                            )}
                        </button>
                        {showRoleMenu && (
                            <div className="absolute right-0 top-full mt-2 z-10 bg-card border border-border rounded-lg shadow-lg py-1">
                                {availableRoles.map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => {
                                            onRoleChange(member.user_id, role);
                                            setShowRoleMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm transition ${
                                            highestRole === role
                                                ? 'bg-primary/20 text-primary-foreground'
                                                : 'text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ban button */}
                    {hasPermission(currentUserRole, 'ban_members') && (
                        <button
                            type="button"
                            onClick={() => onBan(member.user_id)}
                            disabled={loading === member.user_id}
                            className="p-2 rounded-lg bg-input border border-border text-destructive-foreground hover:bg-destructive/10 transition disabled:opacity-50"
                            title="Ban this member"
                        >
                            <Ban className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function BanRow({
                    ban,
                    onUnban,
                    loading,
                }: {
    ban: SectorBan;
    onUnban: (banId: string) => Promise<void>;
    loading: string | null;
}) {
    const isPermanent = !ban.banned_until;
    const isActive = isPermanent || new Date(ban.banned_until!) > new Date();

    return (
        <div key={ban.id} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50 border border-destructive/30">
            {/* Ban info */}
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{ban.display_name || ban.username}</p>
                    {!isActive && <span className="text-xs text-muted-foreground">(Expired)</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isPermanent ? (
                        <>
                            <Ban className="w-3.5 h-3.5" />
                            Permanent ban
                        </>
                    ) : (
                        <>
                            <Clock className="w-3.5 h-3.5" />
                            Until {new Date(ban.banned_until!).toLocaleDateString()}
                        </>
                    )}
                </div>
                {ban.ban_reason && <p className="text-xs text-muted-foreground mt-2">Reason: {ban.ban_reason}</p>}
                <p className="text-xs text-muted-foreground mt-1">Banned by @{ban.banned_by_username}</p>
            </div>

            {/* Unban button */}
            <button
                type="button"
                onClick={() => onUnban(ban.id)}
                disabled={loading === ban.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground hover:border-muted-foreground transition disabled:opacity-50"
            >
                {loading === ban.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remove ban
            </button>
        </div>
    );
}

export default function MembersTab({ sectorId, currentUserRole }: Props) {
    const [state, setState] = useState<TabState>({
        members: [],
        bans: [],
        loading: false,
        error: '',
        success: '',
    });
    const [loading, setLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'bans'>('members');

    useEffect(() => {
        async function loadData() {
            setState(s => ({ ...s, loading: true }));
            try {
                const response = await fetch(`/api/sectors/${sectorId}/members`);
                if (!response.ok) throw new Error('Failed to load members');

                const { members, bans } = await response.json();
                setState(s => ({
                    ...s,
                    members: members || [],
                    bans: bans || [],
                    loading: false,
                }));
            } catch (err) {
                setState(s => ({
                    ...s,
                    error: err instanceof Error ? err.message : 'Failed to load members',
                    loading: false,
                }));
            }
        }

        loadData();
    }, [sectorId]);

    // Load initial data (would be called useEffect in real implementation)
    const canManageRoles = hasPermission(currentUserRole, 'manage_member_roles');
    const canBan = hasPermission(currentUserRole, 'ban_members');

    async function handleRoleChange(userId: string, newRole: SectorRole) {
        setLoading(userId);
        try {
            const res = await fetch(`/api/sectors/${sectorId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'change_role', targetUserId: userId, newRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update role.');

            setState(s => ({
                ...s,
                members: s.members.map(m => m.user_id === userId ? { ...m, roles: [newRole] } : m),
                success: 'Role updated.',
            }));
            setTimeout(() => setState(s => ({ ...s, success: '' })), 3000);
        } catch (err) {
            setState(s => ({ ...s, error: err instanceof Error ? err.message : 'Failed to update role.' }));
        } finally {
            setLoading(null);
        }
    }

    async function handleBan(userId: string, reason?: string) {
        setLoading(userId);
        try {
            const res = await fetch(`/api/sectors/${sectorId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ban', targetUserId: userId, reason, banUntil: null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to ban member.');

            setState(s => ({
                ...s,
                members: s.members.filter(m => m.user_id !== userId),
                success: 'Member banned.',
            }));
            setTimeout(() => setState(s => ({ ...s, success: '' })), 3000);
        } catch (err) {
            setState(s => ({ ...s, error: err instanceof Error ? err.message : 'Failed to ban member.' }));
        } finally {
            setLoading(null);
        }
    }

    async function handleUnban(banId: string) {
        setLoading(banId);
        try {
            const res = await fetch(`/api/sectors/${sectorId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'unban', targetUserId: banId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove ban.');

            setState(s => ({
                ...s,
                bans: s.bans.filter(b => b.id !== banId),
                success: 'Ban removed.',
            }));
            setTimeout(() => setState(s => ({ ...s, success: '' })), 3000);
        } catch (err) {
            setState(s => ({ ...s, error: err instanceof Error ? err.message : 'Failed to remove ban.' }));
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="max-w-4xl flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-border">
                <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className={`pb-2 text-sm font-medium transition ${
                        activeTab === 'members'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Members
                </button>
                {canBan && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('bans')}
                        className={`pb-2 text-sm font-medium transition ${
                            activeTab === 'bans'
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Bans
                    </button>
                )}
            </div>

            {/* Members tab */}
            {activeTab === 'members' && (
                <div className="flex flex-col gap-4">
                    {!canManageRoles && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 border border-border text-muted-foreground text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            You don't have permission to manage member roles.
                        </div>
                    )}
                    {state.members.map(member => (
                        <MemberRow
                            key={member.user_id}
                            member={member}
                            currentUserRole={currentUserRole}
                            onRoleChange={handleRoleChange}
                            onBan={handleBan}
                            loading={loading}
                        />
                    ))}
                </div>
            )}

            {/* Bans tab */}
            {activeTab === 'bans' && (
                <div className="flex flex-col gap-4">
                    {state.bans.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No active bans.</p>
                    ) : (
                        state.bans.map(ban => (
                            <BanRow
                                key={ban.id}
                                ban={ban}
                                onUnban={handleUnban}
                                loading={loading}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Status messages */}
            {state.error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive-foreground text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {state.error}
                </div>
            )}
            {state.success && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                    {state.success}
                </div>
            )}
        </div>
    );
}
