import { cn } from "@/lib/utils";
import { Agent } from "@shared/schema";

interface AgentListItemProps {
  agent: Agent;
  isActive?: boolean;
  onClick?: () => void;
}

export function AgentListItem({ agent, isActive = false, onClick }: AgentListItemProps) {
  // Map status to a display class
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-success";
      case "working":
        return "bg-primary";
      case "standby":
        return "bg-warning";
      case "idle":
      default:
        return "bg-neutral-400";
    }
  };

  // Get border color based on agent color
  const getBorderClass = () => {
    // Extract color from hex and find the corresponding border class
    switch (agent.color) {
      case "#0078D4": return "border-agent-1";
      case "#107C10": return "border-agent-2";
      case "#FFB900": return "border-agent-3";
      case "#E81123": return "border-agent-4";
      default: return "border-neutral-300";
    }
  };

  // Get background color for agent icon
  const getIconBgColor = () => {
    switch (agent.color) {
      case "#0078D4": return "bg-primary";
      case "#107C10": return "bg-accent";
      case "#FFB900": return "bg-warning";
      case "#E81123": return "bg-error";
      default: return "bg-neutral-600";
    }
  };

  return (
    <div 
      className={cn(
        "agent-item p-3 rounded-lg cursor-pointer mb-2 border-l-4",
        getBorderClass(),
        isActive ? "bg-neutral-100 dark:bg-neutral-800" : ""
      )}
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className={cn("h-10 w-10 rounded-full text-white flex items-center justify-center mr-3", getIconBgColor())}>
          <i className={cn(agent.icon, "text-lg")}></i>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-neutral-800 dark:text-neutral-200">{agent.name}</h3>
            <span className={cn("status-badge text-white text-xs px-2 py-1 rounded-full", getStatusClass(agent.status))}>
              {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{agent.role}</p>
        </div>
      </div>
    </div>
  );
}
