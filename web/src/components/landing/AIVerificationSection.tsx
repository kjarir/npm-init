import { Brain, FileCheck, Image, Code, MessageSquare, BarChart3 } from "lucide-react";

const AIVerificationSection = () => {
  return (
    <section id="verification" className="editorial-section">
      <div className="container-editorial">
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <div className="label-mono text-accent mb-4">AI-Based Work Verification</div>
          <h2 className="headline-lg mb-6">
            AI reviews every submission.
            <br />
            <span className="text-muted-foreground">Objectively. Instantly.</span>
          </h2>
          <p className="body-lg text-muted-foreground">
            Our AI analyzes deliverables against milestone requirements. It checks completeness, 
            quality, and alignment with specifications. No bias, no delays, no human error.
          </p>
        </div>

        {/* Verification Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VerificationCard
            icon={Image}
            title="Design Files"
            description="Analyzes mockups, wireframes, and prototypes against specifications"
            checks={["Resolution & format", "Brand compliance", "Component coverage", "Accessibility"]}
          />
          <VerificationCard
            icon={Code}
            title="Code Deliverables"
            description="Reviews code quality, test coverage, and functionality requirements"
            checks={["Test pass rate", "Code standards", "Feature completion", "Documentation"]}
          />
          <VerificationCard
            icon={FileCheck}
            title="Documents"
            description="Validates reports, content, and documentation completeness"
            checks={["Word count", "Format compliance", "Reference accuracy", "Plagiarism check"]}
          />
        </div>

        {/* Verification Demo */}
        <div className="mt-16 bg-secondary border-3 border-foreground brutal-shadow-lg p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - Submission */}
            <div>
              <div className="label-mono text-muted-foreground mb-4">Submitted Deliverable</div>
              <div className="bg-background border-3 border-foreground p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent flex items-center justify-center">
                    <Image className="text-accent-foreground" size={24} />
                  </div>
                  <div>
                    <div className="font-display font-bold">product-page-v2.fig</div>
                    <div className="text-sm text-muted-foreground">Figma Design File • 24.5 MB</div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded</span>
                    <span>2 minutes ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Milestone</span>
                    <span>Product Page Design</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - AI Analysis */}
            <div>
              <div className="label-mono text-muted-foreground mb-4">AI Verification Result</div>
              <div className="bg-background border-3 border-foreground p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-success flex items-center justify-center">
                    <Brain className="text-success-foreground" size={24} />
                  </div>
                  <div>
                    <div className="font-display font-bold text-success">Verification Passed</div>
                    <div className="text-sm text-muted-foreground">All requirements met</div>
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-3">
                  <ScoreBar label="Completeness" score={98} />
                  <ScoreBar label="Quality" score={95} />
                  <ScoreBar label="Specification Match" score={97} />
                  <ScoreBar label="File Integrity" score={100} />
                </div>

                <div className="mt-6 pt-4 border-t-3 border-foreground flex justify-between items-center">
                  <span className="font-display font-bold">Overall Score</span>
                  <span className="font-display font-bold text-2xl text-success">97.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface VerificationCardProps {
  icon: any;
  title: string;
  description: string;
  checks: string[];
}

const VerificationCard = ({ icon: Icon, title, description, checks }: VerificationCardProps) => (
  <div className="bg-background border-3 border-foreground brutal-shadow p-6 h-full flex flex-col">
    <div className="w-14 h-14 bg-accent flex items-center justify-center mb-6">
      <Icon className="text-accent-foreground" size={28} />
    </div>
    <h3 className="font-display font-bold text-xl mb-3">{title}</h3>
    <p className="text-muted-foreground mb-6">{description}</p>
    <div className="mt-auto space-y-2">
      {checks.map((check) => (
        <div key={check} className="flex items-center gap-2 text-sm">
          <div className="w-4 h-4 bg-success/20 flex items-center justify-center">
            <span className="text-success text-xs">✓</span>
          </div>
          <span>{check}</span>
        </div>
      ))}
    </div>
  </div>
);

const ScoreBar = ({ label, score }: { label: string; score: number }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span>{label}</span>
      <span className="font-display font-bold">{score}%</span>
    </div>
    <div className="h-2 bg-muted border border-foreground">
      <div 
        className="h-full bg-success transition-all duration-500"
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

export default AIVerificationSection;
