import { getCardDef, SUIT_SYMBOL, roleName } from '../../shared/src/index';
import type { CardInstance } from '../../shared/src/index';

export { getCardDef, SUIT_SYMBOL, roleName };

export function cardLabel(c: CardInstance): string {
  const d = getCardDef(c.defId);
  return `${SUIT_SYMBOL[d.suit]}${d.rank} ${d.name}`;
}

export function cardName(c: CardInstance): string {
  return getCardDef(c.defId).name;
}

export function isRed(c: CardInstance): boolean {
  const s = getCardDef(c.defId).suit;
  return s === 'heart' || s === 'diamond';
}
