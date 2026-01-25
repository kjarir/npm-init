import { useRef, useState } from 'react';
import { Upload, FileText, Download, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectAttachments, useUploadProjectAttachment, useDeleteProjectAttachment } from '@/hooks/useProjectAttachments';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectAttachmentsProps {
  projectId: string;
  milestoneId?: string;
}

export const ProjectAttachments = ({ projectId, milestoneId }: ProjectAttachmentsProps) => {
  const { user } = useAuth();
  const { data: attachments = [], isLoading } = useProjectAttachments(projectId, milestoneId);
  const uploadAttachment = useUploadProjectAttachment();
  const deleteAttachment = useDeleteProjectAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadAttachment.mutateAsync({
        projectId,
        milestoneId,
        file,
      });
    } catch (error) {
      // Error handled by hook
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    
    try {
      await deleteAttachment.mutateAsync(attachmentId);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="bg-secondary border-3 border-foreground p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg">Project Attachments</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={16} className="mr-2" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No attachments yet</p>
          <p className="text-sm">Upload files related to this project</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-background border-3 border-foreground hover:bg-secondary transition-colors"
            >
              <FileText size={20} className="text-accent" />
              <div className="flex-1 min-w-0">
                <a
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display font-bold text-sm hover:text-accent transition-colors truncate block"
                >
                  {attachment.file_name}
                </a>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {attachment.file_size && (
                    <span>{(attachment.file_size / 1024).toFixed(1)} KB</span>
                  )}
                  {attachment.milestone && (
                    <>
                      <span>•</span>
                      <span>Milestone: {attachment.milestone.title}</span>
                    </>
                  )}
                </div>
                {attachment.description && (
                  <p className="text-xs text-muted-foreground mt-1">{attachment.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={attachment.file_url} download target="_blank" rel="noopener noreferrer">
                    <Download size={16} />
                  </a>
                </Button>
                {attachment.uploaded_by === user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment.id)}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
