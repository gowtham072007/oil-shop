/**
 * Server-Sent Events (SSE) Real-Time Synchronizer
 * Broadcasts product additions, edits, deletions, and settings changes
 * immediately across all connected mobile and desktop devices.
 */

const clients = new Set();

/**
 * Handle new client SSE subscription
 */
export function subscribeEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  // Flush initial connection packet
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientsCount: clients.size + 1 })}\n\n`);
  clients.add(res);

  // Ping every 25 seconds to keep mobile connections alive
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      clients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clients.delete(res);
  });
}

/**
 * Broadcast event to all connected devices in real time
 */
export function broadcast(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

export function getConnectedClientsCount() {
  return clients.size;
}

