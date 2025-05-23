import { 
  users, 
  type User, 
  type InsertUser, 
  type Agent,
  type InsertAgent,
  type Task,
  type InsertTask,
  type AgentOutput,
  type InsertAgentOutput
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Agent methods
  getAgent(id: number): Promise<Agent | undefined>;
  getAgentSync(id: number): Agent | undefined;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgentStatus(id: number, status: string): Promise<Agent | undefined>;
  
  // Task methods
  getTask(id: number): Promise<Task | undefined>;
  getTaskByTaskId(taskId: string): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(taskId: string, status: string): Promise<Task | undefined>;
  
  // Agent output methods
  getAgentOutput(id: number): Promise<AgentOutput | undefined>;
  getOutputsByTaskId(taskId: string): Promise<AgentOutput[]>;
  getOutputsByAgentId(agentId: number): Promise<AgentOutput[]>;
  createAgentOutput(output: InsertAgentOutput): Promise<AgentOutput>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private agents: Map<number, Agent>;
  private tasks: Map<number, Task>;
  private agentOutputs: Map<number, AgentOutput>;
  
  private userId: number;
  private agentId: number;
  private taskId: number;
  private outputId: number;

  constructor() {
    this.users = new Map();
    this.agents = new Map();
    this.tasks = new Map();
    this.agentOutputs = new Map();
    
    this.userId = 1;
    this.agentId = 1;
    this.taskId = 1;
    this.outputId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Agent methods
  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }
  
  getAgentSync(id: number): Agent | undefined {
    return this.agents.get(id);
  }
  
  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }
  
  async createAgent(agent: InsertAgent): Promise<Agent> {
    const id = this.agentId++;
    const createdAt = new Date();
    const newAgent: Agent = { ...agent, id, createdAt };
    this.agents.set(id, newAgent);
    return newAgent;
  }
  
  async updateAgentStatus(id: number, status: string): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    const updatedAgent = { ...agent, status };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }
  
  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async getTaskByTaskId(taskId: string): Promise<Task | undefined> {
    return Array.from(this.tasks.values()).find(
      (task) => task.taskId === taskId
    );
  }
  
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const createdAt = new Date();
    const newTask: Task = { ...task, id, createdAt };
    this.tasks.set(id, newTask);
    return newTask;
  }
  
  async updateTaskStatus(taskId: string, status: string): Promise<Task | undefined> {
    const task = await this.getTaskByTaskId(taskId);
    if (!task) return undefined;
    
    const updatedTask = { ...task, status };
    this.tasks.set(task.id, updatedTask);
    return updatedTask;
  }
  
  // Agent output methods
  async getAgentOutput(id: number): Promise<AgentOutput | undefined> {
    return this.agentOutputs.get(id);
  }
  
  async getOutputsByTaskId(taskId: string): Promise<AgentOutput[]> {
    return Array.from(this.agentOutputs.values()).filter(
      (output) => output.taskId === taskId
    );
  }
  
  async getOutputsByAgentId(agentId: number): Promise<AgentOutput[]> {
    return Array.from(this.agentOutputs.values()).filter(
      (output) => output.agentId === agentId
    );
  }
  
  async createAgentOutput(output: InsertAgentOutput): Promise<AgentOutput> {
    const id = this.outputId++;
    const timestamp = new Date();
    const newOutput: AgentOutput = { ...output, id, timestamp };
    this.agentOutputs.set(id, newOutput);
    return newOutput;
  }
}

export const storage = new MemStorage();
