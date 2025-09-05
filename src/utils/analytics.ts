export type UmamiEvent = {
  name: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: UmamiEvent['data']) => void;
      // Some older versions expose umami(name, data)
      (name: string, data?: UmamiEvent['data']): void;
    };
  }
}

export function trackEvent(name: string, data?: UmamiEvent['data']): void {
  if (typeof window === 'undefined') return;
  try {
    const u: any = (window as any).umami;
    if (!u) return;
    if (typeof u.track === 'function') {
      u.track(name, data);
    } else if (typeof u === 'function') {
      u(name, data);
    }
  } catch {}
}

export const AnalyticsEvents = {
  RegistrationCompleted: 'registration_completed',
  RecipeSubmitted: 'recipe_submitted',
  RatingSubmitted: 'rating_submitted',
  ClickRateRecipe: 'click_rate_recipe',
  ClickSaveRecipe: 'click_save_recipe',
  ClickShareRecipe: 'click_share_recipe',
  ClickShareBlog: 'click_share_blog',
} as const;


