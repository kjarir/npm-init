import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Search, Filter, DollarSign, Clock, User, Target, ChevronRight, Loader2, ArrowLeft, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useProposals } from "@/hooks/useProposals";
import { useAuth } from "@/contexts/AuthContext";
import { ProposalDialog } from "@/components/projects/ProposalDialog";
import { formatDistanceToNow } from "date-fns";

const BrowseProjects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProjectForProposal, setSelectedProjectForProposal] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: projects = [], isLoading, error, refetch } = useProjects('open');
  const { data: myProposals = [] } = useProposals();

  const categories = ["all", "Development", "Design", "Writing", "Marketing", "Video", "Data"];

  const filteredProjects = projects?.filter(project => {
    const matchesSearch = !searchQuery || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.skills_required?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || project.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-28 pb-20">
          <div className="container-editorial">
            <div className="bg-destructive/10 border-3 border-destructive p-8 text-center">
              <h2 className="font-display font-bold text-xl mb-2">Error Loading Projects</h2>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Failed to load projects'}
              </p>
              <Button onClick={() => refetch()} variant="accent">
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-28 pb-20">
        <div className="container-editorial">
          {/* Header */}
          <div className="mb-12">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/freelancer/dashboard')}
              className="mb-4"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
            <div className="label-mono text-accent mb-2">Find Work</div>
            <h1 className="headline-lg mb-4">Browse Projects</h1>
            <p className="body-lg text-muted-foreground max-w-2xl">
              Discover milestone-based projects with locked funds. Apply with confidence—
              you'll get paid automatically when you deliver.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="bg-secondary border-3 border-foreground brutal-shadow p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Search projects by title, skill, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 border-3 border-foreground bg-background font-body focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 border-3 border-foreground font-display text-sm uppercase tracking-wider transition-all ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-secondary"
                    }`}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-muted-foreground">{filteredProjects.length} projects found</span>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              <select className="border-3 border-foreground bg-background px-3 py-2 font-display text-sm">
                <option>Newest First</option>
                <option>Highest Budget</option>
                <option>Shortest Deadline</option>
              </select>
            </div>
          </div>

          {/* Projects List */}
          {projects.length === 0 ? (
            <div className="bg-secondary border-3 border-foreground brutal-shadow p-12 text-center">
              <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="font-display font-bold text-xl mb-2">No Open Projects Available</h3>
              <p className="text-muted-foreground mb-4">
                There are no open projects in the database yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Check the browser console for debugging information.
              </p>
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="space-y-6">
              {filteredProjects.map((project) => (
                <ProjectListItem 
                  key={project.id} 
                  project={project}
                  hasProposal={myProposals.some(p => p.project_id === project.id)}
                  onPropose={() => setSelectedProjectForProposal(project.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-secondary border-3 border-foreground brutal-shadow p-12 text-center">
              <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="font-display font-bold text-xl mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                No projects match your search criteria. Try adjusting your filters.
              </p>
              <p className="text-sm text-muted-foreground">
                Total open projects in database: {projects.length}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Proposal Dialog */}
      {selectedProjectForProposal && (
        <ProposalDialog
          open={!!selectedProjectForProposal}
          onOpenChange={(open) => !open && setSelectedProjectForProposal(null)}
          projectId={selectedProjectForProposal}
          projectBudget={projects.find(p => p.id === selectedProjectForProposal)?.total_budget}
        />
      )}
    </div>
  );
};

interface ProjectListItemProps {
  project: any;
  hasProposal?: boolean;
  onPropose: () => void;
}

const ProjectListItem = ({ project, hasProposal, onPropose }: ProjectListItemProps) => {
  const handleProposeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPropose();
  };

  return (
    <div className="bg-background border-3 border-foreground brutal-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link to={`/freelancer/project/${project.id}`}>
                <h3 className="font-display font-bold text-xl hover:text-accent transition-colors">{project.title}</h3>
              </Link>
              {project.funds_verified && (
                <span className="text-xs bg-success/10 text-success border border-success px-2 py-1 font-display uppercase">
                  Funds Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User size={14} />
              <span>{project.client?.full_name || 'Client'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display font-bold text-2xl">${(project.total_budget || 0).toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{project.milestones?.length || 0} milestones</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-muted-foreground mb-4 line-clamp-2">{project.description || 'No description'}</p>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.skills_required?.map((skill: string) => (
            <span key={skill} className="text-xs border-2 border-foreground px-3 py-1 font-display">
              {skill}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t-3 border-foreground">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-muted-foreground" />
              <span>{project.deadline ? formatDistanceToNow(new Date(project.deadline), { addSuffix: true }) : 'Flexible'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target size={16} className="text-muted-foreground" />
              <span>{project.proposal_count || 0} proposals</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasProposal ? (
              <span className="text-sm text-muted-foreground">Proposal Submitted</span>
            ) : (
              <Button
                variant="accent"
                size="sm"
                onClick={handleProposeClick}
                className="gap-2"
              >
                <FileText size={16} />
                Submit Proposal
              </Button>
            )}
            <Link to={`/freelancer/project/${project.id}`}>
              <Button variant="outline" size="sm">
                View Details
                <ChevronRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseProjects;
