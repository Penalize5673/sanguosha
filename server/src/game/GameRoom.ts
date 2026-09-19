import {
  GENERALS,
  getGeneral,
  getCardDef,
  createDeck,
  assignRoles,
  roleName,
  roleWinText,
  type CardInstance,
  type Role,
  type Phase,
  type RoomStatus,
  type GeneralDef,
  type PendingAction,
  type GamePublicState,
  type PrivatePlayerView,
  type PublicPlayerView,
  type ClientMessage,
} from '../shared.js';

interface Player {
  id: string;
  nickname: string;
  seat: number;
  ready: boolean;
  role: Role | null;
  generalId: string | null;
  maxHp: number;
  hp: number;
  hand: CardInstance[];
  equipment: CardInstance[];
  isAlive: boolean;
  roleRevealed: boolean;
  chained: boolean;
  skipNextPlay: boolean;
  slashUsedThisTurn: number;
  skillUsedThisTurn: Set<string>;
  flags: Record<string, boolean | number>;
  pickOptions: GeneralDef[];
  wsSend: (data: unknown) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function suitColor(suit: string): 'red' | 'black' {
  return suit === 'heart' || suit === 'diamond' ? 'red' : 'black';
}

export class GameRoom {
  code: string;
  hostId: string;
  status: RoomStatus = 'lobby';
  players: Player[] = [];
  deck: CardInstance[] = [];
  discard: CardInstance[] = [];
  currentPlayerId: string | null = null;
  phase: Phase | null = null;
  turnCount = 0;
  log: string[] = [];
  winnerTeam: string | null = null;
  pending: PendingAction | null = null;
  ctx: Record<string, unknown> = {};
  maxPlayers = 8;

  constructor(code: string, hostId: string) {
    this.code = code;
    this.hostId = hostId;
  }

  addPlayer(id: string, nickname: string, wsSend: (data: unknown) => void): string | null {
    if (this.status !== 'lobby') return '对局已开始';
    if (this.players.length >= this.maxPlayers) return '房间已满';
    if (this.players.some((p) => p.nickname === nickname)) return '昵称已被使用';
    this.players.push({
      id, nickname, seat: this.players.length, ready: false, role: null, generalId: null,
      maxHp: 4, hp: 4, hand: [], equipment: [], isAlive: true, roleRevealed: false,
      chained: false, skipNextPlay: false, slashUsedThisTurn: 0, skillUsedThisTurn: new Set(),
      flags: {}, pickOptions: [], wsSend,
    });
    this.broadcastState();
    return null;
  }

  removePlayer(id: string) {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx < 0) return;
    if (this.status === 'lobby') {
      this.players.splice(idx, 1);
      this.players.forEach((p, i) => (p.seat = i));
      if (this.hostId === id && this.players.length) this.hostId = this.players[0].id;
      this.broadcastState();
    } else {
      const p = this.players[idx];
      if (p.isAlive && this.status === 'playing') {
        this.addLog(`${p.nickname} 离开了对局`);
        this.killPlayer(p, null);
      }
    }
  }

  handle(playerId: string, msg: ClientMessage) {
    try {
      switch (msg.type) {
        case 'set_ready': this.setReady(playerId, msg.ready); break;
        case 'start_game': this.startGame(playerId); break;
        case 'pick_general': this.pickGeneral(playerId, msg.generalId); break;
        case 'play_card': this.playCard(playerId, msg.cardId, msg.targetIds || []); break;
        case 'respond': this.respond(playerId, msg); break;
        case 'end_phase': this.endPhase(playerId); break;
        case 'discard_cards': this.discardCards(playerId, msg.cardIds); break;
        case 'use_skill': this.useSkill(playerId, msg.skillId, msg.cardIds || [], msg.targetIds || []); break;
        case 'chat': this.chat(playerId, msg.text); break;
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      this.sendTo(playerId, { type: 'error', message: err });
    }
  }

  private setReady(playerId: string, ready: boolean) {
    if (this.status !== 'lobby') return;
    this.mustPlayer(playerId).ready = ready;
    this.broadcastState();
  }

  private startGame(playerId: string) {
    if (playerId !== this.hostId) throw new Error('只有房主可以开始');
    if (this.status !== 'lobby') throw new Error('无法开始');
    if (this.players.length < 2) throw new Error('至少需要2名玩家');
    this.players.forEach((p) => { if (p.id === this.hostId) p.ready = true; });
    if (!this.players.every((p) => p.ready)) throw new Error('仍有玩家未就绪');

    const roles = assignRoles(this.players.length);
    this.players.forEach((p, i) => {
      p.role = roles[i];
      p.roleRevealed = roles[i] === 'lord';
    });

    const pool = shuffle([...GENERALS]);
    let pi = 0;
    for (const p of this.players) {
      const n = p.role === 'lord' ? 5 : 3;
      p.pickOptions = pool.slice(pi, pi + n);
      pi += n;
    }
    this.status = 'picking';
    this.addLog('身份已分配，请选择武将');
    this.broadcastState();
  }

  private pickGeneral(playerId: string, generalId: string) {
    if (this.status !== 'picking') throw new Error('当前不是选将阶段');
    const p = this.mustPlayer(playerId);
    if (p.generalId) throw new Error('已选择武将');
    if (!p.pickOptions.some((g) => g.id === generalId)) throw new Error('非法武将');
    const g = getGeneral(generalId);
    p.generalId = g.id;
    p.maxHp = g.maxHp + (p.role === 'lord' && this.players.length >= 5 ? 1 : 0);
    p.hp = p.maxHp;
    this.addLog(`${p.nickname} 选择了武将`);
    this.broadcastState();
    if (this.players.every((x) => x.generalId)) this.beginPlay();
  }

  private beginPlay() {
    this.status = 'playing';
    this.deck = shuffle(createDeck());
    this.discard = [];
    const lord = this.players.find((p) => p.role === 'lord')!;
    for (const p of this.players) this.drawCards(p, 4);
    this.currentPlayerId = lord.id;
    this.turnCount = 1;
    this.addLog(`对局开始！主公是 ${lord.nickname}（${getGeneral(lord.generalId!).name}）`);
    this.startTurn(lord);
    this.broadcastState();
  }

  private startTurn(p: Player) {
    p.slashUsedThisTurn = 0;
    p.skillUsedThisTurn = new Set();
    p.flags['luoyi'] = false;
    p.flags['slashNoDistance'] = false;

    if (this.hasHook(p, 'startDrawBlack')) {
      this.drawCards(p, 1);
      this.addLog(`${p.nickname}【洛神】摸一张牌`);
    }
    if (p.role === 'lord') {
      for (const o of this.alive()) {
        if (this.hasHook(o, 'wangzunDraw') && o.id !== p.id) {
          this.drawCards(o, 1);
          this.addLog(`${o.nickname}【妄尊】摸一张牌`);
        }
      }
    }

    if (p.skipNextPlay) {
      p.skipNextPlay = false;
      this.addLog(`${p.nickname} 跳过出牌阶段`);
      this.phase = 'discard';
      this.enterDiscard(p);
      return;
    }

    this.phase = 'draw';
    let n = 2;
    if (this.hasHook(p, 'extraDraw')) n += 1;
    if (p.flags['luoyiNext']) {
      n -= 1;
      p.flags['luoyi'] = true;
      p.flags['luoyiNext'] = false;
    }
    this.drawCards(p, Math.max(1, n));
    this.addLog(`${p.nickname} 摸了 ${Math.max(1, n)} 张牌`);
    this.phase = 'play';
    this.pending = null;
    this.broadcastState();
  }

  private endPhase(playerId: string) {
    const p = this.mustPlayer(playerId);
    if (this.currentPlayerId !== playerId) throw new Error('不是你的回合');
    if (this.pending) throw new Error('请先完成当前响应');
    if (this.phase === 'play') {
      if (this.hasHook(p, 'endDraw')) {
        this.drawCards(p, 1);
        this.addLog(`${p.nickname}【据守】摸一张牌`);
      }
      this.enterDiscard(p);
    } else if (this.phase === 'discard') {
      throw new Error('请弃置多余手牌');
    }
  }

  private enterDiscard(p: Player) {
    this.phase = 'discard';
    const limit = this.handLimit(p);
    if (p.hand.length <= limit) {
      this.nextTurn();
    } else {
      this.pending = {
        type: 'discard',
        fromPlayerId: p.id,
        prompt: `请弃置 ${p.hand.length - limit} 张牌（手牌上限 ${limit}）`,
        amount: p.hand.length - limit,
      };
      this.broadcastState();
    }
  }

  private handLimit(p: Player): number {
    let lim = p.hp;
    if (this.hasHook(p, 'handLimitPlus1')) lim += 1;
    if (p.role === 'lord') {
      for (const o of this.players) {
        if (this.hasHook(o, 'wangzunDraw') && o.isAlive) lim -= 1;
      }
    }
    return Math.max(0, lim);
  }

  private discardCards(playerId: string, cardIds: string[]) {
    const p = this.mustPlayer(playerId);
    if (!this.pending || this.pending.type !== 'discard' || this.pending.fromPlayerId !== playerId) {
      throw new Error('当前无需弃牌');
    }
    const need = this.pending.amount || 0;
    if (cardIds.length !== need) throw new Error(`需弃置 ${need} 张`);
    for (const id of cardIds) {
      const idx = p.hand.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error('手牌不存在');
      this.discard.push(...p.hand.splice(idx, 1));
    }
    this.pending = null;
    this.addLog(`${p.nickname} 弃置了 ${need} 张牌`);
    this.nextTurn();
  }

  private nextTurn() {
    const alive = this.alive();
    if (!alive.length || this.status !== 'playing') return;
    let idx = alive.findIndex((p) => p.id === this.currentPlayerId);
    idx = (idx + 1) % alive.length;
    const next = alive[idx];
    this.turnCount += 1;
    this.currentPlayerId = next.id;
    this.startTurn(next);
    this.broadcastState();
  }

  private playCard(playerId: string, cardId: string, targetIds: string[]) {
    if (this.pending) throw new Error('请先完成当前响应');
    const p = this.mustPlayer(playerId);
    if (this.currentPlayerId !== playerId || this.phase !== 'play') throw new Error('现在不能出牌');
    const card = p.hand.find((c) => c.id === cardId);
    if (!card) throw new Error('手牌不存在');
    const def = getCardDef(card.defId);

    if (def.type === 'equipment') { this.equipCard(p, card); return; }
    if (def.basic === 'slash') { this.useSlash(p, card, targetIds); return; }
    if (def.basic === 'peach') { this.usePeach(p, card, targetIds); return; }
    if (def.basic === 'dodge') throw new Error('「避」只能在响应时使用');
    if (def.trick) { this.useTrick(p, card, def.trick, targetIds); return; }
    throw new Error('无法使用该牌');
  }

  private equipCard(p: Player, card: CardInstance) {
    const def = getCardDef(card.defId);
    const slot = def.slot!;
    const old = p.equipment.filter((e) => getCardDef(e.defId).slot === slot);
    for (const o of old) {
      p.equipment = p.equipment.filter((e) => e.id !== o.id);
      this.discard.push(o);
    }
    p.hand = p.hand.filter((c) => c.id !== card.id);
    p.equipment.push(card);
    this.addLog(`${p.nickname} 装备了「${def.name}」`);
    this.broadcastState();
  }

  private useSlash(p: Player, card: CardInstance, targetIds: string[]) {
    const noLimit = this.hasHook(p, 'slashNoLimit');
    if (!noLimit && p.slashUsedThisTurn >= 1) throw new Error('本回合已使用过「斩」');
    if (targetIds.length !== 1) throw new Error('「斩」需要一名目标');
    const target = this.mustAlive(targetIds[0]);
    if (target.id === p.id) throw new Error('不能斩自己');
    if (!this.inAttackRange(p, target) && !p.flags['slashNoDistance']) throw new Error('目标不在攻击范围内');

    const def = getCardDef(card.defId);
    if (this.blockedByArmor(target, def.suit)) {
      p.hand = p.hand.filter((c) => c.id !== card.id);
      this.discard.push(card);
      p.slashUsedThisTurn += 1;
      this.addLog(`${p.nickname} 对 ${target.nickname} 使用「斩」，被防具无效`);
      this.broadcastState();
      return;
    }

    p.hand = p.hand.filter((c) => c.id !== card.id);
    this.discard.push(card);
    p.slashUsedThisTurn += 1;
    this.addLog(`${p.nickname} 对 ${target.nickname} 使用了「斩」`);

    let needDodge = 1;
    if (this.hasHook(p, 'needDoubleRespond')) needDodge = 2;
    if (this.hasHook(target, 'needDoubleDodge') && target.hand.length >= target.hp) needDodge = 2;

    let canDodge = true;
    if (this.hasHook(p, 'slashVsFewerNoDodge') && target.hand.length <= p.hand.length) canDodge = false;
    if (this.hasHook(p, 'slashJudgeNoDodge') && Math.random() < 0.5) {
      canDodge = false;
      this.addLog(`${p.nickname}【铁蹄】判定成功，目标无法出「避」`);
    }

    if (!canDodge) {
      this.dealDamage(target, p, 1 + (p.flags['luoyi'] ? 1 : 0), 'slash');
      this.broadcastState();
      return;
    }

    this.ctx = { kind: 'slash', from: p.id, to: target.id, damage: 1 + (p.flags['luoyi'] ? 1 : 0), needDodge, dodged: 0 };
    this.pending = {
      type: 'respondDodge', fromPlayerId: p.id, toPlayerId: target.id,
      prompt: needDodge > 1 ? `请打出 ${needDodge} 张「避」` : '请打出「避」或取消', amount: needDodge,
    };
    this.broadcastState();
  }

  private blockedByArmor(target: Player, suit: string): boolean {
    for (const e of target.equipment) {
      const d = getCardDef(e.defId);
      if (d.equip === 'shield' && suit === 'spade') return true;
      if (d.equip === 'mail' && suitColor(suit) === 'red') return true;
    }
    return false;
  }

  private usePeach(p: Player, card: CardInstance, _targetIds: string[]) {
    const target = p;
    if (target.hp >= target.maxHp) throw new Error('体力已满');
    p.hand = p.hand.filter((c) => c.id !== card.id);
    this.discard.push(card);
    let heal = 1;
    if (this.hasHook(p, 'peachExtra')) heal += 1;
    target.hp = Math.min(target.maxHp, target.hp + heal);
    this.addLog(`${p.nickname} 使用「疗」，回复 ${heal} 点体力`);
    this.broadcastState();
  }

  private useTrick(p: Player, card: CardInstance, trick: string, targetIds: string[]) {
    p.hand = p.hand.filter((c) => c.id !== card.id);
    this.discard.push(card);
    if (this.hasHook(p, 'drawOnTrick')) {
      this.drawCards(p, 1);
      this.addLog(`${p.nickname}【集智】摸一张牌`);
    }

    switch (trick) {
      case 'draw2':
        this.drawCards(p, 2);
        this.addLog(`${p.nickname} 使用「空策」摸两张牌`);
        this.broadcastState();
        break;
      case 'healAll':
        for (const a of this.alive()) if (a.hp < a.maxHp) a.hp += 1;
        this.addLog(`${p.nickname} 使用「援护」，全场回复`);
        this.broadcastState();
        break;
      case 'discard1':
      case 'steal': {
        if (targetIds.length !== 1) throw new Error('需要一名目标');
        const t = this.mustAlive(targetIds[0]);
        if (t.id === p.id) throw new Error('不能以自己为目标');
        const cards = [...t.hand, ...t.equipment];
        if (!cards.length) throw new Error('目标没有牌');
        const taken = cards[Math.floor(Math.random() * cards.length)];
        t.hand = t.hand.filter((c) => c.id !== taken.id);
        t.equipment = t.equipment.filter((c) => c.id !== taken.id);
        if (trick === 'steal') {
          p.hand.push(taken);
          this.addLog(`${p.nickname} 「巧取」获得了 ${t.nickname} 的一张牌`);
        } else {
          this.discard.push(taken);
          this.addLog(`${p.nickname} 「削势」弃置了 ${t.nickname} 的一张牌`);
        }
        this.broadcastState();
        break;
      }
      case 'duel': {
        if (targetIds.length !== 1) throw new Error('需要一名目标');
        const t = this.mustAlive(targetIds[0]);
        this.addLog(`${p.nickname} 对 ${t.nickname} 发起「对决」`);
        this.ctx = { kind: 'duel', a: p.id, b: t.id, turn: t.id };
        this.pending = { type: 'respondSlash', fromPlayerId: p.id, toPlayerId: t.id, prompt: '请打出「斩」继续对决，或取消受伤' };
        this.broadcastState();
        break;
      }
      case 'aoeSlash':
      case 'aoeDamage': {
        const others = this.alive().filter((x) => x.id !== p.id);
        this.addLog(`${p.nickname} 使用了「${trick === 'aoeSlash' ? '万箭' : '雷殛'}」`);
        this.ctx = { kind: trick, from: p.id, queue: others.map((o) => o.id), idx: 0 };
        this.advanceAoe();
        break;
      }
      case 'skipTurn': {
        if (targetIds.length !== 1) throw new Error('需要一名目标');
        const t = this.mustAlive(targetIds[0]);
        t.skipNextPlay = true;
        this.addLog(`${p.nickname} 对 ${t.nickname} 使用「迟滞」`);
        this.broadcastState();
        break;
      }
      case 'cancel':
        throw new Error('「破计」只能在响应时使用');
      default:
        throw new Error('未知锦囊');
    }
  }

  private advanceAoe() {
    const queue = this.ctx.queue as string[];
    let idx = this.ctx.idx as number;
    const kind = this.ctx.kind as string;
    const from = this.ctx.from as string;
    while (idx < queue.length) {
      const tid = queue[idx];
      const t = this.players.find((p) => p.id === tid);
      if (!t || !t.isAlive) { idx++; continue; }
      this.ctx.idx = idx;
      this.ctx.aoeDamageOnFail = true;
      if (kind === 'aoeSlash') {
        this.pending = { type: 'respondDodge', fromPlayerId: from, toPlayerId: tid, prompt: '万箭：请打出「避」否则受到1点伤害', amount: 1 };
      } else {
        this.pending = { type: 'respondSlash', fromPlayerId: from, toPlayerId: tid, prompt: '雷殛：请打出「斩」否则受到1点伤害', amount: 1 };
      }
      this.broadcastState();
      return;
    }
    this.pending = null;
    this.ctx = {};
    this.broadcastState();
  }

  private respond(playerId: string, msg: { cardId?: string; accept?: boolean }) {
    if (!this.pending) throw new Error('当前无响应');
    const pending = this.pending;
    if (pending.toPlayerId && pending.toPlayerId !== playerId) throw new Error('不是你的响应');
    if (pending.type === 'discard') throw new Error('请使用弃牌指令');
    const p = this.mustPlayer(playerId);

    if (pending.type === 'respondDodge') {
      if (!msg.cardId || msg.accept === false) { this.finishDodgeFail(p); return; }
      const card = p.hand.find((c) => c.id === msg.cardId);
      if (!card) throw new Error('手牌不存在');
      const def = getCardDef(card.defId);
      const ok = def.basic === 'dodge' || (this.hasHook(p, 'slashDodgeSwap') && def.basic === 'slash') || this.hasHook(p, 'anyAsDodge');
      if (!ok) throw new Error('请打出「避」');
      p.hand = p.hand.filter((c) => c.id !== card.id);
      this.discard.push(card);
      const need = (this.ctx.needDodge as number) || 1;
      this.ctx.dodged = ((this.ctx.dodged as number) || 0) + 1;
      this.addLog(`${p.nickname} 打出了「避」`);
      if ((this.ctx.dodged as number) >= need) {
        if (this.ctx.aoeDamageOnFail) {
          (this.ctx.idx as number)++;
          this.pending = null;
          this.advanceAoe();
        } else {
          this.pending = null;
          this.ctx = {};
          this.broadcastState();
        }
      } else {
        this.pending = { ...pending, prompt: `请再打出「避」（${this.ctx.dodged}/${need}）` };
        this.broadcastState();
      }
      return;
    }

    if (pending.type === 'respondSlash' || pending.type === 'respondDuel') {
      if (!msg.cardId || msg.accept === false) {
        if (this.ctx.aoeDamageOnFail) {
          const from = this.mustPlayer(this.ctx.from as string);
          this.dealDamage(p, from, 1, 'aoe');
          (this.ctx.idx as number)++;
          this.pending = null;
          this.advanceAoe();
        } else if (this.ctx.kind === 'duel') {
          const otherId = (this.ctx.a === p.id ? this.ctx.b : this.ctx.a) as string;
          const other = this.mustPlayer(otherId);
          this.dealDamage(p, other, 1, 'duel');
          this.pending = null;
          this.ctx = {};
          this.broadcastState();
        }
        return;
      }
      const card = p.hand.find((c) => c.id === msg.cardId);
      if (!card) throw new Error('手牌不存在');
      const def = getCardDef(card.defId);
      const ok = def.basic === 'slash' || (this.hasHook(p, 'slashDodgeSwap') && def.basic === 'dodge') ||
        (this.hasHook(p, 'redAsSlash') && suitColor(def.suit) === 'red') ||
        (this.hasHook(p, 'spadeAsSlash') && def.suit === 'spade');
      if (!ok) throw new Error('请打出「斩」');
      p.hand = p.hand.filter((c) => c.id !== card.id);
      this.discard.push(card);
      this.addLog(`${p.nickname} 打出了「斩」`);
      if (this.ctx.aoeDamageOnFail) {
        (this.ctx.idx as number)++;
        this.pending = null;
        this.advanceAoe();
        return;
      }
      if (this.ctx.kind === 'duel') {
        const nextId = p.id === this.ctx.a ? (this.ctx.b as string) : (this.ctx.a as string);
        this.pending = { type: 'respondSlash', fromPlayerId: pending.fromPlayerId, toPlayerId: nextId, prompt: '请打出「斩」继续对决，或取消受伤' };
        this.broadcastState();
      }
    }
  }

  private finishDodgeFail(p: Player) {
    if (this.ctx.aoeDamageOnFail) {
      const from = this.mustPlayer(this.ctx.from as string);
      this.dealDamage(p, from, 1, 'aoe');
      (this.ctx.idx as number)++;
      this.pending = null;
      this.advanceAoe();
      return;
    }
    const from = this.mustPlayer(this.ctx.from as string);
    const dmg = (this.ctx.damage as number) || 1;
    this.dealDamage(p, from, dmg, 'slash');
    this.pending = null;
    this.ctx = {};
    this.broadcastState();
  }

  private useSkill(playerId: string, skillId: string, cardIds: string[], targetIds: string[]) {
    const p = this.mustPlayer(playerId);
    if (this.currentPlayerId !== playerId || this.phase !== 'play') throw new Error('现在不能发动技能');
    if (this.pending) throw new Error('请先完成响应');
    if (p.skillUsedThisTurn.has(skillId)) throw new Error('本回合已发动');

    if (this.hasHook(p, 'selfDamageHit') && (skillId === 's_qiangxi' || skillId === 's_qiangxi2')) {
      if (targetIds.length !== 1) throw new Error('需要目标');
      const t = this.mustAlive(targetIds[0]);
      p.skillUsedThisTurn.add(skillId);
      p.hp -= 1;
      this.addLog(`${p.nickname} 发动技能，失去1点体力`);
      this.checkDying(p, p);
      if (p.isAlive) this.dealDamage(t, p, 1, 'skill');
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'selfDamageDraw2') && skillId === 's_kurou') {
      p.skillUsedThisTurn.add(skillId);
      p.hp -= 1;
      this.drawCards(p, 2);
      this.addLog(`${p.nickname}【苦肉】失去1体力摸两张`);
      this.checkDying(p, p);
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'luoyiBuff') && skillId === 's_luoyi') {
      p.skillUsedThisTurn.add(skillId);
      p.flags['luoyiNext'] = true;
      this.addLog(`${p.nickname}【裸衣】`);
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'slashNoDistance') && skillId === 's_tianyi') {
      p.skillUsedThisTurn.add(skillId);
      p.flags['slashNoDistance'] = true;
      this.addLog(`${p.nickname}【天义】本回合斩无距离限制`);
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'forceDiscardTarget') && skillId === 's_fanjian') {
      if (targetIds.length !== 1) throw new Error('需要目标');
      const t = this.mustAlive(targetIds[0]);
      if (!t.hand.length) throw new Error('目标无手牌');
      const c = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0];
      this.discard.push(c);
      p.skillUsedThisTurn.add(skillId);
      this.addLog(`${p.nickname}【反间】弃置 ${t.nickname} 一张手牌`);
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'redAsSlash') && (skillId === 's_wusheng' || skillId === 's_quanheng')) {
      if (cardIds.length !== 1) throw new Error('选择一张红色牌');
      const card = p.hand.find((c) => c.id === cardIds[0]);
      if (!card) throw new Error('手牌不存在');
      if (suitColor(getCardDef(card.defId).suit) !== 'red') throw new Error('须为红色');
      this.useSlash(p, card, targetIds);
      return;
    }
    if (this.hasHook(p, 'spadeAsSlash') && skillId === 's_jiuchi') {
      if (cardIds.length !== 1) throw new Error('选择一张黑桃牌');
      const card = p.hand.find((c) => c.id === cardIds[0]);
      if (!card) throw new Error('手牌不存在');
      if (getCardDef(card.defId).suit !== 'spade') throw new Error('须为黑桃');
      this.useSlash(p, card, targetIds);
      return;
    }
    if (this.hasHook(p, 'blackAsDiscard') && skillId === 's_qixi') {
      if (cardIds.length !== 1 || targetIds.length !== 1) throw new Error('选择黑色牌与目标');
      const card = p.hand.find((c) => c.id === cardIds[0]);
      if (!card) throw new Error('手牌不存在');
      if (suitColor(getCardDef(card.defId).suit) !== 'black') throw new Error('须为黑色');
      this.useTrick(p, card, 'discard1', targetIds);
      return;
    }
    if (this.hasHook(p, 'diamondAsSkip') && skillId === 's_guose') {
      if (cardIds.length !== 1 || targetIds.length !== 1) throw new Error('选择方块牌与目标');
      const card = p.hand.find((c) => c.id === cardIds[0]);
      if (!card) throw new Error('手牌不存在');
      if (getCardDef(card.defId).suit !== 'diamond') throw new Error('须为方块');
      this.useTrick(p, card, 'skipTurn', targetIds);
      return;
    }
    if (this.hasHook(p, 'slashDodgeSwap') && skillId === 's_longdan') {
      if (cardIds.length !== 1) throw new Error('选择一张避当斩');
      const card = p.hand.find((c) => c.id === cardIds[0]);
      if (!card) throw new Error('手牌不存在');
      if (getCardDef(card.defId).basic !== 'dodge') throw new Error('请选择「避」当「斩」');
      this.useSlash(p, card, targetIds);
      return;
    }
    if (this.hasHook(p, 'lijianDuel') && skillId === 's_lijian') {
      if (targetIds.length !== 2 || cardIds.length !== 1) throw new Error('弃一张牌并选择两名角色');
      const card = p.hand.find((c) => c.id === cardIds[0]);
      if (!card) throw new Error('手牌不存在');
      p.hand = p.hand.filter((c) => c.id !== card.id);
      this.discard.push(card);
      const a = this.mustAlive(targetIds[0]);
      const b = this.mustAlive(targetIds[1]);
      p.skillUsedThisTurn.add(skillId);
      this.addLog(`${p.nickname}【离间】令 ${a.nickname} 与 ${b.nickname} 对决`);
      this.ctx = { kind: 'duel', a: a.id, b: b.id, turn: b.id };
      this.pending = { type: 'respondSlash', fromPlayerId: a.id, toPlayerId: b.id, prompt: '离间对决：请打出「斩」或取消受伤' };
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'forceHitOther') && skillId === 's_quhu') {
      if (targetIds.length !== 2) throw new Error('选择伤害来源与目标');
      const a = this.mustAlive(targetIds[0]);
      const b = this.mustAlive(targetIds[1]);
      p.skillUsedThisTurn.add(skillId);
      this.dealDamage(b, a, 1, 'skill');
      this.addLog(`${p.nickname}【驱虎】`);
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'tuxiSteal') && skillId === 's_tuxi') {
      if (targetIds.length < 1) throw new Error('选择目标');
      p.skillUsedThisTurn.add(skillId);
      for (const tid of targetIds.slice(0, 2)) {
        const t = this.mustAlive(tid);
        if (t.hand.length) p.hand.push(t.hand.splice(0, 1)[0]);
      }
      this.addLog(`${p.nickname}【突袭】`);
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'burstSelfHit2') && skillId === 's_liefan') {
      if (targetIds.length !== 1) throw new Error('需要目标');
      const t = this.mustAlive(targetIds[0]);
      if (t.id === p.id) throw new Error('不能以自己为目标');
      if (!this.inAttackRange(p, t)) throw new Error('目标不在攻击范围内');
      p.skillUsedThisTurn.add(skillId);
      p.hp -= 1;
      this.addLog(`${p.nickname}【烈焚】失去1点体力`);
      this.checkDying(p, p);
      if (p.isAlive) this.dealDamage(t, p, 2, 'skill');
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'forceDiscardAndSkip') && skillId === 's_mizhang') {
      if (targetIds.length !== 1) throw new Error('需要目标');
      const t = this.mustAlive(targetIds[0]);
      if (t.id === p.id) throw new Error('不能以自己为目标');
      if (!t.hand.length) throw new Error('目标无手牌');
      const c = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0];
      this.discard.push(c);
      t.skipNextPlay = true;
      p.skillUsedThisTurn.add(skillId);
      this.addLog(`${p.nickname}【迷障】令 ${t.nickname} 弃牌并跳过下一出牌阶段`);
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'onceForceDiscard') && skillId === 's_chezhou') {
      if (targetIds.length !== 1) throw new Error('需要目标');
      const t = this.mustAlive(targetIds[0]);
      if (!t.hand.length) throw new Error('目标无手牌');
      const c = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1)[0];
      this.discard.push(c);
      p.skillUsedThisTurn.add(skillId);
      this.addLog(`${p.nickname}【掣肘】弃置 ${t.nickname} 一张手牌`);
      this.broadcastState();
      return;
    }
    if (this.hasHook(p, 'healAllyDraw') && skillId === 's_jishi') {
      if (targetIds.length !== 1) throw new Error('需要目标');
      const t = this.mustAlive(targetIds[0]);
      p.skillUsedThisTurn.add(skillId);
      if (t.hp < t.maxHp) t.hp += 1;
      this.drawCards(t, 1);
      this.addLog(`${p.nickname}【济世】令 ${t.nickname} 回复并摸牌`);
      this.broadcastState();
      return;
    }
    throw new Error('该技能暂不可主动发动或参数错误');
  }

  private dealDamage(target: Player, source: Player | null, amount: number, reason: string) {
    if (!target.isAlive) return;
    if (this.hasHook(target, 'damageCap1') && amount > 1) {
      amount = 1;
      this.addLog(`${target.nickname}【凝霜】将伤害降至1点`);
    }
    target.hp -= amount;
    this.addLog(`${target.nickname} 受到 ${amount} 点伤害${source ? `（来自 ${source.nickname}）` : ''}，体力 ${target.hp}`);

    if (source && this.hasHook(target, 'drawOnDamage')) this.drawCards(target, 1);
    if (source && this.hasHook(target, 'draw2OnDamage')) this.drawCards(target, 2 * amount);
    if (source && this.hasHook(target, 'stealOnDamaged') && source.hand.length + source.equipment.length > 0) {
      const cards = [...source.hand, ...source.equipment];
      const taken = cards[Math.floor(Math.random() * cards.length)];
      source.hand = source.hand.filter((c) => c.id !== taken.id);
      source.equipment = source.equipment.filter((c) => c.id !== taken.id);
      target.hand.push(taken);
      this.addLog(`${target.nickname}【反馈】获得一张牌`);
    }
    if (source && this.hasHook(target, 'ganglieRevenge') && Math.random() < 0.75) {
      if (source.hand.length >= 2) {
        this.discard.push(...source.hand.splice(0, 2));
        this.addLog(`${target.nickname}【刚烈】令来源弃两张牌`);
      } else {
        this.dealDamage(source, target, 1, 'ganglie');
        return;
      }
    }
    if (source && this.hasHook(source, 'drawAllyOnDamage')) this.drawCards(source, 1);
    if (source && this.hasHook(source, 'drawOnSlashHit') && reason === 'slash') {
      this.drawCards(source, 1);
      this.addLog(`${source.nickname}【电陌】摸一张牌`);
    }
    if (source && this.hasHook(source, 'healOnNearDamage') && this.distance(source, target) <= 1) {
      if (source.hp < source.maxHp) {
        source.hp += 1;
        this.addLog(`${source.nickname}【狂骨】回复1点体力`);
      }
    }
    this.checkDying(target, source);
  }

  private checkDying(target: Player, source: Player | null) {
    if (target.hp > 0) return;
    while (target.hp <= 0) {
      const peach = target.hand.find((c) => getCardDef(c.defId).basic === 'peach');
      if (peach) {
        target.hand = target.hand.filter((c) => c.id !== peach.id);
        this.discard.push(peach);
        target.hp += 1;
        this.addLog(`${target.nickname} 濒死，使用「疗」回复`);
        continue;
      }
      let saved = false;
      const wansha = this.currentPlayerId && this.hasHook(this.mustPlayer(this.currentPlayerId), 'wanshaLock');
      for (const o of this.alive()) {
        if (o.id === target.id) continue;
        if (wansha && o.id !== this.currentPlayerId) continue;
        const peach2 = o.hand.find((c) => getCardDef(c.defId).basic === 'peach');
        if (peach2) {
          o.hand = o.hand.filter((c) => c.id !== peach2.id);
          this.discard.push(peach2);
          target.hp += 1;
          this.addLog(`${o.nickname} 对 ${target.nickname} 使用「疗」`);
          saved = true;
          break;
        }
        if (this.hasHook(o, 'redAsPeachOutOfTurn')) {
          const red = o.hand.find((c) => suitColor(getCardDef(c.defId).suit) === 'red');
          if (red) {
            o.hand = o.hand.filter((c) => c.id !== red.id);
            this.discard.push(red);
            target.hp += 1;
            this.addLog(`${o.nickname}【急救】救了 ${target.nickname}`);
            saved = true;
            break;
          }
        }
      }
      if (!saved) break;
    }
    if (target.hp <= 0) this.killPlayer(target, source);
  }

  private killPlayer(target: Player, source: Player | null) {
    target.isAlive = false;
    target.hp = 0;
    target.roleRevealed = true;
    this.discard.push(...target.hand, ...target.equipment);
    target.hand = [];
    target.equipment = [];
    this.addLog(`${target.nickname} 阵亡！身份是【${roleName(target.role!)}】`);

    if (source && this.hasHook(source, 'drawOnKill')) {
      this.drawCards(source, 2);
      this.addLog(`${source.nickname}【连破】摸两张牌`);
    }
    if (target.role === 'rebel' && source && source.isAlive) {
      this.drawCards(source, 3);
      this.addLog(`${source.nickname} 击败反贼，摸三张牌`);
    }
    if (target.role === 'loyal' && source?.role === 'lord') {
      this.discard.push(...source.hand, ...source.equipment);
      source.hand = [];
      source.equipment = [];
      this.addLog('主公误杀忠臣，弃置所有牌');
    }

    this.checkWin();
    if (this.status === 'playing' && this.currentPlayerId === target.id) {
      this.pending = null;
      this.nextTurn();
    } else {
      this.broadcastState();
    }
  }

  private checkWin() {
    const alive = this.alive();
    const lordAlive = alive.some((p) => p.role === 'lord');
    const rebelAlive = alive.some((p) => p.role === 'rebel');
    const spyAlive = alive.some((p) => p.role === 'spy');

    if (!lordAlive) {
      if (alive.length === 1 && alive[0].role === 'spy') this.finish('spy');
      else if (!rebelAlive && spyAlive) this.finish('spy');
      else this.finish('rebel');
      return;
    }
    if (!rebelAlive && !spyAlive) this.finish('lord');
  }

  private finish(team: string) {
    this.status = 'finished';
    this.winnerTeam = team;
    this.pending = null;
    this.phase = null;
    this.addLog(roleWinText(team));
    this.players.forEach((p) => (p.roleRevealed = true));
    this.broadcastState();
  }

  private attackRangeOf(p: Player): number {
    let r = 1;
    for (const e of p.equipment) {
      const d = getCardDef(e.defId);
      if (d.slot === 'weapon' && d.attackRange) r = Math.max(r, d.attackRange);
    }
    return r;
  }

  private distance(from: Player, to: Player): number {
    const n = this.alive().length;
    if (n <= 1) return 0;
    const seats = this.alive().sort((a, b) => a.seat - b.seat);
    const i = seats.findIndex((p) => p.id === from.id);
    const j = seats.findIndex((p) => p.id === to.id);
    let d = Math.min(Math.abs(i - j), n - Math.abs(i - j));
    for (const e of to.equipment) if (getCardDef(e.defId).equip === 'swiftHorse') d += 1;
    for (const e of from.equipment) if (getCardDef(e.defId).equip === 'heavyHorse') d -= 1;
    if (this.hasHook(from, 'distanceMinus1')) d -= 1;
    if (this.hasHook(from, 'yicongDistance') && from.hp > 2) d -= 1;
    if (this.hasHook(to, 'yicongDistance') && to.hp <= 2) d += 1;
    return Math.max(1, d);
  }

  private inAttackRange(from: Player, to: Player): boolean {
    return this.distance(from, to) <= this.attackRangeOf(from);
  }

  private drawCards(p: Player, n: number) {
    for (let i = 0; i < n; i++) {
      if (!this.deck.length) {
        if (!this.discard.length) break;
        this.deck = shuffle(this.discard);
        this.discard = [];
      }
      const c = this.deck.pop();
      if (c) p.hand.push(c);
    }
  }

  private hasHook(p: Player, hook: string): boolean {
    if (!p.generalId) return false;
    return getGeneral(p.generalId).hooks.includes(hook);
  }

  private alive(): Player[] { return this.players.filter((p) => p.isAlive); }

  private mustPlayer(id: string): Player {
    const p = this.players.find((x) => x.id === id);
    if (!p) throw new Error('玩家不存在');
    return p;
  }

  private mustAlive(id: string): Player {
    const p = this.mustPlayer(id);
    if (!p.isAlive) throw new Error('目标已死亡');
    return p;
  }

  private addLog(msg: string) {
    this.log.push(msg);
    if (this.log.length > 80) this.log.shift();
  }

  private chat(playerId: string, text: string) {
    const p = this.mustPlayer(playerId);
    const payload = { type: 'chat', from: p.nickname, text: text.slice(0, 100), ts: Date.now() };
    for (const pl of this.players) pl.wsSend(payload);
  }

  private sendTo(playerId: string, data: unknown) {
    this.players.find((p) => p.id === playerId)?.wsSend(data);
  }

  broadcastState() {
    for (const p of this.players) {
      p.wsSend({
        type: 'state',
        state: this.publicState(p),
        me: this.privateView(p),
        pickOptions: this.status === 'picking' && !p.generalId ? p.pickOptions : undefined,
      });
    }
  }

  private publicState(viewer: Player): GamePublicState {
    return {
      roomCode: this.code, status: this.status,
      players: this.players.map((p) => this.publicView(p, viewer)),
      currentPlayerId: this.currentPlayerId, phase: this.phase,
      deckCount: this.deck.length, discardCount: this.discard.length,
      turnCount: this.turnCount, log: this.log.slice(-40),
      winnerTeam: this.winnerTeam, pendingAction: this.pending,
    };
  }

  private publicView(p: Player, viewer: Player): PublicPlayerView {
    const g = p.generalId ? getGeneral(p.generalId) : null;
    const showRole = p.id === viewer.id || p.roleRevealed || p.role === 'lord';
    return {
      id: p.id, nickname: p.nickname, seat: p.seat, generalId: p.generalId,
      generalName: g?.name ?? null, maxHp: p.maxHp, hp: p.hp, handCount: p.hand.length,
      equipment: p.equipment, isAlive: p.isAlive, isCurrent: p.id === this.currentPlayerId,
      role: showRole ? p.role ?? undefined : undefined,
      roleRevealed: p.roleRevealed || p.role === 'lord', isLord: p.role === 'lord', chained: p.chained, ready: p.ready, isHost: p.id === this.hostId,
    };
  }

  private privateView(p: Player): PrivatePlayerView {
    const g = p.generalId ? getGeneral(p.generalId) : null;
    return { ...this.publicView(p, p), hand: p.hand, role: p.role!, skills: g?.skills ?? [] };
  }
}

export function genRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
