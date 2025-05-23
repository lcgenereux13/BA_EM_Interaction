import { useState } from "react";
import { Header } from "./Header";
import { AgentListItem } from "./AgentListItem";
import { StreamContainer } from "./StreamContainer";
import { TaskInput } from "./TaskInput";
import { AgentMetrics } from "./AgentMetrics";
import { useCrewAI } from "@/hooks/useCrewAI";
import { Agent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function Dashboard() {
  const { 
    agents, 
    messages, 
    metrics,
    isLoading, 
    sendTask, 
    clearMessages
  } = useCrewAI();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  
  const handleTaskSubmit = (taskContent: string) => {
    sendTask(taskContent)
      .catch(error => {
        toast({
          title: "Error",
          description: "Failed to send task: " + error.message,
          variant: "destructive"
        });
      });
  };
  
  const filteredMessages = selectedAgent !== null
    ? messages.filter(m => m.type === "system_message" || (m.type === "agent_output" && m.agentId === selectedAgent))
    : messages;
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
      <Header />
      
      <div className="flex-1 flex main-container">
        {/* Agents Sidebar */}
        <div className="w-80 md:w-96 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 agents-sidebar overflow-y-auto">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Agents</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Active crew members</p>
          </div>
          
          <div className="p-2">
            {isLoading ? (
              <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                <div className="animate-spin mb-2">
                  <i className="ri-loader-4-line text-2xl"></i>
                </div>
                <p>Loading agents...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                <i className="ri-error-warning-line text-2xl mb-2"></i>
                <p>No agents available</p>
              </div>
            ) : (
              agents.map((agent: Agent) => (
                <AgentListItem 
                  key={agent.id}
                  agent={agent}
                  isActive={selectedAgent === agent.id}
                  onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                />
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
            <button 
              className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
              disabled
            >
              <i className="ri-add-line"></i>
              <span>Add New Agent</span>
            </button>
          </div>
        </div>
        
        {/* Streaming Content Area */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900 p-4" id="content-area">
          <div className="max-w-4xl mx-auto">
            <StreamContainer 
              messages={filteredMessages} 
              onClear={clearMessages}
            />
            
            <TaskInput 
              onSubmit={handleTaskSubmit}
              isSubmitting={isLoading}
            />
            
            {/* Agent Metrics Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Agent Performance</h2>
              
              {isLoading ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <div className="animate-spin mb-2">
                    <i className="ri-loader-4-line text-2xl"></i>
                  </div>
                  <p>Loading metrics...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.slice(0, 4).map((agent: Agent) => (
                    <AgentMetrics 
                      key={agent.id}
                      agent={agent}
                      tasksCompleted={metrics[agent.id]?.tasksCompleted || 0}
                      totalTasks={metrics[agent.id]?.totalTasks || 0}
                      processingTime={metrics[agent.id]?.processingTime || 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
