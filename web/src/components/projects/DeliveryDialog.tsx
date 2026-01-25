import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDelivery } from '@/hooks/useDeliveries';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface DeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestoneId: string;
  projectId: string;
  deliveredToId: string;
}

export const DeliveryDialog = ({
  open,
  onOpenChange,
  milestoneId,
  projectId,
  deliveredToId,
}: DeliveryDialogProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createDelivery = useCreateDelivery();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast.error('Please upload at least one file');
      return;
    }

    setUploading(true);

    try {
      // Upload files
      const fileUrls: string[] = [];
      
      for (const file of files) {
        const fileName = `deliveries/${projectId}/${milestoneId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);
        
        fileUrls.push(urlData.publicUrl);
      }

      if (fileUrls.length === 0) {
        throw new Error('Failed to upload files');
      }

      // Create delivery
      await createDelivery.mutateAsync({
        milestone_id: milestoneId,
        project_id: projectId,
        delivered_to: deliveredToId,
        delivery_files: fileUrls,
        delivery_notes: notes.trim() || null,
      });
      
      setFiles([]);
      setNotes('');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to submit delivery: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Delivery</DialogTitle>
          <DialogDescription>
            Upload your completed work files for this milestone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Delivery Files *</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-3 border-dashed border-foreground p-8 text-center cursor-pointer hover:bg-secondary transition-colors"
            >
              <Upload className="mx-auto mb-2 text-muted-foreground" size={32} />
              <p className="text-sm text-muted-foreground">Click to upload files</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-secondary border-3 border-foreground"
                  >
                    <FileText size={16} />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Delivery Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this delivery..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="accent" 
              disabled={files.length === 0 || uploading || createDelivery.isPending}
            >
              {(uploading || createDelivery.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Delivery'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
