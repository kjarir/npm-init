import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowRight, Lock, CheckCircle, Info, ArrowLeft, Loader2, FileText } from "lucide-react";
import { ProjectTemplateSelector } from "@/components/projects/ProjectTemplateSelector";
import { toast } from "sonner";
import { useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline: string;
}

const CreateProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createProject = useCreateProject();
  const [step, setStep] = useState(1);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [category, setCategory] = useState("");
  const [billingType, setBillingType] = useState<"fixed" | "hourly">("fixed");
  const [hourlyRate, setHourlyRate] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: "1", title: "", description: "", amount: 0, deadline: "" }
  ]);

  const handleTemplateSelect = (templateData: any) => {
    if (templateData.milestones && Array.isArray(templateData.milestones)) {
      setMilestones(templateData.milestones.map((m: any, idx: number) => ({
        id: (idx + 1).toString(),
        title: m.title || "",
        description: m.description || "",
        amount: m.amount || 0,
        deadline: m.deadline || "",
      })));
    }
    setShowTemplates(false);
    toast.success("Template applied");
  };

  const totalBudget = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      { id: Date.now().toString(), title: "", description: "", amount: 0, deadline: "" }
    ]);
  };

  const removeMilestone = (id: string) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((m) => m.id !== id));
    }
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: string | number) => {
    setMilestones(
      milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const categories = [
    "Development",
    "Design",
    "Writing",
    "Marketing",
    "Video & Animation",
    "Data & Analytics",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-28 pb-20">
        <div className="container-editorial max-w-4xl">
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
            <div className="label-mono text-accent mb-2">Create Project</div>
            <h1 className="headline-lg mb-4">Post a New Project</h1>
            <p className="body-lg text-muted-foreground">
              Define your project, break it into milestones, and lock funds. 
              Freelancers will compete to deliver your vision.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 flex items-center justify-center font-display font-bold border-3 border-foreground ${
                    step >= s ? "bg-primary text-primary-foreground" : "bg-background"
                  }`}
                >
                  {step > s ? <CheckCircle size={20} /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 ${step > s ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Project Details */}
          {step === 1 && (
            <div className="space-y-8">
              {showTemplates ? (
                <div className="bg-secondary border-3 border-foreground brutal-shadow p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold text-xl">Select Template</h2>
                    <Button variant="outline" onClick={() => setShowTemplates(false)}>
                      Cancel
                    </Button>
                  </div>
                  <ProjectTemplateSelector 
                    onSelectTemplate={handleTemplateSelect}
                    category={category}
                  />
                </div>
              ) : (
                <div className="bg-secondary border-3 border-foreground brutal-shadow p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold text-xl">Project Details</h2>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowTemplates(true)}
                      className="gap-2"
                    >
                      <FileText size={16} />
                      Use Template
                    </Button>
                  </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block font-display font-bold mb-2">Project Title</label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="e.g., E-Commerce Website Redesign"
                      className="w-full h-14 px-4 border-3 border-foreground bg-background font-body focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block font-display font-bold mb-2">Description</label>
                    <textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Describe your project, goals, and any specific requirements..."
                      rows={5}
                      className="w-full px-4 py-3 border-3 border-foreground bg-background font-body focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  <div>
                    <label className="block font-display font-bold mb-2">Category</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`p-4 border-3 border-foreground font-display text-left transition-all ${
                            category === cat
                              ? "bg-primary text-primary-foreground brutal-shadow-sm"
                              : "bg-background hover:bg-secondary"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-display font-bold mb-2">Billing Type</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setBillingType("fixed")}
                        className={`flex-1 p-4 border-3 border-foreground font-display transition-all ${
                          billingType === "fixed"
                            ? "bg-primary text-primary-foreground brutal-shadow-sm"
                            : "bg-background hover:bg-secondary"
                        }`}
                      >
                        Fixed Price
                      </button>
                      <button
                        onClick={() => setBillingType("hourly")}
                        className={`flex-1 p-4 border-3 border-foreground font-display transition-all ${
                          billingType === "hourly"
                            ? "bg-primary text-primary-foreground brutal-shadow-sm"
                            : "bg-background hover:bg-secondary"
                        }`}
                      >
                        Hourly
                      </button>
                    </div>
                    {billingType === "hourly" && (
                      <div className="mt-4">
                        <label className="block font-display font-bold mb-2">Hourly Rate ($)</label>
                        <input
                          type="number"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          placeholder="e.g., 50"
                          className="w-full h-14 px-4 border-3 border-foreground bg-background font-body focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              <div className="flex justify-end">
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={() => setStep(2)}
                  disabled={!projectTitle || !category}
                >
                  Continue to Milestones
                  <ArrowRight size={20} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Milestones */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="bg-secondary border-3 border-foreground brutal-shadow p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl">Define Milestones</h2>
                    <p className="text-muted-foreground">Break your project into clear, deliverable milestones</p>
                  </div>
                  <div className="text-right">
                    <div className="label-mono text-muted-foreground">Total Budget</div>
                    <div className="font-display font-bold text-2xl">${totalBudget.toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-6">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="bg-background border-3 border-foreground p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold">
                            {index + 1}
                          </div>
                          <span className="font-display font-bold">Milestone {index + 1}</span>
                        </div>
                        {milestones.length > 1 && (
                          <button
                            onClick={() => removeMilestone(milestone.id)}
                            className="p-2 hover:bg-destructive/10 text-destructive transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-display font-bold mb-1">Title</label>
                          <input
                            type="text"
                            value={milestone.title}
                            onChange={(e) => updateMilestone(milestone.id, "title", e.target.value)}
                            placeholder="e.g., Design Phase"
                            className="w-full h-12 px-4 border-3 border-foreground bg-secondary font-body focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-display font-bold mb-1">Deliverables</label>
                          <textarea
                            value={milestone.description}
                            onChange={(e) => updateMilestone(milestone.id, "description", e.target.value)}
                            placeholder="List specific deliverables that will be verified..."
                            rows={3}
                            className="w-full px-4 py-3 border-3 border-foreground bg-secondary font-body focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-display font-bold mb-1">Budget ($)</label>
                          <input
                            type="number"
                            value={milestone.amount || ""}
                            onChange={(e) => updateMilestone(milestone.id, "amount", parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full h-12 px-4 border-3 border-foreground bg-secondary font-body focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-display font-bold mb-1">Deadline</label>
                          <input
                            type="date"
                            value={milestone.deadline}
                            onChange={(e) => updateMilestone(milestone.id, "deadline", e.target.value)}
                            className="w-full h-12 px-4 border-3 border-foreground bg-secondary font-body focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addMilestone}
                    className="w-full p-4 border-3 border-dashed border-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2 font-display"
                  >
                    <Plus size={20} />
                    Add Another Milestone
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={() => setStep(3)}
                  disabled={milestones.some((m) => !m.title || !m.amount)}
                >
                  Review & Lock Funds
                  <ArrowRight size={20} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-8">
              {/* Project Summary */}
              <div className="bg-secondary border-3 border-foreground brutal-shadow p-8">
                <h2 className="font-display font-bold text-xl mb-6">Review Your Project</h2>
                
                <div className="space-y-6">
                  <div>
                    <div className="label-mono text-muted-foreground mb-1">Project Title</div>
                    <div className="font-display font-bold text-2xl">{projectTitle}</div>
                  </div>

                  <div>
                    <div className="label-mono text-muted-foreground mb-1">Category</div>
                    <div className="inline-block px-3 py-1 bg-primary text-primary-foreground font-display">{category}</div>
                  </div>

                  <div>
                    <div className="label-mono text-muted-foreground mb-1">Description</div>
                    <div className="text-muted-foreground">{projectDescription}</div>
                  </div>
                </div>
              </div>

              {/* Milestones Summary */}
              <div className="bg-background border-3 border-foreground brutal-shadow p-8">
                <h3 className="font-display font-bold text-lg mb-6">Milestones ({milestones.length})</h3>
                
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.id} className="flex items-center gap-4 p-4 bg-secondary border-3 border-foreground">
                      <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-display font-bold">{milestone.title}</div>
                        <div className="text-sm text-muted-foreground">Due: {milestone.deadline}</div>
                      </div>
                      <div className="font-display font-bold text-xl">${milestone.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t-3 border-foreground flex justify-between items-center">
                  <span className="font-display font-bold text-xl">Total to Lock</span>
                  <span className="font-display font-bold text-3xl">${totalBudget.toLocaleString()}</span>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-warning/10 border-3 border-warning p-6 flex gap-4">
                <Info className="text-warning flex-shrink-0" size={24} />
                <div>
                  <div className="font-display font-bold mb-1">How Funds Are Protected</div>
                  <p className="text-muted-foreground text-sm">
                    Your funds will be locked in a smart contract. They can only be released when 
                    milestones are verified complete, or returned to you if work isn't delivered. 
                    Neither party can access funds unilaterally.
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button 
                  variant="hero" 
                  size="xl"
                  onClick={async () => {
                    if (!projectTitle || !category || milestones.some(m => !m.title || !m.amount)) {
                      toast.error("Please complete all required fields");
                      return;
                    }

                    if (!user) {
                      toast.error("You must be logged in to create a project");
                      return;
                    }
                    
                    try {
                      // Prepare milestone data - ensure all required fields are present
                      const milestoneData = milestones
                        .filter((m) => m.title.trim() && m.amount > 0) // Only include valid milestones
                        .map((m) => {
                          // Calculate default deadline: 30 days from now, or use milestone deadline if provided
                          const defaultDeadline = new Date();
                          defaultDeadline.setDate(defaultDeadline.getDate() + 30);
                          const deadlineDate = m.deadline 
                            ? new Date(m.deadline)
                            : defaultDeadline;
                          
                          return {
                            title: m.title.trim(),
                            description: m.description.trim() || m.title.trim(), // Use title as fallback for description
                            amount: m.amount,
                            deadline: deadlineDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
                          };
                        });

                      if (milestoneData.length === 0) {
                        toast.error("Please add at least one valid milestone with title and amount");
                        return;
                      }

                      // Create project using the hook (saves to database)
                      const project = await createProject.mutateAsync({
                        title: projectTitle.trim(),
                        description: projectDescription.trim() || projectTitle.trim(),
                        category: category,
                        deadline: undefined, // Project-level deadline is optional
                        skills_required: [],
                        milestones: milestoneData,
                      });
                      
                      // Success toast is already shown by the hook, but show additional confirmation
                      console.log('✅ Project created successfully:', project.id);
                      
                      // Reset form
                      setProjectTitle("");
                      setProjectDescription("");
                      setCategory("");
                      setBillingType("fixed");
                      setHourlyRate("");
                      setMilestones([{ id: "1", title: "", description: "", amount: 0, deadline: "" }]);
                      setStep(1);
                      
                      // Navigate to project detail page
                      setTimeout(() => {
                        navigate(`/client/project/${project.id}`);
                      }, 1000);
                    } catch (error: any) {
                      console.error('Project creation error:', error);
                      // Error toast is handled by the hook, but show additional info if needed
                      if (!error.message?.includes('Must be logged in')) {
                        toast.error(`Failed to create project: ${error.message || 'Unknown error'}`);
                      }
                    }
                  }}
                  disabled={createProject.isPending}
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      Lock ${totalBudget.toLocaleString()} & Post Project
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateProject;
