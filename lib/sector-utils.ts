import { SectorRole, SectorPermission } from '@/../types';

/**
 * Map roles to their permissions
 */
export const ROLE_PERMISSIONS: Record<SectorRole, SectorPermission[]> = {
    owner: [
        'delete_sector',
        'edit_sector_settings',
        'manage_member_roles',
        'ban_members',
        'approve_posts',
        'pin_posts',
        'post_without_approval',
    ],
    admin: [
        'edit_sector_settings',
        'manage_member_roles',
        'ban_members',
        'approve_posts',
        'pin_posts',
        'post_without_approval',
    ],
    moderator: [
        'manage_member_roles',
        'ban_members',
        'approve_posts',
        'pin_posts',
        'post_without_approval',
    ],
    contributor: [
        'post_without_approval',
    ],
    member: [],
};

/**
 * Role hierarchy for determining who can assign whom
 */
const ROLE_RANK: Record<SectorRole, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    contributor: 1,
    member: 0,
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
    userRoles: SectorRole[],
    permission: SectorPermission,
): boolean {
    return userRoles.some(role => ROLE_PERMISSIONS[role].includes(permission));
}

/**
 * Check if a user can manage another user's role
 * (You can only assign roles at or below your level)
 */
export function canAssignRole(
    assignerRoles: SectorRole[],
    targetRole: SectorRole,
): boolean {
    const assignerMaxRank = Math.max(...assignerRoles.map(r => ROLE_RANK[r]));
    const targetRank = ROLE_RANK[targetRole];
    return assignerMaxRank >= targetRank;
}

/**
 * Get the highest rank a user holds
 */
export function getHighestRole(roles: SectorRole[]): SectorRole {
    return roles.reduce((highest, role) =>
        ROLE_RANK[role] > ROLE_RANK[highest] ? role : highest,
    ) as SectorRole;
}

/**
 * Verify user can perform an action on a member
 */
export function canManageMember(
    managerRoles: SectorRole[],
    targetRoles: SectorRole[],
): boolean {
    // Must have manage permission AND rank must be higher than target
    if (!hasPermission(managerRoles, 'manage_member_roles')) return false;

    const managerRank = Math.max(...managerRoles.map(r => ROLE_RANK[r]));
    const targetRank = Math.max(...targetRoles.map(r => ROLE_RANK[r]));

    return managerRank > targetRank;
}
