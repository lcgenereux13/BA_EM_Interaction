import { useEffect, useRef } from "react";
import { AgentOutput, SystemMessage } from "./AgentOutput";
import { AgentOutputMessage, SystemMessage as SystemMessageType } from "@shared/schema";

interface StreamContainerProps {
  messages: (AgentOutputMessage | SystemMessageType)[];
  onClear: () => void;
}

export function StreamContainer({ messages, onClear }: StreamContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Check if a message is new (less than 5 seconds old)
  const isNew = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    return now.getTime() - messageTime.getTime() < 5000;
  };
  
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Streaming Output</h2>
        <div className="flex space-x-2">
          <button 
            className="text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-primary transition-colors p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" 
            title="Clear All"
            onClick={onClear}
          >
            <i className="ri-eraser-line"></i>
          </button>
          <button 
            className="text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-primary transition-colors p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" 
            title="Download"
          >
            <i className="ri-download-line"></i>
          </button>
          <button 
            className="text-success hover:text-success/90 transition-colors p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" 
            title="Start"
          >
            <i className="ri-play-fill"></i>
          </button>
        </div>
      </div>
      
      <div className="space-y-4" ref={containerRef} id="stream-container" style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {messages.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
            <i className="ri-information-line text-2xl mb-2"></i>
            <p>No messages yet. Submit a task to see agent outputs.</p>
          </div>
        ) : (
          messages.map((message, index) => {
            if (message.type === "system_message") {
              return (
                <SystemMessage 
                  key={`system-${index}`}
                  content={message.content} 
                  timestamp={message.timestamp} 
                />
              );
            } else if (message.type === "agent_output") {
              return (
                <AgentOutput 
                  key={`agent-${message.agentId}-${index}`}
                  agentName={message.agentName}
                  agentIcon={message.agentIcon}
                  content={message.content}
                  timestamp={message.timestamp}
                  agentColor={message.agentColor}
                  isNew={isNew(message.timestamp)}
                />
              );
            }
            return null;
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
