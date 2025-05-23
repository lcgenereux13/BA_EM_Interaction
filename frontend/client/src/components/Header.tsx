import { useTheme } from "./ui/theme-provider";
import { Button } from "./ui/button";

export function Header() {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Apply class directly to ensure immediate change
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    
    // Force body background color update for immediate visual feedback
    if (newTheme === "dark") {
      document.body.style.backgroundColor = "rgb(9, 9, 11)";
    } else {
      document.body.style.backgroundColor = "white";
    }
  };
  
  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-border h-16 flex items-center px-4">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-2">
          <i className="ri-file-text-line text-primary text-2xl"></i>
          <h1 className="text-xl font-semibold">Pagemaking Crew</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div className="relative">
              <i className={`ri-sun-line text-xl transition-all absolute ${theme === 'dark' ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90 scale-50'}`}></i>
              <i className={`ri-moon-line text-xl transition-all ${theme === 'dark' ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0'}`}></i>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs gap-1"
            onClick={() => {
              alert(`How CrewAI with CopilotKit Works:

1. Agent-Based Workflow:
   CrewAI organizes AI agents into specialized roles that work together on complex tasks. CopilotKit enables real-time streaming of their outputs.

2. Real-Time Streaming:
   Using WebSockets, you see token-by-token streaming from agents, showing their thought process as it happens.

3. Document Iteration Process:
   The Analyst creates drafts, then the Manager provides feedback until approval or reaching max iterations.

4. Idempotent Message Handling:
   The system uses unique message IDs to prevent duplicates, even with network issues.`);
            }}
          >
            <i className="ri-information-line"></i>
            <span>How It Works</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
