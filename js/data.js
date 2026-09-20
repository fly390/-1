/* =====================================================================
 *  ★★★ 数据维护指南（社团报名结束后，只需要改这个文件 ★★★
 * =====================================================================
 *  1. 改活动名称 / 时间 / 地点 / 主办方 / 玩法说明文字：改 CONFIG
 *  2. 改四大模块（公益/人文/科技/体育）：MODULES 数组
 *  3. 改兴趣标签：TAGS 数组，注意每个标签的 module 要属于四大模块之一
 *  4. 改社团：CLUBS 数组，一个对象一个社团
 *       - module: 四大模块之一（gongyi/renwen/keji/tiyu），
 *         赞助商、院系展位等非社团摊位写 null（不会出现在推荐里）
 *       - status: "open"=摆摊中 / "closed"=已收摊（地图格子会变灰，
 *         活动当天由管理员在社团群里收到收摊消息后改这里即可）
 *       - booth: "A-01" 格式，横杠前是分区代号；没定写 null → 显示「摊位待定」
 *       - photos: ["img/clubs/xxx.jpg", ...] 社团照片，不写则显示待补充占位框
 *       - activities:（可选）社团活动介绍，详情页单独一栏展示；
 *         不写则详情页不显示「社团活动」栏（intro 里写也行）
 *  5. 改场地分区：ZONES 数组（公益/人文/科技/体育/赞助/国教 + 舞台固定显示）
 *  6. 换真实摊位图：图片放 img/ 文件夹，CONFIG.mapImage 改成 "img/map.png"
 *     （留空则使用 MAP_LAYOUT 自动绘制的场馆平面图；改 runs 里的
 *       from/to 与 x/y 坐标即可重排队列，参考各行的中文注释）
 *  7. 不需要动 app.js / style.css / index.html
 * ===================================================================== */

const CONFIG = {
  appName: "社团百宝箱",                     // 小程序名字
  eventName: "百团大战 · 社团文化节",         // 活动名称
  eventDate: "2026年9月26日-27日 10:00-17:00", // 活动时间（示例，记得改）
  location: "大学生活动中心广场（示例）",      // 活动地点（示例，记得改）
  organizer: "主办 · 校学生会 × 社团联合会（示例）",
  mapImage: "",                              // 真实摊位图路径，例如 "img/map.png"，留空用自动示意图
  /* 玩法说明（顶栏「📖 玩法」按钮和开屏页展示，一行一条） */
  guide: [
    "1️⃣ 开屏选择一个感兴趣的模块：公益 / 人文 / 科技 / 体育",
    "2️⃣ 勾选模块内你喜欢的兴趣标签，系统自动为你匹配推荐社团",
    "3️⃣ 进入「场地地图」看摊位分布：彩色格子=摆摊中，灰色格子=已收摊",
    "4️⃣ 地图支持双指缩放、拖动，点「+」「−」也行",
    "5️⃣ 搜索社团名称 / 标签 / 摊位号，地图会自动放大定位到该摊位并高亮",
    "6️⃣ 点击摊位格子或社团卡片，查看社团介绍、照片和 QQ 群，到摊位面基吧！"
  ]
};

/* ---------- 四大模块（开屏第一步，四选一） ---------- */
const MODULES = [
  { id: "gongyi", name: "公益", emoji: "💝", desc: "志愿公益 · 实践创业", color: "#10AC84" },
  { id: "renwen", name: "人文", emoji: "📚", desc: "文艺 · 兴趣 · 生活",   color: "#FF6B81" },
  { id: "keji",   name: "科技", emoji: "💡", desc: "编程 · 电竞 · 创造",   color: "#54A0FF" },
  { id: "tiyu",   name: "体育", emoji: "🏃", desc: "运动 · 健身 · 户外",   color: "#FFA502" }
];

/* ---------- 兴趣标签（第二步，按模块分组展示） ---------- */
const TAGS = [
  /* 公益 */
  { id: "volunteer", name: "志愿公益",   emoji: "💝", color: "#FF5E57", module: "gongyi" },
  { id: "startup",   name: "创业就业",   emoji: "💼", color: "#5758BB", module: "gongyi" },
  /* 人文 */
  { id: "music",     name: "唱歌音乐",   emoji: "🎤", color: "#FF6B81", module: "renwen" },
  { id: "dance",     name: "舞蹈街舞",   emoji: "💃", color: "#F368A0", module: "renwen" },
  { id: "guitar",    name: "吉他弹唱",   emoji: "🎸", color: "#FF7E5F", module: "renwen" },
  { id: "anime",     name: "动漫",       emoji: "🌸", color: "#A55EEA", module: "renwen" },
  { id: "hanfu",     name: "国风汉服",   emoji: "🏮", color: "#F5B041", module: "renwen" },
  { id: "photo",     name: "摄影摄像",   emoji: "📷", color: "#54A0FF", module: "renwen" },
  { id: "write",     name: "阅读写作",   emoji: "📖", color: "#70A1FF", module: "renwen" },
  { id: "debate",    name: "辩论演讲",   emoji: "🎙️", color: "#57606F", module: "renwen" },
  { id: "english",   name: "英语口语",   emoji: "🌍", color: "#4B7BEC", module: "renwen" },
  { id: "art",       name: "绘画手作",   emoji: "🎨", color: "#10AC84", module: "renwen" },
  { id: "magic",     name: "魔术",       emoji: "🪄", color: "#8854D0", module: "renwen" },
  { id: "food",      name: "美食探店",   emoji: "🍜", color: "#EE5A24", module: "renwen" },
  /* 科技 */
  { id: "code",      name: "编程科技",   emoji: "💻", color: "#12CBC4", module: "keji" },
  { id: "game",      name: "电竞游戏",   emoji: "🎮", color: "#6C5CE7", module: "keji" },
  { id: "boardgame", name: "桌游剧本杀", emoji: "♟️", color: "#596275", module: "keji" },
  { id: "video",     name: "短视频VLOG", emoji: "🎬", color: "#2C3A47", module: "keji" },
  /* 体育 */
  { id: "ball",      name: "球类运动",   emoji: "⚽", color: "#FFA502", module: "tiyu" },
  { id: "fitness",   name: "运动健身",   emoji: "🏃", color: "#2ED573", module: "tiyu" },
  { id: "outdoor",   name: "户外旅行",   emoji: "⛰️", color: "#0ABDE3", module: "tiyu" }
];

/* ---------- 场地分区（摊位图用；舞台固定显示，不在此列） ---------- */
const ZONES = [
  { id: "A", name: "公益区", color: "#10AC84" },
  { id: "B", name: "人文区", color: "#FF6B81" },
  { id: "C", name: "科技区", color: "#54A0FF" },
  { id: "D", name: "体育区", color: "#FFA502" },
  { id: "E", name: "赞助区", color: "#F5B041" },
  { id: "F", name: "国教区", color: "#A55EEA" }
];

/* ---------- 社团列表（以下全部为示例数据，报名结束后替换！） ----------
 * module: gongyi/renwen/keji/tiyu；赞助商、国教等非社团摊位写 null
 * status: "open"=摆摊中 / "closed"=已收摊（活动当天管理员改这个字段）
 * ------------------------------------------------------------------ */
const CLUBS = [
  { id: 1,  name: "街舞社",     cat: "文化艺术", module: "renwen", logo: "🕺", tags: ["dance", "video", "music"],
    slogan: "身体就是我们的语言",
    intro: "校内最炸的街舞团体，涵盖 HipHop、Jazz、Breaking 等多个舞种。零基础也能入门，每学期都有专场演出和 battle 活动，快来把操场变成你的舞台。",
    activities: "每周三、周五晚例行训练；10 月专场公演《舞极限》（示例）；期末草坪随机快闪。文化节现场整点甩舞教学，欢迎来摊位挑战！",
    qq: "100100101", booth: "B-01", status: "open", photos: [] },  /* ← photos 示例：填 ["img/clubs/xxx.jpg"] 即可展示照片；activities 为可选的「社团活动」栏 */

  { id: 2,  name: "民乐团",     cat: "文化艺术", module: "renwen", logo: "🎶", tags: ["music", "hanfu"],
    slogan: "丝竹管弦，国乐正燃",
    intro: "二胡、琵琶、笛箫、古筝……民乐团欢迎所有热爱民族乐器的同学。有乐器基础可直接加入声部，没基础也有教学组从头教起，定期参加校级晚会演出。",
    qq: "100100102", booth: "B-02", status: "open", photos: [] },

  { id: 3,  name: "合唱团",     cat: "文化艺术", module: "renwen", logo: "🎼", tags: ["music"],
    slogan: "把热爱唱给全世界听",
    intro: "不需要你会识谱，只需要你热爱唱歌。合唱团设混声、女声、男声多个声部，由专业指导老师训练，代表学校参加合唱比赛与音乐会。",
    qq: "100100103", booth: "B-03", status: "open", photos: [] },

  { id: 4,  name: "魔术社",     cat: "文化艺术", module: "renwen", logo: "🎩", tags: ["magic", "art"],
    slogan: "下一秒，见证奇迹",
    intro: "近景魔术、舞台魔术、心灵魔术应有尽有。每周例会教学，从扑克牌到舞台表演一步步带你入门，各种晚会都能看到我们的身影。",
    qq: "100100104", booth: "B-04", status: "open", photos: [] },

  { id: 5,  name: "汉服社",     cat: "文化艺术", module: "renwen", logo: "🏮", tags: ["hanfu", "photo", "art"],
    slogan: "着我汉家衣裳，兴礼仪之邦",
    intro: "以汉服为载体，复原传统节日雅集：花朝、上巳、中秋祭月。设有形制研究、妆造、摄影小组，欢迎同袍与好奇宝宝一起玩耍。",
    qq: "100100105", booth: "B-05", status: "open", photos: [] },

  { id: 6,  name: "美术社",     cat: "文化艺术", module: "renwen", logo: "🖌️", tags: ["art", "anime"],
    slogan: "画笔之下，万物有灵",
    intro: "素描、水彩、板绘、涂鸦都欢迎。工作室常备画材，定期组织户外写生与画展，零基础教学班每学期开放报名。",
    qq: "100100106", booth: "B-06", status: "open", photos: [] },

  { id: 7,  name: "文学社",     cat: "文化艺术", module: "renwen", logo: "📚", tags: ["write", "debate"],
    slogan: "以笔为马，不负韶华",
    intro: "小说、诗歌、散文、书评，还有社刊《南风》（示例）。读书会每月一期，写作训练营带你从随手记写到公开发表。",
    qq: "100100107", booth: "B-07", status: "open", photos: [] },

  { id: 8,  name: "校辩论队",   cat: "学术科技", module: "renwen", logo: "💬", tags: ["debate", "write"],
    slogan: "唇枪舌剑，谁与争锋",
    intro: "校际联赛常胜军（示例）。系统训练立论、质询、自由辩论，新生杯是每个人的第一战场。想变得敢说、会说、说得漂亮，来这就对了。",
    qq: "100100108", booth: "B-08", status: "open", photos: [] },

  { id: 9,  name: "篮球协会",   cat: "体育运动", module: "tiyu", logo: "🏀", tags: ["ball", "fitness"],
    slogan: "热爱不打烊，球场上见",
    intro: "院系联赛、3v3 街头赛、女生投篮日……篮协包揽全校篮球活动。无论你是野球场老手还是刚想动起来，都有属于你的球场。",
    qq: "100100109", booth: "D-01", status: "open", photos: [] },

  { id: 10, name: "足球俱乐部", cat: "体育运动", module: "tiyu", logo: "⚽", tags: ["ball", "outdoor"],
    slogan: "绿茵场就是我们的主场",
    intro: "每周训练 + 校内联赛 + 校际友谊赛，门将、后卫、前锋统统缺人！不懂规则也行，来跑两圈就知道足球有多快乐。",
    qq: "100100110", booth: "D-02", status: "open", photos: [] },

  { id: 11, name: "羽毛球协会", cat: "体育运动", module: "tiyu", logo: "🏸", tags: ["ball", "fitness"],
    slogan: "挥拍之间，快意青春",
    intro: "固定包场每周三、周六（示例），从新手教学到对抗赛一条龙。球友氛围超好，兼顾锻炼和社交，减脂交友两不误。",
    qq: "100100111", booth: "D-03", status: "open", photos: [] },

  { id: 12, name: "户外探险社", cat: "体育运动", module: "tiyu", logo: "⛺", tags: ["outdoor", "fitness", "photo"],
    slogan: "山野在召唤，出发即抵达",
    intro: "周末徒步、露营、骑行、城市漫游，寒暑假还有长线远征。装备与安全培训齐全，和一群人一起看日出吧。",
    qq: "100100112", booth: "D-04", status: "open", photos: [] },

  { id: 13, name: "电子竞技社", cat: "兴趣娱乐", module: "keji", logo: "🎮", tags: ["game", "video"],
    slogan: "不服？峡谷里见！",
    intro: "英雄联盟、王者荣耀、CS、主机游戏……设有各游戏分部和校内联赛。观赛party、水友赛不断，菜也没关系，快乐为主。",
    qq: "100100113", booth: "C-01", status: "open", photos: [] },

  { id: 14, name: "桌游社",     cat: "兴趣娱乐", module: "keji", logo: "🎲", tags: ["boardgame", "game"],
    slogan: "剧本杀狼人杀，杀个痛快",
    intro: "狼人杀、剧本杀、UNO、卡坦岛，社内库房上百款桌游随便玩。每周固定车局，新人教学局永远不会让你坐冷板凳。",
    qq: "100100114", booth: "C-02", status: "open", photos: [] },

  { id: 15, name: "程序设计协会", cat: "学术科技", module: "keji", logo: "💻", tags: ["code", "game"],
    slogan: "用代码写下改变世界的第一行",
    intro: "算法训练、ACM 备赛、项目组队、大牛分享会都在这里。无论你是大佬还是刚装好编译器的小白，都有人带你飞。",
    qq: "100100115", booth: "C-03", status: "open", photos: [] },

  { id: 16, name: "科技创新社", cat: "学术科技", module: "keji", logo: "🔬", tags: ["code", "startup"],
    slogan: "把脑洞变成现实的地方",
    intro: "机器人、3D打印、电子制作、创新创业大赛组队中心。拥有独立创客空间（示例），你的奇思妙想在这里都能找到落地的方法。",
    qq: "100100116", booth: "C-04", status: "open", photos: [] },

  { id: 17, name: "动漫社",     cat: "兴趣娱乐", module: "renwen", logo: "👾", tags: ["anime", "art", "boardgame"],
    branches:[
      {name:"外宣部(Make Teapoi Great Again",desc:"QQ:877742508"},
      {name:"声优部",desc:"QQ:1153626247"},
      {name:"---YY频道",desc:"QQ:87131207"},
      {name:"漫画部",desc:"QQ:144924760"},   
      {name:"cos部",desc:"QQ:172128789"},
      {name:"宅舞部",desc:"QQ:322690487"},
      {name:"技术部",desc:"QQ:764931102"},
      {name:"WOTA GEI部",desc:"QQ:1011855066"},
      {name:"Antiflow 茶几轻音部",desc:"QQ:636081255"},
      {name:"特摄群",desc:"QQ:973046551"},
      {name:"茶几偶像同好会",desc:"QQ:378342792"},
      {name:"Game部",desc:"QQ列表:碧蓝档案：144924760,崩3：429392269，Card Game:@碱石灰，舟：975745392,少前：674504188，月球人：1156414309，车万：905239537",link:"./game.html"},
    ],
    slogan: "二次元浓度超标警告！",
    intro: "漫宅双修：宅舞、翻唱、cos、痛包手办交流、新番吐槽大会。每年举办校内漫展（示例），欢迎加入这个次元。",
    qq: "100100117", booth: "B-09", status: "open", photos: [] },

  { id: 18, name: "摄影协会",   cat: "兴趣娱乐", module: "renwen", logo: "📸", tags: ["photo", "video", "outdoor"],
    slogan: "用镜头收集校园里的光",
    intro: "扫街、夜景、人像约拍、后期教学一条龙。手机党也完全欢迎，出片才是硬道理。社团器材库可以借相机（示例）。",
    qq: "100100118", booth: "B-10", status: "open", photos: [] },

  { id: 19, name: "美食社",     cat: "兴趣娱乐", module: "renwen", logo: "🍜", tags: ["food"],
    slogan: "干饭人！干饭魂！",
    intro: "探店测评、厨艺教学、美食市集摆摊。我们的社训是：没有一顿火锅解决不了的事，如果有，那就两顿。",
    qq: "100100119", booth: "B-11", status: "closed", photos: [] },  /* ← status 示例：closed=已收摊，地图格子变灰 */

  { id: 20, name: "民谣吉他社", cat: "兴趣娱乐", module: "renwen", logo: "🎸", tags: ["guitar", "music"],
    slogan: "弹唱青春，和弦与共",
    intro: "零基础吉他速成班 + 草坪弹唱会，社团备有练习琴可以借用（示例）。三个月后，篝火晚会中央弹唱的就是你。",
    qq: "100100120", booth: "B-12", status: "open", photos: [] },

  { id: 21, name: "创业实践社", cat: "实践公益", module: "gongyi", logo: "💼", tags: ["startup", "debate"],
    slogan: "从 0 到 1，做自己的 CEO",
    intro: "创业沙龙、商业路演、互联网+大赛组队、企业参访。在这里认识一群想做事的人，说不定下一个项目合伙人就在社团里。",
    qq: "100100121", booth: "A-01", status: "open", photos: [] },

  { id: 22, name: "志愿者协会", cat: "实践公益", module: "gongyi", logo: "🤝", tags: ["volunteer"],
    slogan: "微光成炬，温暖同行",
    intro: "支教、敬老院探访、大型赛事志愿服务、校园公益市集。志愿时长认证齐全，更重要的是，你会遇到一群温柔又坚定的人。",
    qq: "100100122", booth: "A-02", status: "open", photos: [] },

  { id: 23, name: "英语协会",   cat: "学术科技", module: "renwen", logo: "🌍", tags: ["english", "debate", "write"],
    slogan: "开口说英语，世界在眼前",
    intro: "英语角、四六级打卡营、外教茶话会、英语配音大赛。别再让英语只会做阅读题，来这里大胆开口吧。",
    qq: "100100123", booth: "B-13", status: "open", photos: [] },

  /* ---- 非社团摊位：module 写 null，不会出现在兴趣推荐里，只在地图/搜索/全部列表展示 ---- */
  { id: 24, name: "赞助商展位 ①", cat: "赞助商", module: null, logo: "🎁", tags: [],
    slogan: "校企合作 · 好礼相送（示例）",
    intro: "赞助商展位示例：现场互动领奖品。社团报名结束后，由负责人替换为实际赞助商信息。",
    qq: "-", booth: "E-01", status: "open", photos: [] },

  { id: 25, name: "赞助商展位 ②", cat: "赞助商", module: null, logo: "🎀", tags: [],
    slogan: "扫码抽奖 · 惊喜不断（示例）",
    intro: "赞助商展位示例：扫码参与抽奖活动。社团报名结束后，由负责人替换为实际赞助商信息。",
    qq: "-", booth: "E-02", status: "open", photos: [] },

  { id: 26, name: "国际教育学院展位", cat: "院系展示", module: null, logo: "🏫", tags: [],
    slogan: "中外交流 · 留学咨询（示例）",
    intro: "国教展位示例：国际交流项目介绍与咨询。社团报名结束后，由负责人替换为实际内容。",
    qq: "-", booth: "F-01", status: "open", photos: [] }
];

/* ---------- 场地平面图布局（仿百团大战场馆图，可交互） ----------
 * blocks: 固定设施。type: stage=舞台 / gate=门头 / area=虚线区域(如观众座位区)
 * runs:   摊位队列。dir: "h"横排 / "v"竖列；from/to: 起止摊位号（编号自动递增）；
 *         size: 格子边长；gap: 间距；x/y: 队列起点（左上角，画布 1000×640 坐标）
 * 社团报名结束后：改 from/to 和坐标即可重排队列；要加一排摊位就加一个 run。
 * 摊位格颜色/状态/点击详情会自动匹配 CLUBS 里的 booth 字段，无需额外配置。
 * --------------------------------------------------------------- */
const MAP_LAYOUT = {
  width: 1000, height: 640,
  blocks: [
    { type: "stage", label: "舞台 Stage", x: 400, y: 24,  w: 200, h: 86, color: "#C0392B" },
    { type: "area",  label: "观众座位区", x: 415, y: 215, w: 170, h: 250 },
    { type: "gate",  label: "门头",       x: 435, y: 572, w: 130, h: 52, color: "#E74C3C" }
  ],
  runs: [
    { dir: "h", x: 150, y: 96,  from: "C-01", to: "C-04", size: 44, gap: 6 },  /* 科技区 横排 */
    { dir: "h", x: 650, y: 96,  from: "D-01", to: "D-04", size: 44, gap: 6 },  /* 体育区 横排 */
    { dir: "v", x: 150, y: 150, from: "B-01", to: "B-13", size: 30, gap: 5 },  /* 人文区 左竖列 */
    { dir: "v", x: 822, y: 150, from: "A-01", to: "A-02", size: 34, gap: 6 },  /* 公益区 右竖列 */
    { dir: "v", x: 822, y: 260, from: "E-01", to: "E-02", size: 34, gap: 6 },  /* 赞助区 */
    { dir: "v", x: 822, y: 370, from: "F-01", to: "F-01", size: 34, gap: 6 }   /* 国教区 */
  ]
};

/* ---------- 挂载（程序读取用，不要删） ---------- */
CONFIG.tags = TAGS;
CONFIG.zones = ZONES;
CONFIG.clubs = CLUBS;
CONFIG.modules = MODULES;
CONFIG.mapLayout = MAP_LAYOUT;
