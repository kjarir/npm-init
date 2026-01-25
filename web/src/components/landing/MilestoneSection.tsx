import { Target, Clock, DollarSign, CheckSquare } from "lucide-react";
import { useEffect, useRef } from "react";
import { slideIn, staggerFadeIn, fadeInOnScroll } from "@/lib/animations";

const MilestoneSection = () => {
  const leftContentRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leftContentRef.current) {
      slideIn(leftContentRef.current, "left", { once: true });
    }
    if (featuresRef.current) {
      staggerFadeIn(featuresRef.current.children, { 
        y: 30, 
        stagger: 0.1,
        once: true 
      });
    }
    if (visualRef.current) {
      slideIn(visualRef.current, "right", { once: true });
    }
  }, []);

  return (
    <section id="milestones" className="editorial-section">
      <div className="container-editorial">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div ref={leftContentRef} className="space-y-8">
            <div className="label-mono text-accent">Milestone-Based Agreements</div>
            <h2 className="headline-lg">
              Every project is a series of
              <span className="text-accent"> clear commitments.</span>
            </h2>
            <p className="body-lg text-muted-foreground">
              No more vague scopes or endless negotiations. Define exactly what needs to be delivered, 
              when it's due, and how much it costs. Both parties agree before work begins.
            </p>

            <div ref={featuresRef} className="grid grid-cols-2 gap-4">
              <FeatureCard icon={Target} title="Clear Scope" description="Specific deliverables for each milestone" />
              <FeatureCard icon={Clock} title="Time Bound" description="Deadlines that protect both parties" />
              <FeatureCard icon={DollarSign} title="Fixed Price" description="Budget locked before work starts" />
              <FeatureCard icon={CheckSquare} title="Verifiable" description="Success criteria defined upfront" />
            </div>
          </div>

          {/* Right Visual - Milestone Example */}
          <div ref={visualRef} className="bg-primary text-primary-foreground border-3 border-foreground brutal-shadow-lg p-8">
            <div className="label-mono text-primary-foreground/70 mb-6">Example Milestone</div>
            
            <div className="space-y-6">
              <div>
                <div className="text-sm text-primary-foreground/50 uppercase tracking-wider mb-2">Project</div>
                <div className="font-display font-bold text-2xl">E-Commerce Redesign</div>
              </div>

              <div className="border-t border-primary-foreground/20 pt-6">
                <div className="text-sm text-primary-foreground/50 uppercase tracking-wider mb-2">Milestone 2 of 4</div>
                <div className="font-display font-bold text-xl mb-4">Product Page Design</div>
                
                <div className="space-y-3">
                  <CheckItem text="Desktop and mobile mockups" />
                  <CheckItem text="Interactive prototype in Figma" />
                  <CheckItem text="Design system components" />
                  <CheckItem text="Developer handoff notes" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-primary-foreground/20 pt-6">
                <div>
                  <div className="text-sm text-primary-foreground/50 uppercase tracking-wider mb-1">Budget</div>
                  <div className="font-display font-bold text-2xl">$3,500</div>
                </div>
                <div>
                  <div className="text-sm text-primary-foreground/50 uppercase tracking-wider mb-1">Deadline</div>
                  <div className="font-display font-bold text-2xl">14 Days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <div className="bg-secondary border-3 border-foreground p-4">
    <Icon className="text-accent mb-3" size={24} />
    <div className="font-display font-bold mb-1">{title}</div>
    <div className="text-sm text-muted-foreground">{description}</div>
  </div>
);

const CheckItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-5 h-5 bg-accent flex items-center justify-center flex-shrink-0">
      <CheckSquare size={14} className="text-accent-foreground" />
    </div>
    <span className="text-primary-foreground/80">{text}</span>
  </div>
);

export default MilestoneSection;
