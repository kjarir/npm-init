import { Link } from "react-router-dom";
import { Clock, DollarSign, User, CheckCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { hoverScale } from "@/lib/animations";

interface ProjectCardProps {
  id: string;
  title: string;
  client?: string;
  freelancer?: string;
  budget: number;
  milestonesTotal: number;
  milestonesCompleted: number;
  status: "active" | "pending" | "completed" | "disputed";
  deadline?: string;
  linkPrefix: string;
}

const ProjectCard = ({
  id,
  title,
  client,
  freelancer,
  budget,
  milestonesTotal,
  milestonesCompleted,
  status,
  deadline,
  linkPrefix,
}: ProjectCardProps) => {
  const statusStyles = {
    active: "bg-accent text-accent-foreground",
    pending: "bg-warning text-warning-foreground",
    completed: "bg-success text-success-foreground",
    disputed: "bg-destructive text-destructive-foreground",
  };

  const statusLabels = {
    active: "In Progress",
    pending: "Pending",
    completed: "Completed",
    disputed: "Disputed",
  };

  const progress = (milestonesCompleted / milestonesTotal) * 100;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      return hoverScale(cardRef.current, 1.02);
    }
  }, []);

  return (
    <Link to={`${linkPrefix}/project/${id}`}>
      <div 
        ref={cardRef}
        className="bg-background border-3 border-foreground brutal-shadow p-6 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all h-full"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-display font-bold text-lg">{title}</h3>
          <span className={`px-2 py-1 ${statusStyles[status]} text-xs font-display uppercase tracking-wider`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Person */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <User size={16} />
          <span>{client || freelancer}</span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Milestones</span>
            <span className="font-display font-bold">{milestonesCompleted}/{milestonesTotal}</span>
          </div>
          <div className="h-3 bg-muted border-3 border-foreground">
            <div 
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t-3 border-foreground">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-success" />
            <span className="font-display font-bold">${budget.toLocaleString()}</span>
          </div>
          {deadline && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={14} />
              <span>{deadline}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
