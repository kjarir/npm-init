import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StatCard from "@/components/dashboard/StatCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Lock, CheckCircle, Plus, Clock, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProjects } from "@/hooks/useProjects";
import { useWallet } from "@/hooks/useWallet";
import { useActivityLog } from "@/hooks/useActivity";
import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { staggerFadeIn, fadeInOnScroll } from "@/lib/animations";

const ClientDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useMyProjects();
  const { data: wallet } = useWallet();
  const { data: activities } = useActivityLog(5);

  // All hooks must be called before any conditional returns
  const statsRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    // Don't redirect - allow users to view the page but show a warning if wrong role
  }, [authLoading, user, navigate]);

  // Animation effects - only run when data is loaded
  useEffect(() => {
    if (authLoading || projectsLoading) return;

    if (statsRef.current) {
      staggerFadeIn(statsRef.current.children, { 
        y: 30, 
        stagger: 0.1,
        once: true 
      });
    }
    if (projectsRef.current) {
      fadeInOnScroll(projectsRef.current, { 
        y: 40,
        once: true 
      });
    }
    if (activityRef.current) {
      fadeInOnScroll(activityRef.current, { 
        y: 40,
        once: true 
      });
    }
  }, [projects, authLoading, projectsLoading]);

  if (authLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const activeProjects = projects?.filter(p => p.status === 'in_progress' || p.status === 'open') || [];
  const completedProjects = projects?.filter(p => p.status === 'completed') || [];
  
  const totalLocked = projects?.reduce((sum, p) => sum + (p.locked_funds || 0), 0) || 0;
  const totalReleased = projects?.reduce((sum, p) => sum + (p.released_funds || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-28 pb-20">
        <div className="container-editorial">
          {/* Warning Banner if wrong role */}
          {user && profile && profile.role !== 'client' && (
            <div className="bg-warning/10 border-3 border-warning p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-warning" size={20} />
                <div>
                  <p className="font-display font-bold text-sm">You're viewing the Client Dashboard</p>
                  <p className="text-xs text-muted-foreground">Your account is registered as a {profile.role}. Switch to your dashboard?</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/freelancer/dashboard')}
              >
                Go to Freelancer Dashboard
              </Button>
            </div>
          )}
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="label-mono text-accent mb-2">Client Dashboard</div>
              <h1 className="headline-md">Welcome back, {profile?.full_name || 'Client'}</h1>
            </div>
            <Link to="/client/create-project">
              <Button variant="hero" size="lg">
                <Plus size={20} />
                Post New Project
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard 
              icon={Briefcase} 
              label="Active Projects" 
              value={String(activeProjects.length)} 
              subtext={`${completedProjects.length} completed`}
            />
            <StatCard 
              icon={Lock} 
              label="Funds Locked" 
              value={`$${totalLocked.toLocaleString()}`} 
              subtext="In escrow"
              variant="warning"
            />
            <StatCard 
              icon={CheckCircle} 
              label="Released" 
              value={`$${totalReleased.toLocaleString()}`} 
              subtext="To freelancers"
              variant="success"
            />
            <StatCard 
              icon={DollarSign} 
              label="Available" 
              value={`$${(wallet?.available_balance || 0).toLocaleString()}`} 
              subtext="In wallet"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8 flex gap-4">
            <Link to="/client/freelancers">
              <Button variant="outline" size="sm">
                Browse Freelancers
              </Button>
            </Link>
            <Link to="/disputes">
              <Button variant="outline" size="sm">
                View Disputes
              </Button>
            </Link>
          </div>

          {/* Projects Section */}
          <div ref={projectsRef} className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-2xl">Your Projects</h2>
            </div>

            {projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.slice(0, 4).map((project) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    title={project.title}
                    freelancer={project.freelancer?.full_name || 'No freelancer yet'}
                    budget={project.total_budget}
                    milestonesTotal={project.milestones?.length || 0}
                    milestonesCompleted={project.milestones?.filter(m => m.status === 'completed').length || 0}
                    status={project.status === 'in_progress' ? 'active' : project.status === 'completed' ? 'completed' : 'pending'}
                    deadline={project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                    linkPrefix="/client"
                  />
                ))}
              </div>
            ) : (
              <div className="bg-secondary border-3 border-foreground brutal-shadow p-12 text-center">
                <Briefcase className="mx-auto mb-4 text-muted-foreground" size={48} />
                <h3 className="font-display font-bold text-xl mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-6">Create your first project to get started</p>
                <Link to="/client/create-project">
                  <Button variant="accent">
                    <Plus size={18} />
                    Create Project
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div ref={activityRef} className="bg-secondary border-3 border-foreground brutal-shadow p-6">
            <h3 className="font-display font-bold text-xl mb-6">Recent Activity</h3>
            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <ActivityItem 
                    key={activity.id}
                    icon={getActivityIcon(activity.action_type)}
                    iconBg={getActivityIconBg(activity.action_type)}
                    title={activity.title}
                    description={activity.description || ''}
                    project={activity.project?.title || ''}
                    projectId={activity.project_id}
                    amount={activity.amount ? `$${activity.amount.toLocaleString()}` : undefined}
                    time={formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const getActivityIcon = (actionType: string) => {
  switch (actionType) {
    case 'milestone_completed': return CheckCircle;
    case 'project_created': return Plus;
    case 'dispute_raised': return AlertTriangle;
    default: return Clock;
  }
};

const getActivityIconBg = (actionType: string) => {
  switch (actionType) {
    case 'milestone_completed': return 'bg-success';
    case 'project_created': return 'bg-accent';
    case 'dispute_raised': return 'bg-destructive';
    default: return 'bg-warning';
  }
};

interface ActivityItemProps {
  icon: any;
  iconBg: string;
  title: string;
  description: string;
  project: string;
  projectId?: string;
  amount?: string;
  time: string;
}

interface ActivityItemPropsWithProjectId extends ActivityItemProps {
  projectId?: string;
}

const ActivityItem = ({ icon: Icon, iconBg, title, description, project, projectId, amount, time }: ActivityItemPropsWithProjectId) => {
  const content = (
    <div className="flex gap-4 p-4 bg-background border-3 border-foreground">
      <div className={`w-10 h-10 ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display font-bold">{title}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
            {project && <div className="text-xs text-accent mt-1">{project}</div>}
          </div>
          <div className="text-right flex-shrink-0">
            {amount && <div className="font-display font-bold text-success">{amount}</div>}
            <div className="text-xs text-muted-foreground">{time}</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (projectId) {
    return (
      <Link to={`/client/project/${projectId}`}>
        {content}
      </Link>
    );
  }

  return content;
};

export default ClientDashboard;
