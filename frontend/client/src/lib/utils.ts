import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-success";
    case "working":
      return "bg-primary";
    case "standby":
      return "bg-warning";
    case "idle":
      return "bg-neutral-400";
    default:
      return "bg-neutral-400";
  }
}

export function getBgColorForAgent(index: number): string {
  const colors = [
    "bg-agent-1", // Research Agent
    "bg-agent-2", // Content Writer
    "bg-agent-3", // Editor Agent
    "bg-agent-4"  // QA Agent
  ];
  
  return colors[index % colors.length];
}

export function getBorderColorForAgent(index: number): string {
  const colors = [
    "border-agent-1", // Research Agent
    "border-agent-2", // Content Writer
    "border-agent-3", // Editor Agent
    "border-agent-4"  // QA Agent
  ];
  
  return colors[index % colors.length];
}

export function getAgentColor(colorHex: string): { bgColor: string, borderColor: string } {
  // Map color hex to tailwind classes
  switch (colorHex) {
    case "#0078D4": // primary
      return { bgColor: "bg-agent-1", borderColor: "border-agent-1" };
    case "#107C10": // accent
      return { bgColor: "bg-agent-2", borderColor: "border-agent-2" };
    case "#FFB900": // warning
      return { bgColor: "bg-agent-3", borderColor: "border-agent-3" };
    case "#E81123": // error
      return { bgColor: "bg-agent-4", borderColor: "border-agent-4" };
    default:
      return { bgColor: "bg-gray-100", borderColor: "border-gray-300" };
  }
}

export function getAgentBgColor(agentName: string): string {
  // Simplified version that maps agent names to bg colors
  const agentColors: Record<string, string> = {
    "Research Agent": "bg-primary",
    "Content Writer": "bg-accent",
    "Editor Agent": "bg-warning",
    "QA Agent": "bg-error"
  };
  
  return agentColors[agentName] || "bg-neutral-600";
}
