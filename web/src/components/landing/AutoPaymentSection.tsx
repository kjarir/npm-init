import { Zap, ArrowRight, Shield, Clock } from "lucide-react";

const AutoPaymentSection = () => {
  return (
    <section className="editorial-section bg-primary text-primary-foreground">
      <div className="container-editorial">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Visual - Payment Flow */}
          <div className="order-2 lg:order-1">
            <div className="bg-primary-foreground text-foreground border-3 border-foreground brutal-shadow-lg p-8">
              <div className="label-mono text-muted-foreground mb-6">Payment Rule Engine</div>
              
              {/* Rule Cards */}
              <div className="space-y-4">
                <RuleCard 
                  condition="IF milestone deliverables submitted"
                  action="THEN trigger AI verification"
                  status="passed"
                />
                <RuleCard 
                  condition="IF verification score ≥ 95%"
                  action="THEN release payment instantly"
                  status="passed"
                />
                <RuleCard 
                  condition="IF client doesn't respond in 72h"
                  action="THEN auto-approve submission"
                  status="pending"
                />
                <RuleCard 
                  condition="IF dispute raised"
                  action="THEN freeze funds, start resolution"
                  status="inactive"
                />
              </div>

              {/* Result */}
              <div className="mt-6 pt-6 border-t-3 border-foreground flex items-center justify-between">
                <span className="font-display font-bold">Payment Released</span>
                <div className="flex items-center gap-2">
                  <Zap className="text-success" size={20} />
                  <span className="font-display font-bold text-success text-xl">$3,500</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="order-1 lg:order-2 space-y-8">
            <div className="label-mono text-accent">Automatic Payment by Rules</div>
            <h2 className="headline-lg">
              Payments happen
              <span className="text-accent"> automatically.</span>
              <br />
              No approvals needed.
            </h2>
            <p className="body-lg text-primary-foreground/70">
              Smart contracts execute payments based on predefined rules. When conditions are met, 
              money moves. No delays, no disputes, no chasing invoices.
            </p>

            <div className="space-y-4">
              <BenefitItem 
                icon={Zap} 
                title="Instant Release" 
                description="Payment triggers the moment conditions are verified" 
              />
              <BenefitItem 
                icon={Shield} 
                title="Tamper-Proof" 
                description="Rules are locked in the contract, can't be changed unilaterally" 
              />
              <BenefitItem 
                icon={Clock} 
                title="Timeout Protection" 
                description="If client ghosts, freelancer still gets paid automatically" 
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface RuleCardProps {
  condition: string;
  action: string;
  status: "passed" | "pending" | "inactive";
}

const RuleCard = ({ condition, action, status }: RuleCardProps) => {
  const statusStyles = {
    passed: "border-success bg-success/10",
    pending: "border-warning bg-warning/10",
    inactive: "border-muted bg-muted",
  };

  const statusIcons = {
    passed: "✓",
    pending: "○",
    inactive: "—",
  };

  return (
    <div className={`border-3 ${statusStyles[status]} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 flex items-center justify-center font-bold ${status === "passed" ? "text-success" : status === "pending" ? "text-warning" : "text-muted-foreground"}`}>
          {statusIcons[status]}
        </div>
        <div className="flex-1">
          <div className="font-mono text-sm text-muted-foreground">{condition}</div>
          <div className="flex items-center gap-2 mt-1">
            <ArrowRight size={14} className="text-accent" />
            <div className="font-display font-semibold text-sm">{action}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BenefitItem = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <div className="flex items-start gap-4">
    <div className="w-12 h-12 bg-accent flex items-center justify-center flex-shrink-0">
      <Icon className="text-accent-foreground" size={24} />
    </div>
    <div>
      <div className="font-display font-bold text-lg">{title}</div>
      <div className="text-primary-foreground/70">{description}</div>
    </div>
  </div>
);

export default AutoPaymentSection;
