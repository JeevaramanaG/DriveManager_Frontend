// import { WebSocketServer } from 'ws';

// const wss = new WebSocketServer({ port: 5173 });

// let connectedAgent: WebSocket | null = null;
// let agentIp: string | null = null;

// wss.on('connection', (ws: WebSocket) => {
//     if (connectedAgent) {
//         ws.send(JSON.stringify({ error: "Another agent is already connected" }));
//         ws.close();
//         return;
//     }

//     connectedAgent = ws;
//     console.log("Agent connected");

//     wss.on('message', (message: string) => {
//         const data = JSON.parse(message);
//         if (data.localIp) agentIp = data.localIp;
//     });

//     wss.on('close', () => {
//         connectedAgent = null;
//         agentIp = null;
//     });
// });
