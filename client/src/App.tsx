import { useCallback, useEffect, useMemo, useState } from 'react';
import { createGameSocket } from './ws';
import Lobby from './components/Lobby';
import PickGeneral from './components/PickGeneral';
import GameBoard from './components/GameBoard';
import type { GamePublicState, PrivatePlayerView, GeneralDef } from '../../shared/src/index';

export default function App() {
  const [status, setStatus] = useState('连接中…');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<GamePublicState | null>(null);
  const [me, setMe] = useState<PrivatePlayerView | null>(null);
  const [pickOptions, setPickOptions] = useState<GeneralDef[] | undefined>();
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [chats, setChats] = useState<{ from: string; text: string }[]>([]);

  const sock = useMemo(() => createGameSocket((data) => {
    if (data.type === 'room_created' || data.type === 'joined') {
      setPlayerId(data.playerId);
    } else if (data.type === 'state') {
      setState(data.state);
      setMe(data.me);
      setPickOptions(data.pickOptions);
    } else if (data.type === 'error') {
      setError(data.message);
      setTimeout(() => setError(''), 4000);
    } else if (data.type === 'toast') {
      setToast(data.message);
      setTimeout(() => setToast(''), 2500);
    } else if (data.type === 'chat') {
      setChats((c) => [...c.slice(-30), { from: data.from, text: data.text }]);
    }
  }, setStatus), []);

  useEffect(() => () => sock.close(), [sock]);

  const send = useCallback((msg: any) => {
    if (msg.type === 'leave_room') {
      sock.send(msg);
      setState(null);
      setMe(null);
      setPlayerId(null);
      setPickOptions(undefined);
      return;
    }
    sock.send(msg);
  }, [sock]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⚔</span>
          <div>
            <h1>天元争锋</h1>
            <p className="subtitle">原创身份战卡牌 · 龙庭争霸</p>
          </div>
        </div>
        <div className="conn">{status}{state ? ` · 房 ${state.roomCode}` : ''}</div>
      </header>

      {toast && <div className="toast">{toast}</div>}
      {error && <div className="error-banner">{error}</div>}

      {!state && <Lobby send={send} />}

      {state?.status === 'lobby' && (
        <Lobby send={send} state={state} me={me} playerId={playerId} inRoom />
      )}

      {state?.status === 'picking' && (
        <PickGeneral send={send} options={pickOptions || []} me={me} state={state} />
      )}

      {(state?.status === 'playing' || state?.status === 'finished') && me && (
        <GameBoard send={send} state={state} me={me} playerId={playerId!} chats={chats} />
      )}

      <footer className="footer">天元争锋 · 非商业原创作品 · 与任何商业三国杀产品无关</footer>
    </div>
  );
}
