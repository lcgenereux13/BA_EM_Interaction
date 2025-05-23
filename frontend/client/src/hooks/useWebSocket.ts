import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketMessage } from "@shared/schema";
import { useToast } from "./use-toast";

type WebSocketStatus = "connecting" | "open" | "closed" | "error";

export function useWebSocket() {
  const [status, setStatus] = useState<WebSocketStatus>("connecting");
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set()); // Track processed message IDs
  const { toast } = useToast();

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    
    ws.onopen = () => {
      setStatus("open");
      console.log("WebSocket connection established");
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        
        // Check for message ID to ensure idempotency
        const messageId = getMessageId(data);
        
        if (messageId && processedMessageIds.current.has(messageId)) {
          // Skip duplicate message
          return;
        }
        
        // Add to processed set if it has an ID
        if (messageId) {
          processedMessageIds.current.add(messageId);
        }
        
        setMessages(prev => [...prev, data]);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus("error");
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server. Please refresh the page.",
        variant: "destructive",
      });
    };
    
    ws.onclose = () => {
      setStatus("closed");
      console.log("WebSocket connection closed");
      
      // Reconnect logic based on CopilotKit's recommended approach
      // Only reconnect if this wasn't an intentional close
      if (status === "open") {
        setTimeout(() => {
          toast({
            title: "Reconnecting",
            description: "Attempting to reconnect to the server...",
          });
          // Force a re-render to trigger the WebSocket reconnect
          setStatus("connecting");
        }, 3000);
      }
    };
    
    // Clean up on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [toast, status]);
  
  // Helper to extract message ID from different message types
  const getMessageId = (message: WebSocketMessage): string | null => {
    if (message.type === "task_submit" && "taskId" in message) {
      return message.taskId as string;
    }
    if (message.type === "agent_output" && message.taskId) {
      return message.taskId;
    }
    if (message.type === "task_status" && message.taskId) {
      return message.taskId;
    }
    return null;
  };
  
  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    
    // Queue message for retry if connection is reconnecting
    if (status === "connecting") {
      toast({
        title: "Connection in progress",
        description: "Your message will be sent once connected.",
      });
      
      // Store message to retry after connection
      const retryInterval = setInterval(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(message));
          clearInterval(retryInterval);
        }
      }, 1000);
      
      // Clear retry after 10 seconds if still not connected
      setTimeout(() => clearInterval(retryInterval), 10000);
      return true;
    }
    
    return false;
  }, [status, toast]);
  
  // Clear messages and reset processed IDs
  const clearMessages = useCallback(() => {
    setMessages([]);
    processedMessageIds.current.clear();
  }, []);
  
  return {
    status,
    messages,
    sendMessage,
    clearMessages,
    isConnected: status === "open"
  };
}
