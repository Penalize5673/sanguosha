/** 双客户端 WS 冒烟：建房→加入→准备→开始→选将→出杀/摸牌/弃牌 */
import WebSocket from 'ws';

const PORT = Number(process.env.PORT) || 3000;
const URL = `ws://127.0.0.1:${PORT}/ws`;

class Bot {
  name: string;
  ws!: WebSocket;
  playerId = '';
  state: any = null;
  me: any = null;
  pick: any[] | undefined;
  private queue: any[] = [];
  private wake: (() => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  async connect() {
    this.ws = new WebSocket(URL);
    await new Promise<void>((res, rej) => {
      this.ws.once('open', () => res());
      this.ws.once('error', rej);
    });
    this.ws.on('message', (raw) => {
      const data = JSON.parse(String(raw));
      if (data.type === 'room_created' || data.type === 'joined') this.playerId = data.playerId;
      if (data.type === 'state') {
        this.state = data.state;
        this.me = data.me;
        this.pick = data.pickOptions;
      }
      this.queue.push(data);
      this.wake?.();
    });
  }

  send(msg: object) {
    this.ws.send(JSON.stringify(msg));
  }

  async waitFor(pred: (d: any) => boolean, ms = 10000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const i = this.queue.findIndex(pred);
      if (i >= 0) return this.queue.splice(i, 1)[0];
      await new Promise<void>((r) => {
        this.wake = r;
        setTimeout(r, 200);
      });
    }
    throw new Error(`${this.name} timeout; seen=${[...new Set(this.queue.map((x) => x.type))].join(',')}`);
  }

  async waitState(pred: (s: any) => boolean, ms = 10000) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (this.state && pred(this.state)) return this.state;
      await this.waitFor(() => true, 400).catch(() => null);
    }
    throw new Error(`${this.name} state timeout status=${this.state?.status}`);
  }

  close() {
    this.ws.close();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const a = new Bot('A');
  const b = new Bot('B');
  await a.connect();
  await b.connect();
  console.log('connected');

  a.send({ type: 'create_room', nickname: 'Zhugong' });
  await a.waitFor((d) => d.type === 'room_created');
  const roomCode = a.state?.roomCode || (await a.waitState((s) => !!s.roomCode)).roomCode;
  console.log('room', roomCode);

  b.send({ type: 'join_room', roomCode, nickname: 'Fanzei' });
  await b.waitFor((d) => d.type === 'joined');
  await a.waitState((s) => s.players.length >= 2);
  console.log('players', a.state.players.length);

  a.send({ type: 'set_ready', ready: true });
  b.send({ type: 'set_ready', ready: true });
  await sleep(150);
  a.send({ type: 'start_game' });
  await a.waitState((s) => s.status === 'picking');
  await sleep(200);
  console.log('pick options', a.pick?.length, b.pick?.length);

  a.send({ type: 'pick_general', generalId: a.pick![0].id });
  b.send({ type: 'pick_general', generalId: b.pick![0].id });
  await a.waitState((s) => s.status === 'playing');
  console.log('playing', 'phase', a.state.phase);

  for (let i = 0; i < 8; i++) {
    await sleep(120);
    if (a.state.status === 'finished') break;
    const cur = a.state.currentPlayerId;
    const actor = cur === a.playerId ? a : b;
    const other = actor === a ? b : a;

    // respond if needed
    for (const bot of [a, b]) {
      const p = bot.state?.pendingAction;
      if (p && p.toPlayerId === bot.playerId) {
        if (p.type === 'respondDodge') {
          const dodge = (bot.me?.hand || []).find((c: any) => String(c.defId).includes('dodge'));
          if (dodge) bot.send({ type: 'respond', cardId: dodge.id, accept: true });
          else bot.send({ type: 'respond', accept: false });
        } else if (p.type === 'respondSlash' || p.type === 'respondDuel') {
          const slash = (bot.me?.hand || []).find((c: any) => String(c.defId).includes('slash'));
          if (slash) bot.send({ type: 'respond', cardId: slash.id, accept: true });
          else bot.send({ type: 'respond', accept: false });
        }
        await sleep(80);
      }
    }

    if (actor.state.phase === 'play' && !actor.state.pendingAction) {
      const hand = actor.me?.hand || [];
      const draw2 = hand.find((c: any) => String(c.defId).includes('draw2'));
      const peach = hand.find((c: any) => String(c.defId).includes('peach'));
      const slash = hand.find((c: any) => String(c.defId).includes('slash'));
      if (draw2) {
        actor.send({ type: 'play_card', cardId: draw2.id, targetIds: [] });
        await sleep(80);
      } else if (peach && actor.me.hp < actor.me.maxHp) {
        actor.send({ type: 'play_card', cardId: peach.id, targetIds: [] });
        await sleep(80);
      } else if (slash) {
        actor.send({ type: 'play_card', cardId: slash.id, targetIds: [other.playerId] });
        await sleep(120);
        const p = other.state?.pendingAction;
        if (p?.type === 'respondDodge' && p.toPlayerId === other.playerId) {
          const dodge = (other.me?.hand || []).find((c: any) => String(c.defId).includes('dodge'));
          if (dodge) other.send({ type: 'respond', cardId: dodge.id, accept: true });
          else other.send({ type: 'respond', accept: false });
          await sleep(80);
        }
      }
      actor.send({ type: 'end_phase' });
      await sleep(100);
      if (actor.state?.pendingAction?.type === 'discard' && actor.state.pendingAction.fromPlayerId === actor.playerId) {
        const need = actor.state.pendingAction.amount || 0;
        const ids = (actor.me?.hand || []).slice(0, need).map((c: any) => c.id);
        actor.send({ type: 'discard_cards', cardIds: ids });
        await sleep(80);
      }
    }
  }

  console.log('status', a.state.status);
  console.log('log:', a.state.log?.slice(-5));
  console.log('SMOKE OK');
  a.close();
  b.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('SMOKE FAIL', e);
  process.exit(1);
});
