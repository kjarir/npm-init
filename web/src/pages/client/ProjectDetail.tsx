import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MilestoneTimeline from "@/components/dashboard/MilestoneTimeline";
import { Button } from "@/components/ui/button";
import { User, Calendar, DollarSign, Lock, CheckCircle, Clock, FileText, MessageSquare, AlertTriangle, ArrowLeft, Download, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { MessageDialog } from "@/components/dialogs/MessageDialog";
import { RevisionRequestDialog } from "@/components/projects/RevisionRequestDialog";
import { ProjectAttachments } from "@/components/projects/ProjectAttachments";
import { useProject } from "@/hooks/useProjects";
import { useDeliveries, useUpdateDeliveryStatus } from "@/hooks/useDeliveries";
import { useRevisions } from "@/hooks/useRevisions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: project, isLoading } = useProject(id || '');
  const { data: deliveries = [] } = useDeliveries(id);
  const { data: revisions = [] } = useRevisions(id);
  const updateDeliveryStatus = useUpdateDeliveryStatus();
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [selectedMilestoneForRevision, setSelectedMilestoneForRevision] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, "pending" | "approved" | "rejected">>({});

  const handleApproveSubmission = (submissionId: string) => {
    setSubmissionStatus(prev => ({ ...prev, [submissionId]: "approved" }));
    toast.success("Submission approved! Payment will be released automatically.");
  };

  const handleDownload = (fileName: string) => {
    toast.success(`Downloading ${fileName}...`);
    // In real app, this would trigger actual file download
  };

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
            <Button onClick={() => navigate('/client/dashboard')}>Back to Dashboard</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const milestones = [
    {
      id: "1",
      number: 1,
      title: "Research & Discovery",
      amount: 2000,
      status: "completed" as const,
      deadline: "Feb 7, 2024",
      verificationScore: 98,
    },
    {
      id: "2",
      number: 2,
      title: "Wireframes & User Flows",
      amount: 2500,
      status: "completed" as const,
      deadline: "Feb 14, 2024",
      verificationScore: 96,
    },
    {
      id: "3",
      number: 3,
      title: "High-Fidelity Designs",
      amount: 3500,
      status: "active" as const,
      deadline: "Feb 28, 2024",
    },
    {
      id: "4",
      number: 4,
      title: "Frontend Development",
      amount: 4000,
      status: "locked" as const,
      deadline: "Mar 10, 2024",
    },
    {
      id: "5",
      number: 5,
      title: "Testing & Launch",
      amount: 3000,
      status: "locked" as const,
      deadline: "Mar 15, 2024",
    },
  ];

  const submissions = [
    {
      id: "1",
      milestone: "High-Fidelity Designs",
      file: "product-page-v2.fig",
      size: "24.5 MB",
      submittedAt: "2 hours ago",
      status: "pending",
    },
  ];

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
              {/* Milestones */}
              <div className="bg-secondary border-3 border-foreground brutal-shadow p-6">
                <h2 className="font-display font-bold text-xl mb-6">Milestone Progress</h2>
                {project.milestones && project.milestones.length > 0 ? (
                  <MilestoneTimeline milestones={project.milestones.map((m: any, idx: number) => ({
                    id: m.id,
                    number: m.milestone_number || idx + 1,
                    title: m.title,
                    amount: m.amount,
                    status: m.status,
                    deadline: m.deadline,
                  }))} />
                ) : (
                  <p className="text-muted-foreground">No milestones yet</p>
                )}
              </div>

              {/* Deliveries */}
              {deliveries.length > 0 && (
                <div className="bg-background border-3 border-foreground brutal-shadow p-6">
                  <h2 className="font-display font-bold text-xl mb-6">Deliveries</h2>
                  <div className="space-y-4">
                    {deliveries.map((delivery) => (
                      <div key={delivery.id} className="p-4 bg-secondary border-3 border-foreground">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-display font-bold mb-1">
                              {delivery.milestone?.title || 'Milestone Delivery'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Delivered {new Date(delivery.delivered_at).toLocaleDateString()}
                            </div>
                            {delivery.delivery_notes && (
                              <p className="text-sm mt-2">{delivery.delivery_notes}</p>
                            )}
                          </div>
                          <div className={`px-3 py-1 font-display text-xs uppercase ${
                            delivery.status === 'approved' ? 'bg-success text-success-foreground' :
                            delivery.status === 'revision_requested' ? 'bg-warning text-warning-foreground' :
                            delivery.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                            'bg-secondary text-foreground'
                          }`}>
                            {delivery.status}
                          </div>
                        </div>
                        {delivery.delivery_files && delivery.delivery_files.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {delivery.delivery_files.map((file, idx) => (
                              <a
                                key={idx}
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-accent hover:underline"
                              >
                                <FileText size={16} />
                                {file.split('/').pop()}
                              </a>
                            ))}
                          </div>
                        )}
                        {delivery.status === 'delivered' || delivery.status === 'reviewing' ? (
                          <div className="flex gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => updateDeliveryStatus.mutate({ 
                                deliveryId: delivery.id, 
                                status: 'approved' 
                              })}
                            >
                              <CheckCircle2 size={16} className="mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMilestoneForRevision(delivery.milestone_id);
                                setRevisionDialogOpen(true);
                              }}
                            >
                              <RefreshCw size={16} className="mr-2" />
                              Request Revision
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Submissions */}
              <div className="bg-background border-3 border-foreground brutal-shadow p-6">
                <h2 className="font-display font-bold text-xl mb-6">Recent Submissions</h2>
                
                {submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.map((sub) => {
                      const status = submissionStatus[sub.id] || sub.status;
                      const statusConfig = {
                        pending: { label: "Pending Review", bg: "bg-warning", text: "text-warning-foreground" },
                        approved: { label: "Approved", bg: "bg-success", text: "text-success-foreground" },
                        rejected: { label: "Rejected", bg: "bg-destructive", text: "text-destructive-foreground" },
                      };
                      const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
                      
                      return (
                        <div key={sub.id} className="flex items-center gap-4 p-4 bg-secondary border-3 border-foreground hover:bg-background transition-colors">
                          <div className="w-12 h-12 bg-accent flex items-center justify-center cursor-pointer" onClick={() => handleDownload(sub.file)}>
                            <FileText className="text-accent-foreground" size={24} />
                          </div>
                          <div className="flex-1">
                            <div className="font-display font-bold cursor-pointer hover:text-accent" onClick={() => handleDownload(sub.file)}>
                              {sub.file}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sub.milestone} • {sub.size}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`px-3 py-1 ${config.bg} ${config.text} font-display text-xs uppercase mb-1`}>
                                {config.label}
                              </div>
                              <div className="text-xs text-muted-foreground">{sub.submittedAt}</div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(sub.file)}
                              className="flex-shrink-0"
                            >
                              <Download size={16} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No submissions yet
                  </div>
                )}

                {/* AI Verification Preview */}
                <div className="mt-6 p-4 bg-success/10 border-3 border-success">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="text-success" size={20} />
                    <span className="font-display font-bold text-success">AI Verification Running</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Analyzing file format...</span>
                      <span className="text-success">✓ Complete</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Checking deliverable completeness...</span>
                      <span className="text-success">✓ Complete</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Verifying quality standards...</span>
                      <span className="text-muted-foreground">○ In progress</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Freelancer Card */}
              {project.freelancer && (
                <div className="bg-background border-3 border-foreground brutal-shadow p-6">
                  <div className="label-mono text-muted-foreground mb-4">Freelancer</div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-accent flex items-center justify-center text-accent-foreground font-display font-bold text-xl">
                      {project.freelancer.full_name
                        ? project.freelancer.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                        : project.freelancer.email?.[0]?.toUpperCase() || 'F'}
                    </div>
                    <div>
                      <div className="font-display font-bold text-lg">
                        {project.freelancer.full_name || project.freelancer.email || 'Freelancer'}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-warning">★ {project.freelancer.rating || 5.0}</span>
                        <span className="text-muted-foreground">
                          {project.freelancer.milestones_completed || 0} milestones
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setMessageDialogOpen(true)}
                  >
                    <MessageSquare size={18} />
                    Message
                  </Button>
                </div>
              )}

              {/* Funds Status */}
              <div className="bg-primary text-primary-foreground border-3 border-foreground brutal-shadow p-6">
                <div className="label-mono text-primary-foreground/70 mb-4">Funds Status</div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} />
                      <span>Total Budget</span>
                    </div>
                    <span className="font-display font-bold">${(project.total_budget || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock size={18} className="text-warning" />
                      <span>Locked</span>
                    </div>
                    <span className="font-display font-bold text-warning">${(project.locked_funds || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-success" />
                      <span>Released</span>
                    </div>
                    <span className="font-display font-bold text-success">${(project.released_funds || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="h-4 bg-primary-foreground/20 border border-primary-foreground">
                    <div 
                      className="h-full bg-success"
                      style={{ width: `${(project.releasedFunds / project.budget) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-primary-foreground/70 mt-2 text-center">
                    {Math.round((project.releasedFunds / project.budget) * 100)}% released
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
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => {
                    const pendingSubmission = submissions.find(s => (submissionStatus[s.id] || s.status) === "pending");
                    if (pendingSubmission) {
                      handleApproveSubmission(pendingSubmission.id);
                    } else {
                      toast.info("No pending submissions to approve");
                    }
                  }}
                  disabled={!submissions.some(s => (submissionStatus[s.id] || s.status) === "pending")}
                >
                  Approve Submission
                </Button>
                <Link to="/disputes" className="w-full">
                  <Button variant="outline" className="w-full">
                    <AlertTriangle size={18} />
                    Raise Dispute
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Project Attachments Section */}
        <div className="mt-8">
          <ProjectAttachments projectId={project.id} />
        </div>
      </main>

      {project.freelancer && (
        <>
          <MessageDialog
            open={messageDialogOpen}
            onOpenChange={setMessageDialogOpen}
            recipientName={project.freelancer.full_name || project.freelancer.email || 'Freelancer'}
            recipientId={project.freelancer.id}
            projectId={project.id}
          />
          
          {selectedMilestoneForRevision && (
            <RevisionRequestDialog
              open={revisionDialogOpen}
              onOpenChange={(open) => {
                setRevisionDialogOpen(open);
                if (!open) setSelectedMilestoneForRevision(null);
              }}
              projectId={project.id}
              milestoneId={selectedMilestoneForRevision}
              requestedFromId={project.freelancer.id}
            />
          )}
        </>
      )}

      <Footer />
    </div>
  );
};

export default ProjectDetail;
