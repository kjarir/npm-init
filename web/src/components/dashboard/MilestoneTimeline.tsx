import { CheckCircle, Circle, Clock, AlertCircle, Lock } from "lucide-react";

interface Milestone {
  id: string;
  number: number;
  title: string;
  amount: number;
  status: "completed" | "active" | "locked" | "disputed";
  deadline?: string;
  verificationScore?: number;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

const MilestoneTimeline = ({ milestones }: MilestoneTimelineProps) => {
  return (
    <div className="space-y-0">
      {milestones.map((milestone, index) => (
        <div key={milestone.id} className="relative">
          {/* Connector Line */}
          {index < milestones.length - 1 && (
            <div className="absolute left-6 top-16 w-1 h-full bg-border" />
          )}

          <MilestoneItem milestone={milestone} />
        </div>
      ))}
    </div>
  );
};

const MilestoneItem = ({ milestone }: { milestone: Milestone }) => {
  const statusConfig = {
    completed: {
      icon: CheckCircle,
      bg: "bg-success",
      iconColor: "text-success-foreground",
      border: "border-success",
    },
    active: {
      icon: Clock,
      bg: "bg-accent",
      iconColor: "text-accent-foreground",
      border: "border-accent",
    },
    locked: {
      icon: Lock,
      bg: "bg-muted",
      iconColor: "text-muted-foreground",
      border: "border-muted",
    },
    disputed: {
      icon: AlertCircle,
      bg: "bg-destructive",
      iconColor: "text-destructive-foreground",
      border: "border-destructive",
    },
  };

  const config = statusConfig[milestone.status];
  const Icon = config.icon;

  return (
    <div className={`flex gap-4 p-4 border-3 border-foreground ${milestone.status === "active" ? "bg-secondary brutal-shadow" : "bg-background"} mb-4`}>
      {/* Icon */}
      <div className={`w-12 h-12 ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={config.iconColor} size={24} />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="label-mono text-muted-foreground">Milestone {milestone.number}</div>
            <h4 className="font-display font-bold text-lg">{milestone.title}</h4>
          </div>
          <div className="text-right">
            <div className="font-display font-bold text-xl">${milestone.amount.toLocaleString()}</div>
            {milestone.deadline && (
              <div className="text-sm text-muted-foreground">{milestone.deadline}</div>
            )}
          </div>
        </div>

        {/* Verification Score (if completed) */}
        {milestone.status === "completed" && milestone.verificationScore && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <span className="text-sm text-muted-foreground">AI Verification</span>
            <div className="flex-1 h-2 bg-muted border border-foreground">
              <div 
                className="h-full bg-success"
                style={{ width: `${milestone.verificationScore}%` }}
              />
            </div>
            <span className="font-display font-bold text-success">{milestone.verificationScore}%</span>
          </div>
        )}

        {/* Active milestone actions */}
        {milestone.status === "active" && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <span className="text-sm text-accent font-display font-semibold">● Currently in progress</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MilestoneTimeline;
