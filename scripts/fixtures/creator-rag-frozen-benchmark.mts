export type CreatorRagBenchmarkGroup = 'causal' | 'character_knowledge' | 'timeline' | 'promise'
export type CreatorRagBenchmarkSourceGroup = CreatorRagBenchmarkGroup | 'unclassified'

export interface CreatorRagBenchmarkSource {
  id: string
  workId: string
  branchId: string
  chapterNo: number
  authority: 'canon' | 'author' | 'derived'
  memoryGroup: CreatorRagBenchmarkSourceGroup
  revision: number
  locator: {
    recordId: string
    label: string
  }
  text: string
}

export interface CreatorRagBenchmarkQuery {
  id: string
  group: CreatorRagBenchmarkGroup
  workId: string
  branchId: string
  currentChapterNo: number
  query: string
  expectedSourceIds: string[]
  manualSelectedSourceIds: string[]
}

const benchmarkCases: Array<{
  id: string
  group: CreatorRagBenchmarkGroup
  chapterNo: number
  query: string
  text: string
}> = [
  { id: 'causal-01', group: 'causal', chapterNo: 2, query: '为什么北塔升降机必须人工压住配重？', text: '北塔绞盘在坠落时崩断了自动锁，修复前每次启动升降机都必须由一人站在配重踏板上维持平衡。' },
  { id: 'causal-02', group: 'causal', chapterNo: 3, query: '巡逻队为什么改走钟桥下层？', text: '钟桥上层的铜铃被风暴震响，巡逻队误以为有人入侵，从此把夜间路线改到下层水道。' },
  { id: 'causal-03', group: 'causal', chapterNo: 4, query: '余青的高烧为什么会在午夜复发？', text: '队伍只找到半剂灰叶解毒剂，药力能压住六小时，因此余青的高烧会在午夜再次出现。' },
  { id: 'causal-04', group: 'causal', chapterNo: 5, query: '地下厅为什么持续进水？', text: '封门石被撬开时裂出一道细缝，外侧蓄水层的压力沿裂缝进入地下厅，水位每小时都会上升。' },
  { id: 'causal-05', group: 'causal', chapterNo: 6, query: '众人为什么无法依靠地图返回营地？', text: '纸地图在火盆旁被飞灰点燃，只剩东侧边角，回程只能依靠岑野记住的三处石刻。' },
  { id: 'causal-06', group: 'causal', chapterNo: 7, query: '山谷遇险时为什么不能发出红色求援信号？', text: '唯一的红焰筒被拿去交换净水滤芯，队伍进入山谷后已没有远距离求援信号。' },
  { id: 'causal-07', group: 'causal', chapterNo: 8, query: '灰甲斥候为什么会提前警告风暴？', text: '岑野放走了受伤的灰甲斥候；斥候为偿还这次饶命，在次日清晨送来黑潮风暴的警告。' },
  { id: 'causal-08', group: 'causal', chapterNo: 9, query: '主角手腕上的黑色印记从何而来？', text: '岑野打开无名遗物盒时被盒内影子缠住手腕，影子退去后留下不会被水洗掉的黑色印记。' },

  { id: 'knowledge-01', group: 'character_knowledge', chapterNo: 2, query: '谁亲眼看见守门人调换了钥匙？', text: '只有余青躲在帘幕后亲眼看见守门人把铜钥匙换成骨钥匙，岑野当时仍在院外。' },
  { id: 'knowledge-02', group: 'character_knowledge', chapterNo: 3, query: '岑野是否知道药师就是匿名信的作者？', text: '药师在密室中承认匿名信由自己写下，但现场只有余青听见；岑野仍把写信人当作未知盟友。' },
  { id: 'knowledge-03', group: 'character_knowledge', chapterNo: 4, query: '队伍中谁知道旧井下还有第二出口？', text: '老矿工只把第二出口的位置画给岑野看，余青和守门人都不知道井壁后还有窄道。' },
  { id: 'knowledge-04', group: 'character_knowledge', chapterNo: 5, query: '余青为什么不知道补给箱里藏着信标？', text: '岑野在余青值夜结束后才把信标塞进补给箱夹层，并决定暂时不告诉任何同伴。' },
  { id: 'knowledge-05', group: 'character_knowledge', chapterNo: 6, query: '反方是否知道队伍已经识破假路标？', text: '队伍在背风坡发现假路标，却故意保持原样继续前进，因此布置路标的人尚不知道骗局已经暴露。' },
  { id: 'knowledge-06', group: 'character_knowledge', chapterNo: 7, query: '谁知道北门口令将在黎明失效？', text: '守钟人只向余青说明北门口令到黎明便会失效，岑野只知道当前口令内容。' },
  { id: 'knowledge-07', group: 'character_knowledge', chapterNo: 8, query: '岑野对黑色印记的代价知道到什么程度？', text: '岑野只知道印记会在靠近遗物时发热，并不知道它每次发热都会缩短遗物封印的时间。' },
  { id: 'knowledge-08', group: 'character_knowledge', chapterNo: 9, query: '余青是否知道灰甲斥候曾被岑野放走？', text: '岑野独自在峡口放走灰甲斥候，回营后只说斥候逃脱，余青不知道那是一次主动饶命。' },

  { id: 'timeline-01', group: 'timeline', chapterNo: 2, query: '队伍在抵达北塔前最后停留在哪里？', text: '队伍黄昏离开盐棚，先在断碑坡停留一夜，第二天正午才抵达北塔。' },
  { id: 'timeline-02', group: 'timeline', chapterNo: 4, query: '灰叶解毒剂是在什么时候服下的？', text: '余青在第七码头的晚钟响过后服下半剂灰叶药，当时距离午夜还有六小时。' },
  { id: 'timeline-03', group: 'timeline', chapterNo: 6, query: '遗物盒最初被放在队伍的什么位置？', text: '离开地下厅时，遗物盒被包在油布里，固定在第二辆拖车的底层横梁上。' },
  { id: 'timeline-04', group: 'timeline', chapterNo: 8, query: '风暴警告送达时队伍位于哪里？', text: '灰甲斥候送来警告时，队伍刚越过白石峡，尚未进入会切断视野的芦苇谷。' },
  { id: 'timeline-05', group: 'timeline', chapterNo: 10, query: '北门口令失效前还剩多少时间？', text: '余青在三更得到口令，守钟人说明它会在黎明第一声钟响时失效，只剩约三个时辰。' },
  { id: 'timeline-06', group: 'timeline', chapterNo: 12, query: '岑野最后一次见到完整纸地图是在何处？', text: '完整纸地图最后一次出现于旧驿站火盆旁；队伍离开驿站前，它已被烧掉大半。' },
  { id: 'timeline-07', group: 'timeline', chapterNo: 14, query: '补给箱信标被发现前转移过几次？', text: '信标先随补给箱从盐棚到北塔，又在北塔装车时转入第二辆拖车，之后没有再次移动。' },

  { id: 'promise-01', group: 'promise', chapterNo: 3, query: '岑野答应在什么时候归还药师的罗盘？', text: '岑野借走药师的银罗盘，并承诺在找到北塔入口后立刻归还。' },
  { id: 'promise-02', group: 'promise', chapterNo: 5, query: '余青对老矿工作出了什么承诺？', text: '余青答应老矿工，只要第二出口仍能通行，就会把井下三名失踪者的名字带回地面。' },
  { id: 'promise-03', group: 'promise', chapterNo: 7, query: '队伍欠灰甲斥候什么尚未兑现的回报？', text: '斥候送来风暴警告后要求一条安全离谷路线，岑野答应绘图，但至今尚未交付。' },
  { id: 'promise-04', group: 'promise', chapterNo: 9, query: '岑野曾保证不对余青隐瞒什么？', text: '经历假路标后，岑野保证若黑色印记再次出现异常，会在行动前告诉余青。' },
  { id: 'promise-05', group: 'promise', chapterNo: 11, query: '守钟人要求队伍离开前完成什么事？', text: '守钟人交出口令时要求队伍离开北城前敲响一次西侧哑钟，作为平安回执。' },
  { id: 'promise-06', group: 'promise', chapterNo: 13, query: '药师留下的密封药包应在什么条件下打开？', text: '药师要求只有当余青再次高烧且灰叶药失效时才能打开密封药包，其他时候必须保持封口。' },
  { id: 'promise-07', group: 'promise', chapterNo: 15, query: '岑野对被困矿工家属的最终承诺是什么？', text: '岑野承诺无论是否找到生还者，返回北城时都会交付井下记录和每个人的确切下落。' },
]

const fixtureWorkId = 'work:creator-rag-frozen'
const fixtureBranchId = 'branch:main'

export const creatorRagFrozenSources: CreatorRagBenchmarkSource[] = [
  ...benchmarkCases.map(item => ({
    id: `source:${item.id}`,
    workId: fixtureWorkId,
    branchId: fixtureBranchId,
    chapterNo: item.chapterNo,
    authority: 'canon' as const,
    memoryGroup: item.group,
    revision: 1,
    locator: {
      recordId: `chapter:${item.chapterNo}:${item.id}`,
      label: `冻结夹具第 ${item.chapterNo} 章 / ${item.id}`,
    },
    text: item.text,
  })),
  {
    id: 'decoy:wrong-work-black-mark',
    workId: 'work:unrelated-decoy',
    branchId: fixtureBranchId,
    chapterNo: 8,
    authority: 'canon',
    memoryGroup: 'causal',
    revision: 1,
    locator: { recordId: 'decoy:wrong-work', label: '错误作品诱饵' },
    text: '另一个作品也有黑色印记和遗物盒，但绝不能进入当前作品召回。',
  },
  {
    id: 'decoy:wrong-branch-key',
    workId: fixtureWorkId,
    branchId: 'branch:discarded-if',
    chapterNo: 3,
    authority: 'derived',
    memoryGroup: 'character_knowledge',
    revision: 1,
    locator: { recordId: 'decoy:wrong-branch', label: '错误支线诱饵' },
    text: '废弃支线中守门人把骨钥匙交给了岑野，这不属于主线事实。',
  },
  {
    id: 'decoy:future-chapter-signal',
    workId: fixtureWorkId,
    branchId: fixtureBranchId,
    chapterNo: 25,
    authority: 'author',
    memoryGroup: 'promise',
    revision: 1,
    locator: { recordId: 'decoy:future-chapter', label: '未来章节诱饵' },
    text: '未来规划里银罗盘已经碎裂，但当前写作位置不得提前召回这个结果。',
  },
]

export const creatorRagFrozenQueries: CreatorRagBenchmarkQuery[] = benchmarkCases.map((item, index) => {
  const sourceId = `source:${item.id}`
  return {
    id: `query:${item.id}`,
    group: item.group,
    workId: fixtureWorkId,
    branchId: fixtureBranchId,
    currentChapterNo: 20,
    query: item.query,
    expectedSourceIds: [sourceId],
    manualSelectedSourceIds: index % 5 === 0 ? [sourceId] : [],
  }
})
