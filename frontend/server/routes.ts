import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { crewService } from "./crewService";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { 
  AgentOutputMessage, 
  SystemMessage, 
  TaskSubmitMessage, 
  WebSocketMessage,
  insertAgentSchema,
  insertTaskSchema,
  insertAgentOutputSchema
} from "@shared/schema";
import { nanoid } from "nanoid";

const documentsRoot = path.resolve(import.meta.dirname, "..", "..", "documents");

// Store active WebSocket connections
const clients = new Set<WebSocket>();

// Broadcast message to all connected clients
function broadcast(message: WebSocketMessage) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize HTTP server
  const httpServer = createServer(app);

  app.use("/documents", express.static(documentsRoot));

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // API routes
  app.get('/api/documents', async (_req, res) => {
    try {
      await fs.access(documentsRoot);
    } catch (error) {
      return res.json({ files: [], totalCount: 0 });
    }

    const listFiles = async (dir: string, prefix = "") => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        const absolutePath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...await listFiles(absolutePath, relativePath));
          continue;
        }

        const stats = await fs.stat(absolutePath);
        const extension = path.extname(entry.name).replace(".", "");
        const urlPath = relativePath.split(path.sep).map(encodeURIComponent).join("/");
        files.push({
          name: entry.name,
          path: relativePath,
          url: `/documents/${urlPath}`,
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
          extension
        });
      }

      return files;
    };

    const files = await listFiles(documentsRoot);
    files.sort((a, b) => a.path.localeCompare(b.path));

    res.json({ files, totalCount: files.length });
  });

  app.get('/api/documents/download', async (_req, res) => {
    try {
      await fs.access(documentsRoot);
    } catch (error) {
      return res.status(404).json({ message: 'Documents directory not found' });
    }

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", "attachment; filename=\"documents.tar.gz\"");

    const tarProcess = spawn("tar", ["-czf", "-", "-C", documentsRoot, "."]);

    tarProcess.stdout.pipe(res);

    tarProcess.on("error", (err) => {
      console.error("Failed to create documents archive", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to create documents archive" });
      } else {
        res.end();
      }
    });

    tarProcess.stderr.on("data", (data) => {
      console.error("tar error:", data.toString());
    });
  });

  app.get('/api/agents', async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch agents' });
    }
  });

  app.post('/api/agents', async (req, res) => {
    try {
      const result = insertAgentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid agent data' });
      }
      
      const agent = await storage.createAgent(result.data);
      res.status(201).json(agent);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create agent' });
    }
  });

  app.get('/api/agents/:id', async (req, res) => {
    try {
      const agent = await storage.getAgent(parseInt(req.params.id));
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch agent' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const taskData = {
        content: req.body.content,
        taskId: nanoid(),
        status: 'pending'
      };
      
      const result = insertTaskSchema.safeParse(taskData);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid task data' });
      }
      
      const task = await storage.createTask(result.data);
      
      // Broadcast system message about new task
      const systemMessage: SystemMessage = {
        type: 'system_message',
        content: `New task received: ${task.content}`,
        timestamp: new Date().toISOString()
      };
      broadcast(systemMessage);
      
      // Send to CrewAI service for processing
      crewService.processTask(task, (agentId, content) => {
        // When we get output from an agent, store it and broadcast
        const agent = storage.getAgentSync(agentId);
        if (!agent) return;
        
        const outputData = {
          agentId,
          content,
          taskId: task.taskId
        };
        
        const outputResult = insertAgentOutputSchema.safeParse(outputData);
        if (!outputResult.success) return;
        
        storage.createAgentOutput(outputResult.data).then(output => {
          const outputMessage: AgentOutputMessage = {
            type: 'agent_output',
            agentId: agent.id,
            agentName: agent.name,
            agentIcon: agent.icon,
            agentColor: agent.color,
            content: output.content,
            timestamp: output.timestamp.toISOString(),
            taskId: output.taskId
          };
          
          broadcast(outputMessage);
        });
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error('Error processing task:', error);
      res.status(500).json({ message: 'Failed to process task' });
    }
  });
  
  app.get('/api/outputs/:taskId', async (req, res) => {
    try {
      const outputs = await storage.getOutputsByTaskId(req.params.taskId);
      res.json(outputs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch outputs' });
    }
  });

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    clients.add(ws);
    
    // Send initial system message
    const systemMessage: SystemMessage = {
      type: 'system_message',
      content: 'CrewAI session initialized. Agents are ready to process your request.',
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(systemMessage));
    
    // Handle incoming messages from clients
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'task_submit') {
          const taskMessage = message as TaskSubmitMessage;
          
          // Create a new task using the API
          const response = await fetch('http://localhost:5000/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: taskMessage.content })
          });
          
          if (!response.ok) {
            throw new Error('Failed to create task');
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  return httpServer;
}
