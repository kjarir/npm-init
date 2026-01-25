import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Scale, Clock, CheckCircle, Shield, Users, FileText, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDisputes } from "@/hooks/useDisputes";
import { EvidenceDialog } from "@/components/dialogs/EvidenceDialog";

const Disputes = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | undefined>();
  const { data: disputes = [], isLoading, error, refetch } = useDisputes();
  
  const disputeProcess = [
    {
      step: "1",
      title: "Dispute Raised",
      description: "Either party can raise a dispute if they believe terms were not met. Funds are immediately frozen.",
      icon: AlertTriangle,
    },
    {
      step: "2",
      title: "Evidence Collected",
      description: "Both parties submit their evidence, communications, and deliverables for review.",
      icon: FileText,
    },
    {
      step: "3",
      title: "AI Analysis",
      description: "AI reviews all evidence against the original milestone requirements and contract terms.",
      icon: Scale,
    },
    {
      step: "4",
      title: "Resolution",
      description: "Based on evidence, funds are distributed fairly. Clear cases resolve automatically.",
      icon: CheckCircle,
    },
  ];

  // Format disputes for display
  const activeDisputes = disputes.map(dispute => ({
    id: dispute.id,
    project: (dispute.project as any)?.title || 'Unknown Project',
    projectId: dispute.project_id,
    amount: dispute.disputed_amount,
    raisedBy: (dispute.raised_by_profile as any)?.full_name || 'User',
    reason: dispute.reason,
    status: dispute.status === 'open' ? 'Under Review' : 
            dispute.status === 'under_review' ? 'Under Review' :
            dispute.status === 'resolved' ? 'Resolved' : 'Cancelled',
    daysOpen: Math.floor((new Date().getTime() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60 * 24)),
  })).filter(d => d.status !== 'resolved' && d.status !== 'cancelled');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading disputes...</p>
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
              <h2 className="font-display font-bold text-xl mb-2">Error Loading Disputes</h2>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Failed to load disputes'}
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
              onClick={() => {
                const dashboardLink = profile?.role === 'client' ? '/client/dashboard' : '/freelancer/dashboard';
                navigate(dashboardLink);
              }}
              className="mb-4"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
            <div className="label-mono text-accent mb-2">Dispute Resolution</div>
            <h1 className="headline-lg mb-4">Fair Resolution System</h1>
            <p className="body-lg text-muted-foreground max-w-2xl">
              When things go wrong, BobPay's dispute system ensures fair outcomes based on 
              evidence and original agreements—not who argues louder.
            </p>
          </div>

          {/* Process Overview */}
          <div className="bg-secondary border-3 border-foreground brutal-shadow p-8 mb-12">
            <h2 className="font-display font-bold text-2xl mb-8 text-center">How Disputes Are Resolved</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {disputeProcess.map((step, index) => (
                <div key={step.step} className="relative">
                  <div className="bg-background border-3 border-foreground p-6 h-full">
                    <div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xl mb-4">
                      {step.step}
                    </div>
                    <div className="w-10 h-10 bg-accent/10 border-3 border-accent flex items-center justify-center mb-4">
                      <step.icon className="text-accent" size={20} />
                    </div>
                    <h3 className="font-display font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  
                  {index < disputeProcess.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <div className="w-6 h-6 bg-accent flex items-center justify-center">
                        <ArrowRight className="text-accent-foreground" size={14} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Disputes */}
            <div className="lg:col-span-2">
              <div className="bg-background border-3 border-foreground brutal-shadow p-6">
                <h2 className="font-display font-bold text-xl mb-6">Your Disputes</h2>
                
                {activeDisputes.length > 0 ? (
                  <div className="space-y-4">
                    {activeDisputes.map((dispute) => {
                      const linkPrefix = profile?.role === 'client' ? '/client' : '/freelancer';
                      return (
                        <div key={dispute.id} className="p-6 bg-destructive/10 border-3 border-destructive">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <Link to={`${linkPrefix}/project/${dispute.projectId}`}>
                                <h3 className="font-display font-bold text-lg hover:text-accent transition-colors cursor-pointer">
                                  {dispute.project}
                                </h3>
                              </Link>
                              <div className="text-sm text-muted-foreground">
                                Raised by: {dispute.raisedBy} • Open for {dispute.daysOpen} day{dispute.daysOpen !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="px-3 py-1 bg-warning text-warning-foreground font-display text-sm">
                              {dispute.status}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Disputed Amount</div>
                              <div className="font-display font-bold text-2xl">${dispute.amount.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Reason</div>
                              <div className="font-display font-bold">{dispute.reason}</div>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => {
                                setSelectedDisputeId(dispute.id);
                                setEvidenceDialogOpen(true);
                              }}
                            >
                              Submit Evidence
                            </Button>
                            <Link to={`${linkPrefix}/project/${dispute.projectId}`}>
                              <Button variant="outline" size="sm">
                                View Project Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="mx-auto mb-4" size={48} />
                    <p>No active disputes. Great work maintaining good relationships!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Fairness Principles */}
              <div className="bg-primary text-primary-foreground border-3 border-foreground brutal-shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="text-accent" size={24} />
                  <h3 className="font-display font-bold text-lg">Fairness Principles</h3>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-accent flex-shrink-0 mt-0.5" />
                    <span>Decisions based on original agreement, not arguments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-accent flex-shrink-0 mt-0.5" />
                    <span>All evidence reviewed equally</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-accent flex-shrink-0 mt-0.5" />
                    <span>AI analysis removes human bias</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-accent flex-shrink-0 mt-0.5" />
                    <span>Funds frozen until resolution</span>
                  </li>
                </ul>
              </div>

              {/* Stats */}
              <div className="bg-secondary border-3 border-foreground p-6">
                <h3 className="font-display font-bold text-lg mb-4">Resolution Statistics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg. Resolution Time</span>
                    <span className="font-display font-bold">3.2 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Auto-Resolved</span>
                    <span className="font-display font-bold text-success">78%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Satisfaction Rate</span>
                    <span className="font-display font-bold">94%</span>
                  </div>
                </div>
              </div>

              {/* Help */}
              <div className="bg-background border-3 border-foreground p-6">
                <h3 className="font-display font-bold text-lg mb-4">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Our support team can answer questions about the dispute process.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = "mailto:support@bobpay.com?subject=Dispute%20Support"}
                >
                  <Users size={18} />
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <EvidenceDialog
        open={evidenceDialogOpen}
        onOpenChange={setEvidenceDialogOpen}
        disputeId={selectedDisputeId}
        projectName={activeDisputes.find(d => d.id === selectedDisputeId)?.project}
      />

      <Footer />
    </div>
  );
};

export default Disputes;
