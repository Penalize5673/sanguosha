import { useMemo, useState } from 'react';
import type { GamePublicState, PrivatePlayerView, CardInstance } from '../../../shared/src/index';
import { cardLabel, cardName, getCardDef, roleName, isRed, SUIT_SYMBOL } from '../cardUtil';

interface Props {
  send: (m: object) => void;
  state: GamePublicState;
  me: PrivatePlayerView;
  playerId: string;
  chats: { from: string; text: string }[];
}

export default function GameBoard({ send, state, me, playerId, chats }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [discardSel, setDiscardSel] = useState<string[]>([]);
  const [chatText, setChatText] = useState('');
  const [skillMode, setSkillMode] = useState<string | null>(null);

  const pending = state.pendingAction;
  const myTurn = state.currentPlayerId === playerId && state.phase === 'play' && !pending;
  const needRespond = pending && pending.toPlayerId === playerId;
  const needDiscard = pending?.type === 'discard' && pending.fromPlayerId === playerId;

  const selectedCard = me.hand.find((c) => c.id === selected);
  const selectedDef = selectedCard ? getCardDef(selectedCard.defId) : null;

  const toggleTarget = (id: string) => {
    if (id === playerId && selectedDef?.basic !== 'peach') return;
    setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  };

  const playSelected = () => {
    if (!selected) return;
    if (skillMode) {
      send({ type: 'use_skill', skillId: skillMode, cardIds: [selected], targetIds: targets });
      setSkillMode(null);
      setSelected(null);
      setTargets([]);
      return;
    }
    send({ type: 'play_card', cardId: selected, targetIds: targets });
    setSelected(null);
    setTargets([]);
  };

  const phaseName = state.phase === 'draw' ? '摸牌' : state.phase === 'play' ? '出牌' : state.phase === 'discard' ? '弃牌' : '';

  const others = state.players.filter((p) => p.id !== playerId);

  return (
    <div className="game">
      {state.status === 'finished' && (
        <div className="win-banner">
          {state.log[state.log.length - 1] || '对局结束'}
        </div>
      )}

      <div className="table">
        <div className="meta-row">
          <span>回合 {state.turnCount}</span>
          <span>阶段：{phaseName || '—'}</span>
          <span>牌堆 {state.deckCount} · 弃牌 {state.discardCount}</span>
        </div>

        <div className="seats">
          {others.map((p) => (
            <div
              key={p.id}
              className={`seat ${p.isCurrent ? 'current' : ''} ${!p.isAlive ? 'dead' : ''} ${targets.includes(p.id) ? 'targeted' : ''}`}
              onClick={() => (myTurn || skillMode) && p.isAlive && toggleTarget(p.id)}
            >
              <div className="seat-name">
                {p.generalName || '？'} · {p.nickname}
                {p.isLord && <span className="lord-badge">主公</span>}
              </div>
              <div className="hp">{'♥'.repeat(Math.max(0, p.hp))}{'♡'.repeat(Math.max(0, p.maxHp - p.hp))}</div>
              <div className="seat-info">手牌 {p.handCount}</div>
              <div className="equips">
                {p.equipment.map((e) => (
                  <span key={e.id} className="eq">{cardName(e)}</span>
                ))}
              </div>
              {(p.roleRevealed || p.role) && p.role && (
                <div className="role-tag">{roleName(p.role)}</div>
              )}
            </div>
          ))}
        </div>

        <div className="log-box">
          {state.log.slice(-12).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>

      <div className={`self ${me.isCurrent ? 'current' : ''}`}>
        <div className="self-head">
          <div>
            <strong>{me.generalName}</strong>（{me.nickname}）
            <span className="role-mine">{roleName(me.role)}</span>
          </div>
          <div className="hp big">{'♥'.repeat(Math.max(0, me.hp))}{'♡'.repeat(Math.max(0, me.maxHp - me.hp))}</div>
          <div className="skills">
            {me.skills.map((s) => (
              <button
                key={s.id}
                className={`skill-btn ${skillMode === s.id ? 'active' : ''}`}
                title={s.description}
                disabled={!myTurn || s.kind === 'passive'}
                onClick={() => setSkillMode(skillMode === s.id ? null : s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="equips self-eq">
          装备：
          {me.equipment.length === 0 && <span className="muted">无</span>}
          {me.equipment.map((e) => (
            <span key={e.id} className="eq">{cardLabel(e)}</span>
          ))}
        </div>

        {pending && (
          <div className="pending">
            {pending.prompt}
            {needRespond && (
              <div className="row">
                <button className="btn ghost" onClick={() => send({ type: 'respond', accept: false })}>
                  取消/承受
                </button>
              </div>
            )}
          </div>
        )}

        <div className="hand">
          {me.hand.map((c) => {
            const d = getCardDef(c.defId);
            const active =
              selected === c.id ||
              (needDiscard && discardSel.includes(c.id)) ||
              (needRespond && selected === c.id);
            return (
              <button
                key={c.id}
                className={`card ${isRed(c) ? 'red' : 'black'} ${active ? 'selected' : ''}`}
                onClick={() => {
                  if (needDiscard) {
                    setDiscardSel((s) =>
                      s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]
                    );
                    return;
                  }
                  if (needRespond) {
                    setSelected(c.id);
                    send({ type: 'respond', cardId: c.id, accept: true });
                    setSelected(null);
                    return;
                  }
                  setSelected(selected === c.id ? null : c.id);
                  setTargets([]);
                }}
              >
                <span className="suit">{SUIT_SYMBOL[d.suit]}{d.rank}</span>
                <span className="cname">{d.name}</span>
                <span className="ctype">{d.type === 'basic' ? '基本' : d.type === 'trick' ? '锦囊' : '装备'}</span>
              </button>
            );
          })}
        </div>

        <div className="actions">
          {myTurn && selected && (
            <button className="btn primary" onClick={playSelected}>
              {skillMode ? `发动技能` : '打出'}「{selectedDef?.name}」
              {targets.length ? ` → ${targets.length}目标` : ''}
            </button>
          )}
          {myTurn && (
            <button className="btn" onClick={() => send({ type: 'end_phase' })}>
              结束出牌
            </button>
          )}
          {needDiscard && (
            <button
              className="btn primary"
              disabled={discardSel.length !== (pending?.amount || 0)}
              onClick={() => {
                send({ type: 'discard_cards', cardIds: discardSel });
                setDiscardSel([]);
              }}
            >
              确认弃牌（{discardSel.length}/{pending?.amount}）
            </button>
          )}
          {skillMode && myTurn && !selected && (
            <button
              className="btn primary"
              onClick={() => {
                send({ type: 'use_skill', skillId: skillMode, targetIds: targets });
                setSkillMode(null);
                setTargets([]);
              }}
            >
              发动「{me.skills.find((s) => s.id === skillMode)?.name}」
              {targets.length ? `（${targets.length}目标）` : ''}
            </button>
          )}
        </div>

        <div className="chat">
          <div className="chat-log">
            {chats.slice(-8).map((c, i) => (
              <div key={i}><b>{c.from}</b>：{c.text}</div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatText.trim()) return;
              send({ type: 'chat', text: chatText.trim() });
              setChatText('');
            }}
          >
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="聊天…" maxLength={100} />
            <button type="submit" className="btn ghost">发送</button>
          </form>
        </div>
      </div>
    </div>
  );
}
