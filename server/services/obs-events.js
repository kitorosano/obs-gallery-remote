const clients = new Set();

export function addObsEventClient(res) {
  clients.add(res);
}

export function removeObsEventClient(res) {
  clients.delete(res);
}

export function broadcastObsEvent(type, data = {}) {
  const payload = JSON.stringify({
    type,
    data,
    timestamp: Date.now(),
  });

  for (const client of clients) {
    client.write(`event: obs-event\n`);
    client.write(`data: ${payload}\n\n`);
  }
}

export function getObsEventClientCount() {
  return clients.size;
}