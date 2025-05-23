import { cn } from "@/lib/utils";
import { AgentOutputMessage, SystemMessage as SystemMessageType } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import { formatTimestamp } from "@/lib/utils";

interface ChatMessageProps {
  message: AgentOutputMessage | SystemMessageType;
  isNew?: boolean;
}

export function ChatMessage({ message, isNew = false }: ChatMessageProps) {
  if (message.type === "system_message") {
    return <SystemMessage content={message.content} timestamp={message.timestamp} />;
  }

  // Get agent index for styling
  const getAgentIndex = (agentId: number) => {
    return ((agentId - 1) % 4) + 1; // Maps to 1-4 range
  };

  const agentIndex = getAgentIndex(message.agentId);
  const initials = message.agentName.split(' ').map(name => name[0]).join('').toUpperCase();

  return (
    <div className="message-bubble">
      <div className={`agent-bubble agent-bubble-${agentIndex}`} title={message.agentName}>
        {initials}
      </div>
      
      <div className="agent-instruction-tooltip">
        <div className="font-medium mb-1">{message.agentName}</div>
        <div className="text-xs text-muted-foreground">
          {getAgentRole(message.agentId)}
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <span className={`font-medium text-agent-${agentIndex}`}>{message.agentName}</span>
          <span className="text-muted-foreground text-xs ml-2">{formatTimestamp(message.timestamp)}</span>
        </div>
        
        <div className={cn(
          `agent-message agent-message-${agentIndex}`,
          isNew && "border-2"
        )}>
          <div className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAgentRole(agentId: number): string {
  switch ((agentId - 1) % 4) {
    case 0: return "Research and Information Gathering";
    case 1: return "Content Creation and Writing";
    case 2: return "Editing and Refinement";
    case 3: return "Quality Assurance and Testing";
    default: return "Agent";
  }
}

export function SystemMessage({ content, timestamp }: { content: string; timestamp: string }) {
  return (
    <div className="message-bubble">
      <div className="agent-bubble bg-neutral-500 dark:bg-neutral-600" title="System">
        <i className="ri-computer-line"></i>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <span className="font-medium">System</span>
          <span className="text-muted-foreground text-xs ml-2">{formatTimestamp(timestamp)}</span>
        </div>
        
        <div className="agent-message bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <div className="markdown-content">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator({ agentName, agentId }: { agentName: string; agentId: number }) {
  const agentIndex = ((agentId - 1) % 4) + 1;
  const initials = agentName.split(' ').map(name => name[0]).join('').toUpperCase();

  return (
    <div className="message-bubble">
      <div className={`agent-bubble agent-bubble-${agentIndex}`} title={agentName}>
        {initials}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <span className={`font-medium text-agent-${agentIndex}`}>{agentName}</span>
        </div>
        
        <div className={`agent-message agent-message-${agentIndex}`}>
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}