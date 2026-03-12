import type { Role as RoleType } from '#/generated/prisma/enums'

export { Role } from '#/generated/prisma/enums'
export type { Role as RoleType } from '#/generated/prisma/enums'

export const ROLES = ['VALIDATE_MARKETS', 'MANAGE_USERS', 'RESOLVE_MARKETS'] as const

export function hasRole(userRoles: RoleType[] | undefined, role: RoleType): boolean {
  return Array.isArray(userRoles) && userRoles.includes(role)
}

export function hasAnyRole(userRoles: RoleType[] | undefined, roles: RoleType[]): boolean {
  return roles.some((r) => hasRole(userRoles, r))
}
