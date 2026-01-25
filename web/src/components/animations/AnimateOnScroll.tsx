import { useEffect, useRef, ReactNode } from "react";
import { fadeInOnScroll, slideIn, scaleIn, textReveal } from "@/lib/animations";

interface AnimateOnScrollProps {
  children: ReactNode;
  animation?: "fadeIn" | "slideLeft" | "slideRight" | "slideUp" | "slideDown" | "scale" | "textReveal";
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
}

export const AnimateOnScroll = ({
  children,
  animation = "fadeIn",
  delay = 0,
  duration = 0.8,
  once = true,
  className = "",
}: AnimateOnScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    switch (animation) {
      case "fadeIn":
        fadeInOnScroll(ref.current, { delay, duration, once });
        break;
      case "slideLeft":
        slideIn(ref.current, "left", { delay, duration, once });
        break;
      case "slideRight":
        slideIn(ref.current, "right", { delay, duration, once });
        break;
      case "slideUp":
        slideIn(ref.current, "up", { delay, duration, once });
        break;
      case "slideDown":
        slideIn(ref.current, "down", { delay, duration, once });
        break;
      case "scale":
        scaleIn(ref.current, { delay, duration, once });
        break;
      case "textReveal":
        textReveal(ref.current, { delay, duration, once });
        break;
    }
  }, [animation, delay, duration, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
