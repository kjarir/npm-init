import { useEffect, useRef, ReactNode } from "react";
import { staggerFadeIn } from "@/lib/animations";

interface StaggerContainerProps {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  duration?: number;
  y?: number;
  once?: boolean;
  className?: string;
}

export const StaggerContainer = ({
  children,
  stagger = 0.1,
  delay = 0,
  duration = 0.8,
  y = 30,
  once = true,
  className = "",
}: StaggerContainerProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    staggerFadeIn(ref.current.children, {
      stagger,
      delay,
      duration,
      y,
      once,
    });
  }, [stagger, delay, duration, y, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
