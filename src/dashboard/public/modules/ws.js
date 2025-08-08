export function connectWebSocket(app) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}/ws`;

  app.ws = new WebSocket(wsUrl);

  app.ws.onopen = () => {
    app.connected = true;
  };

  app.ws.onclose = () => {
    app.connected = false;
    setTimeout(() => connectWebSocket(app), 3000);
  };

  app.ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(app, message);
  };

  app.ws.onerror = () => {
    // no-op; connection close handler will manage reconnection
  };
}

export function handleWebSocketMessage(app, message) {
  switch (message.type) {
    case 'initial':
      app.specs = message.data.specs || [];
      app.approvals = message.data.approvals || [];
      break;
    case 'update':
      setTimeout(async () => {
        await app.loadData();
        if (app.specViewer.show) {
          app.refreshSpecViewer();
        }
        if (app.taskProgressViewer.show) {
          app.refreshTaskProgressViewer();
        }
        if (app.markdownPreview.show) {
          app.refreshMarkdownPreview();
        }
      }, 200);
      break;
    case 'approval-update':
      app.approvals = message.data || [];
      break;
    case 'spec-update':
      if (message.data.specName && app.specViewer.show && app.specViewer.specName === message.data.specName) {
        app.refreshSpecViewer();
      }
      break;
    case 'task-update':
      if (message.data.specName && app.taskProgressViewer.show && app.taskProgressViewer.specName === message.data.specName) {
        app.refreshTaskProgressViewer();
      }
      break;
  }
}


