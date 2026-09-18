/** 天元争锋 - 共享类型定义 */

export type Role = 'lord' | 'loyal' | 'rebel' | 'spy';
export type CardType = 'basic' | 'trick' | 'equipment';
export type EquipSlot = 'weapon' | 'armor' | 'horsePlus' | 'horseMinus';
export type Suit = 'spade' | 'heart' | 'club' | 'diamond';
export type Phase = 'draw' | 'play' | 'discard' | 'wait';
export type RoomStatus = 'lobby' | 'picking' | 'playing' | 'finished';

export type BasicId = 'slash' | 'dodge' | 'peach';
export type TrickId =
  | 'draw2'
  | 'discard1'
  | 'steal'
  | 'duel'
  | 'aoeSlash'
  | 'aoeDamage'
  | 'healAll'
  | 'skipTurn'
  | 'cancel';
export type EquipId =
  | 'blade'
  | 'spear'
  | 'bow'
  | 'halberd'
  | 'shield'
  | 'mail'
  | 'swiftHorse'
  | 'heavyHorse';

export interface CardDef {
  defId: string;
  name: string;
  type: CardType;
  suit: Suit;
  rank: number;
  basic?: BasicId;
  trick?: TrickId;
  equip?: EquipId;
  slot?: EquipSlot;
  attackRange?: number;
  description: string;
}

export interface CardInstance {
  id: string;
  defId: string;
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  /** passive | active | trigger */
  kind: 'passive' | 'active' | 'trigger';
}

export interface GeneralDef {
  id: string;
  name: string;
  faction: string;
  maxHp: number;
  gender: 'male' | 'female';
  skills: SkillDef[];
  /** 简要实现标签，供服务端钩子识别 */
  hooks: string[];
}

export interface PublicPlayerView {
  id: string;
  nickname: string;
  seat: number;
  generalId: string | null;
  generalName: string | null;
  maxHp: number;
  hp: number;
  handCount: number;
  equipment: CardInstance[];
  isAlive: boolean;
  isCurrent: boolean;
  role?: Role; // 仅死亡或本人可见时下发
  roleRevealed: boolean;
  isLord: boolean;
  chained: boolean;
  ready?: boolean;
  isHost?: boolean;
}

export interface PrivatePlayerView extends PublicPlayerView {
  hand: CardInstance[];
  role: Role;
  skills: SkillDef[];
}

export interface GamePublicState {
  roomCode: string;
  status: RoomStatus;
  players: PublicPlayerView[];
  currentPlayerId: string | null;
  phase: Phase | null;
  deckCount: number;
  discardCount: number;
  turnCount: number;
  log: string[];
  winnerTeam: string | null;
  pendingAction: PendingAction | null;
}

export interface PendingAction {
  type: 'respondSlash' | 'respondDodge' | 'respondDuel' | 'respondCancel' | 'discard' | 'chooseTarget' | 'useSkill';
  fromPlayerId: string;
  toPlayerId?: string;
  cardId?: string;
  prompt: string;
  candidates?: string[];
  amount?: number;
  deadline?: number;
}

export type ClientMessage =
  | { type: 'create_room'; nickname: string }
  | { type: 'join_room'; roomCode: string; nickname: string }
  | { type: 'leave_room' }
  | { type: 'set_ready'; ready: boolean }
  | { type: 'start_game' }
  | { type: 'pick_general'; generalId: string }
  | { type: 'play_card'; cardId: string; targetIds?: string[] }
  | { type: 'respond'; cardId?: string; accept?: boolean; targetIds?: string[] }
  | { type: 'end_phase' }
  | { type: 'discard_cards'; cardIds: string[] }
  | { type: 'use_skill'; skillId: string; cardIds?: string[]; targetIds?: string[] }
  | { type: 'chat'; text: string };

export type ServerMessage =
  | { type: 'room_created'; roomCode: string; playerId: string }
  | { type: 'joined'; roomCode: string; playerId: string }
  | { type: 'error'; message: string }
  | { type: 'state'; state: GamePublicState; me: PrivatePlayerView | null; pickOptions?: GeneralDef[] }
  | { type: 'chat'; from: string; text: string; ts: number }
  | { type: 'toast'; message: string };
