import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { Agent, AgentOutputMessage, SystemMessage, WebSocketMessage, AgentMetricsMessage } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type AgentMetrics = {
  tasksCompleted: number;
  totalTasks: number;
  processingTime: number;
};

// Data structure for document sections
export interface DocumentSectionData {
  id: string;
  title: string;
  content: string;
  feedback: string;
  hasChanges: boolean;
  agentId?: number;
}

// Mapping of keywords to document sections for simulation
const KEYWORD_TO_SECTION_MAP: Record<string, string[]> = {
  'introduction': ['intro', 'overview', 'multi-agent', 'paradigm'],
  'setup': ['setup', 'configuration', 'install', 'initialize'],
  'integration': ['copilotkit', 'integration', 'react', 'component'],
  'streaming': ['websocket', 'streaming', 'real-time', 'socket'],
  'visualization': ['visualization', 'ui', 'interface', 'display']
};

export function useCrewAI() {
  const { messages: wsMessages, sendMessage, clearMessages: clearWsMessages, isConnected } = useWebSocket();
  const [filteredMessages, setFilteredMessages] = useState<(AgentOutputMessage | SystemMessage)[]>([]);
  const [metrics, setMetrics] = useState<Record<number, AgentMetrics>>({});
  const [documentSections, setDocumentSections] = useState<Record<string, DocumentSectionData>>({
    'introduction': {
      id: 'introduction',
      title: 'Introduction',
      content: 'Multi-agent system architecture overview and benefits.',
      feedback: '',
      hasChanges: false
    },
    'setup': {
      id: 'setup',
      title: 'Setup & Configuration',
      content: 'How to set up the CrewAI framework and configure agents.',
      feedback: '',
      hasChanges: false
    },
    'integration': {
      id: 'integration',
      title: 'CopilotKit Integration',
      content: 'Steps to integrate CrewAI with CopilotKit for real-time streaming.',
      feedback: '',
      hasChanges: false
    },
    'streaming': {
      id: 'streaming',
      title: 'WebSocket Streaming',
      content: 'Implementation of real-time streaming of agent outputs.',
      feedback: '',
      hasChanges: false
    },
    'visualization': {
      id: 'visualization',
      title: 'Agent Visualization',
      content: 'UI components for visualizing agent status and outputs.',
      feedback: '',
      hasChanges: false
    }
  });
  
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch agents
  const { 
    data: agents = [] as Agent[], 
    isLoading: isLoadingAgents,
    error: agentsError
  } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    enabled: isConnected
  });
  
  // Task submission mutation
  const { 
    mutateAsync: submitTask,
    isPending: isSubmittingTask
  } = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest('POST', '/api/tasks', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
    }
  });
  
  // Simulate token streaming for a more realistic effect
  const simulateStreaming = useCallback((agent: Agent, fullText: string, delay = 30) => {
    setCurrentAgent(agent);
    setStreamingMessage('');
    
    let index = 0;
    const timer = setInterval(() => {
      setStreamingMessage(prev => prev + fullText.charAt(index));
      index++;
      
      if (index >= fullText.length) {
        clearInterval(timer);
        setStreamingMessage(null);
        
        // Update document sections based on message content
        updateDocumentSections(fullText.toLowerCase(), agent);
      }
    }, delay);
    
    return () => clearInterval(timer);
  }, []);
  
  // Handle document section updates based on message content
  const updateDocumentSections = useCallback((content: string, agent: Agent) => {
    const sectionUpdates: Record<string, Partial<DocumentSectionData>> = {};
    
    // Check each section for relevant keywords
    Object.entries(KEYWORD_TO_SECTION_MAP).forEach(([sectionId, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        sectionUpdates[sectionId] = {
          hasChanges: true,
          feedback: generateFeedback(sectionId, agent.name),
          agentId: agent.id
        };
      }
    });
    
    // Apply updates if any sections matched
    if (Object.keys(sectionUpdates).length > 0) {
      setDocumentSections(prev => {
        const updated = { ...prev };
        Object.entries(sectionUpdates).forEach(([sectionId, updates]) => {
          updated[sectionId] = { ...updated[sectionId], ...updates };
        });
        return updated;
      });
    }
  }, []);
  
  // Generate feedback based on agent and section
  const generateFeedback = (sectionId: string, agentName: string): string => {
    const feedbackMap: Record<string, Record<string, string>> = {
      'Research Agent': {
        'introduction': 'Added references to latest research papers on multi-agent systems.',
        'setup': 'Included documentation links for configuration options.',
        'integration': 'Found official CopilotKit integration examples.',
        'streaming': 'Added WebSocket implementation best practices.',
        'visualization': 'Referenced visualization patterns from similar projects.'
      },
      'Content Writer': {
        'introduction': 'Improved clarity and structure of introduction.',
        'setup': 'Simplified setup instructions for better readability.',
        'integration': 'Added step-by-step integration guide with code examples.',
        'streaming': 'Clarified WebSocket event handling with examples.',
        'visualization': 'Enhanced component descriptions and usage examples.'
      },
      'Editor Agent': {
        'introduction': 'Fixed grammar and improved consistency in terminology.',
        'setup': 'Reorganized configuration section for better flow.',
        'integration': 'Improved code sample quality and added comments.',
        'streaming': 'Clarified WebSocket connection handling.',
        'visualization': 'Improved component naming consistency.'
      },
      'QA Agent': {
        'introduction': 'Verified technical accuracy of multi-agent description.',
        'setup': 'Tested setup instructions for completeness.',
        'integration': 'Validated integration examples against latest API.',
        'streaming': 'Checked WebSocket error handling for robustness.',
        'visualization': 'Validated UI component props and accessibility.'
      }
    };
    
    const agentFeedback = feedbackMap[agentName] || {};
    return agentFeedback[sectionId] || 'Updated content and improved quality.';
  };
  
  // Handle task submission - using only WebSocket for streaming
  const sendTask = useCallback(async (content: string) => {
    if (!isConnected) throw new Error("Not connected to server");
    
    // Generate unique task ID for idempotency
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Send task only through WebSocket with unique ID
    sendMessage({
      type: "task_submit",
      content,
      taskId // Add task ID for idempotency
    });
    
    // Simulate agent responses with a staggered approach for a more realistic experience
    if (Array.isArray(agents) && agents.length > 0) {
      const researchAgent = agents.find(a => a.name === "Research Agent") || agents[0];
      const contentWriter = agents.find(a => a.name === "Content Writer") || agents[1];
      const editorAgent = agents.find(a => a.name === "Editor Agent") || agents[2];
      const qaAgent = agents.find(a => a.name === "QA Agent") || agents[3];
      
      // Research agent responds first with info gathering
      setTimeout(() => {
        const text = `I'm researching "${content}".\n\nHere's what I found about CrewAI and CopilotKit integration:\n\n- CrewAI provides a framework for orchestrating AI agents with different roles\n- CopilotKit offers streaming capabilities for real-time token generation\n- The integration requires setting up event streams between the backend and frontend\n- WebSocket or Server-Sent Events (SSE) can be used for streaming tokens`;
        simulateStreaming(researchAgent, text);
      }, 1000);
      
      // Content writer starts after research is complete
      setTimeout(() => {
        const text = `Based on the research, here's a draft for the integration code:\n\n\`\`\`jsx\nimport { useEffect, useState } from 'react';\nimport { CopilotKit } from '@copilotkit/react-core';\n\nexport function CrewStreamApp() {\n  const [messages, setMessages] = useState([]);\n  \n  // Connect to the CrewAI stream\n  useEffect(() => {\n    const eventSource = new EventSource('/api/stream');\n    \n    eventSource.onmessage = (event) => {\n      const data = JSON.parse(event.data);\n      // Update UI with streamed tokens\n      setMessages(prev => [...prev, data]);\n    };\n    \n    return () => eventSource.close();\n  }, []);\n  \n  return (\n    <CopilotKit>\n      <ChatInterface messages={messages} />\n    </CopilotKit>\n  );\n}\n\`\`\``;
        simulateStreaming(contentWriter, text);
      }, 5000);
      
      // Editor agent refines the content
      setTimeout(() => {
        const text = `I've reviewed the integration code and have some improvements:\n\n1. We should add error handling for the EventSource\n2. The message parsing could be more robust\n3. Let's add typing information for better developer experience\n\nHere's the improved version:\n\n\`\`\`jsx\nimport { useEffect, useState } from 'react';\nimport { CopilotKit } from '@copilotkit/react-core';\n\ntype AgentMessage = {\n  agent: string;\n  content: string;\n  timestamp: string;\n};\n\nexport function CrewStreamApp() {\n  const [messages, setMessages] = useState<AgentMessage[]>([]);\n  const [error, setError] = useState<string | null>(null);\n  \n  useEffect(() => {\n    const eventSource = new EventSource('/api/stream');\n    \n    eventSource.onmessage = (event) => {\n      try {\n        const data = JSON.parse(event.data);\n        setMessages(prev => [...prev, data]);\n      } catch (err) {\n        setError('Failed to parse stream data');\n      }\n    };\n    \n    eventSource.onerror = () => {\n      setError('Connection error');\n      eventSource.close();\n    };\n    \n    return () => eventSource.close();\n  }, []);\n  \n  return (\n    <CopilotKit>\n      {error && <ErrorBanner message={error} />}\n      <ChatInterface messages={messages} />\n    </CopilotKit>\n  );\n}\n\`\`\``;
        simulateStreaming(editorAgent, text);
      }, 9000);
      
      // QA agent validates the solution
      setTimeout(() => {
        const text = `I've tested the integration code and verified it works with the following configurations:\n\n✅ React 18.0.0+\n✅ CopilotKit 0.2.0+\n✅ EventSource polyfill for older browsers\n\nThe implementation correctly handles the streaming tokens from CrewAI agents and renders them in real-time, with appropriate error handling and TypeScript support.\n\nRecommended next steps:\n1. Add retry logic for connection failures\n2. Implement message persistence for page reloads\n3. Add agent avatars and styling for better user experience`;
        simulateStreaming(qaAgent, text);
      }, 13000);
    }
  }, [isConnected, sendMessage, submitTask, agents, simulateStreaming]);
  
  // Process incoming WebSocket messages
  useEffect(() => {
    const outputMessages: (AgentOutputMessage | SystemMessage)[] = [];
    const metricsData: Record<number, AgentMetrics> = {...metrics};
    
    wsMessages.forEach(msg => {
      if (msg.type === "agent_output" || msg.type === "system_message") {
        outputMessages.push(msg);
      } else if (msg.type === "agent_metrics") {
        const metricMsg = msg as AgentMetricsMessage;
        metricsData[metricMsg.agentId] = {
          tasksCompleted: metricMsg.tasksCompleted,
          totalTasks: metricMsg.totalTasks,
          processingTime: metricMsg.processingTime
        };
      }
    });
    
    setFilteredMessages(outputMessages);
    setMetrics(metricsData);
  }, [wsMessages]);
  
  // Initialize default metrics for agents
  useEffect(() => {
    if (Array.isArray(agents) && agents.length > 0) {
      const defaultMetrics: Record<number, AgentMetrics> = {};
      
      agents.forEach((agent: Agent) => {
        if (!metrics[agent.id]) {
          defaultMetrics[agent.id] = {
            tasksCompleted: 0,
            totalTasks: 0,
            processingTime: 0
          };
        }
      });
      
      if (Object.keys(defaultMetrics).length > 0) {
        setMetrics(prev => ({...prev, ...defaultMetrics}));
      }
    }
  }, [agents, metrics]);
  
  // Clear all messages and document section changes
  const clearMessages = useCallback(() => {
    clearWsMessages();
    setFilteredMessages([]);
    setStreamingMessage(null);
    setCurrentAgent(null);
    
    // Reset document section changes
    setDocumentSections(prev => {
      const reset = { ...prev };
      Object.keys(reset).forEach(key => {
        reset[key] = { ...reset[key], hasChanges: false, feedback: '' };
      });
      return reset;
    });
  }, [clearWsMessages]);
  
  return {
    agents,
    messages: filteredMessages,
    metrics,
    documentSections: Object.values(documentSections),
    currentAgent,
    streamingMessage,
    isLoading: isLoadingAgents || isSubmittingTask,
    error: agentsError,
    sendTask,
    clearMessages
  };
}
