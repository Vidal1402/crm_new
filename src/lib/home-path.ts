export function homePath(isSuperAdmin: boolean): string {
  return isSuperAdmin ? '/saas' : '/funil';
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'super_admin';
}