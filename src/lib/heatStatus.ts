export const HEAT_COLORS = {
  green: '#16A34A',
  yellow: '#FACC15',
  orange: '#F97316',
  red: '#DC2626',
} as const;

const RANK = [HEAT_COLORS.green, HEAT_COLORS.yellow, HEAT_COLORS.orange, HEAT_COLORS.red];

export function contactStatusColor(stageName: string, status: string): string {
  const name = `${stageName} ${status}`.toLowerCase();
  if (name.includes('perd') || status === 'lost') return HEAT_COLORS.red;
  if (name.includes('acordo') || name.includes('negoc')) return HEAT_COLORS.orange;
  if (name.includes('estudo') || name.includes('qualif')) return HEAT_COLORS.yellow;
  return HEAT_COLORS.green;
}

export function hottestColor(colors: string[]): string {
  return colors.reduce((best, color) => (RANK.indexOf(color as typeof RANK[number]) > RANK.indexOf(best as typeof RANK[number]) ? color : best), HEAT_COLORS.green);
}
