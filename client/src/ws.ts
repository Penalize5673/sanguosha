export type MsgHandler = (data: any) => void;

export function createGameSocket(onMessage: MsgHandler, onStatus: (s: string) => void) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${proto}//${location.host}/ws`;
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;

  const connect = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      retry = 0;
      onStatus('已连接');
    };
    ws.onclose = () => {
      onStatus('已断开');
      if (!closed) {
        retry++;
        setTimeout(connect, Math.min(5000, 800 * retry));
      }
    };
    ws.onerror = () => onStatus('连接错误');
    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data));
      } catch { /* ignore */ }
    };
  };
  connect();

  return {
    send(data: object) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    },
    close() {
      closed = true;
      ws?.close();
    },
  };
}
