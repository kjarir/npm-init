import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRevision } from '@/hooks/useRevisions';
import { Loader2 } from 'lucide-react';

interface RevisionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestoneId?: string;
  requestedFromId: string;
}

export const RevisionRequestDialog = ({
  open,
  onOpenChange,
  projectId,
  milestoneId,
  requestedFromId,
}: RevisionRequestDialogProps) => {
  const [reason, setReason] = useState('');
  const createRevision = useCreateRevision();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) return;

    try {
      await createRevision.mutateAsync({
        project_id: projectId,
        milestone_id: milestoneId,
        requested_from: requestedFromId,
        reason: reason.trim(),
      });
      
      setReason('');
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Revision</DialogTitle>
          <DialogDescription>
            Explain what changes you need for this {milestoneId ? 'milestone' : 'project'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Revision Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe what needs to be changed or improved..."
              rows={5}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={createRevision.isPending}>
              {createRevision.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Request Revision'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
