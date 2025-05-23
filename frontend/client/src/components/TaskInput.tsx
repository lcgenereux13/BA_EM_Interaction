import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";

interface TaskInputProps {
  onSubmit: (task: string) => void;
  isSubmitting: boolean;
}

export function TaskInput({ onSubmit, isSubmitting }: TaskInputProps) {
  const [taskInput, setTaskInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskInput.trim() && !isSubmitting) {
      onSubmit(taskInput);
      setTaskInput("");
      setFileName(null);
    }
  };

  // Handle Enter key press (Ctrl+Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (taskInput.trim() && !isSubmitting) {
        handleSubmit(e);
      }
    }
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    
    // Read text file contents
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTaskInput(content);
    };
    reader.readAsText(file);
  };
  
  // Trigger file input click
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="border border-border rounded-md flex flex-col overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="text-sm font-medium">Research Input</div>
          {fileName && (
            <div className="flex items-center text-xs text-muted-foreground">
              <i className="ri-file-text-line mr-1"></i>
              <span>{fileName}</span>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 ml-1"
                onClick={() => {
                  setFileName(null);
                  setTaskInput("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <i className="ri-close-line text-xs"></i>
              </Button>
            </div>
          )}
        </div>
        
        <Textarea
          placeholder="Paste your research text or attach a file. Our agents will create a draft based on this content..."
          className={cn(
            "min-h-[150px] max-h-[300px] p-3 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
            fileName && "bg-muted/10"
          )}
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
        />
        
        <div className="border-t border-border p-2 flex justify-between items-center bg-muted/40">
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".txt,.md,.doc,.docx,.rtf,.csv,.json" 
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="gap-1 text-xs"
              onClick={handleAttachClick}
              disabled={isSubmitting}
            >
              <i className="ri-attachment-2"></i>
              <span>Attach Research</span>
            </Button>
            
            <span className="text-xs text-muted-foreground">
              Press Ctrl+Enter to generate page
            </span>
          </div>
          
          <Button 
            type="submit"
            size="sm"
            className="px-4"
            disabled={!taskInput.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <i className="ri-loader-4-line animate-spin"></i>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span>Generate Page</span>
                <i className="ri-file-transfer-line"></i>
              </div>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
