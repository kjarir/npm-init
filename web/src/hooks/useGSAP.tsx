import { useEffect, useRef, RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Hook for GSAP animations with auto cleanup
 */
export const useGSAP = (
  callback: (context: gsap.Context) => void,
  dependencies: React.DependencyList = []
) => {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      callback(ctx);
    }, scope);

    return () => {
      ctx.revert();
    };
  }, dependencies);

  return scope;
};

/**
 * Hook for creating refs with GSAP animations
 */
export const useGSAPRef = <T extends HTMLElement = HTMLDivElement>() => {
  const ref = useRef<T>(null);

  return ref;
};

/**
 * Hook for scroll-triggered animations
 */
export const useScrollAnimation = (
  ref: RefObject<HTMLElement>,
  animation: () => gsap.core.Tween | gsap.core.Timeline | undefined,
  dependencies: React.DependencyList = []
) => {
  useEffect(() => {
    if (!ref.current) return;

    const anim = animation();

    return () => {
      if (anim) {
        anim.kill();
      }
    };
  }, [ref, ...dependencies]);
};
