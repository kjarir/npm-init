import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProposal } from '@/hooks/useProposals';
import { Loader2 } from 'lucide-react';

interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectBudget?: number;
}

export const ProposalDialog = ({ open, onOpenChange, projectId, projectBudget }: ProposalDialogProps) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState(projectBudget?.toString() || '');
  const [proposedTimeline, setProposedTimeline] = useState('');
  const createProposal = useCreateProposal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!coverLetter.trim() || !proposedBudget || !proposedTimeline) {
      return;
    }

    try {
      await createProposal.mutateAsync({
        project_id: projectId,
        cover_letter: coverLetter.trim(),
        proposed_budget: parseFloat(proposedBudget),
        proposed_timeline: parseInt(proposedTimeline),
      });
      
      setCoverLetter('');
      setProposedBudget(projectBudget?.toString() || '');
      setProposedTimeline('');
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Proposal</DialogTitle>
          <DialogDescription>
            Submit your proposal with your proposed budget and timeline for this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cover_letter">Cover Letter *</Label>
            <Textarea
              id="cover_letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Explain why you're the best fit for this project..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proposed_budget">Proposed Budget ($) *</Label>
              <Input
                id="proposed_budget"
                type="number"
                min="0"
                step="0.01"
                value={proposedBudget}
                onChange={(e) => setProposedBudget(e.target.value)}
                placeholder={projectBudget?.toString() || "0.00"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposed_timeline">Timeline (Days) *</Label>
              <Input
                id="proposed_timeline"
                type="number"
                min="1"
                value={proposedTimeline}
                onChange={(e) => setProposedTimeline(e.target.value)}
                placeholder="e.g., 7"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={createProposal.isPending}>
              {createProposal.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Proposal'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
