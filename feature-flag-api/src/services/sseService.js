// clientId → { res, projectId }
// projectId = null means "no project scope" (legacy env-var auth / demo app)
const clients = new Map();

function addClient(id, res, projectId = null) {
  clients.set(id, { res, projectId: projectId ? String(projectId) : null });
}

function removeClient(id) {
  clients.delete(id);
}

/**
 * Broadcast an SSE event to matching clients.
 *
 * Scoping rules:
 *   - Client with projectId=null  → receives everything (legacy / demo app)
 *   - Client with projectId=X     → receives only events whose flag.projectId === X
 *   - Flag with no projectId       → sent to all clients (legacy flag)
 */
function broadcast(event, data) {
  const flagProjectId = data?.flag?.projectId ? String(data.flag.projectId) : null;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach(({ res, projectId }) => {
    const shouldSend =
      !projectId ||          // client has no scope → gets everything
      !flagProjectId ||      // flag has no projectId → legacy, send to all
      projectId === flagProjectId; // explicit match

    if (shouldSend) {
      try { res.write(payload); } catch { /* client disconnected */ }
    }
  });
}

function clientCount() {
  return clients.size;
}

module.exports = { addClient, removeClient, broadcast, clientCount };
