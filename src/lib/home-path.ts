export function homePath(isSuperAdmin: boolean): string {
  return isSuperAdmin ? '/saas' : '/dashboard';
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'super_admin';
}