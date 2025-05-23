import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export interface DocumentSectionProps {
  id: string;
  title: string;
  content: string;
  isActive?: boolean;
  onClick?: () => void;
  feedback?: string;
  hasChanges?: boolean;
  agentId?: number;
  iteration?: number;
}

export function DocumentSection({ 
  id, 
  title, 
  content, 
  isActive = false, 
  onClick,
  feedback,
  hasChanges = false,
  agentId = 1,
  iteration = 0
}: DocumentSectionProps) {
  // Get agent color class based on agent ID
  const getAgentColorClass = () => {
    // We distinguish between Manager (3) and Analyst (1) 
    return agentId === 3 ? "border-agent-3" : "border-agent-1";
  };
  
  // Get agent name
  const getAgentName = () => {
    return agentId === 3 ? "Manager" : "Analyst";
  };
  
  return (
    <div 
      className={cn(
        "document-section",
        isActive && "active",
        hasChanges && getAgentColorClass()
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-agent-${agentId === 3 ? '3' : '1'}`}></div>
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className={`bg-agent-${agentId === 3 ? '3' : '1'} text-foreground text-xs px-2 py-0.5 rounded`}>
              {getAgentName()}
            </span>
          )}
          {iteration > 0 && (
            <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded">
              Iteration {iteration}
            </span>
          )}
        </div>
      </div>
      
      <div className="text-sm mt-2 border-l-2 pl-2 py-1 overflow-hidden" 
           style={{ borderColor: `var(--agent-${agentId === 3 ? '3' : '1'})` }}>
        <div className="markdown-content max-h-60 overflow-y-auto text-xs">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
      
      {feedback && (
        <div className="mt-2 pt-2 border-t text-xs">
          <div className="flex items-center gap-1 mb-1">
            <i className={`ri-feedback-line text-agent-${agentId === 3 ? '3' : '1'}`}></i>
            <p className={`font-medium text-agent-${agentId === 3 ? '3' : '1'}`}>
              Feedback ({getAgentName()}):
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{feedback}</p>
        </div>
      )}
    </div>
  );
}

export function DraftDocument({ 
  title, 
  sections, 
  feedback, 
  isActive = false, 
  onClick,
  agentId = 1,
  iteration = 0
}: {
  title: string;
  sections: {heading: string; content: string}[];
  feedback?: string;
  isActive?: boolean;
  onClick?: () => void;
  agentId?: number;
  iteration?: number;
}) {
  return (
    <div 
      className={cn(
        "p-4 border border-border rounded-md mb-4 transition-all",
        isActive && "border-primary bg-primary/5",
        agentId === 3 ? "border-agent-3 bg-agent-3/5" : "border-agent-1 bg-agent-1/5"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <div className={`w-6 h-6 rounded-full bg-agent-${agentId === 3 ? '3' : '1'} text-white flex items-center justify-center mr-2 text-xs`}>
            {agentId === 3 ? 'M' : 'A'}
          </div>
          <h3 className="font-medium">{title}</h3>
        </div>
        <div className="flex gap-2">
          {iteration > 0 && (
            <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
              Iteration {iteration}
            </span>
          )}
          <span className={`bg-agent-${agentId === 3 ? '3' : '1'} text-foreground text-xs px-2 py-1 rounded`}>
            {agentId === 3 ? 'Manager Review' : 'Analyst Draft'}
          </span>
        </div>
      </div>
      
      <div className="space-y-3 markdown-content max-h-96 overflow-y-auto p-2 bg-background border border-border rounded">
        {sections.map((section, index) => (
          <div key={index} className="mb-3">
            <h4 className="text-sm font-medium border-b pb-1 mb-1">{section.heading}</h4>
            <div className="text-xs text-muted-foreground">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
      
      {feedback && (
        <div className="mt-3 pt-2 border-t">
          <div className="flex items-center gap-1 mb-2">
            <i className={`ri-feedback-line text-agent-${agentId === 3 ? '3' : '1'}`}></i>
            <p className={`text-sm font-medium text-agent-${agentId === 3 ? '3' : '1'}`}>
              Feedback from {agentId === 3 ? 'Manager' : 'Analyst'}:
            </p>
          </div>
          <div className={`text-xs p-3 border-l-2 rounded bg-background/50 dark:bg-muted/20 border-agent-${agentId === 3 ? '3' : '1'}`}>
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
          {agentId === 3 && (
            <div className="mt-2 flex items-center text-xs text-success gap-1">
              <i className="ri-checkbox-circle-line"></i>
              <span>Document approved for publication</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DocumentSectionSkeleton() {
  return (
    <div className="document-section animate-pulse">
      <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
      <div className="h-2 bg-muted rounded w-full mb-1"></div>
      <div className="h-2 bg-muted rounded w-4/5"></div>
    </div>
  );
}