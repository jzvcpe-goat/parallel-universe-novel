import type { PrototypeScript, PrototypeScriptInput } from './types'

const nowIso = () => new Date().toISOString()

export const defaultScript: PrototypeScript = {
  id: 'rain-bridge',
  title: '雨夜桥边',
  subtitle: '悬疑长篇互动原型',
  genre: '都市悬疑',
  style: '冷静、悬疑、细节扎实',
  world: '近未来城市，旧城区被雨季和监控网络切开。每个街区都有自己的沉默规则。',
  currentBranchId: 'mainline',
  authorGoal: '让读者在每次选择里感到世界线真的改变了人物命运。',
  relationshipMatrix: '顾砚是失踪记者林秋的旧友；边年少帅掌握关键录像；旧案证人只愿在雨夜出现。',
  coreConflict: '主角必须决定公开证据还是保护证人，而任何选择都会改变后续世界线。',
  updatedAt: nowIso(),
  hero: {
    name: '顾砚',
    title: '雨夜证词的记录者',
    level: 7,
    focus: 76,
    intuition: 82,
    courage: 64,
    inventory: ['旧录音笔', '桥洞照片', '匿名门禁卡'],
  },
  chapters: [
    {
      id: 'chapter-01',
      title: '第 3 章 雨夜证词',
      subtitle: '狼导 - 旧楼天台的反向证词与凝眸角',
      body:
        '七月七日深夜，废课桌架堆在前里露出来，林秋按住那份小本子问，门锁反光也跟着冷了一寸。顾砚没有抬头，只把录音笔往桌沿推了推。\n\n' +
        '门外脚步声停在 23 点 33 分。边年少帅的电话簿里跳出一个陌生号码，屏幕上的雨点像被人慢慢擦开。他知道今晚不是找答案的夜晚，而是决定哪一个答案可以活下来的夜晚。\n\n' +
        '旧楼下的巡逻灯扫过桥洞，三个人的影子被切成不同长度。林秋说，如果证据现在公开，证人会失踪；如果继续藏着，旧案会在明天早晨被改写。',
    },
  ],
  creativeSteps: [
    {
      id: 'scene',
      label: '场景',
      prompt: '这一章在哪里发生？谁在场？读者首先看见什么？',
      helper: '用一个可触摸的细节开场，例如雨水、门锁、录音笔或旧楼灯光。',
      draft: '旧楼天台，雨水顺着铁门往下流，顾砚、林秋和边年少帅都在场。',
    },
    {
      id: 'conflict',
      label: '冲突',
      prompt: '什么选择会改变世界线？失败会付出什么代价？',
      helper: '把选择写成两条都合理但都疼的路。',
      draft: '公开证据会保住真相但牺牲证人；隐藏证据会保住证人但让旧案继续污染城市。',
    },
    {
      id: 'develop',
      label: '展开',
      prompt: '选择之后，人物、势力和规则如何连锁变化？',
      helper: '至少写出一个直接影响和一个远距离后果。',
      draft: '边年少帅开始删除监控副本，林秋联系旧案证人，顾砚意识到录像不是唯一证据。',
    },
    {
      id: 'resolve',
      label: '收尾',
      prompt: '这一章如何停在一个新的危险点？埋下什么伏笔？',
      helper: '结尾保留一个读者能记住的物件或句子。',
      draft: '录音笔里多出一段不属于三人的呼吸声，旧楼灯光同时熄灭。',
    },
  ],
  nexusCandidates: [
    {
      id: 'nexus-public-evidence',
      title: '是否公开桥洞录像',
      sourceBeat: '林秋要求立即公开证据',
      butterflyIndex: 0.87,
      status: 'selected',
      branchIds: ['mainline', 'witness-saved', 'evidence-burned'],
      downstreamEffects: ['证人安全', '媒体介入', '旧案势力反扑'],
    },
    {
      id: 'nexus-call-back',
      title: '是否回拨陌生号码',
      sourceBeat: '边年少帅电话簿出现未知号码',
      butterflyIndex: 0.64,
      status: 'suggested',
      branchIds: ['mainline', 'false-confession'],
      downstreamEffects: ['人物信任', '时间线错位', '证词来源'],
    },
    {
      id: 'nexus-hide-recorder',
      title: '是否藏起录音笔',
      sourceBeat: '录音笔被推到桌沿',
      butterflyIndex: 0.52,
      status: 'observing',
      branchIds: ['mainline'],
      downstreamEffects: ['证物链完整性', '主角信誉', '伏笔触发'],
    },
  ],
  branches: [
    {
      id: 'mainline',
      name: '主线',
      status: 'main',
      divergence: 18,
      stability: 72,
      readingProgress: 42,
      tone: '冷静取证',
      summary: '顾砚继续保留证据，等待证人说出完整链条。',
      diffHighlights: ['证人仍在旧楼附近', '录像尚未公开', '媒体未介入'],
    },
    {
      id: 'witness-saved',
      name: '证人优先线',
      status: 'active',
      divergence: 46,
      stability: 58,
      readingProgress: 31,
      tone: '低声护送',
      summary: '顾砚先转移证人，真相被延后，但敌人暴露了新的中间人。',
      diffHighlights: ['桥洞证人存活', '旧楼监控丢失', '林秋开始怀疑顾砚'],
    },
    {
      id: 'evidence-burned',
      name: '证据焚毁线',
      status: 'unstable',
      divergence: 71,
      stability: 39,
      readingProgress: 18,
      tone: '高压追逃',
      summary: '录像公开前被烧毁，主角只能依靠记忆、误差和第二证词追索。',
      diffHighlights: ['证据链断裂', '边年少帅成为嫌疑人', '旧案提前复燃'],
    },
    {
      id: 'false-confession',
      name: '伪证回拨线',
      status: 'locked',
      divergence: 63,
      stability: 44,
      readingProgress: 0,
      tone: '身份错位',
      summary: '陌生号码诱导主角听见伪造证词，下一章需要学习系统校验自洽性。',
      diffHighlights: ['伪证源未确认', '人物关系翻转', '需要后端分歧生成接入'],
    },
  ],
  foreshadowHooks: [
    {
      id: 'hook-recorder-breath',
      label: '录音笔里的第四段呼吸',
      description: '触发时会证明天台上还有一个隐形观察者。',
      status: 'planted',
      linkedBranchId: 'mainline',
    },
    {
      id: 'hook-bridge-card',
      label: '匿名门禁卡',
      description: '可以打开旧楼地下档案室，也可能暴露顾砚的行动轨迹。',
      status: 'dormant',
      linkedBranchId: 'witness-saved',
    },
    {
      id: 'hook-rain-clock',
      label: '23 点 33 分的雨钟',
      description: '每条世界线都在这个时间点出现不同证词。',
      status: 'triggered',
      linkedBranchId: 'evidence-burned',
    },
  ],
}

export function createScriptFromInput(input: PrototypeScriptInput): PrototypeScript {
  const title = input.title.trim() || '未命名世界线'
  const genre = input.genre.trim() || '都市悬疑'
  const relationshipMatrix = input.relationshipMatrix.trim() || '主角与关键证人互相隐瞒一段过去。'
  const coreConflict = input.coreConflict.trim() || '公开真相会伤害证人，隐藏真相会让旧案继续扩散。'
  const world = input.world.trim() || '一座被雨季、监控与旧案共同塑形的城市。'
  const style = input.style.trim() || '冷静、悬疑、细节扎实'
  const id = `script-${Date.now()}`

  return {
    ...defaultScript,
    id,
    title,
    subtitle: `${genre} 原型`,
    genre,
    relationshipMatrix,
    coreConflict,
    world,
    style,
    currentBranchId: 'mainline',
    updatedAt: nowIso(),
    chapters: [
      {
        id: `${id}-chapter-01`,
        title: `第 1 章 ${title}`,
        subtitle: genre,
        body: `正在加载《${title}》的第一幕。\n\n${relationshipMatrix}\n\n核心冲突：${coreConflict}\n\n世界观：${world}`,
      },
    ],
  }
}
