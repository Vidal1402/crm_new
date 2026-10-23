// Shared Supabase checkpoint: only reuse a redeploy recorded for this Vercel project.
export function canReuseRedeploy(
  metadata: Record<string, unknown> | null,
  projectId: string,
): boolean {
  if (!projectId || !metadata) return false;
  if (metadata.project_id !== projectId) return false;
  return typeof metadata.deployment_id === 'string' && metadata.deployment_id.length > 0;
}
