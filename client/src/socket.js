import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// Generate a unique client ID for this session to prevent echo loops
export const clientId = uuidv4();

// Connect to the backend socket server
// Ensure the port matches your Express server port
export const socket = io('http://localhost:3001', {
  autoConnect: true,
});

socket.on('connect', () => {
  console.log(`Connected to Socket server with clientId: ${clientId}`);
});
