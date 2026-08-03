import { Variants } from 'motion/react';

export const MOTION_DURATIONS = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
} as const;

export const MOTION_EASINGS = {
  appleFluid: [0.16, 1, 0.3, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
};

export const MOTION_SPRINGS = {
  subtle: { stiffness: 300, damping: 30 },
  bouncy: { stiffness: 400, damping: 25 },
};

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION_DURATIONS.normal, ease: MOTION_EASINGS.appleFluid },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: MOTION_DURATIONS.fast, ease: MOTION_EASINGS.easeOut },
  },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.appleFluid },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: MOTION_DURATIONS.fast, ease: MOTION_EASINGS.easeOut },
  },
};

export const sidebarVariants: Variants = {
  expanded: { width: '240px', x: 0, transition: { duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.appleFluid } },
  collapsed: { width: '64px', x: 0, transition: { duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.appleFluid } },
  mobile_expanded: { width: '280px', x: 0, transition: { duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.appleFluid } },
  mobile_collapsed: { width: '280px', x: '-100%', transition: { duration: MOTION_DURATIONS.slow, ease: MOTION_EASINGS.appleFluid } },
};

/**
 * Returns reduced-motion variant overrides if `reducedMotion` boolean is true
 */
export function getMotionVariants(variants: Variants, reducedMotion: boolean): Variants {
  if (!reducedMotion) return variants;

  const reduced: Variants = {};
  for (const key of Object.keys(variants)) {
    reduced[key] = {
      opacity: key === 'initial' || key === 'exit' ? 0 : 1,
      scale: 1,
      x: 0,
      y: 0,
      transition: { duration: 0 },
    };
  }
  return reduced;
}
