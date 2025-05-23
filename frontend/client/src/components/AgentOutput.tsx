import { formatTimestamp, getAgentBgColor, getAgentColor } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface AgentOutputProps {
  agentName: string;
  agentIcon: string;
  content: string;
  timestamp: string;
  agentColor: string;
  isNew?: boolean;
}

export function AgentOutput({ 
  agentName, 
  agentIcon, 
  content, 
  timestamp, 
  agentColor,
  isNew = false 
}: AgentOutputProps) {
  const { bgColor, borderColor } = getAgentColor(agentColor);
  
  return (
    <div className={cn(
      "agent-output p-3 rounded-lg border-l-4",
      bgColor,
      borderColor,
      isNew && "new"
    )}>
      <div className="flex items-center mb-2">
        <div className={cn("h-8 w-8 rounded-full text-white flex items-center justify-center mr-2", getAgentBgColor(agentName))}>
          <i className={agentIcon}></i>
        </div>
        <div>
          <span className="font-medium dark:text-neutral-200">{agentName}</span>
          <span className="text-neutral-500 dark:text-neutral-400 text-xs ml-2">{formatTimestamp(timestamp)}</span>
        </div>
      </div>
      <div className="markdown-content dark:text-neutral-300">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

export function SystemMessage({ content, timestamp }: { content: string; timestamp: string }) {
  return (
    <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
      <div className="flex items-center mb-2">
        <div className="h-8 w-8 rounded-full bg-neutral-600 text-white flex items-center justify-center mr-2">
          <i className="ri-computer-line"></i>
        </div>
        <div>
          <span className="font-medium dark:text-neutral-200">System</span>
          <span className="text-neutral-500 dark:text-neutral-400 text-xs ml-2">{formatTimestamp(timestamp)}</span>
        </div>
      </div>
      <div className="markdown-content">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
