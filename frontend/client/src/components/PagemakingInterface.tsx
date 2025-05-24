import { useState, useRef, useEffect } from "react";
import { TaskInput } from "./TaskInput";
import { DocumentSection, DraftDocument } from "./DocumentSection";
import { AgentOutputMessage, SystemMessage as SystemMessageType, Agent } from "@shared/schema";
import { useCrewAI } from "@/hooks/useCrewAI";
import { Button } from "./ui/button";
import { formatTimestamp } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// Page draft structure with sections
interface PageDraft {
  title: string;
  sections: {
    heading: string;
    content: string;
  }[];
  feedback?: string;
  iteration: number;
  agentId: number; // 1 for Analyst, 3 for Manager
}

export function PagemakingInterface() {
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
  const [drafts, setDrafts] = useState<PageDraft[]>([]);
  const [showDiffIndex, setShowDiffIndex] = useState<number | null>(null);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [maxIterations, setMaxIterations] = useState(5);
  const [completionStatus, setCompletionStatus] = useState<'in-progress' | 'complete' | 'none'>('none');
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevDraftCount = useRef(0);

  useEffect(() => {
    if (drafts.length > prevDraftCount.current) {
      setShowDiffIndex(drafts.length - 1);
      const timer = setTimeout(() => setShowDiffIndex(null), 5000);
      prevDraftCount.current = drafts.length;
      return () => clearTimeout(timer);
    }
    prevDraftCount.current = drafts.length;
  }, [drafts]);
  
  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      // Add a small delay to ensure content is fully rendered before scrolling
      setTimeout(() => {
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
        if (isAtBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }, 50);
    }
  }, [messages, streamingMessage]);
  
  // Simulate the iterative process when a task is submitted
  useEffect(() => {
    if (streamingMessage !== null && currentAgent) {
      // The first message is from the Analyst (initial draft)
      if (drafts.length === 0 && currentAgent.name === "Research Agent") {
        // After analyst completes the first draft
        if (streamingMessage.includes("Here's my initial draft") || 
            streamingMessage.includes("Based on the research")) {
          setTimeout(() => {
            // Create first draft from Analyst
            const newDraft: PageDraft = {
              title: "Draft Page",
              sections: [
                { 
                  heading: "Introduction", 
                  content: "This is the introduction section based on the provided research materials." 
                },
                { 
                  heading: "Key Findings", 
                  content: "These are the main points extracted from the research data." 
                },
                { 
                  heading: "Recommendations", 
                  content: "Based on the analysis, here are recommended actions." 
                }
              ],
              iteration: 1,
              agentId: 1 // Analyst
            };
            setDrafts([newDraft]);
            setCurrentIteration(1);
            setCompletionStatus('in-progress');
          }, 2000);
        }
      }
      
      // Manager feedback (after first draft)
      if (drafts.length === 1 && currentAgent.name === "Editor Agent") {
        // Create manager feedback
        setTimeout(() => {
          const updatedDrafts = [...drafts];
          updatedDrafts[0].feedback = "The draft needs work on the introduction. Please expand the key findings section with more detailed analysis from the research. Consider adding a conclusion section.";
          setDrafts(updatedDrafts);
          
          // Create second draft from Analyst (responding to feedback)
          setTimeout(() => {
            const analystRevision: PageDraft = {
              title: "Revised Draft",
              sections: [
                { 
                  heading: "Introduction", 
                  content: "This introduction has been expanded to provide more context based on the research materials." 
                },
                { 
                  heading: "Key Findings", 
                  content: "The key findings have been elaborated with more specific data points and insights from the research." 
                },
                { 
                  heading: "Analysis", 
                  content: "This new section provides deeper analysis of the implications of our findings." 
                },
                { 
                  heading: "Recommendations", 
                  content: "Recommendations have been refined based on the more detailed analysis." 
                },
                { 
                  heading: "Conclusion", 
                  content: "A conclusion has been added to summarize the key points and next steps." 
                }
              ],
              iteration: 2,
              agentId: 1 // Analyst
            };
            setDrafts([...updatedDrafts, analystRevision]);
            setCurrentIteration(2);
          }, 3000);
        }, 2000);
      }
      
      // Manager final review (after second draft)
      if (drafts.length === 2 && currentAgent.name === "QA Agent") {
        setTimeout(() => {
          const updatedDrafts = [...drafts];
          updatedDrafts[1].feedback = "This revision is much better. The introduction flows well and the key findings section is properly detailed. The new analysis section adds significant value. Approved for publication.";
          
          // Final version from Manager with approval
          const managerApproval: PageDraft = {
            title: "Final Approved Version",
            sections: [
              { 
                heading: "Introduction", 
                content: "The introduction has been polished for clarity and engagement." 
              },
              { 
                heading: "Key Findings", 
                content: "Key findings have been organized in a logical flow with supporting evidence." 
              },
              { 
                heading: "Analysis", 
                content: "The analysis section has been strengthened with clearer connections to the research." 
              },
              { 
                heading: "Recommendations", 
                content: "Recommendations have been prioritized and clarified for actionability." 
              },
              { 
                heading: "Conclusion", 
                content: "The conclusion effectively summarizes the document and provides clear next steps." 
              }
            ],
            iteration: 3,
            agentId: 3, // Manager
            feedback: "This document has been reviewed and approved. It effectively addresses the research requirements and presents information in a clear, actionable format."
          };
          
          setDrafts([...updatedDrafts, managerApproval]);
          setCurrentIteration(3);
          setCompletionStatus('complete');
        }, 3000);
      }
    }
  }, [streamingMessage, currentAgent, drafts]);
  
  // Handle research submission
  const handleResearchSubmit = (research: string) => {
    // Reset drafts and status
    setDrafts([]);
    setCurrentIteration(0);
    setCompletionStatus('none');
    
    // Send task to agents
    sendTask(research);
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
  
  return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="chat-container p-6 pb-20" ref={chatContainerRef}>
            {messages.length === 0 && !streamingMessage ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <i className="ri-file-text-line text-primary text-2xl"></i>
                </div>
                <h2 className="text-xl font-semibold mb-2">Pagemaking Crew</h2>
                <p className="text-muted-foreground max-w-md">
                  Paste your research text or attach a file below. Our Analyst and Manager agents will
                  work together to create a professionally structured page based on your research.
                </p>
                
                <div className="flex items-center mt-6 p-3 bg-muted/30 rounded-md">
                  <div className="w-10 h-10 rounded-full bg-agent-1 text-white flex items-center justify-center mr-3 text-lg">
                    A
                  </div>
                  <div>
                    <h3 className="font-medium text-agent-1">Analyst</h3>
                    <p className="text-xs text-muted-foreground">Creates initial drafts based on research</p>
                  </div>
                  
                  <div className="mx-4 text-muted-foreground">
                    <i className="ri-arrow-left-right-line"></i>
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-agent-3 text-white flex items-center justify-center mr-3 text-lg">
                    M
                  </div>
                  <div>
                    <h3 className="font-medium text-agent-3">Manager</h3>
                    <p className="text-xs text-muted-foreground">Reviews and provides feedback</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Only show agent messages (not system messages) */}
                {messages
                  .filter(message => 
                    message.type === "agent_output" && 
                    (message.agentId === 1 || message.agentId === 3) // Analyst (1) or Manager (3)
                  )
                  .map((message, index) => {
                    if (message.type !== "agent_output") return null;
                    
                    // Determine agent type for styling
                    const isManager = message.agentId === 3;
                    const agentIndex = isManager ? 3 : 1;
                    const agentName = isManager ? "Manager" : "Analyst";
                    
                    return (
                      <div key={`message-${index}`} 
                           className={`p-4 rounded-lg border-2 ${isManager ? 'bg-agent-3/10 border-agent-3' : 'bg-agent-1/10 border-agent-1'}`}>
                        <div className="flex items-center mb-3">
                          <div className={`w-8 h-8 rounded-full ${isManager ? 'bg-agent-3' : 'bg-agent-1'} text-white flex items-center justify-center mr-2`}>
                            {isManager ? 'M' : 'A'}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className={`font-medium ${isManager ? 'text-agent-3' : 'text-agent-1'}`}>
                                {agentName}
                              </span>
                              <span className="text-muted-foreground text-xs ml-2">
                                {formatTimestamp(message.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {isManager ? "Reviewing and providing feedback" : "Analyzing research and drafting"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="markdown-content pl-10 overflow-y-auto max-h-[400px] pr-2">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  })
                }
                
                {/* Currently streaming message */}
                {currentAgent && streamingMessage !== null && (
                  <div className={`p-4 rounded-lg border-2 ${
                    currentAgent.id === 3 ? 'bg-agent-3/10 border-agent-3 border-dashed' : 'bg-agent-1/10 border-agent-1 border-dashed'
                  }`}>
                    <div className="flex items-center mb-3">
                      <div className={`w-8 h-8 rounded-full ${
                        currentAgent.id === 3 ? 'bg-agent-3' : 'bg-agent-1'
                      } text-white flex items-center justify-center mr-2`}>
                        {currentAgent.id === 3 ? 'M' : 'A'}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className={`font-medium ${
                            currentAgent.id === 3 ? 'text-agent-3' : 'text-agent-1'
                          }`}>
                            {currentAgent.id === 3 ? 'Manager' : 'Analyst'}
                          </span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {formatTimestamp(new Date().toISOString())}
                          </span>
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                            Writing...
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {currentAgent.id === 3 ? "Reviewing and providing feedback" : "Analyzing research and drafting"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="markdown-content pl-10 overflow-y-auto max-h-[400px] pr-2">
                      <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area */}
        <div className="border-t border-border p-4 sticky bottom-0 bg-background">
          <TaskInput
            onSubmit={handleResearchSubmit}
            isSubmitting={isLoading || streamingMessage !== null || completionStatus === 'in-progress'}
          />
          
          {(messages.length > 0 || streamingMessage !== null) && (
            <div className="flex justify-between mt-2">
              <div>
                {completionStatus === 'in-progress' && (
                  <div className="text-xs text-muted-foreground flex items-center">
                    <i className="ri-time-line mr-1"></i>
                    <span>Iteration {currentIteration} of {maxIterations}</span>
                    <div className="w-24 h-1 bg-muted ml-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(currentIteration / maxIterations) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {completionStatus === 'complete' && (
                  <div className="text-xs text-success flex items-center">
                    <i className="ri-check-line mr-1"></i>
                    <span>Document completed in {currentIteration} iterations</span>
                  </div>
                )}
              </div>
              
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
      
      {/* Draft Document Sidebar */}
      <div className="w-[40%] border-l border-border p-4 overflow-y-auto hidden lg:block">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Document Drafts</h2>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <span className={`text-xs px-2 py-1 rounded ${
                completionStatus === 'complete' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
              }`}>
                {completionStatus === 'complete' ? 'Final Version Ready' : `Iteration ${currentIteration}`}
              </span>
            )}
            {currentIteration > 0 && (
              <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-1 rounded-full">
                {currentIteration}/{maxIterations}
              </span>
            )}
          </div>
        </div>
        
        {/* Document Drafts Section - 70% height */}
        <div className="mb-6" style={{ height: '70%', overflowY: 'auto' }}>
          {drafts.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-border rounded-md text-muted-foreground">
              <i className="ri-draft-line text-2xl mb-2"></i>
              <p>Document drafts will appear here as agents work</p>
            </div>
          ) : (
            <>
              {drafts.map((draft, index) => (
                <DraftDocument
                  key={`draft-${index}`}
                  title={draft.title}
                  sections={draft.sections}
                  feedback={draft.feedback}
                  agentId={draft.agentId}
                  iteration={draft.iteration}
                  isActive={index === drafts.length - 1}
                  prevSections={index > 0 ? drafts[index - 1].sections : undefined}
                  showDiff={index === showDiffIndex}
                />
              ))}
            </>
          )}
        </div>
        
        {/* Dedicated Feedback Section - 30% height */}
        <div className="border border-border rounded-md p-4 mb-4" style={{ height: '30%', overflowY: 'auto' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-medium">Feedback History</h3>
            {drafts.filter(draft => draft.feedback).length > 0 ? (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {drafts.filter(draft => draft.feedback).length} items
              </span>
            ) : (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                No feedback yet
              </span>
            )}
          </div>
          
          {drafts.filter(draft => draft.feedback).length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <i className="ri-chat-1-line text-xl mb-2"></i>
              <p className="text-sm">Feedback will appear here as agents review documents</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {drafts.filter(draft => draft.feedback).map((draft, index) => (
                <div key={`feedback-${index}`} 
                  className={`p-3 rounded border ${
                    draft.agentId === 3 ? 'border-agent-3 bg-agent-3/5' : 'border-agent-1 bg-agent-1/5'
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
                      draft.agentId === 3 ? 'bg-agent-3' : 'bg-agent-1'
                    }`}>
                      {draft.agentId === 3 ? 'M' : 'A'}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium">
                          {draft.agentId === 3 ? 'Manager' : 'Analyst'} Feedback
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Iteration {draft.iteration}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs pl-8">
                    <ReactMarkdown>{draft.feedback}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {completionStatus === 'complete' && (
          <div className="flex justify-center mt-4">
            <Button className="gap-1">
              <i className="ri-download-line"></i>
              <span>Download Final Document</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}