import type { ReactNode } from 'react';
import type { PlanFeature } from '@/lib/plans';

export function FeatureGate({ children }: { feature: PlanFeature; children: ReactNode }) {
  return children;
}
