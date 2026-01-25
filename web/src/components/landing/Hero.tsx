import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Lock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { fadeIn, staggerFadeIn, scaleIn } from "@/lib/animations";

const Hero = () => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const trustIndicatorsRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial page load animations
    fadeIn(badgeRef.current, { delay: 0.2, y: 20 });
    fadeIn(headingRef.current, { delay: 0.4, y: 30 });
    fadeIn(textRef.current, { delay: 0.6, y: 20 });
    fadeIn(buttonsRef.current, { delay: 0.8, y: 20 });
    staggerFadeIn(trustIndicatorsRef.current?.children || [], { delay: 1, y: 20 });
    scaleIn(visualRef.current, { delay: 0.5 });
  }, []);

  return (
    <section className="min-h-screen flex items-center pt-20 bg-background">
      <div className="container-editorial">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div 
              ref={badgeRef}
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary border-3 border-foreground brutal-shadow-sm"
            >
              <span className="label-mono text-foreground">The Fair Work Protocol</span>
            </div>

            <h1 ref={headingRef} className="headline-xl">
              Work agreed.
              <br />
              <span className="text-accent">Money locked.</span>
              <br />
              Payments automatic.
            </h1>

            <p ref={textRef} className="body-lg text-muted-foreground max-w-lg">
              BobPay splits every project into milestones. Funds are locked upfront. 
              Payments release automatically when rules are met. No middlemen. No disputes. Just fair work.
            </p>

            <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4">
              <Link to="/client/dashboard">
                <Button variant="hero" size="xl">
                  Start as Client
                  <ArrowRight className="ml-2" />
                </Button>
              </Link>
              <Link to="/freelancer/dashboard">
                <Button variant="outline" size="xl">
                  Join as Freelancer
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div ref={trustIndicatorsRef} className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-success border-3 border-foreground flex items-center justify-center">
                  <Shield size={20} className="text-success-foreground" />
                </div>
                <span className="font-display text-sm">Blockchain-Secured</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-warning border-3 border-foreground flex items-center justify-center">
                  <Lock size={20} className="text-warning-foreground" />
                </div>
                <span className="font-display text-sm">Funds Locked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-accent border-3 border-foreground flex items-center justify-center">
                  <Zap size={20} className="text-accent-foreground" />
                </div>
                <span className="font-display text-sm">AI Verified</span>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div ref={visualRef} className="relative">
            <div className="bg-secondary border-3 border-foreground brutal-shadow-lg p-8">
              {/* Milestone Flow Diagram */}
              <div className="space-y-6">
                <div className="label-mono text-muted-foreground">Live Project Flow</div>
                
                {/* Milestone Steps */}
                <div className="space-y-4">
                  <MilestoneStep 
                    number="01" 
                    title="Design Phase" 
                    amount="$2,500" 
                    status="completed"
                  />
                  <MilestoneStep 
                    number="02" 
                    title="Development" 
                    amount="$5,000" 
                    status="active"
                  />
                  <MilestoneStep 
                    number="03" 
                    title="Testing & Launch" 
                    amount="$2,500" 
                    status="locked"
                  />
                </div>

                {/* Total */}
                <div className="border-t-3 border-foreground pt-4 flex justify-between items-center">
                  <span className="font-display font-bold">Total Locked</span>
                  <span className="font-display font-bold text-2xl">$10,000</span>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-accent border-3 border-foreground brutal-shadow px-4 py-2">
              <span className="font-display font-bold text-accent-foreground">100% Protected</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface MilestoneStepProps {
  number: string;
  title: string;
  amount: string;
  status: "completed" | "active" | "locked";
}

const MilestoneStep = ({ number, title, amount, status }: MilestoneStepProps) => {
  const statusStyles = {
    completed: "bg-success text-success-foreground",
    active: "bg-accent text-accent-foreground",
    locked: "bg-muted text-muted-foreground",
  };

  const statusLabels = {
    completed: "Released",
    active: "In Progress",
    locked: "Locked",
  };

  return (
    <div className={`flex items-center gap-4 p-4 border-3 border-foreground ${status === "active" ? "bg-background brutal-shadow" : "bg-background"}`}>
      <div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold">
        {number}
      </div>
      <div className="flex-1">
        <div className="font-display font-bold">{title}</div>
        <div className="text-sm text-muted-foreground">{amount}</div>
      </div>
      <div className={`px-3 py-1 ${statusStyles[status]} font-display text-xs uppercase tracking-wider`}>
        {statusLabels[status]}
      </div>
    </div>
  );
};

export default Hero;
