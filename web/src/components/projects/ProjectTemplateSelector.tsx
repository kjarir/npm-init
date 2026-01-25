import { useState } from 'react';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectTemplates, useCreateTemplate } from '@/hooks/useProjectTemplates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProjectTemplateSelectorProps {
  onSelectTemplate: (templateData: any) => void;
  category?: string;
}

export const ProjectTemplateSelector = ({ onSelectTemplate, category }: ProjectTemplateSelectorProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: templates = [], isLoading } = useProjectTemplates(category);
  const createTemplate = useCreateTemplate();
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState(category || 'Development');

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // This would typically get the current project structure
    // For now, we'll use a placeholder
    const templateData = {
      milestones: [],
      category: templateCategory,
    };

    try {
      await createTemplate.mutateAsync({
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        template_data: templateData,
        is_public: false,
      });
      
      setTemplateName('');
      setTemplateDescription('');
      setShowCreateDialog(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg">Project Templates</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus size={16} className="mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-3 border-foreground bg-secondary p-6">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No templates available</p>
          <p className="text-sm">Create a template to reuse project structures</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.template_data)}
              className="p-4 bg-background border-3 border-foreground hover:bg-secondary transition-colors text-left"
            >
              <div className="font-display font-bold mb-1">{template.name}</div>
              {template.description && (
                <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{template.category}</span>
                {template.usage_count > 0 && (
                  <>
                    <span>•</span>
                    <span>Used {template.usage_count} times</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project Template</DialogTitle>
            <DialogDescription>
              Save the current project structure as a reusable template.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., E-commerce Website Template"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_description">Description</Label>
              <Textarea
                id="template_description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_category">Category</Label>
              <select
                id="template_category"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={createTemplate.isPending}>
                {createTemplate.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Template'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
