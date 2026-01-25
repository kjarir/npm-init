import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, FileText, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface EvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeId?: string;
  projectName?: string;
}

export const EvidenceDialog = ({
  open,
  onOpenChange,
  disputeId,
  projectName,
}: EvidenceDialogProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim() && files.length === 0) {
      toast.error("Please provide evidence description or upload files");
      return;
    }

    setUploading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success("Evidence submitted successfully");
      setDescription("");
      setFiles([]);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to submit evidence");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Evidence</DialogTitle>
          <DialogDescription>
            {projectName && `Dispute for: ${projectName}`}
            Provide evidence to support your case
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="font-display font-bold">Description</label>
            <Textarea
              placeholder="Describe your evidence and explain your position..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[150px] border-3 border-foreground"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <label className="font-display font-bold">Attach Files (Optional)</label>
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
                    <Button
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

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleSubmit}
              disabled={uploading || (!description.trim() && files.length === 0)}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Evidence
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
