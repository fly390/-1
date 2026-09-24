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
  mapImage: "img/map.png",                   // 真实摊位图（2026 场馆图），配合 BOOTH_LAYOUT 生成可交互名牌
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
  { id: "teach",     name: "支教助学",   emoji: "🎒", color: "#10AC84", module: "gongyi" },
  { id: "eco",       name: "环保生态",   emoji: "🌱", color: "#0ABDE3", module: "gongyi" },
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
  { id: "robot",     name: "机器人创客", emoji: "🤖", color: "#EE5A24", module: "keji" },
  { id: "science",   name: "科学探索",   emoji: "🔬", color: "#12CBC4", module: "keji" },
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
/* ---------- 社团列表（2026 真实名录，来源：社团名录海报2026.pdf） ----------
 * 按社团联合会四大分会归入模块：公益20 / 体育24 / 科技26 / 人文艺术31
 * 各社团介绍与口号为占位文案，由各负责人登录后自行更新；摊位号待摊位图公布后由管理员分配
 * ------------------------------------------------------------------ */
const CLUBS = [
  { id: 1, name: "北极光社团", cat: "志愿公益", module: "gongyi", logo: "🌌", tags: ["volunteer"],
    slogan: "微光成炬，与爱同行",
    intro: "「北极光社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 2, name: "爱不流浪协会", cat: "志愿公益", module: "gongyi", logo: "🐱", tags: ["volunteer", "eco"],
    slogan: "青春有担当，志愿正当时",
    intro: "「爱不流浪协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 3, name: "知心手语社", cat: "志愿公益", module: "gongyi", logo: "🤟", tags: ["volunteer"],
    slogan: "用行动温暖这所校园",
    intro: "「知心手语社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 4, name: "自治保卫部", cat: "志愿公益", module: "gongyi", logo: "🛡️", tags: ["volunteer"],
    slogan: "聚是一团火，散是满天星",
    intro: "「自治保卫部」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 5, name: "蓝点海洋协会", cat: "志愿公益", module: "gongyi", logo: "🌊", tags: ["volunteer", "eco"],
    slogan: "微光成炬，与爱同行",
    intro: "「蓝点海洋协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 6, name: "大学生红十字会", cat: "志愿公益", module: "gongyi", logo: "⛑️", tags: ["volunteer"],
    slogan: "青春有担当，志愿正当时",
    intro: "「大学生红十字会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 7, name: "逸夫科普讲解队", cat: "志愿公益", module: "gongyi", logo: "📣", tags: ["volunteer", "science"],
    slogan: "用行动温暖这所校园",
    intro: "「逸夫科普讲解队」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 8, name: "启明星盲校支教团", cat: "志愿公益", module: "gongyi", logo: "🎒", tags: ["volunteer", "teach"],
    slogan: "聚是一团火，散是满天星",
    intro: "「启明星盲校支教团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 9, name: "夏心续梦公益社团", cat: "志愿公益", module: "gongyi", logo: "✨", tags: ["volunteer"],
    slogan: "微光成炬，与爱同行",
    intro: "「夏心续梦公益社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 10, name: "逸夫博物馆社教团", cat: "志愿公益", module: "gongyi", logo: "🏛️", tags: ["volunteer", "science"],
    slogan: "青春有担当，志愿正当时",
    intro: "「逸夫博物馆社教团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 11, name: "气象科普协会", cat: "志愿公益", module: "gongyi", logo: "🔬", tags: ["volunteer", "science"],
    slogan: "用行动温暖这所校园",
    intro: "「气象科普协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 12, name: "“服务E时代”社团", cat: "志愿公益", module: "gongyi", logo: "✨", tags: ["volunteer", "startup"],
    slogan: "聚是一团火，散是满天星",
    intro: "「“服务E时代”社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 13, name: "明德风·爱心助学团", cat: "志愿公益", module: "gongyi", logo: "🤝", tags: ["volunteer", "teach"],
    slogan: "微光成炬，与爱同行",
    intro: "「明德风·爱心助学团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 14, name: "扬子鄂科普志愿服务社团", cat: "志愿公益", module: "gongyi", logo: "🔬", tags: ["volunteer", "science", "startup"],
    slogan: "青春有担当，志愿正当时",
    intro: "「扬子鄂科普志愿服务社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 15, name: "“地大人”校友服务团", cat: "志愿公益", module: "gongyi", logo: "🎓", tags: ["volunteer", "startup"],
    slogan: "用行动温暖这所校园",
    intro: "「“地大人”校友服务团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 16, name: "山中花儿爱心助学团", cat: "志愿公益", module: "gongyi", logo: "🤝", tags: ["volunteer", "teach"],
    slogan: "聚是一团火，散是满天星",
    intro: "「山中花儿爱心助学团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 17, name: "大我公益科普协会", cat: "志愿公益", module: "gongyi", logo: "🔬", tags: ["volunteer", "science"],
    slogan: "微光成炬，与爱同行",
    intro: "「大我公益科普协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 18, name: "最美夕阳红敬老志愿团", cat: "志愿公益", module: "gongyi", logo: "🌅", tags: ["volunteer"],
    slogan: "青春有担当，志愿正当时",
    intro: "「最美夕阳红敬老志愿团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 19, name: "测地明理宣讲团", cat: "志愿公益", module: "gongyi", logo: "📢", tags: ["volunteer", "science"],
    slogan: "用行动温暖这所校园",
    intro: "「测地明理宣讲团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 20, name: "牵手筑梦·岩语助学公益服务团", cat: "志愿公益", module: "gongyi", logo: "🤝", tags: ["volunteer", "teach", "startup"],
    slogan: "聚是一团火，散是满天星",
    intro: "「牵手筑梦·岩语助学公益服务团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 21, name: "排球协会", cat: "体育运动", module: "tiyu", logo: "🏐", tags: ["ball"],
    slogan: "流汗的样子最帅",
    intro: "「排球协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 22, name: "Fir轮滑协会", cat: "体育运动", module: "tiyu", logo: "⛸️", tags: ["fitness", "outdoor"],
    slogan: "动起来，快乐会传染",
    intro: "「Fir轮滑协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 23, name: "乒乓球协会", cat: "体育运动", module: "tiyu", logo: "🏓", tags: ["ball"],
    slogan: "热爱不打烊，场上见",
    intro: "「乒乓球协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 24, name: "羽毛球协会", cat: "体育运动", module: "tiyu", logo: "🏸", tags: ["ball", "fitness"],
    slogan: "挥拍之间，快意青春",
    intro: "固定包场每周训练，从新手教学到对抗赛一条龙。球友氛围超好，兼顾锻炼和社交，减脂交友两不误。",
    qq: "100100111", booth: "", status: "closed", photos: [] },
  { id: 25, name: "电子竞技社", cat: "体育运动", module: "tiyu", logo: "🎮", tags: ["game", "fitness"],
    slogan: "不服？峡谷里见！",
    intro: "英雄联盟、王者荣耀、CS、主机游戏……设有各游戏分部和校内联赛。观赛party、水友赛不断，菜也没关系，快乐为主。",
    qq: "100100113", booth: "", status: "closed", photos: [] },
  { id: 26, name: "滑板社", cat: "体育运动", module: "tiyu", logo: "🛹", tags: ["fitness", "outdoor"],
    slogan: "动起来，快乐会传染",
    intro: "「滑板社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 27, name: "滑翔伞社团", cat: "体育运动", module: "tiyu", logo: "🪂", tags: ["fitness", "outdoor"],
    slogan: "热爱不打烊，场上见",
    intro: "「滑翔伞社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 28, name: "交谊舞协会", cat: "体育运动", module: "tiyu", logo: "💃", tags: ["fitness"],
    slogan: "以球会友，以武会友",
    intro: "「交谊舞协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 29, name: "武术协会", cat: "体育运动", module: "tiyu", logo: "🥋", tags: ["fitness"],
    slogan: "流汗的样子最帅",
    intro: "「武术协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 30, name: "网球协会", cat: "体育运动", module: "tiyu", logo: "🎾", tags: ["ball"],
    slogan: "动起来，快乐会传染",
    intro: "「网球协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 31, name: "足球社", cat: "体育运动", module: "tiyu", logo: "⚽", tags: ["ball", "outdoor"],
    slogan: "绿茵场就是我们的主场",
    intro: "每周训练 + 校内联赛 + 校际友谊赛，门将、后卫、前锋统统缺人！不懂规则也行，来跑两圈就知道足球有多快乐。",
    qq: "100100110", booth: "", status: "closed", photos: [] },
  { id: 32, name: "女子篮球协会", cat: "体育运动", module: "tiyu", logo: "🏀", tags: ["ball"],
    slogan: "以球会友，以武会友",
    intro: "「女子篮球协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 33, name: "游泳协会", cat: "体育运动", module: "tiyu", logo: "🏊", tags: ["fitness"],
    slogan: "流汗的样子最帅",
    intro: "「游泳协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 34, name: "壁虎漫步攀岩社", cat: "体育运动", module: "tiyu", logo: "🧗", tags: ["fitness", "outdoor"],
    slogan: "动起来，快乐会传染",
    intro: "「壁虎漫步攀岩社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 35, name: "震旦纪跑团", cat: "体育运动", module: "tiyu", logo: "🏃", tags: ["fitness"],
    slogan: "热爱不打烊，场上见",
    intro: "「震旦纪跑团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 36, name: "拓展运动社团", cat: "体育运动", module: "tiyu", logo: "🏕️", tags: ["fitness", "outdoor"],
    slogan: "以球会友，以武会友",
    intro: "「拓展运动社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 37, name: "匹克球社团", cat: "体育运动", module: "tiyu", logo: "🎾", tags: ["ball"],
    slogan: "流汗的样子最帅",
    intro: "「匹克球社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 38, name: "CUG极限飞盘协会", cat: "体育运动", module: "tiyu", logo: "🥏", tags: ["ball"],
    slogan: "动起来，快乐会传染",
    intro: "「CUG极限飞盘协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 39, name: "大学生龙狮团", cat: "体育运动", module: "tiyu", logo: "🦁", tags: ["fitness"],
    slogan: "热爱不打烊，场上见",
    intro: "「大学生龙狮团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 40, name: "CUG博雅棋苑", cat: "体育运动", module: "tiyu", logo: "♟️", tags: ["boardgame"],
    slogan: "以球会友，以武会友",
    intro: "「CUG博雅棋苑」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 41, name: "桨板瑜伽社团", cat: "体育运动", module: "tiyu", logo: "🚣", tags: ["fitness"],
    slogan: "流汗的样子最帅",
    intro: "「桨板瑜伽社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 42, name: "瑜伽与减压社团", cat: "体育运动", module: "tiyu", logo: "🧘", tags: ["fitness"],
    slogan: "动起来，快乐会传染",
    intro: "「瑜伽与减压社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 43, name: "自行车运动协会", cat: "体育运动", module: "tiyu", logo: "🚲", tags: ["fitness", "outdoor"],
    slogan: "热爱不打烊，场上见",
    intro: "「自行车运动协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 44, name: "女子足球社团", cat: "体育运动", module: "tiyu", logo: "⚽", tags: ["ball", "outdoor"],
    slogan: "以球会友，以武会友",
    intro: "「女子足球社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 45, name: "非开挖技术协会", cat: "学术科技", module: "keji", logo: "⛏️", tags: ["robot", "code"],
    slogan: "用技术把脑洞变成现实",
    intro: "「非开挖技术协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 46, name: "兵棋推演社团", cat: "学术科技", module: "keji", logo: "♟️", tags: ["boardgame"],
    slogan: "创造欲过剩？来这里释放",
    intro: "「兵棋推演社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 47, name: "IT120帮帮团", cat: "学术科技", module: "keji", logo: "🛠️", tags: ["code"],
    slogan: "代码与灵感，都在路上",
    intro: "「IT120帮帮团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 48, name: "人工智能协会", cat: "学术科技", module: "keji", logo: "🤖", tags: ["code"],
    slogan: "下一个改变世界的，可能就是你",
    intro: "「人工智能协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 49, name: "智能基座协会", cat: "学术科技", module: "keji", logo: "🧱", tags: ["code"],
    slogan: "用技术把脑洞变成现实",
    intro: "「智能基座协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 50, name: "地球科学俱乐部", cat: "学术科技", module: "keji", logo: "🌍", tags: ["science"],
    slogan: "创造欲过剩？来这里释放",
    intro: "「地球科学俱乐部」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 51, name: "ACM-ICPC 协会", cat: "学术科技", module: "keji", logo: "💻", tags: ["code"],
    slogan: "代码与灵感，都在路上",
    intro: "「ACM-ICPC 协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 52, name: "数理科技协会", cat: "学术科技", module: "keji", logo: "📐", tags: ["code"],
    slogan: "下一个改变世界的，可能就是你",
    intro: "「数理科技协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 53, name: "科幻界", cat: "学术科技", module: "keji", logo: "🛸", tags: ["science"],
    slogan: "用技术把脑洞变成现实",
    intro: "「科幻界」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 54, name: "机器人创客协会", cat: "学术科技", module: "keji", logo: "🦾", tags: ["robot", "code"],
    slogan: "创造欲过剩？来这里释放",
    intro: "「机器人创客协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 55, name: "电子信息研创会", cat: "学术科技", module: "keji", logo: "📡", tags: ["robot", "code"],
    slogan: "代码与灵感，都在路上",
    intro: "「电子信息研创会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 56, name: "图形技能协会", cat: "学术科技", module: "keji", logo: "🖥️", tags: ["science"],
    slogan: "下一个改变世界的，可能就是你",
    intro: "「图形技能协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 57, name: "绿色协会", cat: "学术科技", module: "keji", logo: "🌿", tags: ["science"],
    slogan: "用技术把脑洞变成现实",
    intro: "「绿色协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 58, name: "集成电路协会", cat: "学术科技", module: "keji", logo: "🔌", tags: ["robot", "code"],
    slogan: "创造欲过剩？来这里释放",
    intro: "「集成电路协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 59, name: "网络空间安全协会", cat: "学术科技", module: "keji", logo: "✨", tags: ["code"],
    slogan: "代码与灵感，都在路上",
    intro: "「网络空间安全协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 60, name: "天文爱好者协会", cat: "学术科技", module: "keji", logo: "🔭", tags: ["science"],
    slogan: "下一个改变世界的，可能就是你",
    intro: "「天文爱好者协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 61, name: "机械创新协会", cat: "学术科技", module: "keji", logo: "⚙️", tags: ["robot", "code"],
    slogan: "用技术把脑洞变成现实",
    intro: "「机械创新协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 62, name: "大学生3D打印社团", cat: "学术科技", module: "keji", logo: "🖨️", tags: ["robot", "code"],
    slogan: "创造欲过剩？来这里释放",
    intro: "「大学生3D打印社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 63, name: "侏罗纪电子制作协会", cat: "学术科技", module: "keji", logo: "📡", tags: ["robot", "code"],
    slogan: "代码与灵感，都在路上",
    intro: "「侏罗纪电子制作协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 64, name: "文化遗产与岩土文物保护协会", cat: "学术科技", module: "keji", logo: "🏺", tags: ["science"],
    slogan: "下一个改变世界的，可能就是你",
    intro: "「文化遗产与岩土文物保护协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 65, name: "岩石纪元 Minecraft 社团", cat: "学术科技", module: "keji", logo: "⛏️", tags: ["game", "code"],
    slogan: "用技术把脑洞变成现实",
    intro: "「岩石纪元 Minecraft 社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 66, name: "结构设计与发展研究会", cat: "学术科技", module: "keji", logo: "🏗️", tags: ["science"],
    slogan: "创造欲过剩？来这里释放",
    intro: "「结构设计与发展研究会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 67, name: "人工智能先行者社团", cat: "学术科技", module: "keji", logo: "🤖", tags: ["code"],
    slogan: "代码与灵感，都在路上",
    intro: "「人工智能先行者社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 68, name: "“地芯”人工智能协会", cat: "学术科技", module: "keji", logo: "🤖", tags: ["code", "robot"],
    slogan: "下一个改变世界的，可能就是你",
    intro: "「“地芯”人工智能协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 69, name: "“地心守护”社团", cat: "学术科技", module: "keji", logo: "🌋", tags: ["science"],
    slogan: "用技术把脑洞变成现实",
    intro: "「“地心守护”社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 70, name: "大学生通信科创会", cat: "学术科技", module: "keji", logo: "📶", tags: ["code"],
    slogan: "创造欲过剩？来这里释放",
    intro: "「大学生通信科创会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 71, name: "研究生心理协会", cat: "文化艺术", module: "renwen", logo: "🧠", tags: ["write"],
    slogan: "把兴趣玩成专业",
    intro: "「研究生心理协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 72, name: "子衿汉服社", cat: "文化艺术", module: "renwen", logo: "🏮", tags: ["hanfu"],
    slogan: "一群人，一条心，一起玩",
    intro: "「子衿汉服社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 73, name: "应急救援协会", cat: "文化艺术", module: "renwen", logo: "🚑", tags: ["outdoor"],
    slogan: "热爱可抵岁月漫长",
    intro: "「应急救援协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 74, name: "地大G舞团", cat: "文化艺术", module: "renwen", logo: "✨", tags: ["dance"],
    slogan: "在热爱里发光的人，都在这里",
    intro: "「地大G舞团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 75, name: "中乐相声社", cat: "文化艺术", module: "renwen", logo: "🗣️", tags: ["music"],
    slogan: "把兴趣玩成专业",
    intro: "「中乐相声社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 76, name: "青年铸梦研习社", cat: "文化艺术", module: "renwen", logo: "🌟", tags: ["write"],
    slogan: "一群人，一条心，一起玩",
    intro: "「青年铸梦研习社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 77, name: "原力影视工坊", cat: "文化艺术", module: "renwen", logo: "🎬", tags: ["photo", "video"],
    slogan: "热爱可抵岁月漫长",
    intro: "「原力影视工坊」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 78, name: "玉文化", cat: "文化艺术", module: "renwen", logo: "🀄", tags: ["hanfu", "art"],
    slogan: "在热爱里发光的人，都在这里",
    intro: "「玉文化」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 79, name: "灵韵笛箫社", cat: "文化艺术", module: "renwen", logo: "🪈", tags: ["hanfu", "music"],
    slogan: "把兴趣玩成专业",
    intro: "「灵韵笛箫社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 80, name: "和雅古琴社", cat: "文化艺术", module: "renwen", logo: "🎶", tags: ["hanfu", "music"],
    slogan: "一群人，一条心，一起玩",
    intro: "「和雅古琴社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 81, name: "英语协会", cat: "文化艺术", module: "renwen", logo: "🌍", tags: ["english", "debate", "write"],
    slogan: "开口说英语，世界在眼前",
    intro: "英语角、四六级打卡营、外教茶话会、英语配音大赛。别再让英语只会做阅读题，来这里大胆开口吧。",
    qq: "100100123", booth: "", status: "closed", photos: [] },
  { id: 82, name: "法律协会", cat: "文化艺术", module: "renwen", logo: "⚖️", tags: ["debate"],
    slogan: "在热爱里发光的人，都在这里",
    intro: "「法律协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 83, name: "NDS街舞社", cat: "文化艺术", module: "renwen", logo: "🕺", tags: ["dance", "video", "music"],
    slogan: "身体就是我们的语言",
    intro: "校内最炸的街舞团体，涵盖 HipHop、Jazz、Breaking 等多个舞种。零基础也能入门，每学期都有专场演出和 battle 活动，快来把操场变成你的舞台。",
    activities: "每周三、周五晚例行训练；文化节现场整点甩舞教学，欢迎来摊位挑战！",
    qq: "100100101", booth: "", status: "closed", photos: [] },
  { id: 84, name: "未来之声传媒社", cat: "文化艺术", module: "renwen", logo: "📷", tags: ["photo", "video"],
    slogan: "一群人，一条心，一起玩",
    intro: "「未来之声传媒社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 85, name: "茶几动漫社", cat: "文化艺术", module: "renwen", logo: "👾", tags: ["anime", "art", "boardgame"],
    branches: [
      { name: "外宣部(Make Teapoi Great Again)", desc: "QQ:877742508" },
      { name: "声优部", desc: "QQ:1153626247" },
      { name: "YY频道", desc: "QQ:87131207" },
      { name: "漫画部", desc: "QQ:144924760" },
      { name: "cos部", desc: "QQ:172128789" },
      { name: "宅舞部", desc: "QQ:322690487" },
      { name: "技术部", desc: "QQ:764931102" },
      { name: "WOTA GEI部", desc: "QQ:1011855066" },
      { name: "Antiflow 茶几轻音部", desc: "QQ:636081255" },
      { name: "特摄群", desc: "QQ:973046551" },
      { name: "茶几偶像同好会", desc: "QQ:378342792" },
      { name: "Game部", desc: "QQ列表:碧蓝档案：144924760,崩3：429392269，Card Game:@碱石灰，舟：975745392,少前：674504188，月球人：1156414309，车万：905239537", link: "./game.html" }
    ],
    slogan: "二次元浓度超标警告！",
    intro: "漫宅双修：宅舞、翻唱、cos、痛包手办交流、新番吐槽大会。每年举办校内漫展，欢迎加入这个次元。",
    qq: "100100117", booth: "1", status: "closed", photos: [] },
  { id: 86, name: "大学生自游者俱乐部", cat: "文化艺术", module: "renwen", logo: "⛺", tags: ["outdoor"],
    slogan: "在热爱里发光的人，都在这里",
    intro: "「大学生自游者俱乐部」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 87, name: "三叠口琴社", cat: "文化艺术", module: "renwen", logo: "🎼", tags: ["music"],
    slogan: "把兴趣玩成专业",
    intro: "「三叠口琴社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 88, name: "星空音乐社", cat: "文化艺术", module: "renwen", logo: "🎵", tags: ["music"],
    slogan: "一群人，一条心，一起玩",
    intro: "「星空音乐社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 89, name: "书画协会", cat: "文化艺术", module: "renwen", logo: "🖌️", tags: ["art"],
    slogan: "热爱可抵岁月漫长",
    intro: "「书画协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 90, name: "晋文化研习社", cat: "文化艺术", module: "renwen", logo: "🏺", tags: ["write", "hanfu"],
    slogan: "在热爱里发光的人，都在这里",
    intro: "「晋文化研习社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 91, name: "ABC音乐剧社", cat: "文化艺术", module: "renwen", logo: "🎭", tags: ["music"],
    slogan: "把兴趣玩成专业",
    intro: "「ABC音乐剧社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 92, name: "嘻U记脱口秀社", cat: "文化艺术", module: "renwen", logo: "🎤", tags: ["music"],
    slogan: "一群人，一条心，一起玩",
    intro: "「嘻U记脱口秀社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 93, name: "Pin说唱社", cat: "文化艺术", module: "renwen", logo: "🎧", tags: ["music"],
    slogan: "热爱可抵岁月漫长",
    intro: "「Pin说唱社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 94, name: "镜岱未来 文化传习社团", cat: "文化艺术", module: "renwen", logo: "🏮", tags: ["hanfu"],
    slogan: "在热爱里发光的人，都在这里",
    intro: "「镜岱未来 文化传习社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 95, name: "超级大咖咖啡社", cat: "文化艺术", module: "renwen", logo: "☕", tags: ["food"],
    slogan: "把兴趣玩成专业",
    intro: "「超级大咖咖啡社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 96, name: "演讲与辩论协会", cat: "文化艺术", module: "renwen", logo: "🎙️", tags: ["debate"],
    slogan: "一群人，一条心，一起玩",
    intro: "「演讲与辩论协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 97, name: "粤韵风华粤语社", cat: "文化艺术", module: "renwen", logo: "🗣️", tags: ["english"],
    slogan: "热爱可抵岁月漫长",
    intro: "「粤韵风华粤语社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 98, name: "“就业邦”职业发展协会", cat: "文化艺术", module: "renwen", logo: "💼", tags: ["startup"],
    slogan: "在热爱里发光的人，都在这里",
    intro: "「“就业邦”职业发展协会」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 99, name: "南望兰台校史研习社", cat: "文化艺术", module: "renwen", logo: "📜", tags: ["write"],
    slogan: "把兴趣玩成专业",
    intro: "「南望兰台校史研习社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 100, name: "石榴籽民族文化社", cat: "文化艺术", module: "renwen", logo: "🧧", tags: ["hanfu"],
    slogan: "一群人，一条心，一起玩",
    intro: "「石榴籽民族文化社」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 101, name: "大学生“红色之声”宣讲社团", cat: "文化艺术", module: "renwen", logo: "📢", tags: ["debate"],
    slogan: "热爱可抵岁月漫长",
    intro: "「大学生“红色之声”宣讲社团」正在纳新！这里聚集着一群志同道合的同学，日常活动丰富、氛围友好。详细内容由社团负责人更新中，欢迎到摊位面基或加群咨询。",
    qq: "", booth: "", status: "closed", photos: [] },
  { id: 102, name: "赞助商展位 ①", cat: "赞助商", module: null, logo: "🎁", tags: [],
    slogan: "校企合作 · 好礼相送（待更新）",
    intro: "赞助商展位：现场互动领奖品。内容由负责人替换为实际赞助商信息。",
    qq: "-", booth: "E-01", status: "closed", photos: [] },
  { id: 103, name: "赞助商展位 ②", cat: "赞助商", module: null, logo: "🎀", tags: [],
    slogan: "扫码抽奖 · 惊喜不断（待更新）",
    intro: "赞助商展位：扫码参与抽奖活动。内容由负责人替换为实际赞助商信息。",
    qq: "-", booth: "E-02", status: "closed", photos: [] },
  { id: 104, name: "国际教育学院展位", cat: "院系展示", module: null, logo: "🏫", tags: [],
    slogan: "中外交流 · 留学咨询（待更新）",
    intro: "国教展位：国际交流项目介绍与咨询。内容由负责人替换为实际内容。",
    qq: "-", booth: "F-01", status: "closed", photos: [] }
];

/* ---------- 场地平面图布局（仿百团大战场馆图，可交互） ----------
 * mapImage 有值时地图用真实场馆图 + BOOTH_LAYOUT 名牌（本段仅作无图兜底）。
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

/* ---------- 摊位名牌坐标（基于真实场馆图 img/map.png 像素检测标定） ----------
 * segments: from/to 编号等差排列，(x1,y1)→(x2,y2) 为首尾格中心（百分比坐标）
 *   kind: "ring"=外圈白格 / "inner"=内圈青格；12 号为横跨双列的宽格
 * specials: 图内固定功能区（橙块/医疗点）
 * 管理员拖动名牌后的位置覆盖保存在服务端，自动合并到本坐标系上
 * ------------------------------------------------------------------ */
const BOOTH_LAYOUT = {
  segments: [
    { from: 135, to: 144, x1: 8.38, y1: 10.43, x2: 33.24, y2: 10.43, kind: "ring" },  /* 顶左横排 */
    { from: 41,  to: 50,  x1: 66.16, y1: 10.34, x2: 91.02, y2: 10.34, kind: "ring" }, /* 顶右横排 */
    { from: 51,  to: 68,  x1: 93.57, y1: 14.38, x2: 93.57, y2: 85.15, kind: "ring" }, /* 右竖列 */
    { from: 134, to: 117, x1: 5.49, y1: 14.93, x2: 5.49, y2: 85.15, kind: "ring" },   /* 左竖列（134 顶 → 117 底） */
    { from: 93,  to: 104, x1: 8.85, y1: 90.27, x2: 38.59, y2: 90.27, kind: "ring" },  /* 底左上横排 */
    { from: 105, to: 116, x1: 8.26, y1: 96.04, x2: 38.67, y2: 96.04, kind: "ring" },  /* 底左下横排 */
    { from: 80,  to: 69,  x1: 60.83, y1: 90.27, x2: 90.85, y2: 90.27, kind: "ring" }, /* 底右上横排（80 左 → 69 右） */
    { from: 81,  to: 92,  x1: 60.73, y1: 94.04, x2: 91.14, y2: 94.04, kind: "ring" }, /* 底右下横排 */
    { from: 1,   to: 11,  x1: 24.25, y1: 25.9, x2: 24.25, y2: 67.4, kind: "inner" }, /* 内左列A */
    { from: 23,  to: 13,  x1: 27.15, y1: 25.9, x2: 27.15, y2: 67.4, kind: "inner" }, /* 内左列B（23 顶 → 13 底） */
    { from: 12,  to: 12, x1: 26.06, y1: 72.27, x2: 26.06, y2: 72.27, kind: "inner", wide: true }, /* 宽格 */
    { from: 24,  to: 33,  x1: 71.9, y1: 33.94, x2: 71.9, y2: 71.64, kind: "inner" },  /* 内右列A */
    { from: 40,  to: 34,  x1: 74.79, y1: 46.78, x2: 74.79, y2: 71.84, kind: "inner" } /* 内右列B（40 顶 → 34 底） */
  ],
  specials: [
    { id: "ctrl", label: "控台区", x: 71.9, y: 27.01, tall: true },
    { id: "info", label: "咨询处", x: 74.79, y: 27.01 },
    { id: "med",  label: "医疗点", x: 74.97, y: 33.99 },
    { id: "wait", label: "候场区", x: 74.79, y: 39.48, tall: true }
  ]
};

/* ---------- 挂载（程序读取用，不要删） ---------- */
CONFIG.tags = TAGS;
CONFIG.zones = ZONES;
CONFIG.clubs = CLUBS;
CONFIG.modules = MODULES;
CONFIG.mapLayout = MAP_LAYOUT;
CONFIG.boothLayout = BOOTH_LAYOUT;
