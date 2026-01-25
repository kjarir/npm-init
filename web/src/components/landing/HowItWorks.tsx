import { FileText, Lock, CheckCircle, Wallet, ArrowDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { fadeInOnScroll, staggerFadeIn, textReveal } from "@/lib/animations";

const HowItWorks = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headerRef.current) {
      textReveal(headerRef.current, { once: true });
    }
    if (stepsRef.current) {
      staggerFadeIn(stepsRef.current.children, { 
        y: 50, 
        stagger: 0.15,
        once: true 
      });
    }
  }, []);

  const steps = [
    {
      number: "01",
      icon: FileText,
      title: "Define Milestones",
      description: "Break your project into clear, measurable milestones. Each milestone has specific deliverables and a budget.",
      visual: "Agreement"
    },
    {
      number: "02",
      icon: Lock,
      title: "Lock Funds",
      description: "Client deposits funds into a secure smart contract. Money is locked but never accessible to anyone until conditions are met.",
      visual: "Escrow"
    },
    {
      number: "03",
      icon: CheckCircle,
      title: "Submit & Verify",
      description: "Freelancer submits proof of work. AI verification checks deliverables against milestone requirements automatically.",
      visual: "Verification"
    },
    {
      number: "04",
      icon: Wallet,
      title: "Auto Release",
      description: "When verification passes, payment releases instantly. No manual approval needed. Fair and automatic.",
      visual: "Payment"
    },
  ];

  return (
    <section id="how-it-works" className="editorial-section bg-secondary">
      <div className="container-editorial">
        {/* Section Header */}
        <div ref={headerRef} className="max-w-3xl mb-20">
          <div className="label-mono text-accent mb-4">How BobPay Works</div>
          <h2 className="headline-lg mb-6">
            From agreement to payment.
            <br />
            <span className="text-muted-foreground">Fully automated.</span>
          </h2>
          <p className="body-lg text-muted-foreground">
            Traditional platforms leave too much to trust. BobPay replaces trust with rules. 
            Every step is verified, every payment is automatic.
          </p>
        </div>

        {/* Steps Grid */}
        <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="bg-background border-3 border-foreground brutal-shadow h-full p-6 flex flex-col">
                {/* Step Number */}
                <div className="w-16 h-16 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-2xl mb-6">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 bg-accent/10 border-3 border-accent flex items-center justify-center mb-4">
                  <step.icon className="text-accent" size={24} />
                </div>

                {/* Content */}
                <h3 className="font-display font-bold text-xl mb-3">{step.title}</h3>
                <p className="text-muted-foreground flex-1">{step.description}</p>

                {/* Visual Label */}
                <div className="mt-6 pt-4 border-t-3 border-foreground">
                  <span className="label-mono text-muted-foreground">{step.visual}</span>
                </div>
              </div>

              {/* Arrow connector (hidden on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <div className="w-6 h-6 bg-accent flex items-center justify-center">
                    <ArrowDown className="text-accent-foreground rotate-[-90deg]" size={16} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
