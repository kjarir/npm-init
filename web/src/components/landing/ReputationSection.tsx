import { Star, TrendingUp, Shield, Award, CheckCircle, Clock, Handshake } from "lucide-react";

const ReputationSection = () => {
  return (
    <section id="reputation" className="editorial-section bg-primary text-primary-foreground">
      <div className="container-editorial">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="label-mono text-accent">Transparent Reputation</div>
            <h2 className="headline-lg">
              Reputation built on
              <span className="text-accent"> real work.</span>
              <br />
              Not reviews.
            </h2>
            <p className="body-lg text-primary-foreground/70">
              Traditional platforms let anyone write reviews. BobPay reputation comes from verified 
              milestone completions, fair behavior, and on-time deliveries. Trust is earned, not gamed.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <ReputationMetric icon={CheckCircle} label="Milestones Completed" value="47" />
              <ReputationMetric icon={TrendingUp} label="Success Rate" value="98%" />
              <ReputationMetric icon={Clock} label="On-Time Rate" value="95%" />
              <ReputationMetric icon={Handshake} label="Fair Exits" value="2" />
            </div>
          </div>

          {/* Right Visual - Profile Card */}
          <div className="bg-primary-foreground text-foreground border-3 border-foreground brutal-shadow-lg p-8">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-20 h-20 bg-accent flex items-center justify-center text-accent-foreground font-display font-bold text-3xl">
                SM
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-2xl">Sarah Martinez</div>
                <div className="text-muted-foreground">Full-Stack Developer</div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="text-warning fill-warning" size={16} />
                    ))}
                  </div>
                  <span className="font-display font-bold">4.9</span>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              <TrustBadge icon={Shield} label="Verified Identity" />
              <TrustBadge icon={Award} label="Top 10%" />
              <TrustBadge icon={CheckCircle} label="100% Fair" />
            </div>

            {/* Stats */}
            <div className="space-y-4">
              <StatBar label="Milestones Completed" value={47} max={50} />
              <StatBar label="Verification Pass Rate" value={98} max={100} />
              <StatBar label="Client Satisfaction" value={96} max={100} />
            </div>

            {/* Recent Work */}
            <div className="mt-6 pt-6 border-t-3 border-foreground">
              <div className="label-mono text-muted-foreground mb-4">Recent Verified Work</div>
              <div className="space-y-3">
                <RecentWork title="E-commerce Platform" amount="$12,500" milestones={5} />
                <RecentWork title="Mobile App MVP" amount="$8,000" milestones={3} />
                <RecentWork title="API Integration" amount="$3,200" milestones={2} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ReputationMetric = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="bg-primary-foreground/10 border border-primary-foreground/20 p-4">
    <Icon className="text-accent mb-2" size={24} />
    <div className="font-display font-bold text-2xl">{value}</div>
    <div className="text-sm text-primary-foreground/70">{label}</div>
  </div>
);

const TrustBadge = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 bg-success/10 text-success px-3 py-1 border border-success">
    <Icon size={14} />
    <span className="text-xs font-display font-bold uppercase">{label}</span>
  </div>
);

const StatBar = ({ label, value, max }: { label: string; value: number; max: number }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display font-bold">{value}</span>
    </div>
    <div className="h-3 bg-muted border-3 border-foreground">
      <div 
        className="h-full bg-accent transition-all duration-500"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  </div>
);

const RecentWork = ({ title, amount, milestones }: { title: string; amount: string; milestones: number }) => (
  <div className="flex items-center justify-between p-3 bg-secondary border-3 border-foreground">
    <div>
      <div className="font-display font-bold">{title}</div>
      <div className="text-sm text-muted-foreground">{milestones} milestones</div>
    </div>
    <div className="font-display font-bold text-success">{amount}</div>
  </div>
);

export default ReputationSection;
