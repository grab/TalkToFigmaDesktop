/*
 * Copyright 2026 Grabtaxi Holdings Pte Ltd (GRAB), All rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be found in the LICENSE file
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import net from 'node:net';
import { createLogger } from './logger';
import { PORTS } from '../../shared/constants';

const execAsync = promisify(exec);
const logger = createLogger('Port');

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Get process using a specific port
 */
export async function getProcessOnPort(port: number): Promise<{ pid: number; name: string } | null> {
  const platform = process.platform;
  
  try {
    if (platform === 'darwin' || platform === 'linux') {
      const { stdout } = await execAsync(`lsof -i :${port} -t`);
      const pid = parseInt(stdout.trim().split('\n')[0], 10);
      
      if (isNaN(pid)) return null;
      
      // Get process name
      const { stdout: psOut } = await execAsync(`ps -p ${pid} -o comm=`);
      return { pid, name: psOut.trim() };
    } else if (platform === 'win32') {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      if (lines.length === 0) return null;
      
      const parts = lines[0].trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);
      
      if (isNaN(pid)) return null;
      
      const { stdout: taskOut } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
      const name = taskOut.split(',')[0].replace(/"/g, '');
      return { pid, name };
    }
  } catch {
    // Port not in use or command failed
    return null;
  }
  
  return null;
}

/**
 * Kill process using a specific port (only if it's our app)
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  const processInfo = await getProcessOnPort(port);
  
  if (!processInfo) {
    logger.debug(`No process found on port ${port}`);
    return true;
  }

  // Check if it's our application (TalkToFigma or Electron)
  const ourAppNames = ['electron', 'talktofigma', 'node'];
  const isOurApp = ourAppNames.some(name => 
    processInfo.name.toLowerCase().includes(name)
  );
  
  if (!isOurApp) {
    logger.warn(`Port ${port} is used by ${processInfo.name} (PID: ${processInfo.pid}), not our app`);
    return false;
  }
  
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      await execAsync(`taskkill /PID ${processInfo.pid} /F`);
    } else {
      await execAsync(`kill -9 ${processInfo.pid}`);
    }
    
    logger.info(`Killed process ${processInfo.name} (PID: ${processInfo.pid}) on port ${port}`);
    return true;
  } catch (error) {
    logger.error(`Failed to kill process on port ${port}:`, { error });
    return false;
  }
}

/**
 * Ensure all required ports are available
 */
export async function ensurePortsAvailable(): Promise<{ success: boolean; unavailablePorts: number[] }> {
  const requiredPorts = [PORTS.WEBSOCKET, PORTS.MCP_SSE];
  const unavailablePorts: number[] = [];
  
  for (const port of requiredPorts) {
    const available = await isPortAvailable(port);
    
    if (!available) {
      logger.warn(`Port ${port} is in use, attempting to free it`);
      const killed = await killProcessOnPort(port);
      
      if (!killed) {
        unavailablePorts.push(port);
      } else {
        // Wait a bit for the port to be released
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check again
        const stillInUse = !(await isPortAvailable(port));
        if (stillInUse) {
          unavailablePorts.push(port);
        }
      }
    }
  }
  
  return {
    success: unavailablePorts.length === 0,
    unavailablePorts,
  };
}

/**
 * Ensure a specific port is available (free it if necessary)
 */
export async function ensurePortAvailable(port: number): Promise<boolean> {
  const available = await isPortAvailable(port);

  if (available) {
    logger.debug(`Port ${port} is already available`);
    return true;
  }

  logger.warn(`Port ${port} is in use, attempting to free it`);
  const killed = await killProcessOnPort(port);

  if (!killed) {
    logger.error(`Failed to free port ${port}`);
    return false;
  }

  // Wait for the port to be released
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check again
  const stillAvailable = await isPortAvailable(port);
  if (!stillAvailable) {
    logger.error(`Port ${port} still in use after kill attempt`);
    return false;
  }

  logger.info(`Successfully freed port ${port}`);
  return true;
}

/**
 * Clean up ports used by our application
 */
export async function cleanupPorts(): Promise<void> {
  const ports = [PORTS.WEBSOCKET, PORTS.MCP_SSE, PORTS.OAUTH_CALLBACK];

  for (const port of ports) {
    await killProcessOnPort(port);
  }
}
