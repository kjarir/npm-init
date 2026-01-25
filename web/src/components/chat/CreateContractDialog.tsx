import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProject } from '@/hooks/useProjects';
import { useCreateConversation } from '@/hooks/useChat';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freelancerId?: string;
  conversationId: string;
}

export const CreateContractDialog = ({
  open,
  onOpenChange,
  freelancerId,
  conversationId,
}: CreateContractDialogProps) => {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const createConversation = useCreateConversation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Development');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState([
    { title: '', description: '', amount: '', deadline: '' },
  ]);

  const handleAddMilestone = () => {
    setMilestones([...milestones, { title: '', description: '', amount: '', deadline: '' }]);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (milestones.length === 0 || milestones.some(m => !m.title.trim() || !m.amount)) {
      toast.error('Please add at least one milestone with title and amount');
      return;
    }

    try {
      const milestoneData = milestones.map((m) => ({
        title: m.title.trim(),
        description: m.description.trim(),
        amount: parseFloat(m.amount),
        deadline: m.deadline || undefined,
      }));

      const project = await createProject.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
        deadline: deadline || undefined,
        milestones: milestoneData,
      });

      // Update existing conversation with project_id if it exists
      if (project && freelancerId && conversationId) {
        try {
          const { error } = await supabase
            .from('conversations')
            .update({ project_id: project.id })
            .eq('id', conversationId);
          
          if (error) {
            console.error('Failed to update conversation:', error);
          }
        } catch (error) {
          console.error('Error updating conversation:', error);
        }
      }

      toast.success('Contract created successfully!');
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setBudget('');
      setDeadline('');
      setMilestones([{ title: '', description: '', amount: '', deadline: '' }]);
      
      // Navigate to project detail
      navigate(`/client/project/${project.id}`);
    } catch (error: any) {
      toast.error(`Failed to create contract: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contract</DialogTitle>
          <DialogDescription>
            Create a new project contract with milestones. Funds will be locked until milestones are completed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Build a responsive website"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project requirements..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 border-3 border-foreground bg-background font-body"
              >
                <option>Development</option>
                <option>Design</option>
                <option>Writing</option>
                <option>Marketing</option>
                <option>Video</option>
                <option>Data</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Milestones *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMilestone}>
                Add Milestone
              </Button>
            </div>

            {milestones.map((milestone, index) => (
              <div key={index} className="p-4 border-3 border-foreground bg-secondary space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold">Milestone {index + 1}</span>
                  {milestones.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMilestone(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Milestone title *"
                    value={milestone.title}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[index].title = e.target.value;
                      setMilestones(updated);
                    }}
                    required
                  />
                  <Textarea
                    placeholder="Description"
                    value={milestone.description}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[index].description = e.target.value;
                      setMilestones(updated);
                    }}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Amount ($) *"
                      value={milestone.amount}
                      onChange={(e) => {
                        const updated = [...milestones];
                        updated[index].amount = e.target.value;
                        setMilestones(updated);
                      }}
                      min="0"
                      step="0.01"
                      required
                    />
                    <Input
                      type="date"
                      placeholder="Deadline"
                      value={milestone.deadline}
                      onChange={(e) => {
                        const updated = [...milestones];
                        updated[index].deadline = e.target.value;
                        setMilestones(updated);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={createProject.isPending}>
              {createProject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Contract'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
