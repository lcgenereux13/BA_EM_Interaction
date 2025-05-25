import { useState, useRef, useEffect } from "react";
import { TaskInput } from "./TaskInput";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import { DocumentSection } from "./DocumentSection";
import { AgentOutputMessage, SystemMessage as SystemMessageType, Agent } from "@shared/schema";
import { useCrewAI, DocumentSectionData } from "@/hooks/useCrewAI";
import { Button } from "./ui/button";
import { formatTimestamp } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export function ChatInterface() {
  const { 
    agents, 
    messages, 
    documentSections,
    currentAgent,
    streamingMessage,
    sendTask, 
    clearMessages,
    isLoading
  } = useCrewAI();
  
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    // Ensure the newest content is visible
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);
  
  // Handle document section click
  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
  };
  
  // Check if a message is new (less than 5 seconds old)
  const isNew = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    return now.getTime() - messageTime.getTime() < 5000;
  };

  // Get agent index for styling (1-4 range)
  const getAgentIndex = (agentId: number) => {
    return ((agentId - 1) % 4) + 1;
  };
  
  // Get agent initials for the bubble
  const getAgentInitials = (agentName: string) => {
    return agentName.split(' ').map(name => name[0]).join('').toUpperCase();
  };
  
  return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Messages */}
        <div className="absolute inset-0 overflow-y-auto">
          <div className="chat-container p-6 pb-32" ref={chatContainerRef}>
            {messages.length === 0 && !streamingMessage ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <i className="ri-team-fill text-primary text-2xl"></i>
                </div>
                <h2 className="text-xl font-semibold mb-2">CrewAI Chat Interface</h2>
                <p className="text-muted-foreground max-w-md">
                  Submit a task to see real-time outputs from the CrewAI agents. Each agent will contribute
                  specialized knowledge to complete your task.
                </p>
              </div>
            ) : (
              <>
                {/* Regular messages */}
                {messages.map((message, index) => (
                  <ChatMessage 
                    key={`message-${index}`} 
                    message={message} 
                    isNew={isNew(message.timestamp)} 
                  />
                ))}
                
                {/* Currently streaming message */}
                {currentAgent && streamingMessage !== null && (
                  <div className="message-bubble">
                    <div className={`agent-bubble agent-bubble-${getAgentIndex(currentAgent.id)}`} 
                         title={currentAgent.name}>
                      {getAgentInitials(currentAgent.name)}
                    </div>
                    
                    <div className="agent-instruction-tooltip">
                      <div className="font-medium mb-1">{currentAgent.name}</div>
                      <div className="text-xs text-muted-foreground">{currentAgent.role}</div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className={`font-medium text-agent-${getAgentIndex(currentAgent.id)}`}>
                          {currentAgent.name}
                        </span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {formatTimestamp(new Date().toISOString())}
                        </span>
                      </div>
                      
                      <div className={`agent-message agent-message-${getAgentIndex(currentAgent.id)} border-2`}>
                        <div className="markdown-content">
                          <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
        
        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4 bg-background">
          <TaskInput
            onSubmit={sendTask}
            isSubmitting={isLoading || streamingMessage !== null}
          />
          
          {(messages.length > 0 || streamingMessage !== null) && (
            <div className="flex justify-end mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearMessages}
                className="text-xs text-muted-foreground"
                disabled={streamingMessage !== null}
              >
                <i className="ri-delete-bin-line mr-1"></i>
                Clear Conversation
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Document Section Sidebar */}
      <div className="w-80 border-l border-border p-4 overflow-y-auto hidden lg:block">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Document Sections</h2>
          <p className="text-sm text-muted-foreground">
            Sections being updated by agents
          </p>
        </div>
        
        <div className="space-y-3">
          {documentSections.map((section: DocumentSectionData) => (
            <DocumentSection
              key={section.id}
              {...section}
              isActive={section.id === activeSection}
              onClick={() => handleSectionClick(section.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}