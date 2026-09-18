import { useState } from 'react';
import type { GamePublicState, PrivatePlayerView } from '../../../shared/src/index';
import { roleName } from '../cardUtil';

interface Props {
  send: (m: object) => void;
  state?: GamePublicState | null;
  me?: PrivatePlayerView | null;
  playerId?: string | null;
  inRoom?: boolean;
}

export default function Lobby({ send, state, me, playerId, inRoom }: Props) {
  const [nickname, setNickname] = useState(() => localStorage.getItem('ty_nick') || '');
  const [code, setCode] = useState('');

  const saveNick = (n: string) => {
    setNickname(n);
    localStorage.setItem('ty_nick', n);
  };

  if (inRoom && state) {
    const amHost = state.players.find(p => p.id === playerId)?.isHost;

    return (
      <div className="panel lobby-room">
        <h2>房间 {state.roomCode}</h2>
        <p className="hint">将房间码分享给好友（2–8 人）。全员就绪后由房主开始。</p>
        <ul className="player-list">
          {state.players.map((p) => (
            <li key={p.id}>
              <span>{p.nickname}{p.seat === 0 ? '（房主）' : ''}</span>
              <span className={p.ready ? 'tag ready' : 'tag'}>
                {p.isHost ? '房主 · ' : ''}{p.ready ? '已就绪' : '未就绪'}
              </span>
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="btn" onClick={() => send({ type: 'set_ready', ready: true })}>准备就绪</button>
          {amHost && (
            <button className="btn primary" onClick={() => send({ type: 'start_game' })}>开始对局</button>
          )}
          <button className="btn ghost" onClick={() => send({ type: 'leave_room' })}>离开</button>
        </div>
        {me?.role && (
          <p className="secret">你的身份：<strong>{roleName(me.role)}</strong>（仅自己可见，主公公开）</p>
        )}
      </div>
    );
  }

  return (
    <div className="panel lobby">
      <h2>进入乱世</h2>
      <label>
        昵称
        <input value={nickname} maxLength={12} onChange={(e) => saveNick(e.target.value)} placeholder="少侠留名" />
      </label>
      <div className="row">
        <button
          className="btn primary"
          disabled={!nickname.trim()}
          onClick={() => send({ type: 'create_room', nickname: nickname.trim() })}
        >
          创建房间
        </button>
      </div>
      <div className="divider">或加入</div>
      <label>
        房间码（6位）
        <input
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="例如 AB12CD"
        />
      </label>
      <button
        className="btn"
        disabled={!nickname.trim() || code.length !== 6}
        onClick={() => send({ type: 'join_room', roomCode: code, nickname: nickname.trim() })}
      >
        加入房间
      </button>
      <div className="rules">
        <h3>规则速览</h3>
        <ul>
          <li>身份：主公、忠臣、反贼、内奸</li>
          <li>基本牌：斩（攻击）、避（闪避）、疗（回复）</li>
          <li>回合：摸牌 → 出牌 → 弃牌</li>
          <li>主公阵亡则反贼/内奸胜；反贼与内奸全灭则主公胜</li>
        </ul>
      </div>
    </div>
  );
}
