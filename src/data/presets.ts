import type { StyleId, TemplateId } from "../types";

export const stylePresets: Array<{
  id: StyleId;
  name: string;
  short: string;
}> = [
  { id: "auto", name: "自动推荐", short: "由图片决定" },
  { id: "elegant", name: "优雅纸本", short: "细腻纸纹与杂志留白" },
  { id: "vintage", name: "复古繁盛", short: "邮票、胶片、贴纸层叠" },
  { id: "travel", name: "旅行档案", short: "坐标、时间线与票据感" },
  { id: "soft", name: "可爱治愈", short: "柔和彩签与圆润拼贴" },
];

export const templatePresets: Array<{
  id: TemplateId;
  name: string;
  short: string;
}> = [
  { id: "atlas", name: "图文手帐", short: "大图 + 细密标签" },
  { id: "collage", name: "繁复拼贴", short: "照片、票据、贴纸错落" },
  { id: "magazine", name: "杂志跨页", short: "强标题与精修排版" },
  { id: "archive", name: "旅行档案", short: "索引、时间、参数并置" },
];

/**
 * 场景细节字段：根据当前场景在弹窗里动态展示。
 *   - 无 options：渲染为输入框（兼容老场景）。
 *   - 有 options + multiple=false：渲染为「单选 chip」。
 *   - 有 options + multiple=true：渲染为「多选 chip」，存值用「、」拼接。
 *   - 提供 allowCustom 时，chip 最后会追加「自定义…」打开行内输入。
 */
export type SceneDetailField = {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
  multiple?: boolean;
  allowCustom?: boolean;
};

export type SceneOption = {
  name: string;
  /** 简短标签，给 prompt 用。 */
  tag: string;
  /** 此场景下默认引导用户补充的细节字段。 */
  fields: SceneDetailField[];
};

/**
 * 场景细节：尽量把所有字段做成「选项芯片」，让用户最少输入。
 * 对真正没法穷举的字段（如目的地、纪念主题）仍保留 input + allowCustom 兜底。
 */
export const sceneOptions: SceneOption[] = [
  {
    name: "一次旅程",
    tag: "旅行",
    fields: [
      // 目的地保留输入：地名几乎无法穷举
      { key: "destination", label: "目的地", placeholder: "例如：日本 · 富士山 / 河口湖" },
      {
        key: "duration",
        label: "行程",
        options: ["一日往返", "周末两日", "3 天 2 夜", "5 天 4 夜", "一周以上", "深度长居"],
      },
      {
        key: "companions",
        label: "同行人",
        options: ["独行", "和朋友", "和家人", "和伴侣", "亲子游", "团队出差"],
      },
      {
        key: "transport",
        label: "主要交通",
        multiple: true,
        options: ["高铁/动车", "飞机", "自驾", "城市地铁", "步行", "骑行", "船 / 渡轮"],
      },
      {
        key: "weather",
        label: "天气",
        options: ["晴朗", "多云", "小雨", "雪天", "晨雾", "夜色"],
      },
      // 印象最深保留输入：高度个性化
      { key: "highlight", label: "印象最深", placeholder: "例如：镰仓高校前站等列车" },
    ],
  },
  {
    name: "城市散步",
    tag: "城市",
    fields: [
      { key: "district", label: "街区 / 商圈", placeholder: "例如：上海武康路" },
      {
        key: "route",
        label: "路线感觉",
        options: ["按地图走完", "随心乱逛", "跟着小红书攻略", "一路停一路拍"],
      },
      {
        key: "stops",
        label: "停留过的小店",
        multiple: true,
        options: ["咖啡馆", "买手店", "独立书店", "市集 / 摊位", "甜品店", "酒馆", "公园 / 草坪"],
      },
      {
        key: "weather",
        label: "天气",
        options: ["晴朗", "多云", "小雨", "黄昏", "夜景", "雪天"],
      },
    ],
  },
  {
    name: "周末日常",
    tag: "日常",
    fields: [
      {
        key: "place",
        label: "主要地点",
        options: ["家里", "楼下咖啡馆", "工作室", "户外公园", "图书馆", "朋友家"],
      },
      {
        key: "activity",
        label: "做了什么",
        multiple: true,
        options: ["睡到自然醒", "做饭", "阅读", "做手工", "看电影", "运动", "整理房间", "见朋友"],
      },
      {
        key: "items",
        label: "随身物品",
        multiple: true,
        options: ["相机", "胶片机", "一本书", "笔记本", "蓝牙音箱", "保温杯", "iPad"],
      },
      {
        key: "mood",
        label: "今天的氛围",
        options: ["慢节奏", "被治愈", "小确幸", "稍微忙", "宅得舒服"],
      },
    ],
  },
  {
    name: "朋友聚会",
    tag: "聚会",
    fields: [
      {
        key: "occasion",
        label: "聚会缘由",
        options: ["生日", "毕业 / 重聚", "节日", "随便约一约", "新店打卡", "工作庆功"],
      },
      {
        key: "people",
        label: "几位 · 关系",
        options: ["2-3 人 · 至交", "4-6 人 · 老友", "7 人以上 · 大局", "同事", "邻居 / 楼友"],
      },
      {
        key: "venue",
        label: "地点",
        options: ["私厨 / 小酒馆", "咖啡馆", "家里 / Airbnb", "户外野餐", "KTV / 桌游"],
      },
      {
        key: "menu",
        label: "菜系 / 酒水",
        multiple: true,
        options: ["中餐", "日料", "西餐", "甜品", "酒水", "奶茶 / 咖啡", "BBQ / 烧烤"],
      },
    ],
  },
  {
    name: "独处片刻",
    tag: "独处",
    fields: [
      {
        key: "place",
        label: "在哪儿",
        options: ["阳台 / 窗边", "床上", "咖啡馆角落", "公园长椅", "深夜的厨房", "通勤路上"],
      },
      {
        key: "activity",
        label: "做了什么",
        multiple: true,
        options: ["发呆", "翻旧照片", "写日记", "听歌", "看书", "做白日梦", "散步"],
      },
      {
        key: "media",
        label: "陪伴的歌 / 书 / 电影",
        placeholder: "例如：听《Wave》、读《巴黎评论》",
      },
      {
        key: "feeling",
        label: "心情关键词",
        multiple: true,
        options: ["平静", "想念", "被治愈", "有点闷", "释然", "蓄能", "刚刚好"],
      },
    ],
  },
  {
    name: "纪念日",
    tag: "纪念",
    fields: [
      { key: "occasion", label: "纪念什么", placeholder: "例如：结婚 3 周年" },
      {
        key: "subject",
        label: "为谁 / 写给谁",
        options: ["写给自己", "写给伴侣", "写给家人", "写给朋友", "写给宠物", "写给未来"],
      },
      {
        key: "place",
        label: "地点",
        options: ["家里", "约会过的地方", "旅行途中", "餐厅 / 咖啡馆", "去年来过的地方"],
      },
      {
        key: "ritual",
        label: "今天的小仪式",
        multiple: true,
        options: ["拍合影", "互写卡片", "做一道菜", "重看老照片", "买花", "互换礼物"],
      },
    ],
  },
];

/** 兼容旧用法，仍提供纯字符串名列表。 */
export const sceneNames = sceneOptions.map((scene) => scene.name);

export const moodOptions = ["松弛", "热烈", "怀旧", "奇遇", "安静", "明亮", "浪漫", "像电影"];

export const narratorOptions = [
  "写给未来自己的信",
  "像旅行档案一样整理",
  "像一本精致生活杂志",
  "像朋友在夜里低声讲述",
];

// ----------------------------------------------------------------------------
//  视觉风味（Visual Style）—— 全部 chip 化，对应 6 段处理流程中的 3/5/6
// ----------------------------------------------------------------------------

/** 整体色调倾向（单选）。对应 prompt 中的「色调」段。 */
export const paletteOptions: Array<{ id: string; label: string; short: string }> = [
  { id: "warm-film", label: "暖色胶片", short: "黄昏 / 木质 / 复古" },
  { id: "cool-clean", label: "冷色清透", short: "海雾 / 冰川 / 极简" },
  { id: "pastel-soft", label: "马卡龙柔色", short: "奶油 / 樱花 / 治愈" },
  { id: "deep-night", label: "深夜墨蓝", short: "夜色 / 霓虹 / 都市" },
  { id: "earth-vintage", label: "大地复古", short: "卡其 / 砖红 / 旅人" },
  { id: "high-contrast", label: "高反差强对比", short: "黑白 / 街拍 / 强烈" },
];

/** 画面主色调（单选）。仅用于 UI 展示，不加入 prompt。常见手帐色彩。 */
export const mainColorOptions: Array<{ id: string; label: string; color: string }> = [
  { id: "cherry-pink", label: "樱花粉", color: "#FFB6D9" },
  { id: "sky-blue", label: "天空蓝", color: "#87CEEB" },
  { id: "mint-green", label: "薄荷绿", color: "#98FF98" },
  { id: "lavender", label: "薰衣草紫", color: "#E6B3FF" },
  { id: "peach", label: "蜜桃橙", color: "#FFCC99" },
  { id: "cream", label: "奶油黄", color: "#FFFACD" },
  { id: "coral", label: "珊瑚红", color: "#FF7F7F" },
  { id: "sage-green", label: "鼠尾草绿", color: "#9DC183" },
  { id: "dusty-rose", label: "尘粉玫瑰", color: "#D8A8A8" },
  { id: "ocean-teal", label: "海洋青", color: "#5F9EA0" },
];

/** 氛围标签（多选）。对应 prompt 中的「情绪 / 氛围」段。 */
export const vibeOptions: string[] = [
  "治愈",
  "松弛",
  "复古",
  "夏日感",
  "冬日感",
  "晨间",
  "深夜",
  "公路片",
  "日系小清新",
  "ins 极简",
  "胶片颗粒",
  "童话感",
  "都市感",
  "野外感",
];

/**
 * 排版形状（多选）。对应 prompt 中的「排版」段——指导 LLM 裁剪图片的轮廓形状。
 * 注意：这里只放「形状本身」（方/圆/爱心/几何/抠图/局部剪贴），
 * 「边缘装饰」（撕纸边/相框/胶片孔/宝丽得白边）已抽到 edgeStyleOptions 独立维度。
 */
export const layoutShapeOptions: Array<{ id: string; label: string; hint: string }> = [
  { id: "rect", label: "经典方形", hint: "拍立得 / 标准矩形" },
  { id: "round", label: "圆形 / 椭圆", hint: "胶卷孔 / 徽章" },
  { id: "heart", label: "爱心 / 异形", hint: "甜蜜场合点缀" },
  { id: "polygon", label: "几何多边形", hint: "六边形 / 钻石" },
  { id: "subject-cutout", label: "沿主体轮廓抠图", hint: "人物 / 物体抠出贴上" },
  { id: "detail-clip", label: "局部细节剪贴", hint: "招牌 / 路牌 / 纹理放大" },
];

/**
 * 照片边缘风格（多选）。这是与「形状」正交的维度，控制照片四周如何包装。
 *   - isFixedShape=true：该边缘风格自身带固定形状（如电影胶片必然是横长条带孔、
 *     宝丽得必然是白边方框、取景器必然是带四角的近似方形），
 *     生成时应「忽略形状偏好」按该边缘的固有形状执行；
 *   - isFixedShape=false：只装饰边缘，不限制内部形状，
 *     可与「排版形状」组合使用（如「圆形」+「描边纸」）。
 */
export const edgeStyleOptions: Array<{
  id: string;
  label: string;
  hint: string;
  isFixedShape: boolean;
}> = [
  { id: "torn-paper", label: "撕纸边", hint: "纸边手撕拼贴感", isFixedShape: false },
  { id: "picture-frame", label: "相框", hint: "深色木框 / 金属框", isFixedShape: true },
  { id: "film-strip", label: "电影胶片", hint: "横长条带感光孔", isFixedShape: true },
  { id: "viewfinder", label: "手持取景框", hint: "相机取景器四角", isFixedShape: true },
  { id: "polaroid-white", label: "宝丽得白边", hint: "底部留白可写字", isFixedShape: true },
  { id: "sticker-edge", label: "贴纸描边", hint: "便签 / 偏移描边", isFixedShape: false },
  { id: "soft-blur", label: "羽化柔边", hint: "边缘虚化晕染", isFixedShape: false },
  { id: "washi-tape", label: "和纸胶带封边", hint: "顶/底贴胶带固定", isFixedShape: false },
];

/** 装饰元素（多选）。对应 prompt 中的「装饰元素」段。 */
export const decorationOptions: Array<{ id: string; label: string }> = [
  { id: "doodle-cat", label: "线条小猫" },
  { id: "paper-plane", label: "纸飞机 / 飞鸟" },
  { id: "stars", label: "小星星 / 银河" },
  { id: "flowers", label: "花朵 / 叶子" },
  { id: "tickets", label: "票根 / 邮戳" },
  { id: "tape", label: "胶带 / 贴纸" },
  { id: "arrow-note", label: "箭头 + 手写批注" },
  { id: "music-note", label: "音符 / 歌词条" },
  { id: "weather-icon", label: "天气小图标" },
  { id: "doodle-line", label: "随手线条 / 涂鸦" },
];

/** 底图纸张纹理（单选）。对应 prompt 中的「底图融合」段。 */
export const paperOptions: Array<{ id: string; label: string; short: string }> = [
  { id: "cream-linen", label: "米色道林纸", short: "经典手帐底" },
  { id: "rice-paper", label: "宣纸 / 米纸", short: "东方留白" },
  { id: "kraft", label: "牛皮纸", short: "复古旅行" },
  { id: "blue-grid", label: "淡蓝网格", short: "笔记本质感" },
  { id: "polaroid", label: "拍立得相纸", short: "白边胶片" },
  { id: "night-paper", label: "深蓝夜纸", short: "深夜 / 星空" },
  { id: "watercolor", label: "水彩纹理", short: "柔和晕染" },
];
