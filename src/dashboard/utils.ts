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