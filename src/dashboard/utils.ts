import { createServer } from 'net';

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, '0.0.0.0', () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

export async function findAvailablePort(): Promise<number> {
  // Use industry standard ephemeral port range (49152-65535)
  const ephemeralStart = 49152;
  const ephemeralEnd = 65535;
  
  // Generate a random starting point to avoid always using the same ports
  const randomStart = ephemeralStart + Math.floor(Math.random() * 1000);
  
  for (let port = randomStart; port <= ephemeralEnd; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  // If we didn't find one from random start to end, try from beginning to random start
  for (let port = ephemeralStart; port < randomStart; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  throw new Error(`No available ephemeral port found in range ${ephemeralStart}-${ephemeralEnd}`);
}

/**
 * Check if a specific port is available for use
 * @param port The port number to check
 * @returns Promise<boolean> true if port is available, false otherwise
 */
export async function isSpecificPortAvailable(port: number): Promise<boolean> {
  return isPortAvailable(port);
}

/**
 * Validate a port number and check if it's available
 * @param port The port number to validate and check
 * @returns Promise<void> throws error if invalid or unavailable
 */
export async function validateAndCheckPort(port: number): Promise<void> {
  // Validate port range
  if (port < 1024 || port > 65535) {
    throw new Error(`Port ${port} is out of range. Port must be between 1024 and 65535.`);
  }
  
  // Check if port is available
  const available = await isSpecificPortAvailable(port);
  if (!available) {
    throw new Error(`Port ${port} is already in use. Please choose a different port or omit --port to use an ephemeral port.`);
  }
}