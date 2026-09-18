import type { GeneralDef } from './types.js';

/**
 * 40+ 原创武将（天元争锋）
 * hooks 供服务端识别：extraDraw, recoverOnKill, slashNoLimit, dodgeAsSlash,
 * drawOnDamage, discardOnHit, healAlly, doubleSlashRange, lowHpDraw,
 * peachExtra, skipDrawGain, revengeKill, equipDraw, handLimit+1, etc.
 */
export const GENERALS: GeneralDef[] = [
  {
    id: 'g01', name: '陆承渊', faction: '龙庭', maxHp: 4, gender: 'male',
    skills: [{ id: 's_renwang', name: '仁望', description: '主公技：其他龙庭角色可替你打出「疗」。', kind: 'passive' }],
    hooks: ['lordHealAssist'],
  },
  {
    id: 'g02', name: '沈孤鸿', faction: '龙庭', maxHp: 4, gender: 'male',
    skills: [{ id: 's_jianxin', name: '坚心', description: '你的手牌上限+1。', kind: 'passive' }],
    hooks: ['handLimitPlus1'],
  },
  {
    id: 'g03', name: '白夜笙', faction: '龙庭', maxHp: 3, gender: 'female',
    skills: [{ id: 's_qinglan', name: '清澜', description: '你受到伤害后可摸一张牌。', kind: 'trigger' }],
    hooks: ['drawOnDamage'],
  },
  {
    id: 'g04', name: '顾长风', faction: '龙庭', maxHp: 4, gender: 'male',
    skills: [{ id: 's_lianpo', name: '连破', description: '你杀死一名角色后可摸两张牌。', kind: 'trigger' }],
    hooks: ['drawOnKill'],
  },
  {
    id: 'g05', name: '苏墨白', faction: '龙庭', maxHp: 3, gender: 'female',
    skills: [{ id: 's_huichun', name: '回春', description: '你使用「疗」时可额外回复1点体力（目标相同）。', kind: 'passive' }],
    hooks: ['peachExtra'],
  },
  {
    id: 'g06', name: '贺兰策', faction: '龙庭', maxHp: 4, gender: 'male',
    skills: [{ id: 's_tiebi', name: '铁壁', description: '你的回合外，手牌数不小于体力时，「斩」对你需两张「避」。', kind: 'passive' }],
    hooks: ['needDoubleDodge'],
  },
  {
    id: 'g07', name: '萧寒星', faction: '龙庭', maxHp: 3, gender: 'male',
    skills: [{ id: 's_jifeng', name: '疾风', description: '摸牌阶段你多摸一张牌。', kind: 'passive' }],
    hooks: ['extraDraw'],
  },
  {
    id: 'g08', name: '柳如烟', faction: '龙庭', maxHp: 3, gender: 'female',
    skills: [{ id: 's_mijing', name: '迷踪', description: '你计算与其他角色距离-1。', kind: 'passive' }],
    hooks: ['distanceMinus1'],
  },
  {
    id: 'g09', name: '岳镇北', faction: '苍原', maxHp: 4, gender: 'male',
    skills: [{ id: 's_paoxiao', name: '咆哮', description: '出牌阶段你使用「斩」无次数限制。', kind: 'passive' }],
    hooks: ['slashNoLimit'],
  },
  {
    id: 'g10', name: '拓跋烈', faction: '苍原', maxHp: 4, gender: 'male',
    skills: [{ id: 's_tieqi', name: '铁骑', description: '你使用「斩」指定目标后，目标需弃一张牌否则无法出「避」。', kind: 'trigger' }],
    hooks: ['slashForceDiscard'],
  },
  {
    id: 'g11', name: '乌孙瑶', faction: '苍原', maxHp: 3, gender: 'female',
    skills: [{ id: 's_jushou', name: '据守', description: '结束阶段你可摸一张牌并翻面（简化：摸一张）。', kind: 'active' }],
    hooks: ['endDraw'],
  },
  {
    id: 'g12', name: '呼延破', faction: '苍原', maxHp: 4, gender: 'male',
    skills: [{ id: 's_qiangxi', name: '强袭', description: '出牌阶段限一次，失去1点体力对攻击范围内角色造成1点伤害。', kind: 'active' }],
    hooks: ['selfDamageHit'],
  },
  {
    id: 'g13', name: '慕容雪', faction: '苍原', maxHp: 3, gender: 'female',
    skills: [{ id: 's_guhuo', name: '蛊惑', description: '你可将一张牌当「避」使用。', kind: 'active' }],
    hooks: ['anyAsDodge'],
  },
  {
    id: 'g14', name: '斛律苍', faction: '苍原', maxHp: 4, gender: 'male',
    skills: [{ id: 's_jizhen', name: '激阵', description: '你造成伤害后可令一名角色摸一张牌。', kind: 'trigger' }],
    hooks: ['drawAllyOnDamage'],
  },
  {
    id: 'g15', name: '段飞鸿', faction: '苍原', maxHp: 4, gender: 'male',
    skills: [{ id: 's_mashu', name: '马术', description: '你计算与其他角色距离-1。', kind: 'passive' }],
    hooks: ['distanceMinus1'],
  },
  {
    id: 'g16', name: '叶轻云', faction: '江左', maxHp: 3, gender: 'female',
    skills: [{ id: 's_guose', name: '国色', description: '你可将一张方块牌当「迟滞」使用。', kind: 'active' }],
    hooks: ['diamondAsSkip'],
  },
  {
    id: 'g17', name: '周问天', faction: '江左', maxHp: 3, gender: 'male',
    skills: [{ id: 's_fanjian', name: '反间', description: '出牌阶段限一次，令一名角色猜测你展示牌的颜色并执行效果（简化：弃其一张）。', kind: 'active' }],
    hooks: ['forceDiscardTarget'],
  },
  {
    id: 'g18', name: '陆清歌', faction: '江左', maxHp: 3, gender: 'female',
    skills: [{ id: 's_qixi', name: '奇袭', description: '你可将一张黑色牌当「削势」使用。', kind: 'active' }],
    hooks: ['blackAsDiscard'],
  },
  {
    id: 'g19', name: '孙破虏', faction: '江左', maxHp: 4, gender: 'male',
    skills: [{ id: 's_yingzi', name: '英姿', description: '摸牌阶段多摸一张牌。', kind: 'passive' }],
    hooks: ['extraDraw'],
  },
  {
    id: 'g20', name: '大乔梦', faction: '江左', maxHp: 3, gender: 'female',
    skills: [{ id: 's_liuli', name: '流离', description: '当你成为「斩」的目标时，可弃一张牌将目标转移给攻击范围内另一名角色。', kind: 'trigger' }],
    hooks: ['redirectSlash'],
  },
  {
    id: 'g21', name: '甘兴霸', faction: '江左', maxHp: 4, gender: 'male',
    skills: [{ id: 's_kurou', name: '苦肉', description: '出牌阶段限一次，失去1点体力摸两张牌。', kind: 'active' }],
    hooks: ['selfDamageDraw2'],
  },
  {
    id: 'g22', name: '太史慈航', faction: '江左', maxHp: 4, gender: 'male',
    skills: [{ id: 's_tianyi', name: '天义', description: '出牌阶段限一次，与一名角色拼点（简化：你本回合「斩」无距离限制）。', kind: 'active' }],
    hooks: ['slashNoDistance'],
  },
  {
    id: 'g23', name: '小乔羽', faction: '江左', maxHp: 3, gender: 'female',
    skills: [{ id: 's_tianxiang', name: '天香', description: '你受到伤害时可弃一张红桃牌转移伤害并令其摸牌。', kind: 'trigger' }],
    hooks: ['transferDamage'],
  },
  {
    id: 'g24', name: '诸葛星河', faction: '星汉', maxHp: 3, gender: 'male',
    skills: [{ id: 's_guanxing', name: '观星', description: '准备阶段观看牌堆顶两张，以任意顺序放回（简化：摸一张再弃一张）。', kind: 'trigger' }],
    hooks: ['viewTopDrawDiscard'],
  },
  {
    id: 'g25', name: '赵云川', faction: '星汉', maxHp: 4, gender: 'male',
    skills: [{ id: 's_longdan', name: '龙胆', description: '你可将「斩」当「避」、「避」当「斩」使用。', kind: 'active' }],
    hooks: ['slashDodgeSwap'],
  },
  {
    id: 'g26', name: '张翼德', faction: '星汉', maxHp: 4, gender: 'male',
    skills: [{ id: 's_pao', name: '狂啸', description: '出牌阶段「斩」无次数限制。', kind: 'passive' }],
    hooks: ['slashNoLimit'],
  },
  {
    id: 'g27', name: '关云戈', faction: '星汉', maxHp: 4, gender: 'male',
    skills: [{ id: 's_wusheng', name: '武圣', description: '你可将一张红色牌当「斩」使用。', kind: 'active' }],
    hooks: ['redAsSlash'],
  },
  {
    id: 'g28', name: '黄月英', faction: '星汉', maxHp: 3, gender: 'female',
    skills: [{ id: 's_jizhi', name: '集智', description: '你使用锦囊牌时摸一张牌。', kind: 'trigger' }],
    hooks: ['drawOnTrick'],
  },
  {
    id: 'g29', name: '马超影', faction: '星汉', maxHp: 4, gender: 'male',
    skills: [{ id: 's_tieqi2', name: '铁蹄', description: '你使用「斩」指定目标后，判定（简化：50%令其本此无法「避」）。', kind: 'trigger' }],
    hooks: ['slashJudgeNoDodge'],
  },
  {
    id: 'g30', name: '黄忠弓', faction: '星汉', maxHp: 4, gender: 'male',
    skills: [{ id: 's_liegong', name: '烈弓', description: '你对手牌数不大于你的角色使用「斩」时，其无法出「避」。', kind: 'passive' }],
    hooks: ['slashVsFewerNoDodge'],
  },
  {
    id: 'g31', name: '魏延狼', faction: '星汉', maxHp: 4, gender: 'male',
    skills: [{ id: 's_kuanggu', name: '狂骨', description: '你对距离1以内的角色造成伤害后回复1点体力。', kind: 'trigger' }],
    hooks: ['healOnNearDamage'],
  },
  {
    id: 'g32', name: '徐庶隐', faction: '星汉', maxHp: 3, gender: 'male',
    skills: [{ id: 's_zhuhai', name: '诛害', description: '一名角色的结束阶段，若其本回合造成过伤害，你可对其使用一张「斩」。', kind: 'trigger' }],
    hooks: ['endSlashRevenge'],
  },
  {
    id: 'g33', name: '司马烬', faction: '幽冥', maxHp: 3, gender: 'male',
    skills: [{ id: 's_fankui', name: '反馈', description: '你受到伤害后可获得来源一张牌。', kind: 'trigger' }],
    hooks: ['stealOnDamaged'],
  },
  {
    id: 'g34', name: '郭嘉策', faction: '幽冥', maxHp: 3, gender: 'male',
    skills: [{ id: 's_yiji', name: '遗计', description: '你受到1点伤害后摸两张牌，可分给其他角色。', kind: 'trigger' }],
    hooks: ['draw2OnDamage'],
  },
  {
    id: 'g35', name: '甄宓洛', faction: '幽冥', maxHp: 3, gender: 'female',
    skills: [{ id: 's_luoshen', name: '洛神', description: '准备阶段你可判定，黑色则获得之并可再判（简化：摸一张黑色优先）。', kind: 'trigger' }],
    hooks: ['startDrawBlack'],
  },
  {
    id: 'g36', name: '典韦怒', faction: '幽冥', maxHp: 4, gender: 'male',
    skills: [{ id: 's_qiangxi2', name: '悍击', description: '出牌阶段限一次，弃一张武器牌对距离1角色造成1点伤害；或失去1点体力造成1点伤害。', kind: 'active' }],
    hooks: ['selfDamageHit'],
  },
  {
    id: 'g37', name: '许褚猛', faction: '幽冥', maxHp: 4, gender: 'male',
    skills: [{ id: 's_luoyi', name: '裸衣', description: '摸牌阶段你可少摸一张，本回合「斩」伤害+1。', kind: 'active' }],
    hooks: ['luoyiBuff'],
  },
  {
    id: 'g38', name: '张辽奔', faction: '幽冥', maxHp: 4, gender: 'male',
    skills: [{ id: 's_tuxi', name: '突袭', description: '摸牌阶段你可少摸任意张，改为获得等量其他角色各一张手牌。', kind: 'active' }],
    hooks: ['tuxiSteal'],
  },
  {
    id: 'g39', name: '荀彧让', faction: '幽冥', maxHp: 3, gender: 'male',
    skills: [{ id: 's_quhu', name: '驱虎', description: '出牌阶段限一次，令一名有牌角色拼点（简化：其对另一角色造成1点伤害）。', kind: 'active' }],
    hooks: ['forceHitOther'],
  },
  {
    id: 'g40', name: '贾诩毒', faction: '幽冥', maxHp: 3, gender: 'male',
    skills: [{ id: 's_wansha', name: '完杀', description: '你的回合内，只有你和濒死角色可使用「疗」。', kind: 'passive' }],
    hooks: ['wanshaLock'],
  },
  {
    id: 'g41', name: '蔡文姬', faction: '幽冥', maxHp: 3, gender: 'female',
    skills: [{ id: 's_beige', name: '悲歌', description: '一名角色受到「斩」伤害后，你可弃一张牌令其摸三张并弃两张。', kind: 'trigger' }],
    hooks: ['beigeHelp'],
  },
  {
    id: 'g42', name: '夏侯惇', faction: '幽冥', maxHp: 4, gender: 'male',
    skills: [{ id: 's_ganglie', name: '刚烈', description: '你受到伤害后可判定，非红桃则伤害来源弃两张牌或受到1点伤害。', kind: 'trigger' }],
    hooks: ['ganglieRevenge'],
  },
  {
    id: 'g43', name: '华佗济', faction: '散侠', maxHp: 3, gender: 'male',
    skills: [{ id: 's_jijiu', name: '急救', description: '你的回合外可将一张红色牌当「疗」使用。', kind: 'active' }],
    hooks: ['redAsPeachOutOfTurn'],
  },
  {
    id: 'g44', name: '吕奉先', faction: '散侠', maxHp: 4, gender: 'male',
    skills: [{ id: 's_wushuang', name: '无双', description: '你的「斩」或「对决」需两张「避」/「斩」才能响应。', kind: 'passive' }],
    hooks: ['needDoubleRespond'],
  },
  {
    id: 'g45', name: '貂蝉舞', faction: '散侠', maxHp: 3, gender: 'female',
    skills: [{ id: 's_lijian', name: '离间', description: '出牌阶段限一次，弃一张牌令两名男性角色「对决」。', kind: 'active' }],
    hooks: ['lijianDuel'],
  },
  {
    id: 'g46', name: '袁公路', faction: '散侠', maxHp: 4, gender: 'male',
    skills: [{ id: 's_wangzun', name: '妄尊', description: '主公的准备阶段你摸一张牌；主公手牌上限-1。', kind: 'passive' }],
    hooks: ['wangzunDraw'],
  },
  {
    id: 'g47', name: '公孙瓒', faction: '散侠', maxHp: 4, gender: 'male',
    skills: [{ id: 's_yicong', name: '义从', description: '体力大于2时距离-1；不大于2时其他角色与你距离+1。', kind: 'passive' }],
    hooks: ['yicongDistance'],
  },
  {
    id: 'g48', name: '董仲颖', faction: '散侠', maxHp: 8, gender: 'male',
    skills: [{ id: 's_jiuchi', name: '酒池', description: '你可将一张黑桃手牌当「斩」使用（本回合限一次伤害+0简化）。', kind: 'active' }],
    hooks: ['spadeAsSlash'],
  },
];

export function getGeneral(id: string): GeneralDef {
  const g = GENERALS.find((x) => x.id === id);
  if (!g) throw new Error(`未知武将: ${id}`);
  return g;
}

export function roleNameFaction(faction: string): string {
  return faction;
}
