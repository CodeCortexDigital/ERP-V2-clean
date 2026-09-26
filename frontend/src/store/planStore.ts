import { create } from 'zustand';
import billingService, { MySubscription } from '@/services/subscription.service';

// The school's plan as the app needs it everywhere: which optional areas are open and whether it's read-only.
interface PlanState {
  sub: MySubscription | null;
  refresh: () => Promise<void>;
  has: (module: string) => boolean;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  sub: null,
  refresh: async () => {
    try { set({ sub: await billingService.mine() }); } catch { /* keep the last known state */ }
  },
  // Until the plan is known, show everything (the server still enforces it).
  has: (module) => !get().sub || get().sub!.modules.includes(module),
}));
