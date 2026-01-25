import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StatCard from "@/components/dashboard/StatCard";
import ProjectCard from "@/components/dashboard/ProjectCard";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, TrendingUp, Clock, Search, Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProjects, useProjects } from "@/hooks/useProjects";
import { useWallet } from "@/hooks/useWallet";
import { useEffect } from "react";

const FreelancerDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: myProjects, isLoading: myProjectsLoading } = useMyProjects();
  const { data: openProjects } = useProjects('open');
  const { data: wallet } = useWallet();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    // Don't redirect - allow users to view the page but show a warning if wrong role
  }, [authLoading, user, navigate]);

  if (authLoading || myProjectsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const activeProjects = myProjects?.filter(p => p.status === 'in_progress') || [];
  const pendingMilestones = activeProjects.reduce((sum, p) => 
    sum + (p.milestones?.filter(m => m.status === 'active' || m.status === 'locked').length || 0), 0
  );
  const earnedThisMonth = profile?.total_earned || 0;
  const pendingPayout = wallet?.pending_release || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-28 pb-20">
        <div className="container-editorial">
          {/* Warning Banner if wrong role */}
          {user && profile && profile.role !== 'freelancer' && (
            <div className="bg-warning/10 border-3 border-warning p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-warning" size={20} />
                <div>
                  <p className="font-display font-bold text-sm">You're viewing the Freelancer Dashboard</p>
                  <p className="text-xs text-muted-foreground">Your account is registered as a {profile.role}. Switch to your dashboard?</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/client/dashboard')}
              >
                Go to Client Dashboard
              </Button>
            </div>
          )}
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="label-mono text-accent mb-2">Freelancer Dashboard</div>
              <h1 className="headline-md">Welcome back, {profile?.full_name || 'Freelancer'}</h1>
            </div>
            <Link to="/freelancer/projects">
              <Button variant="hero" size="lg">
                <Search size={20} />
                Browse Projects
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard 
              icon={Briefcase} 
              label="Active Projects" 
              value={String(activeProjects.length)} 
              subtext={`${pendingMilestones} milestones remaining`}
            />
            <StatCard 
              icon={DollarSign} 
              label="Pending Payout" 
              value={`$${pendingPayout.toLocaleString()}`} 
              subtext="After verification"
              variant="warning"
            />
            <StatCard 
              icon={TrendingUp} 
              label="Total Earned" 
              value={`$${earnedThisMonth.toLocaleString()}`} 
              subtext="All time"
              variant="success"
            />
            <StatCard 
              icon={Star} 
              label="Success Rate" 
              value={`${profile?.success_rate || 100}%`} 
              subtext={`${profile?.milestones_completed || 0} milestones completed`}
              variant="accent"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Projects */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-2xl">Your Active Projects</h2>
                <span className="text-muted-foreground text-sm">{activeProjects.length} projects</span>
              </div>

              {activeProjects.length > 0 ? (
                <div className="space-y-6">
                  {activeProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      id={project.id}
                      title={project.title}
                      client={project.client?.full_name || 'Client'}
                      budget={project.total_budget}
                      milestonesTotal={project.milestones?.length || 0}
                      milestonesCompleted={project.milestones?.filter(m => m.status === 'completed').length || 0}
                      status="active"
                      deadline={project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                      linkPrefix="/freelancer"
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-secondary border-3 border-foreground brutal-shadow p-8 text-center">
                  <Briefcase className="mx-auto mb-4 text-muted-foreground" size={40} />
                  <p className="text-muted-foreground">No active projects yet</p>
                  <Link to="/freelancer/projects">
                    <Button variant="accent" size="sm" className="mt-4">
                      Find Projects
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Recommended Projects */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-2xl">Available Projects</h2>
                <Link to="/freelancer/projects" className="text-accent font-display font-semibold hover:underline">
                  View All →
                </Link>
              </div>

              {openProjects && openProjects.length > 0 ? (
                <div className="space-y-6">
                  {openProjects.slice(0, 3).map((project) => (
                    <div key={project.id} className="bg-background border-3 border-foreground brutal-shadow p-6 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-display font-bold text-lg">{project.title}</h3>
                          <div className="text-sm text-muted-foreground">{project.client?.full_name || 'Client'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display font-bold text-xl">${project.total_budget.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{project.milestones?.length || 0} milestones</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.skills_required?.slice(0, 3).map((skill) => (
                          <span key={skill} className="text-xs border-2 border-foreground px-2 py-1 font-display">
                            {skill}
                          </span>
                        ))}
                      </div>

                      <Link to={`/freelancer/project/${project.id}`}>
                        <Button variant="accent" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-secondary border-3 border-foreground brutal-shadow p-8 text-center">
                  <Search className="mx-auto mb-4 text-muted-foreground" size={40} />
                  <p className="text-muted-foreground">No open projects available</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Actions */}
          <div className="mt-12 bg-secondary border-3 border-foreground brutal-shadow p-6">
            <h3 className="font-display font-bold text-xl mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/freelancer/projects">
                <ActionItem 
                  icon={Search}
                  iconBg="bg-accent"
                  title="Browse Projects"
                  description="Find new projects matching your skills"
                />
              </Link>
              <Link to="/wallet">
                <ActionItem 
                  icon={DollarSign}
                  iconBg="bg-success"
                  title="View Wallet"
                  description="Check your earnings and withdraw funds"
                />
              </Link>
              <Link to="/disputes">
                <ActionItem 
                  icon={AlertCircle}
                  iconBg="bg-warning"
                  title="Dispute Center"
                  description="View or raise project disputes"
                />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

interface ActionItemProps {
  icon: any;
  iconBg: string;
  title: string;
  description: string;
}

const ActionItem = ({ icon: Icon, iconBg, title, description }: ActionItemProps) => (
  <div className="flex items-center gap-4 p-4 bg-background border-3 border-foreground hover:bg-secondary transition-colors">
    <div className={`w-12 h-12 ${iconBg} flex items-center justify-center flex-shrink-0`}>
      <Icon size={24} className="text-white" />
    </div>
    <div className="flex-1">
      <div className="font-display font-bold">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  </div>
);

export default FreelancerDashboard;
