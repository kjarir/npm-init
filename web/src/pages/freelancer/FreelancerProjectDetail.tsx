import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MilestoneTimeline from "@/components/dashboard/MilestoneTimeline";
import { Button } from "@/components/ui/button";
import { User, Calendar, DollarSign, Lock, CheckCircle, Clock, Upload, FileText, MessageSquare, AlertTriangle, Shield, Send, ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";
import { FileUploadDialog } from "@/components/dialogs/FileUploadDialog";
import { MessageDialog } from "@/components/dialogs/MessageDialog";
import { DeliveryDialog } from "@/components/projects/DeliveryDialog";
import { RevisionRequestDialog } from "@/components/projects/RevisionRequestDialog";
import { TimeTracker } from "@/components/projects/TimeTracker";
import { ProjectAttachments } from "@/components/projects/ProjectAttachments";
import { useProject } from "@/hooks/useProjects";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useRevisions } from "@/hooks/useRevisions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FreelancerProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: project, isLoading } = useProject(id || '');
  const { data: deliveries = [] } = useDeliveries(id);
  const { data: revisions = [] } = useRevisions(id);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [selectedMilestoneForDelivery, setSelectedMilestoneForDelivery] = useState<string | null>(null);
  const [selectedMilestoneForRevision, setSelectedMilestoneForRevision] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "uploaded" | "submitted">("idle");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-28 pb-20">
          <div className="container-editorial text-center">
            <h1 className="headline-lg mb-4">Project not found</h1>
            <Button onClick={() => navigate('/freelancer/dashboard')}>Back to Dashboard</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentMilestone = project.milestones?.find((m: any) => m.status === "active");

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
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 font-display text-sm uppercase tracking-wider ${
                project.status === 'in_progress' ? 'bg-accent text-accent-foreground' :
                project.status === 'completed' ? 'bg-success text-success-foreground' :
                project.status === 'open' ? 'bg-warning text-warning-foreground' :
                'bg-secondary text-foreground'
              }`}>
                {project.status.replace('_', ' ')}
              </span>
              <span className="text-muted-foreground">{project.category}</span>
            </div>
            <h1 className="headline-lg mb-4">{project.title}</h1>
            <p className="body-lg text-muted-foreground max-w-3xl">{project.description || 'No description provided'}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Current Milestone - Submit Work */}
              {currentMilestone && (
                <div className="bg-accent/10 border-3 border-accent brutal-shadow p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-accent flex items-center justify-center">
                      <Clock className="text-accent-foreground" size={24} />
                    </div>
                    <div>
                      <div className="label-mono text-accent">Current Milestone</div>
                      <h2 className="font-display font-bold text-xl">{currentMilestone.title}</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-background border-3 border-foreground p-4">
                      <div className="text-sm text-muted-foreground">Payout</div>
                      <div className="font-display font-bold text-2xl">${currentMilestone.amount.toLocaleString()}</div>
                    </div>
                    <div className="bg-background border-3 border-foreground p-4">
                      <div className="text-sm text-muted-foreground">Deadline</div>
                      <div className="font-display font-bold text-2xl">{currentMilestone.deadline}</div>
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div className="bg-background border-3 border-dashed border-foreground p-8 text-center">
                    <Upload className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="font-display font-bold text-lg mb-2">Submit Your Deliverables</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload your work files for AI verification. Supported: .fig, .psd, .zip, .pdf
                    </p>
                    <Button 
                      variant="accent" 
                      size="lg"
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      <Upload size={18} />
                      Choose Files
                    </Button>
                  </div>

                  {/* Verification Info */}
                  <div className="mt-4 p-4 bg-secondary border-3 border-foreground flex items-start gap-4">
                    <Shield className="text-success flex-shrink-0" size={20} />
                    <div className="text-sm">
                      <span className="font-display font-bold">AI Verification:</span>{" "}
                      <span className="text-muted-foreground">
                        Once submitted, AI will verify your deliverables against milestone requirements. 
                        If verification passes (95%+ score), payment releases automatically.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Milestones */}
              <div className="bg-secondary border-3 border-foreground brutal-shadow p-6">
                <h2 className="font-display font-bold text-xl mb-6">All Milestones</h2>
                {project.milestones && project.milestones.length > 0 ? (
                  <MilestoneTimeline milestones={project.milestones.map((m: any, idx: number) => ({
                    id: m.id,
                    number: m.milestone_number || idx + 1,
                    title: m.title,
                    amount: m.amount,
                    status: m.status,
                    deadline: m.deadline,
                    verificationScore: m.verification_score,
                  }))} />
                ) : (
                  <p className="text-muted-foreground">No milestones yet</p>
                )}
              </div>

              {/* Deliverables History */}
              <div className="bg-background border-3 border-foreground brutal-shadow p-6">
                <h2 className="font-display font-bold text-xl mb-6">Your Submissions</h2>
                
                <div className="space-y-4">
                  <SubmissionItem 
                    milestone="Wireframes & User Flows"
                    file="wireframes-v3-final.fig"
                    size="18.2 MB"
                    submittedAt="Feb 13, 2024"
                    status="verified"
                    score={96}
                  />
                  <SubmissionItem 
                    milestone="Research & Discovery"
                    file="research-report.pdf"
                    size="4.5 MB"
                    submittedAt="Feb 6, 2024"
                    status="verified"
                    score={98}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Client Card */}
              {project.client && (
                <div className="bg-background border-3 border-foreground brutal-shadow p-6">
                  <div className="label-mono text-muted-foreground mb-4">Client</div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl">
                      {project.client.full_name
                        ? project.client.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                        : project.client.email?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="font-display font-bold text-lg">
                        {project.client.full_name || project.client.email || 'Client'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {project.client.total_spent ? `$${project.client.total_spent.toLocaleString()} spent` : 'New client'}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setMessageDialogOpen(true)}
                  >
                    <MessageSquare size={18} />
                    Message Client
                  </Button>
                </div>
              )}

              {/* Earnings Status */}
              <div className="bg-success/10 border-3 border-success p-6">
                <div className="label-mono text-success mb-4">Your Earnings</div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-success" />
                      <span>Earned</span>
                    </div>
                    <span className="font-display font-bold text-success">${(project.released_funds || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock size={18} className="text-warning" />
                      <span>Pending</span>
                    </div>
                    <span className="font-display font-bold">${(project.locked_funds || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-success/30 pt-4">
                    <span className="font-display font-bold">Total Contract</span>
                    <span className="font-display font-bold text-xl">${project.budget.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Project Info */}
              <div className="bg-secondary border-3 border-foreground p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar size={16} />
                      <span>Start Date</span>
                    </div>
                    <span className="font-display font-bold">{project.startDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock size={16} />
                      <span>Deadline</span>
                    </div>
                    <span className="font-display font-bold">{project.deadline}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {currentMilestone && (
                  <Button 
                    variant="success" 
                    className="w-full"
                    onClick={() => setSelectedMilestoneForDelivery(currentMilestone.id)}
                  >
                    <Upload size={18} className="mr-2" />
                    Submit Delivery
                  </Button>
                )}
                <Link to="/disputes" className="w-full">
                  <Button variant="outline" className="w-full">
                    <AlertTriangle size={18} className="mr-2" />
                    Request Exit
                  </Button>
                </Link>
              </div>

              {/* Time Tracking (for hourly projects) */}
              {project.billing_type === 'hourly' && (
                <TimeTracker projectId={project.id} />
              )}

              {/* Revisions */}
              {revisions.length > 0 && (
                <div className="bg-warning/10 border-3 border-warning p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw size={16} className="text-warning" />
                    <span className="font-display font-bold text-warning">Revision Requests</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You have {revisions.filter(r => r.status === 'pending').length} pending revision request(s)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Attachments Section */}
        <div className="mt-8">
          <ProjectAttachments projectId={project.id} />
        </div>
      </main>

      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        milestoneTitle={currentMilestone?.title}
        onUploadComplete={(files) => {
          setUploadedFiles(files);
          setSubmissionStatus("uploaded");
        }}
      />

      {project.client && (
        <>
          <MessageDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            recipientName={project.client.full_name || project.client.email || 'Client'}
            recipientId={project.client.id}
            projectId={project.id}
          />
          
          {selectedMilestoneForDelivery && (
            <DeliveryDialog
              open={!!selectedMilestoneForDelivery}
              onOpenChange={(open) => !open && setSelectedMilestoneForDelivery(null)}
              milestoneId={selectedMilestoneForDelivery}
              projectId={project.id}
              deliveredToId={project.client.id}
            />
          )}
        </>
      )}

      <Footer />
    </div>
  );
};

interface SubmissionItemProps {
  milestone: string;
  file: string;
  size: string;
  submittedAt: string;
  status: "verified" | "pending" | "rejected";
  score?: number;
}

const SubmissionItem = ({ milestone, file, size, submittedAt, status, score }: SubmissionItemProps) => {
  const handleDownload = () => {
    toast.success(`Downloading ${file}...`);
    // In real app, this would trigger actual file download
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-secondary border-3 border-foreground hover:bg-background transition-colors">
      <div className="w-12 h-12 bg-success flex items-center justify-center">
        <CheckCircle className="text-success-foreground" size={24} />
      </div>
      <div className="flex-1">
        <div className="font-display font-bold">{file}</div>
        <div className="text-sm text-muted-foreground">
          {milestone} • {size}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-success font-display font-bold">{score}%</span>
            <span className="px-2 py-1 bg-success text-success-foreground font-display text-xs uppercase">
              Verified
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{submittedAt}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-shrink-0"
        >
          <Download size={16} />
        </Button>
      </div>
    </div>
  );
};

export default FreelancerProjectDetail;
