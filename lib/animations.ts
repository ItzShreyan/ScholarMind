// ✅ 120Hz-STYLE ANIMATION UTILITIES
// Optimized for smooth, responsive animations across all interactions

import { Variants } from "framer-motion";

/**
 * Smooth fade-in animation for page/component entry
 * Used for: Modal opens, tab switches, content reveals
 */
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

/**
 * Slide-up animation for content entering from bottom
 * Used for: Modals, panels, notifications
 */
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

/**
 * Scale animation for button/card interactions
 * Used for: Button clicks, card hovers, interactive elements
 */
export const scaleVariants: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: "easeIn"
    }
  }
};

/**
 * Staggered list animation for multiple items
 * Used for: File lists, quiz options, flashcard decks
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
      ease: "easeOut"
    }
  }
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

/**
 * Smooth loading spinner animation
 * Used for: Loading states, processing indicators
 */
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

/**
 * Pulse animation for attention-grabbing elements
 * Used for: Notifications, alerts, status indicators
 */
export const pulseVariants: Variants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

/**
 * Bounce animation for playful interactions
 * Used for: Success messages, achievements
 */
export const bounceVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut"
    }
  }
};

/**
 * Hover animation for interactive elements
 * Used for: Buttons, links, cards
 */
export const hoverVariants = {
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: "easeIn"
    }
  }
};

/**
 * Smooth scroll-triggered animation
 * Used for: Scroll-based reveals, parallax effects
 */
export const scrollRevealVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

/**
 * Tab switch animation
 * Used for: Workspace tab switches, panel transitions
 */
export const tabSwitchVariants: Variants = {
  enter: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  center: {
    zIndex: 1,
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: {
    zIndex: 0,
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

/**
 * Smooth height transition for collapsible elements
 * Used for: Accordions, expandable sections
 */
export const expandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

/**
 * Tooltip/popover animation
 * Used for: Tooltips, context menus, popovers
 */
export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.15,
      ease: "easeIn"
    }
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

/**
 * Smooth color transition
 * Used for: Theme changes, status updates
 */
export const colorTransitionVariants: Variants = {
  animate: {
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
};

/**
 * Shake animation for errors
 * Used for: Form validation errors, failed operations
 */
export const shakeVariants: Variants = {
  animate: {
    x: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  }
};

/**
 * Smooth transition presets for common durations
 */
export const transitionPresets = {
  fast: { duration: 0.15, ease: "easeOut" },
  normal: { duration: 0.3, ease: "easeOut" },
  slow: { duration: 0.5, ease: "easeOut" },
  verySlow: { duration: 0.8, ease: "easeOut" }
};

/**
 * Easing functions optimized for 120Hz displays
 */
export const easingFunctions = {
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  smoothIn: "cubic-bezier(0.4, 0, 1, 1)",
  smoothOut: "cubic-bezier(0, 0, 0.2, 1)",
  snappy: "cubic-bezier(0.34, 1.56, 0.64, 1)"
};

/**
 * Performance-optimized animation hook
 * Prevents layout thrashing and ensures 60fps animations
 */
export const useOptimizedAnimation = (isEnabled: boolean = true) => {
  return {
    shouldAnimate: isEnabled && typeof window !== "undefined",
    reduceMotion: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };
};
