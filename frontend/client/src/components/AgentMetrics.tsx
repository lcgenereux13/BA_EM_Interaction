import { Agent } from "@shared/schema";

interface AgentMetricsProps {
  agent: Agent;
  tasksCompleted: number;
  totalTasks: number;
  processingTime: number;
}

export function AgentMetrics({ 
  agent, 
  tasksCompleted, 
  totalTasks, 
  processingTime 
}: AgentMetricsProps) {
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
  
  // Get progress bar color
  const getProgressBarColor = () => {
    switch (agent.color) {
      case "#0078D4": return "bg-primary";
      case "#107C10": return "bg-accent";
      case "#FFB900": return "bg-warning";
      case "#E81123": return "bg-error";
      default: return "bg-neutral-600";
    }
  };
  
  // Format processing time in minutes and seconds
  const formatProcessingTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };
  
  // Calculate percentage for progress bar
  const progressPercentage = totalTasks > 0 
    ? Math.round((tasksCompleted / totalTasks) * 100) 
    : 0;
  
  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
      <div className="flex items-center mb-3">
        <div className={`h-8 w-8 rounded-full text-white flex items-center justify-center mr-2 ${getIconBgColor()}`}>
          <i className={agent.icon}></i>
        </div>
        <h3 className="font-medium dark:text-neutral-200">{agent.name}</h3>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Tasks Completed</p>
          <div className="flex justify-between items-center">
            <p className="font-medium dark:text-neutral-300">{tasksCompleted}/{totalTasks}</p>
            <div className="w-2/3 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
              <div 
                className={`${getProgressBarColor()} h-2 rounded-full`} 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Processing Time</p>
          <p className="font-medium dark:text-neutral-300">{formatProcessingTime(processingTime)}</p>
        </div>
      </div>
    </div>
  );
}
