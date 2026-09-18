import type { Role } from './types.js';

/** 按人数分配身份：主公、忠臣、反贼、内奸 */
export function assignRoles(playerCount: number): Role[] {
  const map: Record<number, Role[]> = {
    2: ['lord', 'rebel'],
    3: ['lord', 'loyal', 'rebel'],
    4: ['lord', 'loyal', 'rebel', 'spy'],
    5: ['lord', 'loyal', 'rebel', 'rebel', 'spy'],
    6: ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'spy'],
    7: ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'spy'],
    8: ['lord', 'loyal', 'loyal', 'rebel', 'rebel', 'rebel', 'spy', 'spy'],
  };
  const roles = map[playerCount];
  if (!roles) throw new Error(`不支持的人数: ${playerCount}`);
  return shuffle([...roles]);
}

export function roleName(role: Role): string {
  switch (role) {
    case 'lord': return '主公';
    case 'loyal': return '忠臣';
    case 'rebel': return '反贼';
    case 'spy': return '内奸';
  }
}

export function roleWinText(team: string): string {
  switch (team) {
    case 'lord': return '主公阵营胜利！忠臣护驾有功。';
    case 'rebel': return '反贼胜利！推翻朝廷。';
    case 'spy': return '内奸独胜！渔翁得利。';
    default: return '对局结束';
  }
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
