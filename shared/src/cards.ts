import type { CardDef } from './types.js';

const S = 'spade' as const;
const H = 'heart' as const;
const C = 'club' as const;
const D = 'diamond' as const;

/** 原创卡牌：斩/避/疗 + 锦囊 + 装备 */
export const CARD_DEFS: CardDef[] = [
  // —— 基本牌：斩 ——
  ...makeMany('slash', '斩', 'basic', '对攻击范围内一名角色使用，令其受到1点伤害（可被「避」抵消）。', { basic: 'slash' }, [
    [S, 1], [S, 2], [S, 3], [S, 4], [S, 5], [S, 6], [S, 7], [S, 8],
    [H, 10], [H, 11], [H, 12],
    [C, 2], [C, 3], [C, 4], [C, 5], [C, 6], [C, 7], [C, 8], [C, 9],
    [D, 6], [D, 7], [D, 8], [D, 9], [D, 10], [D, 13],
  ]),
  // —— 基本牌：避 ——
  ...makeMany('dodge', '避', 'basic', '抵消一张「斩」或其他指定你为目标的攻击效果。', { basic: 'dodge' }, [
    [H, 2], [H, 3], [H, 4], [H, 5], [H, 6], [H, 7], [H, 8], [H, 9], [H, 13],
    [D, 2], [D, 3], [D, 4], [D, 5], [D, 6], [D, 7], [D, 8], [D, 11],
  ]),
  // —— 基本牌：疗 ——
  ...makeMany('peach', '疗', 'basic', '回复1点体力。濒死时可对任意角色使用。', { basic: 'peach' }, [
    [H, 1], [H, 3], [H, 4], [H, 6], [H, 7], [H, 8], [H, 9], [H, 12],
    [D, 1], [D, 12],
  ]),
  // —— 锦囊 ——
  ...makeMany('draw2', '空策', 'trick', '摸两张牌。', { trick: 'draw2' }, [
    [H, 7], [H, 8], [H, 9], [H, 11],
  ]),
  ...makeMany('discard1', '削势', 'trick', '弃置一名其他角色的一张手牌或装备。', { trick: 'discard1' }, [
    [S, 3], [S, 4], [S, 12], [C, 3], [C, 4],
  ]),
  ...makeMany('steal', '巧取', 'trick', '获得一名其他角色的一张手牌或装备。', { trick: 'steal' }, [
    [S, 3], [S, 4], [S, 11], [D, 3], [D, 4],
  ]),
  ...makeMany('duel', '对决', 'trick', '与一名其他角色拼「斩」：双方轮流打出「斩」，先无法打出者受伤。', { trick: 'duel' }, [
    [S, 1], [C, 1], [D, 1],
  ]),
  ...makeMany('aoeSlash', '万箭', 'trick', '令所有其他角色依次打出「避」，否则受到1点伤害。', { trick: 'aoeSlash' }, [
    [H, 1], [H, 1],
  ]),
  ...makeMany('aoeDamage', '雷殛', 'trick', '令所有其他角色依次打出「斩」，否则受到1点伤害。', { trick: 'aoeDamage' }, [
    [S, 1], [C, 12],
  ]),
  ...makeMany('healAll', '援护', 'trick', '所有角色各回复1点体力。', { trick: 'healAll' }, [
    [H, 1], [H, 3],
  ]),
  ...makeMany('skipTurn', '迟滞', 'trick', '令一名其他角色跳过其下一个出牌阶段。', { trick: 'skipTurn' }, [
    [S, 6], [C, 6], [D, 6],
  ]),
  ...makeMany('cancel', '破计', 'trick', '抵消一张锦囊牌的效果。', { trick: 'cancel' }, [
    [S, 11], [C, 12], [C, 13], [D, 12],
  ]),
  // —— 装备：武器 ——
  card('blade', '青锋', 'equipment', S, 5, '攻击范围2。你使用「斩」可指定距离更远的目标。', { equip: 'blade', slot: 'weapon', attackRange: 2 }),
  card('blade2', '青锋', 'equipment', S, 6, '攻击范围2。', { equip: 'blade', slot: 'weapon', attackRange: 2 }),
  card('spear', '龙枪', 'equipment', S, 12, '攻击范围3。可将两张手牌当「斩」使用。', { equip: 'spear', slot: 'weapon', attackRange: 3 }),
  card('bow', '穿云弓', 'equipment', H, 5, '攻击范围5。', { equip: 'bow', slot: 'weapon', attackRange: 5 }),
  card('halberd', '方天戟', 'equipment', D, 12, '攻击范围4。你的「斩」可额外指定至多两名目标（若仅此一张手牌）。', { equip: 'halberd', slot: 'weapon', attackRange: 4 }),
  card('sword', '寒铁剑', 'equipment', C, 5, '攻击范围2。目标不能用装备区的牌响应「斩」。', { equip: 'blade', slot: 'weapon', attackRange: 2 }),
  // —— 防具 ——
  card('shield', '玄甲', 'equipment', C, 2, '黑桃「斩」对你无效。', { equip: 'shield', slot: 'armor' }),
  card('mail', '软猬甲', 'equipment', S, 2, '红色「斩」对你无效。', { equip: 'mail', slot: 'armor' }),
  card('shield2', '玄甲', 'equipment', C, 3, '黑桃「斩」对你无效。', { equip: 'shield', slot: 'armor' }),
  // —— 坐骑 ——
  card('swift1', '绝影驹', 'equipment', H, 13, '其他角色计算与你的距离+1。', { equip: 'swiftHorse', slot: 'horsePlus' }),
  card('swift2', '赤电', 'equipment', C, 5, '其他角色计算与你的距离+1。', { equip: 'swiftHorse', slot: 'horsePlus' }),
  card('heavy1', '追风', 'equipment', D, 13, '你计算与其他角色的距离-1。', { equip: 'heavyHorse', slot: 'horseMinus' }),
  card('heavy2', '奔雷', 'equipment', H, 5, '你计算与其他角色的距离-1。', { equip: 'heavyHorse', slot: 'horseMinus' }),
];

function card(
  defId: string,
  name: string,
  type: CardDef['type'],
  suit: CardDef['suit'],
  rank: number,
  description: string,
  extra: Partial<CardDef>
): CardDef {
  return { defId, name, type, suit, rank, description, ...extra };
}

function makeMany(
  baseId: string,
  name: string,
  type: CardDef['type'],
  description: string,
  extra: Partial<CardDef>,
  list: [CardDef['suit'], number][]
): CardDef[] {
  return list.map(([suit, rank], i) =>
    card(`${baseId}_${suit}_${rank}_${i}`, name, type, suit, rank, description, extra)
  );
}

export function getCardDef(defId: string): CardDef {
  const d = CARD_DEFS.find((c) => c.defId === defId);
  if (!d) throw new Error(`未知卡牌: ${defId}`);
  return d;
}

export function createDeck(): { id: string; defId: string }[] {
  return CARD_DEFS.map((d, i) => ({
    id: `c${i}_${d.defId}`,
    defId: d.defId,
  }));
}

export const SUIT_SYMBOL: Record<string, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦',
};

export const SUIT_COLOR: Record<string, string> = {
  spade: 'black',
  heart: 'red',
  club: 'black',
  diamond: 'red',
};
