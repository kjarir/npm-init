import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Fade in animation with optional slide
 */
export const fadeIn = (
  element: gsap.TweenTarget,
  options?: {
    delay?: number;
    duration?: number;
    y?: number;
    x?: number;
    opacity?: number;
    ease?: string;
  }
) => {
  return gsap.from(element, {
    opacity: options?.opacity ?? 0,
    y: options?.y ?? 20,
    x: options?.x ?? 0,
    duration: options?.duration ?? 0.8,
    delay: options?.delay ?? 0,
    ease: options?.ease ?? "power3.out",
  });
};

/**
 * Fade in on scroll with ScrollTrigger
 */
export const fadeInOnScroll = (
  element: gsap.TweenTarget,
  options?: {
    delay?: number;
    duration?: number;
    y?: number;
    x?: number;
    start?: string;
    end?: string;
    trigger?: gsap.TweenTarget;
    once?: boolean;
  }
) => {
  return gsap.fromTo(
    element,
    {
      opacity: 0,
      y: options?.y ?? 50,
      x: options?.x ?? 0,
    },
    {
      opacity: 1,
      y: 0,
      x: 0,
      duration: options?.duration ?? 1,
      delay: options?.delay ?? 0,
      ease: "power3.out",
      scrollTrigger: {
        trigger: options?.trigger ?? element,
        start: options?.start ?? "top 80%",
        end: options?.end ?? "bottom 20%",
        toggleActions: options?.once ? "play none none none" : "play none none reverse",
        once: options?.once ?? false,
      },
    }
  );
};

/**
 * Stagger fade in for multiple elements
 */
export const staggerFadeIn = (
  elements: gsap.TweenTarget,
  options?: {
    delay?: number;
    duration?: number;
    stagger?: number;
    y?: number;
    x?: number;
    start?: string;
    once?: boolean;
  }
) => {
  return gsap.fromTo(
    elements,
    {
      opacity: 0,
      y: options?.y ?? 30,
      x: options?.x ?? 0,
    },
    {
      opacity: 1,
      y: 0,
      x: 0,
      duration: options?.duration ?? 0.8,
      delay: options?.delay ?? 0,
      stagger: options?.stagger ?? 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: elements,
        start: options?.start ?? "top 85%",
        toggleActions: options?.once ? "play none none none" : "play none none reverse",
        once: options?.once ?? false,
      },
    }
  );
};

/**
 * Text reveal animation (split text effect)
 */
export const textReveal = (
  element: gsap.TweenTarget,
  options?: {
    delay?: number;
    duration?: number;
    split?: boolean;
    start?: string;
    once?: boolean;
  }
) => {
  const text = typeof element === "string" ? element : (element as HTMLElement)?.textContent || "";
  
  return gsap.fromTo(
    element,
    {
      opacity: 0,
      y: 50,
    },
    {
      opacity: 1,
      y: 0,
      duration: options?.duration ?? 1,
      delay: options?.delay ?? 0,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: options?.start ?? "top 80%",
        toggleActions: options?.once ? "play none none none" : "play none none reverse",
        once: options?.once ?? false,
      },
    }
  );
};

/**
 * Scale in animation
 */
export const scaleIn = (
  element: gsap.TweenTarget,
  options?: {
    delay?: number;
    duration?: number;
    start?: string;
    once?: boolean;
  }
) => {
  return gsap.fromTo(
    element,
    {
      opacity: 0,
      scale: 0.8,
    },
    {
      opacity: 1,
      scale: 1,
      duration: options?.duration ?? 0.8,
      delay: options?.delay ?? 0,
      ease: "back.out(1.7)",
      scrollTrigger: {
        trigger: element,
        start: options?.start ?? "top 85%",
        toggleActions: options?.once ? "play none none none" : "play none none reverse",
        once: options?.once ?? false,
      },
    }
  );
};

/**
 * Slide in from direction
 */
export const slideIn = (
  element: gsap.TweenTarget,
  direction: "left" | "right" | "up" | "down" = "left",
  options?: {
    delay?: number;
    duration?: number;
    distance?: number;
    start?: string;
    once?: boolean;
  }
) => {
  const distances = {
    left: { x: -(options?.distance ?? 100), y: 0 },
    right: { x: options?.distance ?? 100, y: 0 },
    up: { x: 0, y: -(options?.distance ?? 100) },
    down: { x: 0, y: options?.distance ?? 100 },
  };

  const { x, y } = distances[direction];

  return gsap.fromTo(
    element,
    {
      opacity: 0,
      x,
      y,
    },
    {
      opacity: 1,
      x: 0,
      y: 0,
      duration: options?.duration ?? 0.8,
      delay: options?.delay ?? 0,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: options?.start ?? "top 85%",
        toggleActions: options?.once ? "play none none none" : "play none none reverse",
        once: options?.once ?? false,
      },
    }
  );
};

/**
 * Parallax effect
 */
export const parallax = (
  element: gsap.TweenTarget,
  options?: {
    speed?: number;
    start?: string;
    end?: string;
  }
) => {
  return gsap.to(element, {
    yPercent: -(options?.speed ?? 50),
    ease: "none",
    scrollTrigger: {
      trigger: element,
      start: options?.start ?? "top bottom",
      end: options?.end ?? "bottom top",
      scrub: true,
    },
  });
};

/**
 * Rotate on scroll
 */
export const rotateOnScroll = (
  element: gsap.TweenTarget,
  options?: {
    rotation?: number;
    start?: string;
    end?: string;
  }
) => {
  return gsap.to(element, {
    rotation: options?.rotation ?? 360,
    ease: "none",
    scrollTrigger: {
      trigger: element,
      start: options?.start ?? "top bottom",
      end: options?.end ?? "bottom top",
      scrub: true,
    },
  });
};

/**
 * Pin element on scroll
 */
export const pinOnScroll = (
  element: gsap.TweenTarget,
  options?: {
    start?: string;
    end?: string;
    pinSpacing?: boolean;
  }
) => {
  return ScrollTrigger.create({
    trigger: element,
    start: options?.start ?? "top top",
    end: options?.end ?? "bottom top",
    pin: true,
    pinSpacing: options?.pinSpacing ?? true,
  });
};

/**
 * Animate counter
 */
export const animateCounter = (
  element: gsap.TweenTarget,
  targetValue: number,
  options?: {
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  }
) => {
  const obj = { value: 0 };

  return gsap.to(obj, {
    value: targetValue,
    duration: options?.duration ?? 2,
    ease: "power2.out",
    onUpdate: () => {
      const value = options?.decimals
        ? obj.value.toFixed(options.decimals)
        : Math.round(obj.value);
      if (element) {
        (element as HTMLElement).textContent =
          `${options?.prefix ?? ""}${value}${options?.suffix ?? ""}`;
      }
    },
  });
};

/**
 * Hover animation
 */
export const hoverScale = (element: gsap.TweenTarget, scale: number = 1.05) => {
  const el = element as HTMLElement;
  
  const handleMouseEnter = () => {
    gsap.to(element, {
      scale,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(element, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  el.addEventListener("mouseenter", handleMouseEnter);
  el.addEventListener("mouseleave", handleMouseLeave);

  return () => {
    el.removeEventListener("mouseenter", handleMouseEnter);
    el.removeEventListener("mouseleave", handleMouseLeave);
  };
};

/**
 * Cleanup all ScrollTriggers
 */
export const cleanupScrollTriggers = () => {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
};
