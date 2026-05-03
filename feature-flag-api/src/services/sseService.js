const clients = new Map();   // clientId → response object

function addClient(id, res) { 
  clients.set(id, res); 
}

function removeClient(id) { 
  clients.delete(id); 
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try { 
      res.write(payload); 
    } catch (e) { 
      // client disconnected, will be cleaned by 'close' event
    }
  });
}

module.exports = { addClient, removeClient, broadcast };
