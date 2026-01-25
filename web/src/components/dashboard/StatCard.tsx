import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "success" | "warning" | "accent";
}

const StatCard = ({ icon: Icon, label, value, subtext, variant = "default" }: StatCardProps) => {
  const variants = {
    default: "bg-background",
    success: "bg-success/10 border-success",
    warning: "bg-warning/10 border-warning",
    accent: "bg-accent/10 border-accent",
  };

  const iconVariants = {
    default: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    accent: "bg-accent text-accent-foreground",
  };

  return (
    <div className={`border-3 border-foreground brutal-shadow p-6 ${variants[variant]}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${iconVariants[variant]} flex items-center justify-center`}>
          <Icon size={24} />
        </div>
        <div className="label-mono text-muted-foreground">{label}</div>
      </div>
      <div className="font-display font-bold text-3xl">{value}</div>
      {subtext && <div className="text-sm text-muted-foreground mt-1">{subtext}</div>}
    </div>
  );
};

export default StatCard;
