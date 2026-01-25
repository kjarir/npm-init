import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle, Shield, Search, Filter, MapPin, Loader2, ArrowLeft, MessageSquare } from "lucide-react";
import { useFreelancers } from "@/hooks/useProfiles";
import { useCreateConversation } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const BrowseFreelancers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: freelancers = [], isLoading, error, refetch } = useFreelancers();
  const createConversation = useCreateConversation();

  const handleStartConversation = async (freelancerId: string) => {
    if (!user || !profile) {
      toast.error('Please sign in to start a conversation');
      navigate('/auth');
      return;
    }

    try {
      const conversation = await createConversation.mutateAsync({
        otherUserId: freelancerId,
        projectId: null,
      });
      
      navigate(`/chat?conversation=${conversation.id}`);
    } catch (error: any) {
      toast.error(`Failed to start conversation: ${error.message}`);
    }
  };

  const skills = ["all", "Development", "Design", "Writing", "Marketing", "Video", "Data"];

  const filteredFreelancers = freelancers?.filter(freelancer => {
    const matchesSearch = !searchQuery || 
      freelancer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      freelancer.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      freelancer.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSkill = selectedSkill === "all" || 
      freelancer.skills?.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase()));
    
    return matchesSearch && matchesSkill;
  }).sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "milestones":
        return (b.milestones_completed || 0) - (a.milestones_completed || 0);
      case "rateLow":
        return (a.hourly_rate || 0) - (b.hourly_rate || 0);
      case "rateHigh":
        return (b.hourly_rate || 0) - (a.hourly_rate || 0);
      default:
        return 0;
    }
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading freelancers...</p>
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
              <h2 className="font-display font-bold text-xl mb-2">Error Loading Freelancers</h2>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Failed to load freelancers'}
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
              onClick={() => navigate('/client/dashboard')}
              className="mb-4"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
            <div className="label-mono text-accent mb-2">Find Talent</div>
            <h1 className="headline-lg mb-4">Browse Freelancers</h1>
            <p className="body-lg text-muted-foreground max-w-2xl">
              Discover verified professionals with proven track records. 
              Every reputation score is earned through completed milestones.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="bg-secondary border-3 border-foreground brutal-shadow p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  placeholder="Search by skill, name, or expertise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 border-3 border-foreground bg-background font-body focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {skills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkill(skill)}
                    className={`px-4 py-2 border-3 border-foreground font-display text-sm uppercase tracking-wider transition-all ${
                      selectedSkill === skill
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-secondary"
                    }`}
                  >
                    {skill === "all" ? "All Skills" : skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-muted-foreground">
              {filteredFreelancers.length} freelancer{filteredFreelancers.length !== 1 ? 's' : ''} found
              {freelancers.length > 0 && (
                <span className="ml-2 text-xs">(out of {freelancers.length} total)</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              <select 
                className="border-3 border-foreground bg-background px-3 py-2 font-display text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="rating">Highest Rated</option>
                <option value="milestones">Most Milestones</option>
                <option value="rateLow">Lowest Rate</option>
                <option value="rateHigh">Highest Rate</option>
              </select>
            </div>
          </div>

          {/* Freelancers Grid */}
          {freelancers.length === 0 ? (
            <div className="bg-secondary border-3 border-foreground brutal-shadow p-12 text-center">
              <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="font-display font-bold text-xl mb-2">No Freelancers Available</h3>
              <p className="text-muted-foreground mb-4">
                There are no freelancers in the database yet.
              </p>
              <div className="bg-background border-3 border-foreground p-6 mt-6 text-left max-w-2xl mx-auto">
                <h4 className="font-display font-bold mb-3">To fix this:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Go to your Supabase Dashboard → SQL Editor</li>
                  <li>Run <code className="bg-secondary px-2 py-1">CHECK_PROFILES.sql</code> to see what profiles exist</li>
                  <li>Run <code className="bg-secondary px-2 py-1">CREATE_TEST_FREELANCER.sql</code> to create a test freelancer</li>
                  <li>Or sign up a new account with role "Freelancer"</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-4">
                  Check the browser console (F12) for detailed debugging information.
                </p>
              </div>
            </div>
          ) : filteredFreelancers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFreelancers.map((freelancer) => (
                <FreelancerCard 
                  key={freelancer.id} 
                  freelancer={freelancer}
                  onStartConversation={handleStartConversation}
                />
              ))}
            </div>
          ) : (
            <div className="bg-secondary border-3 border-foreground brutal-shadow p-12 text-center">
              <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="font-display font-bold text-xl mb-2">No freelancers found</h3>
              <p className="text-muted-foreground mb-4">
                No freelancers match your search criteria. Try adjusting your filters.
              </p>
              <p className="text-sm text-muted-foreground">
                Total freelancers in database: {freelancers.length}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

interface FreelancerCardProps {
  freelancer: any;
  onStartConversation: (freelancerId: string) => void;
}

const FreelancerCard = ({ freelancer, onStartConversation }: FreelancerCardProps) => {
  const initials = freelancer.full_name
    ? freelancer.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'FL';

  return (
    <div className="bg-background border-3 border-foreground brutal-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 bg-accent flex items-center justify-center text-accent-foreground font-display font-bold text-xl">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-lg">{freelancer.full_name || 'Freelancer'}</h3>
              {freelancer.is_verified && (
                <Shield className="text-success" size={16} />
              )}
            </div>
            <div className="text-muted-foreground">{freelancer.title || 'Freelancer'}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star 
                    key={i} 
                    className={i <= Math.floor(freelancer.rating || 5) ? "text-warning fill-warning" : "text-muted"} 
                    size={14} 
                  />
                ))}
              </div>
              <span className="font-display font-bold text-sm">{freelancer.rating || 5.0}</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {freelancer.is_top_rated && (
            <span className="text-xs bg-success/10 text-success border border-success px-2 py-1 font-display uppercase tracking-wider">
              Top Rated
            </span>
          )}
          <span className="text-xs bg-secondary px-2 py-1 font-display">
            {freelancer.milestones_completed || 0} milestones
          </span>
          <span className="text-xs bg-secondary px-2 py-1 font-display">
            {freelancer.success_rate || 100}% success
          </span>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {freelancer.skills?.slice(0, 3).map((skill: string) => (
            <span key={skill} className="text-xs border-2 border-foreground px-2 py-1 font-display">
              {skill}
            </span>
          ))}
          {freelancer.skills?.length > 3 && (
            <span className="text-xs text-muted-foreground">+{freelancer.skills.length - 3} more</span>
          )}
        </div>

        {/* Location */}
        {freelancer.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={14} />
            <span>{freelancer.location}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t-3 border-foreground p-4 flex items-center justify-between bg-secondary">
        <div>
          <div className="text-sm text-muted-foreground">Hourly Rate</div>
          <div className="font-display font-bold text-xl">${freelancer.hourly_rate || 50}</div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onStartConversation(freelancer.id)}
          >
            <MessageSquare size={16} className="mr-2" />
            Message
          </Button>
          <Link to={`/client/create-project`}>
            <Button variant="default" size="sm">
              Hire for Project
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BrowseFreelancers;
