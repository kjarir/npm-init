import { UserMinus, UserPlus, ArrowRight, RefreshCw, CheckCircle } from "lucide-react";

const FairExitSection = () => {
  return (
    <section className="editorial-section">
      <div className="container-editorial">
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <div className="label-mono text-accent mb-4">Fair Exit and Replacement</div>
          <h2 className="headline-lg mb-6">
            Life happens.
            <br />
            <span className="text-muted-foreground">Projects don't have to stop.</span>
          </h2>
          <p className="body-lg text-muted-foreground">
            When a freelancer needs to exit mid-project, BobPay handles it gracefully. 
            Work is preserved, funds are protected, and a replacement can continue from the exact same milestone.
          </p>
        </div>

        {/* Exit Flow Visualization */}
        <div className="bg-secondary border-3 border-foreground brutal-shadow-lg p-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            {/* Step 1 - Exit Request */}
            <div className="bg-background border-3 border-foreground p-6 text-center">
              <div className="w-14 h-14 bg-warning mx-auto mb-4 flex items-center justify-center">
                <UserMinus className="text-warning-foreground" size={28} />
              </div>
              <div className="font-display font-bold mb-2">Exit Request</div>
              <div className="text-sm text-muted-foreground">Freelancer initiates fair exit</div>
            </div>

            <ArrowRight className="hidden lg:block text-accent mx-auto" size={32} />

            {/* Step 2 - Work Preserved */}
            <div className="bg-background border-3 border-foreground p-6 text-center">
              <div className="w-14 h-14 bg-success mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="text-success-foreground" size={28} />
              </div>
              <div className="font-display font-bold mb-2">Work Preserved</div>
              <div className="text-sm text-muted-foreground">All completed work saved on-chain</div>
            </div>

            <ArrowRight className="hidden lg:block text-accent mx-auto" size={32} />

            {/* Step 3 - Replacement Joins */}
            <div className="bg-background border-3 border-foreground p-6 text-center">
              <div className="w-14 h-14 bg-accent mx-auto mb-4 flex items-center justify-center">
                <UserPlus className="text-accent-foreground" size={28} />
              </div>
              <div className="font-display font-bold mb-2">Replacement Joins</div>
              <div className="text-sm text-muted-foreground">New freelancer continues from same point</div>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <BenefitCard
            title="For Freelancers"
            points={[
              "Exit without penalty if done fairly",
              "Keep reputation for completed milestones",
              "Get paid for verified work",
              "No hostage situations"
            ]}
          />
          <BenefitCard
            title="For Clients"
            points={[
              "Project continues without restart",
              "All previous work preserved",
              "No additional cost for transition",
              "New freelancer sees full context"
            ]}
          />
          <BenefitCard
            title="For the Project"
            points={[
              "Seamless continuity",
              "No lost progress",
              "History fully documented",
              "Deadline adjustments automatic"
            ]}
          />
        </div>
      </div>
    </section>
  );
};

const BenefitCard = ({ title, points }: { title: string; points: string[] }) => (
  <div className="bg-background border-3 border-foreground brutal-shadow p-6">
    <h3 className="font-display font-bold text-xl mb-4">{title}</h3>
    <ul className="space-y-3">
      {points.map((point) => (
        <li key={point} className="flex items-start gap-2">
          <CheckCircle className="text-success mt-0.5 flex-shrink-0" size={18} />
          <span className="text-muted-foreground">{point}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default FairExitSection;
