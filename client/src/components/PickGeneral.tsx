import type { GamePublicState, PrivatePlayerView, GeneralDef } from '../../../shared/src/index';
import { roleName } from '../cardUtil';

interface Props {
  send: (m: object) => void;
  options: GeneralDef[];
  me: PrivatePlayerView | null;
  state: GamePublicState;
}

export default function PickGeneral({ send, options, me, state }: Props) {
  if (me?.generalId) {
    return (
      <div className="panel">
        <h2>等待其他玩家选将…</h2>
        <p>你已选择武将。当前进度：{state.players.filter(p => p.generalId).length}/{state.players.length}</p>
      </div>
    );
  }

  return (
    <div className="panel pick">
      <h2>选择武将</h2>
      {me?.role && <p className="secret">身份：{roleName(me.role)}</p>}
      <div className="general-grid">
        {options.map((g) => (
          <button key={g.id} className="general-card" onClick={() => send({ type: 'pick_general', generalId: g.id })}>
            <div className="g-name">{g.name}</div>
            <div className="g-meta">{g.faction} · 体力 {g.maxHp}</div>
            {g.skills.map((s) => (
              <div key={s.id} className="g-skill">
                <strong>{s.name}</strong>：{s.description}
              </div>
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}
