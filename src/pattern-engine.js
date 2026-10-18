/**
 * Pattern Mode Engine
 * 独立的技术形态模拟引擎，不污染 TradingEngine
 */

// 形态定义
const PATTERNS = {
  HEAD_SHOULDERS: {
    name: '头肩顶',
    nameEn: 'Head and Shoulders',
    type: 'reversal',
    direction: 'bearish',
    description: '经典反转形态，常出现在上升趋势末期。',
  },
  HEAD_SHOULDERS_BOTTOM: {
    name: '头肩底',
    nameEn: 'Inverse Head and Shoulders',
    type: 'reversal',
    direction: 'bullish',
    description: '经典底部反转形态，常出现在下降趋势末期。',
  },
  DOUBLE_TOP: {
    name: '双顶',
    nameEn: 'Double Top',
    type: 'reversal',
    direction: 'bearish',
    description: '两次冲高失败后回落，偏空。',
  },
  DOUBLE_BOTTOM: {
    name: '双底',
    nameEn: 'Double Bottom',
    type: 'reversal',
    direction: 'bullish',
    description: '两次探底后反弹，偏多。',
  },
  ASCENDING_TRIANGLE: {
    name: '上升三角形',
    nameEn: 'Ascending Triangle',
    type: 'continuation',
    direction: 'bullish',
    description: '高点受压、低点抬高，向上突破概率较高。',
  },
  DESCENDING_TRIANGLE: {
    name: '下降三角形',
    nameEn: 'Descending Triangle',
    type: 'continuation',
    direction: 'bearish',
    description: '低点支撑、反弹减弱，向下突破概率较高。',
  },
  BULL_FLAG: {
    name: '上升旗形',
    nameEn: 'Bull Flag',
    type: 'continuation',
    direction: 'bullish',
    description: '急涨旗杆后下倾旗面整理，向上突破延续。',
  },
  BEAR_FLAG: {
    name: '下降旗形',
    nameEn: 'Bear Flag',
    type: 'continuation',
    direction: 'bearish',
    description: '急跌旗杆后上倾旗面整理，向下跌破延续。',
  },
  RECTANGLE_BOX_BULLISH: {
    name: '箱体上破',
    nameEn: 'Rectangle Breakout',
    type: 'continuation',
    direction: 'bullish',
    description: '价格在箱体内多次震荡后向上突破。',
  },
  RECTANGLE_BOX_BEARISH: {
    name: '箱体下破',
    nameEn: 'Rectangle Breakdown',
    type: 'continuation',
    direction: 'bearish',
    description: '价格在箱体内多次震荡后向下跌破。',
  },
  FALLING_WEDGE: {
    name: '下降楔形',
    nameEn: 'Falling Wedge',
    type: 'reversal',
    direction: 'bullish',
    description: '高低点同步下移但波幅收敛，向上突破概率较高。',
  },
  RISING_WEDGE: {
    name: '上升楔形',
    nameEn: 'Rising Wedge',
    type: 'reversal',
    direction: 'bearish',
    description: '高低点同步抬升但波幅收敛，向下跌破概率较高。',
  },
  SMC_BULLISH_ACCUMULATION: {
    name: 'SMC看涨积累',
    nameEn: 'SMC Bullish Accumulation',
    type: 'reversal',
    direction: 'bullish',
    description: '机构积累区后向下洗盘（manipulation），随后结构改变（ChoCh）向上突破，形成高概率做多机会。',
  },
  RANDOM: {
    name: '随机走势',
    nameEn: 'Random Walk',
    type: 'mixed',
    direction: 'random',
    description: '无明显结构特征的随机波动。',
  },
};

// ═══════════════════════════════════════════════════════════════
// 预设形态分析模板 (直接展示，无需实时AI分析)
// ═══════════════════════════════════════════════════════════════
const PATTERN_ANALYSIS_TEMPLATES = {
  HEAD_SHOULDERS: {
    direction: 'bearish',
    confidence: 0.82,
    analysis: `【头肩顶形态】经典顶部反转信号

📐 形态结构：
• 左肩：第一次上涨至高点后回落至颈线
• 头部：再次上涨突破左肩高度，形成最高点后回落
• 右肩：第三次反弹但力度明显减弱，未能触及头部高度

📊 关键识别要点：
• 三个峰：中间最高（头），两侧较低（肩）
• 颈线：连接两次回落低点的支撑线
• 成交量：通常头部成交量小于左肩，右肩更弱
• 右肩高度低于头部是确认信号

⚠️ 交易策略：
• 入场：价格跌破颈线后做空
• 止损：右肩高点上方
• 目标：颈线向下量度头顶到颈线的距离
• 有效性：突破颈线后通常有回测确认`,
  },
  HEAD_SHOULDERS_BOTTOM: {
    direction: 'bullish',
    confidence: 0.82,
    analysis: `【头肩底形态】经典底部反转信号

📐 形态结构：
• 左肩：第一次下跌至低点后反弹至颈线
• 头部：再次下跌跌破左肩低点，形成最低点后反弹
• 右肩：第三次回落但杀跌力度减弱，未再跌破头部低点

📊 关键识别要点：
• 三个谷：中间最低（头），两侧较高（肩）
• 颈线：连接两次反弹高点的压力线
• 成交量：右肩企稳和突破颈线时放量更可靠
• 右肩低点高于头部是底部转强信号

⚠️ 交易策略：
• 入场：价格突破颈线后做多
• 止损：右肩低点下方
• 目标：颈线向上量度头部到颈线的距离
• 有效性：突破颈线后常有回踩确认`,
  },
  DOUBLE_TOP: {
    direction: 'bearish',
    confidence: 0.78,
    analysis: `【双顶形态（M顶）】顶部反转信号

📐 形态结构：
• 第一顶：价格上涨至阻力位后回落
• 颈线回踩：回落至支撑位形成中间低点
• 第二顶：再次反弹至第一顶附近但无法突破
• 当前位于颈线附近盘整区域

📊 关键识别要点：
• 两个高度接近的顶部（误差<3%视为有效）
• 颈线为两顶之间回落的最低点水平线
• 第二顶成交量通常萎缩，反映买方力量衰竭
• 颈线附近盘整时间越长，突破后力度越大

⚠️ 交易策略：
• 入场：价格跌破颈线后做空
• 止损：第二顶高点上方
• 目标：颈线向下量度顶部到颈线的距离
• 注意：约30%会出现假突破后反转回升`,
  },
  DOUBLE_BOTTOM: {
    direction: 'bullish',
    confidence: 0.78,
    analysis: `【双底形态（W底）】底部反转信号

📐 形态结构：
• 第一底：价格下跌至支撑位后反弹
• 颈线反弹：反弹至阻力位形成中间高点
• 第二底：再次下探至第一底附近获得支撑
• 当前位于颈线附近盘整区域

📊 关键识别要点：
• 两个深度接近的底部（误差<3%视为有效）
• 颈线为两底之间反弹的最高点水平线
• 第二底成交量通常放大，反映抄底资金入场
• 两底之间间隔越久形态越可靠

⚠️ 交易策略：
• 入场：价格突破颈线后做多
• 止损：第二底低点下方
• 目标：颈线向上量度底部到颈线的距离
• 注意：突破颈线后常有回踩确认`,
  },
  ASCENDING_TRIANGLE: {
    direction: 'bullish',
    confidence: 0.75,
    analysis: `【上升三角形】看涨持续/突破形态

📐 形态结构：
• 水平阻力线：多次冲高触及同一水平位后回落
• 上升支撑线：每次回落的低点逐步抬高
• 三角收敛：价格在阻力与支撑之间波幅逐渐收窄
• 当前处于三角形末端，即将选择方向

📊 关键识别要点：
• 至少2-3次触及水平阻力线
• 低点依次抬高形成上升趋势线
• 波动区间逐渐缩小（收敛形态）
• 突破通常发生在三角形2/3至3/4处

⚠️ 交易策略：
• 入场：价格放量突破水平阻力线后做多
• 止损：最近一次回调低点下方
• 目标：三角形底边的高度向上投射
• 概率：约75%向上突破，25%向下假突破`,
  },
  DESCENDING_TRIANGLE: {
    direction: 'bearish',
    confidence: 0.75,
    analysis: `【下降三角形】看跌持续/突破形态

📐 形态结构：
• 水平支撑线：多次下探触及同一水平位后反弹
• 下降压力线：每次反弹的高点逐步降低
• 三角收敛：价格在支撑与压力之间波幅逐渐收窄
• 当前处于三角形末端，即将选择方向

📊 关键识别要点：
• 至少2-3次触及水平支撑线
• 高点依次降低形成下降趋势线
• 卖方力量持续增强，买方力量逐步减弱
• 突破通常发生在三角形2/3至3/4处

⚠️ 交易策略：
• 入场：价格放量跌破水平支撑线后做空
• 止损：最近一次反弹高点上方
• 目标：三角形顶边的高度向下投射
• 概率：约75%向下突破，25%向上假突破`,
  },
  BULL_FLAG: {
    direction: 'bullish',
    confidence: 0.80,
    analysis: `【上升旗形】强势看涨持续形态

📐 形态结构：
• 旗杆：一段急速上涨走势（强势推动波）
• 旗面：涨势后的缓慢下倾回调整理
• 通道：旗面形成平行下倾的小通道
• 当前处于旗面回调末端

📊 关键识别要点：
• 旗杆角度陡峭（强势上攻）
• 旗面回调幅度通常不超过旗杆的38.2%-50%
• 旗面回调时间通常短于旗杆推动时间
• 回调中成交量萎缩是健康信号

⚠️ 交易策略：
• 入场：价格突破旗面上沿后做多
• 止损：旗面最低点下方
• 目标：从突破点向上量度一个旗杆的长度
• 可靠性：强势趋势中出现的旗形成功率约65-70%`,
  },
  BEAR_FLAG: {
    direction: 'bearish',
    confidence: 0.80,
    analysis: `【下降旗形】强势看跌持续形态

📐 形态结构：
• 旗杆：一段急速下跌走势（强势推动波）
• 旗面：跌势后的缓慢上倾反弹整理
• 通道：旗面形成平行上倾的小通道
• 当前处于旗面反弹末端

📊 关键识别要点：
• 旗杆角度陡峭（强势下杀）
• 旗面反弹幅度通常不超过旗杆的38.2%-50%
• 旗面反弹时间通常短于旗杆推动时间
• 反弹中成交量萎缩是健康信号

⚠️ 交易策略：
• 入场：价格跌破旗面下沿后做空
• 止损：旗面最高点上方
• 目标：从跌破点向下量度一个旗杆的长度
• 可靠性：强势趋势中出现的旗形成功率约65-70%`,
  },
  RECTANGLE_BOX_BULLISH: {
    direction: 'bullish',
    confidence: 0.73,
    analysis: `【箱体上破】区间蓄势后的看涨突破

📐 形态结构：
• 箱体上沿：价格多次冲高遇阻，形成清晰压力区
• 箱体下沿：价格多次回落获得支撑，形成横向区间
• 区间震荡：多空反复拉锯，波动围绕箱体上下沿展开
• 当前位于箱体上沿附近，等待突破确认

📊 关键识别要点：
• 至少2次触及上沿和下沿，箱体边界越清晰越有效
• 箱体内部振幅相对稳定，不应频繁假破
• 突破上沿后若能站稳，说明蓄势完成
• 成交量放大可提高突破可信度

⚠️ 交易策略：
• 入场：价格有效突破箱体上沿后做多
• 止损：箱体上沿下方或最近回踩低点下方
• 目标：箱体高度向上等距投射
• 注意：突破后回踩不破上沿是更稳健确认`,
  },
  RECTANGLE_BOX_BEARISH: {
    direction: 'bearish',
    confidence: 0.73,
    analysis: `【箱体下破】区间蓄势后的看跌破位

📐 形态结构：
• 箱体上沿：价格多次反弹受压，形成稳定压力区
• 箱体下沿：价格多次下探获得支撑，形成关键支撑线
• 区间震荡：走势长时间横盘，等待方向选择
• 当前位于箱体下沿附近，警惕破位延续

📊 关键识别要点：
• 箱体边界越多次被验证，跌破后的参考价值越强
• 跌破下沿代表支撑失效，空头占优
• 若跌破后回抽下沿再受压，破位更可靠
• 横盘时间越长，破位后的波动通常越大

⚠️ 交易策略：
• 入场：价格有效跌破箱体下沿后做空
• 止损：箱体下沿上方或最近反弹高点上方
• 目标：箱体高度向下等距投射
• 注意：箱体假跌破较常见，需等待收盘确认`,
  },
  FALLING_WEDGE: {
    direction: 'bullish',
    confidence: 0.77,
    analysis: `【下降楔形】波幅收敛后的看涨反转/突破

📐 形态结构：
• 上轨：反弹高点逐步降低，形成下降压力线
• 下轨：回落低点也逐步降低，但下降速度放缓
• 楔形收敛：两条趋势线逐渐靠拢，空头动能衰减
• 当前位于楔形末端，关注向上突破上轨

📊 关键识别要点：
• 高点和低点同步下移，但波动空间逐步压缩
• 下轨斜率通常小于上轨，代表杀跌力度减弱
• 形态末端常出现量能萎缩
• 向上突破上轨是确认信号

⚠️ 交易策略：
• 入场：价格突破下降楔形上轨后做多
• 止损：突破前最近低点下方
• 目标：楔形最宽处高度向上投射
• 注意：下降楔形虽偏多，但未突破前仍处于下降通道`,
  },
  RISING_WEDGE: {
    direction: 'bearish',
    confidence: 0.77,
    analysis: `【上升楔形】波幅收敛后的看跌反转/破位

📐 形态结构：
• 下轨：回落低点逐步抬高，形成上升支撑线
• 上轨：反弹高点也逐步抬高，但上攻幅度递减
• 楔形收敛：两条趋势线逐渐靠拢，多头动能衰减
• 当前位于楔形末端，警惕向下跌破下轨

📊 关键识别要点：
• 高点和低点同步抬升，但波动空间逐步压缩
• 上轨斜率通常小于下轨，代表追涨力度减弱
• 形态末端若量能背离，破位风险上升
• 跌破下轨是确认信号

⚠️ 交易策略：
• 入场：价格跌破上升楔形下轨后做空
• 止损：跌破前最近高点上方
• 目标：楔形最宽处高度向下投射
• 注意：未跌破前仍可能沿楔形继续缓慢上行`,
  },
  SMC_BULLISH_ACCUMULATION: {
    direction: 'bullish',
    confidence: 0.85,
    analysis: `【SMC看涨积累】机构订单流做多结构

📐 形态结构：
• 初始下跌（-OB）：从供应区快速下跌
• 积累区：底部横盘震荡，机构悄悄吸筹
• 洗盘（Manipulation）：向下假突破诱空散户止损
• V型回升：快速收回积累区
• ChoCh（结构转变）：突破积累区高点确认多头

📊 关键识别要点：
• 积累区震荡时间较长（筹码充分换手）
• 洗盘急跌幅度大但恢复迅速（V型）
• ChoCh突破前高是结构转变的核心确认
• +Breaker：洗盘区间成为新的支撑区域

⚠️ 交易策略：
• 入场：ChoCh确认后回调至+Breaker区域做多
• 止损：Manipulation最低点下方
• 目标：初始下跌起点（-OB供应区）
• 逻辑：机构完成积累后推动价格回到供应区出货`,
  },
  RANDOM: {
    direction: 'neutral',
    confidence: 0.50,
    analysis: `【随机走势】无明显技术形态

📐 当前结构：
• 价格在区间内无规律波动
• 未形成可辨识的经典技术形态
• 多空力量相对均衡，方向不明确

📊 识别要点：
• 无清晰的趋势线或支撑阻力
• 高低点无规律排列
• 成交量无明显特征
• 属于震荡市或无序波动

⚠️ 应对策略：
• 此类走势建议观望等待
• 等待明确形态出现后再入场
• 可以用区间上下沿做短线博弈
• 注意风控，减小仓位`,
  },
};

// 阶段状态常量
const PATTERN_PHASES = {
  IDLE: 'idle',
  PHASE1: 'phase1',       // 阶段1: K线回放
  PHASE2: 'phase2',       // 阶段2: 教学绘图
  PHASE3: 'phase3',       // 阶段3: 补齐走势
  RESULT: 'result',
};

const PATTERN_MIN_PREVIEW_CANDLE_COUNT = 80;
const PATTERN_MIN_REPLAY_CANDLE_COUNT = 35;
const PATTERN_CANDLE_COUNTS = {
  HEAD_SHOULDERS: { previewCount: 150, replayCount: 60 },
  HEAD_SHOULDERS_BOTTOM: { previewCount: 150, replayCount: 60 },
  DOUBLE_TOP: { previewCount: 132, replayCount: 48 },
  DOUBLE_BOTTOM: { previewCount: 132, replayCount: 48 },
  ASCENDING_TRIANGLE: { previewCount: 144, replayCount: 52 },
  DESCENDING_TRIANGLE: { previewCount: 144, replayCount: 52 },
  BULL_FLAG: { previewCount: 120, replayCount: 44 },
  BEAR_FLAG: { previewCount: 120, replayCount: 44 },
  RECTANGLE_BOX_BULLISH: { previewCount: 132, replayCount: 48 },
  RECTANGLE_BOX_BEARISH: { previewCount: 132, replayCount: 48 },
  FALLING_WEDGE: { previewCount: 144, replayCount: 52 },
  RISING_WEDGE: { previewCount: 144, replayCount: 52 },
  SMC_BULLISH_ACCUMULATION: { previewCount: 144, replayCount: 64 },
  RANDOM: { previewCount: 120, replayCount: 40 },
};

const DRAWING_COLORS = {
  white: '#f8fafc',
  blue: '#60a5fa',
  cyan: '#22d3ee',
  yellow: '#d9d86b',
  orange: '#f97316',
  red: '#ef4444',
  green: '#22c55e',
  magenta: '#e879f9',
  support: 'rgba(34,197,94,0.78)',
  resistance: 'rgba(239,68,68,0.78)',
};

const PATTERN_DRAWING_TEMPLATES = {
  // ═══════════════════════════════════════════════════════════════
  // 头肩顶 HEAD_SHOULDERS
  // K线阶段: 0-0.14(左肩) | 0.14-0.26(回落) | 0.26-0.44(头) | 0.44-0.56(回落) | 0.56-0.70(右肩) | 0.70-0.84(回落) | 0.84-1(跌破=replay)
  // preview结束于颈线位置(t≈0.84)，用户需猜测是否跌破
  // ═══════════════════════════════════════════════════════════════
  HEAD_SHOULDERS: [
    // 颈线: 连接两次回落低点
    { kind: 'line', color: DRAWING_COLORS.magenta, width: 2.4, dash: '9 6', text: 'NECKLINE',
      from: { r: 0.20, zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'low' },
      to: { r: 0.50, zoneFrom: 0.44, zoneTo: 0.56, zoneField: 'low' } },
    // 头部极值标记
    { kind: 'circle', point: { r: 0.35, zoneFrom: 0.30, zoneTo: 0.44, zoneField: 'high' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 9, width: 2.5 },
    // 形态轮廓折线
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2.5, points: [
      { r: 0.04, field: 'close' },
      { r: 0.12, zoneFrom: 0.08, zoneTo: 0.16, zoneField: 'high' },
      { r: 0.20, zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'low' },
      { r: 0.35, zoneFrom: 0.30, zoneTo: 0.44, zoneField: 'high' },
      { r: 0.50, zoneFrom: 0.44, zoneTo: 0.56, zoneField: 'low' },
      { r: 0.63, zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'high' },
      { r: 0.77, zoneFrom: 0.70, zoneTo: 0.84, zoneField: 'low' },
    ] },
    // 标注
    { kind: 'pointLabel', text: '左肩', color: DRAWING_COLORS.blue, point: { r: 0.12, zoneFrom: 0.08, zoneTo: 0.16, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: '头部', color: DRAWING_COLORS.orange, point: { r: 0.35, zoneFrom: 0.30, zoneTo: 0.44, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: '右肩', color: DRAWING_COLORS.blue, point: { r: 0.63, zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'high', offset: 0.03 }, dy: -14 },
    // 量度跌幅
    { kind: 'arrow', color: DRAWING_COLORS.red, width: 2,
      from: { r: 0.35, zoneFrom: 0.30, zoneTo: 0.44, zoneField: 'high' },
      to: { r: 0.35, zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'low' }, text: '量度跌幅' },
    // entry (preview 末尾 = 决策点)
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bearish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'high', offset: 0.02 },
      target: { zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'low', offset: -0.45 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'low' }, text: '跌破目标' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'low' }, dx: -30, dy: 20 },
  ],

  HEAD_SHOULDERS_BOTTOM: [
    { kind: 'line', color: DRAWING_COLORS.magenta, width: 2.4, dash: '9 6', text: 'NECKLINE',
      from: { r: 0.20, zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'high' },
      to: { r: 0.50, zoneFrom: 0.44, zoneTo: 0.56, zoneField: 'high' } },
    { kind: 'circle', point: { r: 0.35, zoneFrom: 0.30, zoneTo: 0.44, zoneField: 'low' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 9, width: 2.5 },
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2.5, points: [
      { r: 0.04, field: 'close' },
      { r: 0.12, zoneFrom: 0.08, zoneTo: 0.16, zoneField: 'low' },
      { r: 0.20, zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'high' },
      { r: 0.35, zoneFrom: 0.30, zoneTo: 0.44, zoneField: 'low' },
      { r: 0.50, zoneFrom: 0.44, zoneTo: 0.56, zoneField: 'high' },
      { r: 0.63, zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'low' },
      { r: 0.77, zoneFrom: 0.70, zoneTo: 0.84, zoneField: 'high' },
    ] },
    { kind: 'pointLabel', text: '左肩', color: DRAWING_COLORS.blue, point: { r: 0.12, zoneFrom: 0.08, zoneTo: 0.16, zoneField: 'low', offset: -0.03 }, dy: 18 },
    { kind: 'pointLabel', text: '头部', color: DRAWING_COLORS.orange, point: { r: 0.35, zoneFrom: 0.30, zoneTo: 0.44, zoneField: 'low', offset: -0.03 }, dy: 18 },
    { kind: 'pointLabel', text: '右肩', color: DRAWING_COLORS.blue, point: { r: 0.63, zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'low', offset: -0.03 }, dy: 18 },
    { kind: 'arrow', color: DRAWING_COLORS.green, width: 2,
      from: { r: 0.35, zoneFrom: 0.30, zoneTo: 0.44, zoneField: 'low' },
      to: { r: 0.35, zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'high' }, text: '量度涨幅' },
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bullish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'low', offset: -0.02 },
      target: { zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'high', offset: 0.45 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'high' }, text: '突破目标' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'high' }, dx: -30, dy: -18 },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 双顶 DOUBLE_TOP
  // K线阶段: 0-0.20(顶1) | 0.20-0.35(回落) | 0.35-0.52(顶2) | 0.52-0.68(回落) | 0.68-0.85(颈线盘整) | 0.85-1(跌破=replay)
  // preview结束于颈线盘整(t≈0.85)，用户需猜测是否跌破
  // ═══════════════════════════════════════════════════════════════
  DOUBLE_TOP: [
    // 双顶阻力区
    { kind: 'box', color: 'rgba(239,68,68,0.50)', fill: 'rgba(127,29,29,0.15)',
      from: { r: 0.10 }, to: { r: 0.58 },
      top: { zoneFrom: 0.0, zoneTo: 0.55, zoneField: 'high' },
      bottom: { zoneFrom: 0.14, zoneTo: 0.24, zoneField: 'high' } },
    // 形态折线
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2.5, points: [
      { r: 0.04, field: 'close' },
      { r: 0.16, zoneFrom: 0.12, zoneTo: 0.22, zoneField: 'high' },
      { r: 0.28, zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'low' },
      { r: 0.44, zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'high' },
      { r: 0.60, zoneFrom: 0.52, zoneTo: 0.68, zoneField: 'low' },
      { r: 0.80, field: 'close' },
    ] },
    // 颈线
    { kind: 'hline', text: 'NECKLINE', color: DRAWING_COLORS.magenta, width: 2.4, dash: '9 6',
      point: { zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'low' } },
    // 顶部极值标记
    { kind: 'circle', point: { r: 0.16, zoneFrom: 0.12, zoneTo: 0.22, zoneField: 'high' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 7, width: 2 },
    { kind: 'circle', point: { r: 0.44, zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'high' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 7, width: 2 },
    // 标注
    { kind: 'pointLabel', text: '顶1', color: DRAWING_COLORS.orange, point: { r: 0.16, zoneFrom: 0.12, zoneTo: 0.22, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: '顶2', color: DRAWING_COLORS.orange, point: { r: 0.44, zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: '颈线', color: DRAWING_COLORS.yellow, point: { r: 0.28, zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'low', offset: -0.02 }, dy: 18 },
    // entry
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bearish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'high', offset: 0.02 },
      target: { zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'low', offset: -0.40 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'low' }, text: '跌破颈线' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'low' }, dx: -30, dy: 20 },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 双底 DOUBLE_BOTTOM
  // K线阶段: 0-0.20(底1) | 0.20-0.35(反弹) | 0.35-0.52(底2) | 0.52-0.68(反弹) | 0.68-0.85(颈线盘整) | 0.85-1(突破=replay)
  // preview结束于颈线盘整(t≈0.85)，用户需猜测是否突破
  // ═══════════════════════════════════════════════════════════════
  DOUBLE_BOTTOM: [
    // 双底支撑区
    { kind: 'box', color: 'rgba(34,197,94,0.50)', fill: 'rgba(20,83,45,0.15)',
      from: { r: 0.10 }, to: { r: 0.58 },
      top: { zoneFrom: 0.14, zoneTo: 0.24, zoneField: 'low' },
      bottom: { zoneFrom: 0.0, zoneTo: 0.55, zoneField: 'low' } },
    // 形态折线
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2.5, points: [
      { r: 0.04, field: 'close' },
      { r: 0.16, zoneFrom: 0.12, zoneTo: 0.22, zoneField: 'low' },
      { r: 0.28, zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'high' },
      { r: 0.44, zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'low' },
      { r: 0.60, zoneFrom: 0.52, zoneTo: 0.68, zoneField: 'high' },
      { r: 0.80, field: 'close' },
    ] },
    // 颈线
    { kind: 'hline', text: 'NECKLINE', color: DRAWING_COLORS.magenta, width: 2.4, dash: '9 6',
      point: { zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'high' } },
    // 底部极值标记
    { kind: 'circle', point: { r: 0.16, zoneFrom: 0.12, zoneTo: 0.22, zoneField: 'low' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 7, width: 2 },
    { kind: 'circle', point: { r: 0.44, zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'low' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 7, width: 2 },
    // 标注
    { kind: 'pointLabel', text: '底1', color: DRAWING_COLORS.blue, point: { r: 0.16, zoneFrom: 0.12, zoneTo: 0.22, zoneField: 'low', offset: -0.03 }, dy: 18 },
    { kind: 'pointLabel', text: '底2', color: DRAWING_COLORS.blue, point: { r: 0.44, zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'low', offset: -0.03 }, dy: 18 },
    { kind: 'pointLabel', text: '颈线', color: DRAWING_COLORS.yellow, point: { r: 0.28, zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'high', offset: 0.02 }, dy: -14 },
    // entry
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bullish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'low', offset: -0.02 },
      target: { zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'high', offset: 0.40 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'high' }, text: '突破颈线' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'high' }, dx: -30, dy: -18 },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 上升三角形 ASCENDING_TRIANGLE
  // K线阶段: 0-0.85(三角收敛) | 0.85-1(突破=replay)
  // preview结束于三角收敛末端(t≈0.85)，用户需猜测突破方向
  // ═══════════════════════════════════════════════════════════════
  ASCENDING_TRIANGLE: [
    // 三角区域填充
    { kind: 'polygon', color: 'rgba(232,121,249,0.35)', fill: 'rgba(168,85,247,0.12)', width: 0, points: [
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'high', offset: -0.005 },
      { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high', offset: -0.005 },
      { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low' },
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'low' },
    ] },
    // 水平阻力线
    { kind: 'hline', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.6,
      point: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: -0.005 } },
    // 上升支撑线
    { kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.6,
      from: { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'low' },
      to: { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low' } },
    // 起始高点标记
    { kind: 'circle', point: { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'high' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 8, width: 2.5 },
    // 内部折线
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'low' },
      { r: 0.15, zoneFrom: 0.10, zoneTo: 0.20, zoneField: 'high' },
      { r: 0.22, zoneFrom: 0.17, zoneTo: 0.28, zoneField: 'low' },
      { r: 0.36, zoneFrom: 0.30, zoneTo: 0.42, zoneField: 'high' },
      { r: 0.43, zoneFrom: 0.38, zoneTo: 0.50, zoneField: 'low' },
      { r: 0.57, zoneFrom: 0.50, zoneTo: 0.64, zoneField: 'high' },
      { r: 0.64, zoneFrom: 0.58, zoneTo: 0.72, zoneField: 'low' },
      { r: 0.78, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high' },
    ] },
    { kind: 'pointLabel', text: '高点受压', color: DRAWING_COLORS.orange, point: { r: 0.36, zoneFrom: 0.30, zoneTo: 0.42, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: '低点抬高', color: DRAWING_COLORS.green, point: { r: 0.64, zoneFrom: 0.58, zoneTo: 0.72, zoneField: 'low', offset: -0.02 }, dy: 18 },
    // entry
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bullish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low', offset: -0.02 },
      target: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: 0.35 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'high' }, text: '突破目标' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'high' }, dx: -30, dy: -18 },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 下降三角形 DESCENDING_TRIANGLE
  // K线阶段: 0-0.85(三角收敛) | 0.85-1(跌破=replay)
  // ═══════════════════════════════════════════════════════════════
  DESCENDING_TRIANGLE: [
    // 三角区域填充
    { kind: 'polygon', color: 'rgba(232,121,249,0.35)', fill: 'rgba(168,85,247,0.12)', width: 0, points: [
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'high' },
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'low', offset: 0.005 },
      { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low', offset: 0.005 },
      { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high' },
    ] },
    // 水平支撑线
    { kind: 'hline', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.6,
      point: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: 0.005 } },
    // 下降压力线
    { kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.6,
      from: { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'high' },
      to: { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high' } },
    // 起始高点标记
    { kind: 'circle', point: { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'high' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 8, width: 2.5 },
    // 内部折线
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.15, zoneField: 'high' },
      { r: 0.15, zoneFrom: 0.10, zoneTo: 0.20, zoneField: 'low' },
      { r: 0.22, zoneFrom: 0.17, zoneTo: 0.28, zoneField: 'high' },
      { r: 0.36, zoneFrom: 0.30, zoneTo: 0.42, zoneField: 'low' },
      { r: 0.43, zoneFrom: 0.38, zoneTo: 0.50, zoneField: 'high' },
      { r: 0.57, zoneFrom: 0.50, zoneTo: 0.64, zoneField: 'low' },
      { r: 0.64, zoneFrom: 0.58, zoneTo: 0.72, zoneField: 'high' },
      { r: 0.78, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low' },
    ] },
    { kind: 'pointLabel', text: '高点降低', color: DRAWING_COLORS.orange, point: { r: 0.43, zoneFrom: 0.38, zoneTo: 0.50, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: '低点支撑', color: DRAWING_COLORS.green, point: { r: 0.57, zoneFrom: 0.50, zoneTo: 0.64, zoneField: 'low', offset: -0.02 }, dy: 18 },
    // entry
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bearish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high', offset: 0.02 },
      target: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: -0.35 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'low' }, text: '跌破目标' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'low' }, dx: -30, dy: 20 },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 牛旗 BULL_FLAG
  // K线阶段: 0-0.28(旗杆急涨) | 0.28-0.85(旗面缓跌回调) | 0.85-1(突破=replay)
  // preview结束于旗面底部(t≈0.85)，用户需猜测是否突破
  // ═══════════════════════════════════════════════════════════════
  BULL_FLAG: [
    // 旗杆
    { kind: 'arrow', color: DRAWING_COLORS.green, width: 3,
      from: { r: 0.04, zoneFrom: 0.0, zoneTo: 0.08, zoneField: 'low' },
      to: { r: 0.26, zoneFrom: 0.22, zoneTo: 0.30, zoneField: 'high' }, text: '旗杆' },
    // 旗面通道
    { kind: 'polygon', color: 'rgba(232,121,249,0.30)', fill: 'rgba(168,85,247,0.10)', width: 0, points: [
      { r: 0.30, zoneFrom: 0.28, zoneTo: 0.36, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.78, zoneTo: 0.85, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low' },
      { r: 0.32, zoneFrom: 0.28, zoneTo: 0.38, zoneField: 'low' },
    ] },
    { kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4,
      from: { r: 0.30, zoneFrom: 0.28, zoneTo: 0.36, zoneField: 'high' },
      to: { r: 0.82, zoneFrom: 0.78, zoneTo: 0.85, zoneField: 'high' } },
    { kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4,
      from: { r: 0.32, zoneFrom: 0.28, zoneTo: 0.38, zoneField: 'low' },
      to: { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low' } },
    // 旗面内走势
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.32, zoneFrom: 0.28, zoneTo: 0.38, zoneField: 'high' },
      { r: 0.42, zoneFrom: 0.38, zoneTo: 0.48, zoneField: 'low' },
      { r: 0.52, zoneFrom: 0.48, zoneTo: 0.58, zoneField: 'high' },
      { r: 0.62, zoneFrom: 0.58, zoneTo: 0.68, zoneField: 'low' },
      { r: 0.72, zoneFrom: 0.68, zoneTo: 0.78, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.78, zoneTo: 0.85, zoneField: 'low' },
    ] },
    { kind: 'pointLabel', text: '旗面回调', color: DRAWING_COLORS.blue, point: { r: 0.52, zoneFrom: 0.48, zoneTo: 0.58, zoneField: 'high', offset: 0.03 }, dy: -14 },
    // entry
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bullish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low', offset: -0.02 },
      target: { zoneFrom: 0.22, zoneTo: 0.30, zoneField: 'high', offset: 0.30 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'high' }, text: '旗形突破' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'high' }, dx: -30, dy: -18 },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 熊旗 BEAR_FLAG
  // K线阶段: 0-0.28(旗杆急跌) | 0.28-0.85(旗面缓涨回调) | 0.85-1(跌破=replay)
  // preview结束于旗面顶部(t≈0.85)，用户需猜测是否跌破
  // ═══════════════════════════════════════════════════════════════
  BEAR_FLAG: [
    // 旗杆
    { kind: 'arrow', color: DRAWING_COLORS.red, width: 3,
      from: { r: 0.04, zoneFrom: 0.0, zoneTo: 0.08, zoneField: 'high' },
      to: { r: 0.26, zoneFrom: 0.22, zoneTo: 0.30, zoneField: 'low' }, text: '旗杆' },
    // 旗面通道
    { kind: 'polygon', color: 'rgba(232,121,249,0.30)', fill: 'rgba(168,85,247,0.10)', width: 0, points: [
      { r: 0.30, zoneFrom: 0.28, zoneTo: 0.36, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.78, zoneTo: 0.85, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low' },
      { r: 0.32, zoneFrom: 0.28, zoneTo: 0.38, zoneField: 'low' },
    ] },
    { kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4,
      from: { r: 0.30, zoneFrom: 0.28, zoneTo: 0.36, zoneField: 'high' },
      to: { r: 0.82, zoneFrom: 0.78, zoneTo: 0.85, zoneField: 'high' } },
    { kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4,
      from: { r: 0.32, zoneFrom: 0.28, zoneTo: 0.38, zoneField: 'low' },
      to: { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low' } },
    // 旗面内走势
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.32, zoneFrom: 0.28, zoneTo: 0.38, zoneField: 'low' },
      { r: 0.42, zoneFrom: 0.38, zoneTo: 0.48, zoneField: 'high' },
      { r: 0.52, zoneFrom: 0.48, zoneTo: 0.58, zoneField: 'low' },
      { r: 0.62, zoneFrom: 0.58, zoneTo: 0.68, zoneField: 'high' },
      { r: 0.72, zoneFrom: 0.68, zoneTo: 0.78, zoneField: 'low' },
      { r: 0.82, zoneFrom: 0.78, zoneTo: 0.85, zoneField: 'high' },
    ] },
    { kind: 'pointLabel', text: '旗面反弹', color: DRAWING_COLORS.blue, point: { r: 0.52, zoneFrom: 0.48, zoneTo: 0.58, zoneField: 'low', offset: -0.03 }, dy: 18 },
    // entry
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bearish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.78, zoneTo: 0.85, zoneField: 'high', offset: 0.02 },
      target: { zoneFrom: 0.22, zoneTo: 0.30, zoneField: 'low', offset: -0.30 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'low' }, text: '旗形跌破' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'low' }, dx: -30, dy: 20 },
  ],

  RECTANGLE_BOX_BULLISH: [
    { kind: 'box', color: 'rgba(96,165,250,0.55)', fill: 'rgba(37,99,235,0.13)',
      from: { r: 0.04 }, to: { r: 0.85 },
      top: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: -0.006 },
      bottom: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: 0.006 } },
    { kind: 'hline', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4,
      point: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: -0.006 } },
    { kind: 'hline', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4,
      point: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: 0.006 } },
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.08, zoneFrom: 0.04, zoneTo: 0.14, zoneField: 'low' },
      { r: 0.20, zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'high' },
      { r: 0.32, zoneFrom: 0.26, zoneTo: 0.38, zoneField: 'low' },
      { r: 0.46, zoneFrom: 0.38, zoneTo: 0.54, zoneField: 'high' },
      { r: 0.58, zoneFrom: 0.52, zoneTo: 0.66, zoneField: 'low' },
      { r: 0.72, zoneFrom: 0.66, zoneTo: 0.80, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'close' },
    ] },
    { kind: 'pointLabel', text: '区间蓄势', color: DRAWING_COLORS.blue, point: { r: 0.46, zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bullish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: -0.02 },
      target: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: 0.35 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'high' }, text: '箱体突破' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'high' }, dx: -30, dy: -18 },
  ],

  RECTANGLE_BOX_BEARISH: [
    { kind: 'box', color: 'rgba(96,165,250,0.55)', fill: 'rgba(37,99,235,0.13)',
      from: { r: 0.04 }, to: { r: 0.85 },
      top: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: -0.006 },
      bottom: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: 0.006 } },
    { kind: 'hline', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4,
      point: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: -0.006 } },
    { kind: 'hline', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4,
      point: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: 0.006 } },
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.08, zoneFrom: 0.04, zoneTo: 0.14, zoneField: 'high' },
      { r: 0.20, zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'low' },
      { r: 0.32, zoneFrom: 0.26, zoneTo: 0.38, zoneField: 'high' },
      { r: 0.46, zoneFrom: 0.38, zoneTo: 0.54, zoneField: 'low' },
      { r: 0.58, zoneFrom: 0.52, zoneTo: 0.66, zoneField: 'high' },
      { r: 0.72, zoneFrom: 0.66, zoneTo: 0.80, zoneField: 'low' },
      { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'close' },
    ] },
    { kind: 'pointLabel', text: '区间蓄势', color: DRAWING_COLORS.blue, point: { r: 0.46, zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bearish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: 0.02 },
      target: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: -0.35 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'low' }, text: '箱体跌破' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'low' }, dx: -30, dy: 20 },
  ],

  FALLING_WEDGE: [
    // 楼形区域填充
    { kind: 'polygon', color: 'rgba(232,121,249,0.30)', fill: 'rgba(168,85,247,0.10)', width: 0, points: [
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'high' },
      { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low' },
      { r: 0.10, zoneFrom: 0.0, zoneTo: 0.18, zoneField: 'low' },
    ] },
    { kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.6,
      from: { r: 0.08, zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'high' },
      to: { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high' } },
    { kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.6,
      from: { r: 0.10, zoneFrom: 0.0, zoneTo: 0.18, zoneField: 'low' },
      to: { r: 0.82, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low' } },
    // 起始高点标记
    { kind: 'circle', point: { r: 0.08, zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'high' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 8, width: 2.5 },
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'high' },
      { r: 0.20, zoneFrom: 0.14, zoneTo: 0.28, zoneField: 'low' },
      { r: 0.32, zoneFrom: 0.26, zoneTo: 0.40, zoneField: 'high' },
      { r: 0.45, zoneFrom: 0.38, zoneTo: 0.54, zoneField: 'low' },
      { r: 0.58, zoneFrom: 0.52, zoneTo: 0.66, zoneField: 'high' },
      { r: 0.70, zoneFrom: 0.64, zoneTo: 0.76, zoneField: 'low' },
      { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'high' },
    ] },
    { kind: 'pointLabel', text: '高低点下移', color: DRAWING_COLORS.orange, point: { r: 0.32, zoneFrom: 0.26, zoneTo: 0.40, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: '波幅收敛', color: DRAWING_COLORS.blue, point: { r: 0.70, zoneFrom: 0.64, zoneTo: 0.76, zoneField: 'low', offset: -0.02 }, dy: 18 },
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bullish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low', offset: -0.02 },
      target: { zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'high', offset: 0.28 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'high' }, text: '楔形突破' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'high' }, dx: -30, dy: -18 },
  ],

  RISING_WEDGE: [
    // 楼形区域填充
    { kind: 'polygon', color: 'rgba(232,121,249,0.30)', fill: 'rgba(168,85,247,0.10)', width: 0, points: [
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'high' },
      { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low' },
      { r: 0.10, zoneFrom: 0.0, zoneTo: 0.18, zoneField: 'low' },
    ] },
    { kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.6,
      from: { r: 0.08, zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'high' },
      to: { r: 0.80, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high' } },
    { kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.6,
      from: { r: 0.10, zoneFrom: 0.0, zoneTo: 0.18, zoneField: 'low' },
      to: { r: 0.82, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low' } },
    // 起始低点标记
    { kind: 'circle', point: { r: 0.10, zoneFrom: 0.0, zoneTo: 0.18, zoneField: 'low' }, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 8, width: 2.5 },
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.08, zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'low' },
      { r: 0.20, zoneFrom: 0.14, zoneTo: 0.28, zoneField: 'high' },
      { r: 0.32, zoneFrom: 0.26, zoneTo: 0.40, zoneField: 'low' },
      { r: 0.45, zoneFrom: 0.38, zoneTo: 0.54, zoneField: 'high' },
      { r: 0.58, zoneFrom: 0.52, zoneTo: 0.66, zoneField: 'low' },
      { r: 0.70, zoneFrom: 0.64, zoneTo: 0.76, zoneField: 'high' },
      { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low' },
    ] },
    { kind: 'pointLabel', text: '高低点抬升', color: DRAWING_COLORS.orange, point: { r: 0.45, zoneFrom: 0.38, zoneTo: 0.54, zoneField: 'high', offset: 0.03 }, dy: -14 },
    { kind: 'pointLabel', text: '波幅收敛', color: DRAWING_COLORS.blue, point: { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low', offset: -0.02 }, dy: 18 },
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: 'bearish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high', offset: 0.02 },
      target: { zoneFrom: 0.0, zoneTo: 0.16, zoneField: 'low', offset: -0.28 },
      from: { r: 0.74 }, to: { r: 0.83 } },
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'low' }, text: '楔形跌破' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'low' }, dx: -30, dy: 20 },
  ],

  // ═══════════════════════════════════════════════════════════════
  // SMC 看涨积累 SMC_BULLISH_ACCUMULATION
  // K线阶段: 0-0.08(初跌) | 0.08-0.48(积累) | 0.48-0.58(洗盘) | 0.58-0.68(V回复) | 0.68-0.82(ChoCh) | 0.82-1(突破=replay)
  // preview结束于ChoCh突破确认(t≈0.82)，用户需猜测继续上涨还是假突破
  // ═══════════════════════════════════════════════════════════════
  SMC_BULLISH_ACCUMULATION: [
    // -ob 阻力线 (初始高点)
    { kind: 'hline', text: '-ob', color: DRAWING_COLORS.yellow, width: 1.8, dash: '9 5',
      point: { zoneFrom: 0, zoneTo: 0.08, zoneField: 'high' } },

    // accumulation zone (积累区 0.08-0.48)
    { kind: 'box', color: 'rgba(96,165,250,0.55)', fill: 'rgba(37,99,235,0.18)',
      from: { r: 0.08 }, to: { r: 0.48 },
      top: { zoneFrom: 0.08, zoneTo: 0.48, zoneField: 'high' },
      bottom: { zoneFrom: 0.08, zoneTo: 0.48, zoneField: 'low' } },
    { kind: 'pointLabel', text: 'accumulation', color: DRAWING_COLORS.blue,
      point: { r: 0.24, zoneFrom: 0.08, zoneTo: 0.48, zoneField: 'high', offset: 0.03 }, dy: -14 },

    // 积累区内部zigzag
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.10, zoneFrom: 0.08, zoneTo: 0.15, zoneField: 'close' },
      { r: 0.17, zoneFrom: 0.13, zoneTo: 0.21, zoneField: 'high' },
      { r: 0.24, zoneFrom: 0.19, zoneTo: 0.29, zoneField: 'low' },
      { r: 0.31, zoneFrom: 0.27, zoneTo: 0.35, zoneField: 'high' },
      { r: 0.38, zoneFrom: 0.34, zoneTo: 0.42, zoneField: 'low' },
      { r: 0.45, zoneFrom: 0.41, zoneTo: 0.48, zoneField: 'high' },
    ] },

    // manipulation (洗盘 0.48-0.58)
    { kind: 'arrow', color: DRAWING_COLORS.yellow, width: 2.5,
      from: { r: 0.48, zoneFrom: 0.08, zoneTo: 0.48, zoneField: 'low' },
      to: { r: 0.55, zoneFrom: 0.48, zoneTo: 0.60, zoneField: 'low' }, text: 'manipulation' },
    { kind: 'pointLabel', text: 'manipulation', color: DRAWING_COLORS.yellow,
      point: { r: 0.55, zoneFrom: 0.48, zoneTo: 0.60, zoneField: 'low', offset: -0.02 }, dy: 18 },

    // ChoCh (0.58-0.68 V回复 + 0.68-0.82 突破)
    { kind: 'polyline', color: DRAWING_COLORS.cyan, width: 2.8, points: [
      { r: 0.55, zoneFrom: 0.48, zoneTo: 0.60, zoneField: 'low' },
      { r: 0.63, zoneFrom: 0.58, zoneTo: 0.68, zoneField: 'close' },
      { r: 0.75, zoneFrom: 0.68, zoneTo: 0.82, zoneField: 'high' },
    ] },
    { kind: 'pointLabel', text: 'ChoCh', color: DRAWING_COLORS.white,
      point: { r: 0.75, zoneFrom: 0.68, zoneTo: 0.82, zoneField: 'high', offset: 0.03 }, dy: -14 },

    // +breaker
    { kind: 'arrow', color: DRAWING_COLORS.white, width: 2.5,
      from: { r: 0.60, zoneFrom: 0.48, zoneTo: 0.60, zoneField: 'low' },
      to: { r: 0.60, zoneFrom: 0.08, zoneTo: 0.48, zoneField: 'high' }, text: '+breaker' },

    // entry (preview 末尾)
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },

    // riskBox
    { kind: 'riskBox', direction: 'bullish',
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: 0.58, zoneTo: 0.68, zoneField: 'low', offset: -0.02 },
      target: { zoneFrom: 0, zoneTo: 0.08, zoneField: 'high', offset: 0.02 },
      from: { r: 0.74 }, to: { r: 0.83 } },

    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: 'high' }, text: '积累突破目标' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'high' }, dx: -36, dy: -18 },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 随机走势 RANDOM
  // ═══════════════════════════════════════════════════════════════
  RANDOM: [
    { kind: 'box', color: 'rgba(96,165,250,0.40)', fill: 'rgba(37,99,235,0.08)', from: { r: 0.10 }, to: { r: 0.90 }, top: { zoneFrom: 0.0, zoneTo: 1.0, zoneField: 'high', offset: -0.03 }, bottom: { zoneFrom: 0.0, zoneTo: 1.0, zoneField: 'low', offset: 0.03 } },
    { kind: 'hline', text: '区间上沿', color: DRAWING_COLORS.resistance, width: 2.1, point: { zoneFrom: 0.0, zoneTo: 1.0, zoneField: 'high', offset: -0.03 } },
    { kind: 'hline', text: '区间下沿', color: DRAWING_COLORS.support, width: 2.1, point: { zoneFrom: 0.0, zoneTo: 1.0, zoneField: 'low', offset: 0.03 } },
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2, points: [
      { r: 0.10, field: 'close' },
      { r: 0.30, field: 'high' },
      { r: 0.50, field: 'low' },
      { r: 0.70, field: 'high' },
      { r: 0.90, field: 'low' },
      { r: 1, field: 'close' },
    ] },
    { kind: 'pointLabel', text: '无明显形态', color: DRAWING_COLORS.blue, point: { r: 0.30, zoneFrom: 0.0, zoneTo: 1.0, zoneField: 'high', offset: 0.04 }, dy: -14 },
    { kind: 'pointLabel', text: '方向不明', color: DRAWING_COLORS.orange, point: { r: 1, field: 'close' }, dx: 28, dy: -14, showDot: true },
    { kind: 'circle', point: { r: 1, field: 'close' }, color: DRAWING_COLORS.white },
    // 阶段3
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 1, field: 'close' }, to: { section: 'future', r: 0.85, field: 'close' }, text: '最终走势' },
    { kind: 'pointLabel', text: 'result', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: 'close' }, dx: -30, dy: -16 },
  ],
};

const insertPatternDrawingEnhancements = (patternKey, enhancements) => {
  const template = PATTERN_DRAWING_TEMPLATES[patternKey];
  if (!Array.isArray(template) || !Array.isArray(enhancements) || !enhancements.length) return;
  template.splice(Math.max(0, template.length - 2), 0, ...enhancements);
};

Object.entries({
  HEAD_SHOULDERS: [
    { kind: 'box', color: 'rgba(234,179,8,0.36)', fill: 'rgba(234,179,8,0.08)', from: { r: 0.70 }, to: { r: 0.85 }, top: { zoneFrom: 0.44, zoneTo: 0.56, zoneField: 'low', offset: 0.035 }, bottom: { zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'low', offset: -0.015 } },
    { kind: 'line', text: '肩部压力', color: 'rgba(248,250,252,0.68)', width: 1.6, dash: '5 4', from: { r: 0.12, zoneFrom: 0.08, zoneTo: 0.16, zoneField: 'high' }, to: { r: 0.63, zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'high' } },
    { kind: 'pointLabel', text: '右肩失败', color: DRAWING_COLORS.red, point: { r: 0.63, zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'high', offset: 0.055 }, dy: -14, fontSize: 12 },
    { kind: 'pointLabel', text: '破颈确认区', color: DRAWING_COLORS.yellow, point: { r: 0.80, zoneFrom: 0.70, zoneTo: 0.84, zoneField: 'low', offset: -0.03 }, dy: 20, fontSize: 12 },
  ],
  HEAD_SHOULDERS_BOTTOM: [
    { kind: 'box', color: 'rgba(234,179,8,0.36)', fill: 'rgba(234,179,8,0.08)', from: { r: 0.70 }, to: { r: 0.85 }, top: { zoneFrom: 0.14, zoneTo: 0.26, zoneField: 'high', offset: 0.015 }, bottom: { zoneFrom: 0.44, zoneTo: 0.56, zoneField: 'high', offset: -0.035 } },
    { kind: 'line', text: '肩部支撑', color: 'rgba(248,250,252,0.68)', width: 1.6, dash: '5 4', from: { r: 0.12, zoneFrom: 0.08, zoneTo: 0.16, zoneField: 'low' }, to: { r: 0.63, zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'low' } },
    { kind: 'pointLabel', text: '右肩承接', color: DRAWING_COLORS.green, point: { r: 0.63, zoneFrom: 0.58, zoneTo: 0.70, zoneField: 'low', offset: -0.055 }, dy: 18, fontSize: 12 },
    { kind: 'pointLabel', text: '破颈确认区', color: DRAWING_COLORS.yellow, point: { r: 0.80, zoneFrom: 0.70, zoneTo: 0.84, zoneField: 'high', offset: 0.03 }, dy: -14, fontSize: 12 },
  ],
  DOUBLE_TOP: [
    { kind: 'hline', text: '双顶供给区', color: DRAWING_COLORS.red, width: 1.9, dash: '6 4', point: { zoneFrom: 0.10, zoneTo: 0.52, zoneField: 'high', offset: 0.006 } },
    { kind: 'box', color: 'rgba(234,179,8,0.34)', fill: 'rgba(234,179,8,0.07)', from: { r: 0.68 }, to: { r: 0.85 }, top: { zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'low', offset: 0.03 }, bottom: { zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'low', offset: -0.012 } },
    { kind: 'arrow', color: DRAWING_COLORS.red, width: 1.9, from: { r: 0.44, zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'high' }, to: { r: 0.60, zoneFrom: 0.52, zoneTo: 0.68, zoneField: 'low' }, text: '二次测试失败' },
    { kind: 'pointLabel', text: '跌破确认区', color: DRAWING_COLORS.yellow, point: { r: 0.80, field: 'close' }, dy: 20, fontSize: 12 },
  ],
  DOUBLE_BOTTOM: [
    { kind: 'hline', text: '双底需求区', color: DRAWING_COLORS.green, width: 1.9, dash: '6 4', point: { zoneFrom: 0.10, zoneTo: 0.52, zoneField: 'low', offset: -0.006 } },
    { kind: 'box', color: 'rgba(234,179,8,0.34)', fill: 'rgba(234,179,8,0.07)', from: { r: 0.68 }, to: { r: 0.85 }, top: { zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'high', offset: 0.012 }, bottom: { zoneFrom: 0.20, zoneTo: 0.35, zoneField: 'high', offset: -0.03 } },
    { kind: 'arrow', color: DRAWING_COLORS.green, width: 1.9, from: { r: 0.44, zoneFrom: 0.37, zoneTo: 0.52, zoneField: 'low' }, to: { r: 0.60, zoneFrom: 0.52, zoneTo: 0.68, zoneField: 'high' }, text: '二次测试承接' },
    { kind: 'pointLabel', text: '突破确认区', color: DRAWING_COLORS.yellow, point: { r: 0.80, field: 'close' }, dy: -14, fontSize: 12 },
  ],
  ASCENDING_TRIANGLE: [
    { kind: 'box', color: 'rgba(148,163,184,0.28)', fill: 'rgba(148,163,184,0.06)', from: { r: 0.66 }, to: { r: 0.85 }, top: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: -0.004 }, bottom: { zoneFrom: 0.58, zoneTo: 0.85, zoneField: 'low', offset: 0.004 } },
    { kind: 'pointLabel', text: '压缩末端', color: DRAWING_COLORS.blue, point: { r: 0.78, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high', offset: 0.03 }, dy: -14, fontSize: 12 },
    { kind: 'pointLabel', text: '突破触发线', color: DRAWING_COLORS.yellow, point: { r: 0.78, zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: -0.015 }, dy: -14, fontSize: 12 },
  ],
  DESCENDING_TRIANGLE: [
    { kind: 'box', color: 'rgba(148,163,184,0.28)', fill: 'rgba(148,163,184,0.06)', from: { r: 0.66 }, to: { r: 0.85 }, top: { zoneFrom: 0.58, zoneTo: 0.85, zoneField: 'high', offset: -0.004 }, bottom: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: 0.004 } },
    { kind: 'pointLabel', text: '压缩末端', color: DRAWING_COLORS.blue, point: { r: 0.78, zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low', offset: -0.03 }, dy: 18, fontSize: 12 },
    { kind: 'pointLabel', text: '跌破触发线', color: DRAWING_COLORS.yellow, point: { r: 0.78, zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: 0.015 }, dy: 18, fontSize: 12 },
  ],
  BULL_FLAG: [
    { kind: 'box', color: 'rgba(96,165,250,0.34)', fill: 'rgba(37,99,235,0.08)', from: { r: 0.30 }, to: { r: 0.85 }, top: { zoneFrom: 0.28, zoneTo: 0.85, zoneField: 'high', offset: 0.006 }, bottom: { zoneFrom: 0.28, zoneTo: 0.85, zoneField: 'low', offset: -0.006 } },
    { kind: 'hline', text: '回调失效位', color: DRAWING_COLORS.red, width: 1.6, dash: '5 5', point: { zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low', offset: -0.02 } },
    { kind: 'pointLabel', text: '健康回撤', color: DRAWING_COLORS.green, point: { r: 0.62, zoneFrom: 0.58, zoneTo: 0.68, zoneField: 'low', offset: -0.03 }, dy: 18, fontSize: 12 },
    { kind: 'pointLabel', text: '量度目标=旗杆', color: DRAWING_COLORS.yellow, point: { r: 0.26, zoneFrom: 0.22, zoneTo: 0.30, zoneField: 'high', offset: 0.045 }, dy: -14, fontSize: 12 },
  ],
  BEAR_FLAG: [
    { kind: 'box', color: 'rgba(96,165,250,0.34)', fill: 'rgba(37,99,235,0.08)', from: { r: 0.30 }, to: { r: 0.85 }, top: { zoneFrom: 0.28, zoneTo: 0.85, zoneField: 'high', offset: 0.006 }, bottom: { zoneFrom: 0.28, zoneTo: 0.85, zoneField: 'low', offset: -0.006 } },
    { kind: 'hline', text: '反弹失效位', color: DRAWING_COLORS.red, width: 1.6, dash: '5 5', point: { zoneFrom: 0.78, zoneTo: 0.85, zoneField: 'high', offset: 0.02 } },
    { kind: 'pointLabel', text: '弱反弹', color: DRAWING_COLORS.red, point: { r: 0.62, zoneFrom: 0.58, zoneTo: 0.68, zoneField: 'high', offset: 0.03 }, dy: -14, fontSize: 12 },
    { kind: 'pointLabel', text: '量度目标=旗杆', color: DRAWING_COLORS.yellow, point: { r: 0.26, zoneFrom: 0.22, zoneTo: 0.30, zoneField: 'low', offset: -0.045 }, dy: 18, fontSize: 12 },
  ],
  RECTANGLE_BOX_BULLISH: [
    { kind: 'hline', text: '箱体中轴', color: 'rgba(148,163,184,0.68)', width: 1.4, dash: '4 4', point: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'close' } },
    { kind: 'pointLabel', text: '上沿供给被吸收', color: DRAWING_COLORS.yellow, point: { r: 0.72, zoneFrom: 0.66, zoneTo: 0.80, zoneField: 'high', offset: 0.035 }, dy: -14, fontSize: 12 },
    { kind: 'box', color: 'rgba(34,197,94,0.34)', fill: 'rgba(20,83,45,0.08)', from: { r: 0.74 }, to: { r: 0.85 }, top: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: 0.018 }, bottom: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'high', offset: -0.012 } },
  ],
  RECTANGLE_BOX_BEARISH: [
    { kind: 'hline', text: '箱体中轴', color: 'rgba(148,163,184,0.68)', width: 1.4, dash: '4 4', point: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'close' } },
    { kind: 'pointLabel', text: '下沿需求失守', color: DRAWING_COLORS.yellow, point: { r: 0.72, zoneFrom: 0.66, zoneTo: 0.80, zoneField: 'low', offset: -0.035 }, dy: 18, fontSize: 12 },
    { kind: 'box', color: 'rgba(239,68,68,0.34)', fill: 'rgba(127,29,29,0.08)', from: { r: 0.74 }, to: { r: 0.85 }, top: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: 0.012 }, bottom: { zoneFrom: 0.0, zoneTo: 0.85, zoneField: 'low', offset: -0.018 } },
  ],
  FALLING_WEDGE: [
    { kind: 'pointLabel', text: '空头动能衰竭', color: DRAWING_COLORS.orange, point: { r: 0.70, zoneFrom: 0.64, zoneTo: 0.76, zoneField: 'low', offset: -0.05 }, dy: 18, fontSize: 12 },
    { kind: 'hline', text: '末端失效位', color: DRAWING_COLORS.red, width: 1.6, dash: '5 5', point: { zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'low', offset: -0.02 } },
    { kind: 'pointLabel', text: '上破确认', color: DRAWING_COLORS.yellow, point: { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'high', offset: 0.035 }, dy: -14, fontSize: 12 },
  ],
  RISING_WEDGE: [
    { kind: 'pointLabel', text: '多头动能衰竭', color: DRAWING_COLORS.orange, point: { r: 0.70, zoneFrom: 0.64, zoneTo: 0.76, zoneField: 'high', offset: 0.05 }, dy: -14, fontSize: 12 },
    { kind: 'hline', text: '末端失效位', color: DRAWING_COLORS.red, width: 1.6, dash: '5 5', point: { zoneFrom: 0.72, zoneTo: 0.85, zoneField: 'high', offset: 0.02 } },
    { kind: 'pointLabel', text: '下破确认', color: DRAWING_COLORS.yellow, point: { r: 0.82, zoneFrom: 0.76, zoneTo: 0.85, zoneField: 'low', offset: -0.035 }, dy: 18, fontSize: 12 },
  ],
  SMC_BULLISH_ACCUMULATION: [
    { kind: 'hline', text: 'BSL 买方流动性', color: DRAWING_COLORS.red, width: 1.5, dash: '5 5', point: { zoneFrom: 0.08, zoneTo: 0.48, zoneField: 'high', offset: 0.008 } },
    { kind: 'hline', text: 'SSL 卖方流动性', color: DRAWING_COLORS.green, width: 1.5, dash: '5 5', point: { zoneFrom: 0.08, zoneTo: 0.48, zoneField: 'low', offset: -0.008 } },
    { kind: 'box', color: 'rgba(34,197,94,0.38)', fill: 'rgba(20,83,45,0.10)', from: { r: 0.60 }, to: { r: 0.82 }, top: { zoneFrom: 0.58, zoneTo: 0.82, zoneField: 'high', offset: 0.006 }, bottom: { zoneFrom: 0.58, zoneTo: 0.82, zoneField: 'low', offset: -0.006 } },
    { kind: 'pointLabel', text: 'displacement', color: DRAWING_COLORS.cyan, point: { r: 0.68, zoneFrom: 0.58, zoneTo: 0.82, zoneField: 'high', offset: 0.045 }, dy: -14, fontSize: 12 },
  ],
  RANDOM: [
    { kind: 'hline', text: '中性均衡线', color: 'rgba(148,163,184,0.68)', width: 1.4, dash: '4 4', point: { zoneFrom: 0.0, zoneTo: 1.0, zoneField: 'close' } },
    { kind: 'pointLabel', text: '等待有效突破', color: DRAWING_COLORS.yellow, point: { r: 0.70, field: 'close' }, dy: -14, fontSize: 12 },
  ],
}).forEach(([patternKey, enhancements]) => insertPatternDrawingEnhancements(patternKey, enhancements));

const ADDITIONAL_PATTERN_ENTRIES = [
  { key: 'SYMMETRICAL_TRIANGLE_BULLISH', name: '对称三角形上破', nameEn: 'Symmetrical Triangle Breakout', type: 'continuation', direction: 'bullish', confidence: 0.74, description: '高点降低、低点抬高形成收敛结构，最终向上突破。', focus: '收敛上破', path: [[0, -0.020], [0.12, 0.040], [0.24, -0.026], [0.38, 0.030], [0.52, -0.014], [0.68, 0.014], [0.84, 0.002], [1, 0.052]] },
  { key: 'SYMMETRICAL_TRIANGLE_BEARISH', name: '对称三角形下破', nameEn: 'Symmetrical Triangle Breakdown', type: 'continuation', direction: 'bearish', confidence: 0.74, description: '高点降低、低点抬高形成收敛结构，最终向下跌破。', focus: '收敛下破', path: [[0, 0.020], [0.12, -0.040], [0.24, 0.026], [0.38, -0.030], [0.52, 0.014], [0.68, -0.014], [0.84, -0.002], [1, -0.052]] },
  { key: 'BULL_PENNANT', name: '看涨三角旗形', nameEn: 'Bullish Pennant', type: 'continuation', direction: 'bullish', confidence: 0.78, description: '急涨旗杆后出现小型收敛三角整理，随后延续向上。', focus: '旗杆后收敛', path: [[0, -0.050], [0.24, 0.045], [0.34, 0.018], [0.46, 0.036], [0.58, 0.024], [0.72, 0.032], [0.84, 0.028], [1, 0.074]] },
  { key: 'BEAR_PENNANT', name: '看跌三角旗形', nameEn: 'Bearish Pennant', type: 'continuation', direction: 'bearish', confidence: 0.78, description: '急跌旗杆后出现小型收敛三角整理，随后延续向下。', focus: '旗杆后收敛', path: [[0, 0.050], [0.24, -0.045], [0.34, -0.018], [0.46, -0.036], [0.58, -0.024], [0.72, -0.032], [0.84, -0.028], [1, -0.074]] },
  { key: 'TRIPLE_TOP', name: '三重顶', nameEn: 'Triple Top', type: 'reversal', direction: 'bearish', confidence: 0.79, description: '价格三次冲击同一阻力失败，跌破颈线后形成顶部反转。', focus: '三次冲高失败', path: [[0, -0.020], [0.14, 0.050], [0.27, -0.022], [0.40, 0.048], [0.54, -0.018], [0.68, 0.047], [0.84, -0.020], [1, -0.070]] },
  { key: 'TRIPLE_BOTTOM', name: '三重底', nameEn: 'Triple Bottom', type: 'reversal', direction: 'bullish', confidence: 0.79, description: '价格三次下探同一支撑获得承接，突破颈线后形成底部反转。', focus: '三次探底企稳', path: [[0, 0.020], [0.14, -0.050], [0.27, 0.022], [0.40, -0.048], [0.54, 0.018], [0.68, -0.047], [0.84, 0.020], [1, 0.070]] },
  { key: 'ROUNDING_TOP', name: '圆弧顶', nameEn: 'Rounding Top', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '价格缓慢圆弧式见顶，动能逐步衰竭后向下转弱。', focus: '圆弧派发', path: [[0, -0.040], [0.12, -0.010], [0.26, 0.022], [0.42, 0.040], [0.58, 0.028], [0.72, -0.004], [0.84, -0.030], [1, -0.070]] },
  { key: 'ROUNDING_BOTTOM', name: '圆弧底', nameEn: 'Rounding Bottom', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '价格缓慢圆弧式筑底，抛压逐步消化后向上转强。', focus: '圆弧吸筹', path: [[0, 0.040], [0.12, 0.010], [0.26, -0.022], [0.42, -0.040], [0.58, -0.028], [0.72, 0.004], [0.84, 0.030], [1, 0.070]] },
  { key: 'CUP_AND_HANDLE', name: '杯柄形态', nameEn: 'Cup and Handle', type: 'continuation', direction: 'bullish', confidence: 0.76, description: '圆弧杯底回到前高附近后小幅回调形成手柄，再向上突破。', focus: '杯口突破', path: [[0, 0.036], [0.14, -0.004], [0.30, -0.040], [0.48, -0.032], [0.64, 0.012], [0.74, 0.036], [0.84, 0.016], [1, 0.066]] },
  { key: 'INVERTED_CUP_AND_HANDLE', name: '倒杯柄形态', nameEn: 'Inverted Cup and Handle', type: 'continuation', direction: 'bearish', confidence: 0.76, description: '倒圆弧回到前低附近后小幅反弹形成手柄，再向下跌破。', focus: '杯口跌破', path: [[0, -0.036], [0.14, 0.004], [0.30, 0.040], [0.48, 0.032], [0.64, -0.012], [0.74, -0.036], [0.84, -0.016], [1, -0.066]] },
  { key: 'RISING_CHANNEL', name: '上升通道', nameEn: 'Rising Channel', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '价格沿平行上升通道运行，回踩下轨后延续上行。', focus: '通道延续', path: [[0, -0.040], [0.14, 0.000], [0.26, -0.020], [0.40, 0.022], [0.54, 0.002], [0.68, 0.044], [0.84, 0.024], [1, 0.070]] },
  { key: 'FALLING_CHANNEL', name: '下降通道', nameEn: 'Falling Channel', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '价格沿平行下降通道运行，反抽上轨后延续下行。', focus: '通道延续', path: [[0, 0.040], [0.14, 0.000], [0.26, 0.020], [0.40, -0.022], [0.54, -0.002], [0.68, -0.044], [0.84, -0.024], [1, -0.070]] },
  { key: 'ASCENDING_CHANNEL_BREAKDOWN', name: '上升通道跌破', nameEn: 'Ascending Channel Breakdown', type: 'reversal', direction: 'bearish', confidence: 0.73, description: '上升通道末端跌破下轨，趋势由强转弱。', focus: '通道跌破', path: [[0, -0.042], [0.14, -0.002], [0.28, -0.022], [0.42, 0.020], [0.56, 0.000], [0.70, 0.040], [0.84, 0.010], [1, -0.060]] },
  { key: 'DESCENDING_CHANNEL_BREAKOUT', name: '下降通道突破', nameEn: 'Descending Channel Breakout', type: 'reversal', direction: 'bullish', confidence: 0.73, description: '下降通道末端突破上轨，趋势由弱转强。', focus: '通道突破', path: [[0, 0.042], [0.14, 0.002], [0.28, 0.022], [0.42, -0.020], [0.56, 0.000], [0.70, -0.040], [0.84, -0.010], [1, 0.060]] },
  { key: 'BROADENING_TOP', name: '扩散顶', nameEn: 'Broadening Top', type: 'reversal', direction: 'bearish', confidence: 0.71, description: '高点抬高、低点降低，波幅放大后向下跌破。', focus: '波幅扩散', path: [[0, -0.012], [0.12, 0.022], [0.25, -0.030], [0.40, 0.045], [0.56, -0.048], [0.72, 0.060], [0.84, -0.036], [1, -0.078]] },
  { key: 'BROADENING_BOTTOM', name: '扩散底', nameEn: 'Broadening Bottom', type: 'reversal', direction: 'bullish', confidence: 0.71, description: '高低点扩散但下方逐步承接增强，最终向上突破。', focus: '扩散反转', path: [[0, 0.012], [0.12, -0.022], [0.25, 0.030], [0.40, -0.045], [0.56, 0.048], [0.72, -0.060], [0.84, 0.036], [1, 0.078]] },
  { key: 'ASCENDING_BROADENING_WEDGE', name: '上升扩散楔形', nameEn: 'Ascending Broadening Wedge', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '价格高低点同步抬升但波幅扩大，上行动能失控后跌破。', focus: '扩散楔形', path: [[0, -0.040], [0.14, -0.004], [0.28, -0.026], [0.42, 0.026], [0.56, -0.008], [0.72, 0.062], [0.84, 0.012], [1, -0.064]] },
  { key: 'DESCENDING_BROADENING_WEDGE', name: '下降扩散楔形', nameEn: 'Descending Broadening Wedge', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '价格高低点同步下移但波幅扩大，恐慌释放后向上突破。', focus: '扩散楔形', path: [[0, 0.040], [0.14, 0.004], [0.28, 0.026], [0.42, -0.026], [0.56, 0.008], [0.72, -0.062], [0.84, -0.012], [1, 0.064]] },
  { key: 'DIAMOND_TOP', name: '钻石顶', nameEn: 'Diamond Top', type: 'reversal', direction: 'bearish', confidence: 0.75, description: '先扩散后收敛形成菱形结构，跌破收敛下沿确认顶部。', focus: '菱形转弱', path: [[0, -0.006], [0.12, 0.026], [0.25, -0.040], [0.40, 0.056], [0.54, -0.030], [0.68, 0.024], [0.84, -0.010], [1, -0.066]] },
  { key: 'DIAMOND_BOTTOM', name: '钻石底', nameEn: 'Diamond Bottom', type: 'reversal', direction: 'bullish', confidence: 0.75, description: '先扩散后收敛形成菱形结构，突破收敛上沿确认底部。', focus: '菱形转强', path: [[0, 0.006], [0.12, -0.026], [0.25, 0.040], [0.40, -0.056], [0.54, 0.030], [0.68, -0.024], [0.84, 0.010], [1, 0.066]] },
  { key: 'V_TOP', name: 'V形顶', nameEn: 'V Top', type: 'reversal', direction: 'bearish', confidence: 0.69, description: '价格急速拉升后迅速反转下杀，形成尖顶。', focus: '急涨急跌', path: [[0, -0.050], [0.16, -0.010], [0.32, 0.070], [0.46, 0.020], [0.62, -0.020], [0.84, -0.042], [1, -0.076]] },
  { key: 'V_BOTTOM', name: 'V形底', nameEn: 'V Bottom', type: 'reversal', direction: 'bullish', confidence: 0.69, description: '价格急速下杀后迅速反转拉升，形成尖底。', focus: '急跌急涨', path: [[0, 0.050], [0.16, 0.010], [0.32, -0.070], [0.46, -0.020], [0.62, 0.020], [0.84, 0.042], [1, 0.076]] },
  { key: 'ISLAND_TOP', name: '岛形顶', nameEn: 'Island Top', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '跳空上行后高位孤岛震荡，随后跳空下跌形成顶部。', focus: '高位孤岛', path: [[0, -0.030], [0.18, 0.010], [0.30, 0.062], [0.46, 0.054], [0.62, 0.060], [0.76, 0.046], [0.84, 0.020], [1, -0.064]] },
  { key: 'ISLAND_BOTTOM', name: '岛形底', nameEn: 'Island Bottom', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '跳空下行后低位孤岛震荡，随后跳空上涨形成底部。', focus: '低位孤岛', path: [[0, 0.030], [0.18, -0.010], [0.30, -0.062], [0.46, -0.054], [0.62, -0.060], [0.76, -0.046], [0.84, -0.020], [1, 0.064]] },
  { key: 'BUMP_AND_RUN_TOP', name: '顶部Bump and Run', nameEn: 'Bump and Run Reversal Top', type: 'reversal', direction: 'bearish', confidence: 0.73, description: '缓慢上升后出现过陡冲顶，跌破原始趋势线后快速回落。', focus: '过陡冲顶', path: [[0, -0.040], [0.18, -0.010], [0.36, 0.012], [0.54, 0.034], [0.68, 0.078], [0.84, 0.030], [1, -0.060]] },
  { key: 'BUMP_AND_RUN_BOTTOM', name: '底部Bump and Run', nameEn: 'Bump and Run Reversal Bottom', type: 'reversal', direction: 'bullish', confidence: 0.73, description: '缓慢下跌后出现过陡杀跌，突破原始趋势线后快速回升。', focus: '过陡杀跌', path: [[0, 0.040], [0.18, 0.010], [0.36, -0.012], [0.54, -0.034], [0.68, -0.078], [0.84, -0.030], [1, 0.060]] },
  { key: 'THREE_DRIVES_TOP', name: '三推浪顶部', nameEn: 'Three Drives Top', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '三段逐步衰竭的上推形成顶部，第三推后转弱。', focus: '三推衰竭', path: [[0, -0.040], [0.14, 0.016], [0.26, -0.012], [0.42, 0.038], [0.54, 0.002], [0.70, 0.056], [0.84, 0.018], [1, -0.058]] },
  { key: 'THREE_DRIVES_BOTTOM', name: '三推浪底部', nameEn: 'Three Drives Bottom', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '三段逐步衰竭的下推形成底部，第三推后转强。', focus: '三推衰竭', path: [[0, 0.040], [0.14, -0.016], [0.26, 0.012], [0.42, -0.038], [0.54, -0.002], [0.70, -0.056], [0.84, -0.018], [1, 0.058]] },
  { key: 'AB_CD_BULLISH', name: '看涨AB=CD', nameEn: 'Bullish AB=CD', type: 'harmonic', direction: 'bullish', confidence: 0.68, description: 'AB与CD两段下跌节奏接近，D点完成后看涨反转。', focus: 'D点反转', path: [[0, 0.046], [0.18, -0.020], [0.38, 0.022], [0.70, -0.050], [0.84, -0.036], [1, 0.052]] },
  { key: 'AB_CD_BEARISH', name: '看跌AB=CD', nameEn: 'Bearish AB=CD', type: 'harmonic', direction: 'bearish', confidence: 0.68, description: 'AB与CD两段上涨节奏接近，D点完成后看跌反转。', focus: 'D点反转', path: [[0, -0.046], [0.18, 0.020], [0.38, -0.022], [0.70, 0.050], [0.84, 0.036], [1, -0.052]] },
  { key: 'GARTLEY_BULLISH', name: '看涨Gartley', nameEn: 'Bullish Gartley', type: 'harmonic', direction: 'bullish', confidence: 0.69, description: 'XABCD回撤结构在D点完成，等待向上反转。', focus: '谐波D点', path: [[0, 0.050], [0.18, -0.030], [0.34, 0.020], [0.52, -0.008], [0.76, -0.013], [0.84, 0.006], [1, 0.054]] },
  { key: 'GARTLEY_BEARISH', name: '看跌Gartley', nameEn: 'Bearish Gartley', type: 'harmonic', direction: 'bearish', confidence: 0.69, description: 'XABCD回撤结构在D点完成，等待向下反转。', focus: '谐波D点', path: [[0, -0.050], [0.18, 0.030], [0.34, -0.020], [0.52, 0.008], [0.76, 0.013], [0.84, -0.006], [1, -0.054]] },
  { key: 'BUTTERFLY_BULLISH', name: '看涨蝴蝶', nameEn: 'Bullish Butterfly', type: 'harmonic', direction: 'bullish', confidence: 0.67, description: 'D点通常超过X点形成深度洗盘，完成后看涨反转。', focus: '深度D点', path: [[0, 0.040], [0.16, -0.024], [0.34, 0.018], [0.52, -0.004], [0.76, -0.041], [0.84, -0.024], [1, 0.050]] },
  { key: 'BUTTERFLY_BEARISH', name: '看跌蝴蝶', nameEn: 'Bearish Butterfly', type: 'harmonic', direction: 'bearish', confidence: 0.67, description: 'D点通常超过X点形成过度拉升，完成后看跌反转。', focus: '深度D点', path: [[0, -0.040], [0.16, 0.024], [0.34, -0.018], [0.52, 0.004], [0.76, 0.041], [0.84, 0.024], [1, -0.050]] },
  { key: 'BAT_BULLISH', name: '看涨蝙蝠', nameEn: 'Bullish Bat', type: 'harmonic', direction: 'bullish', confidence: 0.67, description: 'D点深度回撤但通常不超过X点，完成后看涨反转。', focus: '蝙蝠D点', path: [[0, 0.045], [0.18, -0.030], [0.36, 0.010], [0.54, -0.006], [0.76, -0.021], [0.84, -0.004], [1, 0.048]] },
  { key: 'BAT_BEARISH', name: '看跌蝙蝠', nameEn: 'Bearish Bat', type: 'harmonic', direction: 'bearish', confidence: 0.67, description: 'D点深度反弹但通常不超过X点，完成后看跌反转。', focus: '蝙蝠D点', path: [[0, -0.045], [0.18, 0.030], [0.36, -0.010], [0.54, 0.006], [0.76, 0.021], [0.84, 0.004], [1, -0.048]] },
  // ── 谐波补全 ──
  { key: 'CRAB_BULLISH', name: '看涨螃蟹', nameEn: 'Bullish Crab', type: 'harmonic', direction: 'bullish', confidence: 0.66, description: 'D点大幅超过X点（1.618延伸），极端深度洗盘后看涨反转。', focus: '极端D点', path: [[0, 0.038], [0.16, -0.020], [0.32, 0.016], [0.50, -0.002], [0.76, -0.056], [0.84, -0.036], [1, 0.054]] },
  { key: 'CRAB_BEARISH', name: '看跌螃蟹', nameEn: 'Bearish Crab', type: 'harmonic', direction: 'bearish', confidence: 0.66, description: 'D点大幅超过X点（1.618延伸），极端过度拉升后看跌反转。', focus: '极端D点', path: [[0, -0.038], [0.16, 0.020], [0.32, -0.016], [0.50, 0.002], [0.76, 0.056], [0.84, 0.036], [1, -0.054]] },
  { key: 'SHARK_BULLISH', name: '看涨鲨鱼', nameEn: 'Bullish Shark', type: 'harmonic', direction: 'bullish', confidence: 0.65, description: '0-X-A-B-C结构中C点超过0点形成极端回撤，完成后看涨。', focus: '鲨鱼C点', path: [[0, 0.042], [0.16, -0.018], [0.34, 0.024], [0.52, 0.004], [0.76, -0.026], [0.84, -0.008], [1, 0.050]] },
  { key: 'SHARK_BEARISH', name: '看跌鲨鱼', nameEn: 'Bearish Shark', type: 'harmonic', direction: 'bearish', confidence: 0.65, description: '0-X-A-B-C结构中C点超过0点形成极端反弹，完成后看跌。', focus: '鲨鱼C点', path: [[0, -0.042], [0.16, 0.018], [0.34, -0.024], [0.52, -0.004], [0.76, 0.026], [0.84, 0.008], [1, -0.050]] },
  { key: 'CYPHER_BULLISH', name: '看涨赛弗', nameEn: 'Bullish Cypher', type: 'harmonic', direction: 'bullish', confidence: 0.66, description: 'XABCD结构中B点超过X且D点深度回撤至XC段的0.786位，完成后看涨。', focus: '赛弗D点', path: [[0, 0.044], [0.15, -0.026], [0.30, 0.052], [0.48, -0.030], [0.72, 0.028], [0.84, 0.038], [1, 0.064]] },
  { key: 'CYPHER_BEARISH', name: '看跌赛弗', nameEn: 'Bearish Cypher', type: 'harmonic', direction: 'bearish', confidence: 0.66, description: 'XABCD结构中B点超过X且D点深度反弹至XC段的0.786位，完成后看跌。', focus: '赛弗D点', path: [[0, -0.044], [0.15, 0.026], [0.30, -0.052], [0.48, 0.030], [0.72, -0.028], [0.84, -0.038], [1, -0.064]] },
  { key: 'FIVE_ZERO_BULLISH', name: '看涨5-0形态', nameEn: 'Bullish 5-0', type: 'harmonic', direction: 'bullish', confidence: 0.64, description: '由AB=CD延伸演化而来的五段结构，在最终回撤点完成后看涨。', focus: '5-0回撤', path: [[0, 0.036], [0.14, -0.022], [0.28, 0.018], [0.44, -0.034], [0.62, 0.010], [0.78, -0.042], [0.84, -0.030], [1, 0.048]] },
  { key: 'FIVE_ZERO_BEARISH', name: '看跌5-0形态', nameEn: 'Bearish 5-0', type: 'harmonic', direction: 'bearish', confidence: 0.64, description: '由AB=CD延伸演化而来的五段结构，在最终反弹点完成后看跌。', focus: '5-0回撤', path: [[0, -0.036], [0.14, 0.022], [0.28, -0.018], [0.44, 0.034], [0.62, -0.010], [0.78, 0.042], [0.84, 0.030], [1, -0.048]] },
  // ── 沃尔夫波 ──
  { key: 'WOLFE_WAVE_BULLISH', name: '看涨沃尔夫波', nameEn: 'Bullish Wolfe Wave', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '五波结构中1-3-5点与2-4点分别共线，第5浪完成后向目标线反转上行。', focus: '第5浪完成', path: [[0, 0.030], [0.14, -0.020], [0.28, 0.040], [0.46, -0.038], [0.64, 0.028], [0.78, -0.054], [0.84, -0.040], [1, 0.056]] },
  { key: 'WOLFE_WAVE_BEARISH', name: '看跌沃尔夫波', nameEn: 'Bearish Wolfe Wave', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '五波结构中1-3-5点与2-4点分别共线，第5浪完成后向目标线反转下行。', focus: '第5浪完成', path: [[0, -0.030], [0.14, 0.020], [0.28, -0.040], [0.46, 0.038], [0.64, -0.028], [0.78, 0.054], [0.84, 0.040], [1, -0.056]] },
  // ── 艾略特波浪 ──
  { key: 'ELLIOTT_IMPULSE_BULLISH', name: '艾略特推动浪(涨)', nameEn: 'Elliott Impulse Wave Up', type: 'continuation', direction: 'bullish', confidence: 0.74, description: '经典五浪上涨推动结构(1-2-3-4-5)，第3浪通常最长最强。', focus: '五浪推动', path: [[0, -0.050], [0.14, 0.010], [0.22, -0.010], [0.42, 0.050], [0.52, 0.024], [0.68, 0.058], [0.84, 0.038], [1, 0.080]] },
  { key: 'ELLIOTT_IMPULSE_BEARISH', name: '艾略特推动浪(跌)', nameEn: 'Elliott Impulse Wave Down', type: 'continuation', direction: 'bearish', confidence: 0.74, description: '经典五浪下跌推动结构(1-2-3-4-5)，第3浪通常最长最强。', focus: '五浪推动', path: [[0, 0.050], [0.14, -0.010], [0.22, 0.010], [0.42, -0.050], [0.52, -0.024], [0.68, -0.058], [0.84, -0.038], [1, -0.080]] },
  { key: 'ELLIOTT_CORRECTIVE_BULLISH', name: '艾略特调整浪(涨)', nameEn: 'Elliott Corrective ABC Up', type: 'reversal', direction: 'bullish', confidence: 0.68, description: 'ABC三浪调整完成后价格企稳，准备恢复上行趋势。', focus: 'C浪结束', path: [[0, 0.040], [0.20, -0.010], [0.40, 0.018], [0.64, -0.046], [0.78, -0.054], [0.84, -0.040], [1, 0.046]] },
  { key: 'ELLIOTT_CORRECTIVE_BEARISH', name: '艾略特调整浪(跌)', nameEn: 'Elliott Corrective ABC Down', type: 'reversal', direction: 'bearish', confidence: 0.68, description: 'ABC三浪反弹调整完成后价格回落，准备恢复下行趋势。', focus: 'C浪结束', path: [[0, -0.040], [0.20, 0.010], [0.40, -0.018], [0.64, 0.046], [0.78, 0.054], [0.84, 0.040], [1, -0.046]] },
  // ── SMC 看跌派发 ──
  { key: 'SMC_BEARISH_DISTRIBUTION', name: 'SMC看跌派发', nameEn: 'SMC Bearish Distribution', type: 'reversal', direction: 'bearish', confidence: 0.76, description: '机构派发区后向上诱多（manipulation），随后结构改变（ChoCh）向下跌破，形成高概率做空机会。', focus: 'ChoCh向下', path: [[0, -0.040], [0.08, 0.012], [0.18, 0.020], [0.28, 0.008], [0.38, 0.024], [0.48, 0.016], [0.58, 0.044], [0.68, 0.008], [0.78, -0.020], [0.84, -0.016], [1, -0.068]] },
  // ── 经典图表形态补全 ──
  { key: 'QUASIMODO_BULLISH', name: '看涨QM形态', nameEn: 'Bullish Quasimodo', type: 'reversal', direction: 'bullish', confidence: 0.74, description: '下跌趋势中出现更低低点但随后突破前高，形成结构反转(Over and Under)。', focus: 'QM结构反转', path: [[0, 0.040], [0.14, -0.010], [0.28, 0.024], [0.44, -0.046], [0.58, -0.056], [0.72, 0.010], [0.84, 0.030], [1, 0.068]] },
  { key: 'QUASIMODO_BEARISH', name: '看跌QM形态', nameEn: 'Bearish Quasimodo', type: 'reversal', direction: 'bearish', confidence: 0.74, description: '上涨趋势中出现更高高点但随后跌破前低，形成结构反转(Over and Under)。', focus: 'QM结构反转', path: [[0, -0.040], [0.14, 0.010], [0.28, -0.024], [0.44, 0.046], [0.58, 0.056], [0.72, -0.010], [0.84, -0.030], [1, -0.068]] },
  { key: 'REVERSAL_123_BULLISH', name: '看涨1-2-3反转', nameEn: 'Bullish 1-2-3 Reversal', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '下跌中出现低点(1)→反弹高点(2)→更高低点(3)，突破点2后确认反转。', focus: '突破点2', path: [[0, 0.044], [0.20, -0.040], [0.40, 0.010], [0.60, -0.026], [0.78, -0.016], [0.84, 0.014], [1, 0.062]] },
  { key: 'REVERSAL_123_BEARISH', name: '看跌1-2-3反转', nameEn: 'Bearish 1-2-3 Reversal', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '上涨中出现高点(1)→回落低点(2)→更低高点(3)，跌破点2后确认反转。', focus: '跌破点2', path: [[0, -0.044], [0.20, 0.040], [0.40, -0.010], [0.60, 0.026], [0.78, 0.016], [0.84, -0.014], [1, -0.062]] },
  { key: 'MEASURED_MOVE_UP', name: '量度上涨', nameEn: 'Measured Move Up', type: 'continuation', direction: 'bullish', confidence: 0.71, description: '第一段上涨→回调→第二段上涨幅度与第一段近似。', focus: '等幅上涨', path: [[0, -0.044], [0.26, 0.020], [0.44, -0.008], [0.62, 0.010], [0.84, 0.046], [1, 0.078]] },
  { key: 'MEASURED_MOVE_DOWN', name: '量度下跌', nameEn: 'Measured Move Down', type: 'continuation', direction: 'bearish', confidence: 0.71, description: '第一段下跌→反弹→第二段下跌幅度与第一段近似。', focus: '等幅下跌', path: [[0, 0.044], [0.26, -0.020], [0.44, 0.008], [0.62, -0.010], [0.84, -0.046], [1, -0.078]] },
  { key: 'SPIKE_AND_CHANNEL_BULLISH', name: '尖峰通道(涨)', nameEn: 'Spike and Channel Up', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '初始急涨(spike)后进入缓慢上升通道，回踩通道下轨延续。', focus: '通道回踩', path: [[0, -0.048], [0.18, 0.020], [0.30, 0.010], [0.44, 0.032], [0.56, 0.018], [0.70, 0.042], [0.84, 0.030], [1, 0.068]] },
  { key: 'SPIKE_AND_CHANNEL_BEARISH', name: '尖峰通道(跌)', nameEn: 'Spike and Channel Down', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '初始急跌(spike)后进入缓慢下降通道，反抽通道上轨延续。', focus: '通道反抽', path: [[0, 0.048], [0.18, -0.020], [0.30, -0.010], [0.44, -0.032], [0.56, -0.018], [0.70, -0.042], [0.84, -0.030], [1, -0.068]] },
  { key: 'GAP_AND_GO_BULLISH', name: '跳空启动(涨)', nameEn: 'Gap and Go Bullish', type: 'continuation', direction: 'bullish', confidence: 0.72, description: '向上跳空缺口不回补，沿缺口方向持续上行。', focus: '缺口不补', path: [[0, -0.026], [0.14, -0.010], [0.28, 0.040], [0.40, 0.030], [0.54, 0.038], [0.68, 0.028], [0.84, 0.044], [1, 0.074]] },
  { key: 'GAP_AND_GO_BEARISH', name: '跳空启动(跌)', nameEn: 'Gap and Go Bearish', type: 'continuation', direction: 'bearish', confidence: 0.72, description: '向下跳空缺口不回补，沿缺口方向持续下行。', focus: '缺口不补', path: [[0, 0.026], [0.14, 0.010], [0.28, -0.040], [0.40, -0.030], [0.54, -0.038], [0.68, -0.028], [0.84, -0.044], [1, -0.074]] },
  { key: 'ENDING_DIAGONAL_TOP', name: '终结楔形顶', nameEn: 'Ending Diagonal Top', type: 'reversal', direction: 'bearish', confidence: 0.73, description: '上涨末端出现收敛楔形(5浪结构)，高低点同升但重叠严重，完成后快速反转。', focus: '终结楔形', path: [[0, -0.036], [0.12, 0.000], [0.24, -0.018], [0.38, 0.022], [0.50, -0.004], [0.64, 0.040], [0.76, 0.016], [0.84, 0.050], [1, -0.052]] },
  { key: 'ENDING_DIAGONAL_BOTTOM', name: '终结楔形底', nameEn: 'Ending Diagonal Bottom', type: 'reversal', direction: 'bullish', confidence: 0.73, description: '下跌末端出现收敛楔形(5浪结构)，高低点同降但重叠严重，完成后快速反转。', focus: '终结楔形', path: [[0, 0.036], [0.12, 0.000], [0.24, 0.018], [0.38, -0.022], [0.50, 0.004], [0.64, -0.040], [0.76, -0.016], [0.84, -0.050], [1, 0.052]] },
  { key: 'SCALLOP_ASCENDING', name: '上升贝壳形', nameEn: 'Ascending Scallop', type: 'continuation', direction: 'bullish', confidence: 0.68, description: '价格呈弧形回调后突破前高，类似浅杯形延续上涨。', focus: '弧形回调', path: [[0, -0.020], [0.14, 0.024], [0.30, -0.004], [0.48, -0.016], [0.64, 0.008], [0.78, 0.030], [0.84, 0.020], [1, 0.062]] },
  { key: 'SCALLOP_DESCENDING', name: '下降贝壳形', nameEn: 'Descending Scallop', type: 'continuation', direction: 'bearish', confidence: 0.68, description: '价格呈弧形反弹后跌破前低，类似浅杯形延续下跌。', focus: '弧形反弹', path: [[0, 0.020], [0.14, -0.024], [0.30, 0.004], [0.48, 0.016], [0.64, -0.008], [0.78, -0.030], [0.84, -0.020], [1, -0.062]] },
  { key: 'PIPE_TOP', name: '管状顶', nameEn: 'Pipe Top', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '连续两根长上影线出现在相似高度，预示顶部压力极大。', focus: '连续长上影', path: [[0, -0.036], [0.16, -0.006], [0.34, 0.030], [0.50, 0.050], [0.64, 0.046], [0.76, 0.020], [0.84, -0.006], [1, -0.060]] },
  { key: 'PIPE_BOTTOM', name: '管状底', nameEn: 'Pipe Bottom', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '连续两根长下影线出现在相似低度，预示底部承接极强。', focus: '连续长下影', path: [[0, 0.036], [0.16, 0.006], [0.34, -0.030], [0.50, -0.050], [0.64, -0.046], [0.76, -0.020], [0.84, 0.006], [1, 0.060]] },
  { key: 'FLAT_TOP_BREAKOUT', name: '平顶突破', nameEn: 'Flat Top Breakout', type: 'continuation', direction: 'bullish', confidence: 0.74, description: '多次试探同一水平阻力位后放量突破，延续上涨。', focus: '多次试探后突破', path: [[0, -0.030], [0.14, 0.024], [0.26, -0.004], [0.40, 0.026], [0.52, 0.002], [0.66, 0.028], [0.78, 0.010], [0.84, 0.026], [1, 0.070]] },
  { key: 'FLAT_BOTTOM_BREAKDOWN', name: '平底跌破', nameEn: 'Flat Bottom Breakdown', type: 'continuation', direction: 'bearish', confidence: 0.74, description: '多次试探同一水平支撑位后放量跌破，延续下跌。', focus: '多次试探后跌破', path: [[0, 0.030], [0.14, -0.024], [0.26, 0.004], [0.40, -0.026], [0.52, -0.002], [0.66, -0.028], [0.78, -0.010], [0.84, -0.026], [1, -0.070]] },
  { key: 'HIGH_TIGHT_FLAG', name: '高位紧密旗形', nameEn: 'High Tight Flag', type: 'continuation', direction: 'bullish', confidence: 0.80, description: '极强势急涨后仅有极浅幅度(10-25%)的横盘整理，随后继续拉升。', focus: '极浅回调', path: [[0, -0.060], [0.28, 0.040], [0.42, 0.032], [0.56, 0.036], [0.70, 0.028], [0.84, 0.034], [1, 0.082]] },
  { key: 'TIGHT_BEAR_FLAG', name: '低位紧密旗形', nameEn: 'Tight Bear Flag', type: 'continuation', direction: 'bearish', confidence: 0.80, description: '极弱势急跌后仅有极浅幅度的横盘整理，随后继续下杀。', focus: '极浅反弹', path: [[0, 0.060], [0.28, -0.040], [0.42, -0.032], [0.56, -0.036], [0.70, -0.028], [0.84, -0.034], [1, -0.082]] },
  // ── K线组合走势 ──
  { key: 'ENGULFING_BULLISH_SETUP', name: '看涨吞没走势', nameEn: 'Bullish Engulfing Setup', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '下跌末期出现大阳线完全吞没前一根阴线，信号确认后延续反弹。', focus: '吞没反转', path: [[0, 0.044], [0.18, 0.016], [0.36, -0.020], [0.52, -0.046], [0.66, -0.054], [0.76, -0.030], [0.84, -0.010], [1, 0.054]] },
  { key: 'ENGULFING_BEARISH_SETUP', name: '看跌吞没走势', nameEn: 'Bearish Engulfing Setup', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '上涨末期出现大阴线完全吞没前一根阳线，信号确认后延续下跌。', focus: '吞没反转', path: [[0, -0.044], [0.18, -0.016], [0.36, 0.020], [0.52, 0.046], [0.66, 0.054], [0.76, 0.030], [0.84, 0.010], [1, -0.054]] },
  { key: 'MORNING_STAR_SETUP', name: '启明星走势', nameEn: 'Morning Star Setup', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '下跌末期出现阴线+十字星+大阳线组合，确认底部后反弹上行。', focus: '三K反转', path: [[0, 0.040], [0.20, 0.010], [0.40, -0.030], [0.56, -0.052], [0.68, -0.058], [0.78, -0.034], [0.84, -0.014], [1, 0.056]] },
  { key: 'EVENING_STAR_SETUP', name: '黄昏星走势', nameEn: 'Evening Star Setup', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '上涨末期出现阳线+十字星+大阴线组合，确认顶部后回落下行。', focus: '三K反转', path: [[0, -0.040], [0.20, -0.010], [0.40, 0.030], [0.56, 0.052], [0.68, 0.058], [0.78, 0.034], [0.84, 0.014], [1, -0.056]] },
  { key: 'THREE_SOLDIERS_SETUP', name: '三白兵走势', nameEn: 'Three White Soldiers Setup', type: 'reversal', direction: 'bullish', confidence: 0.73, description: '下跌后连续出现三根实体递增的阳线，强烈看涨信号后延续上行。', focus: '三连阳', path: [[0, 0.042], [0.18, 0.014], [0.36, -0.018], [0.52, -0.040], [0.64, -0.046], [0.74, -0.020], [0.84, 0.010], [1, 0.062]] },
  { key: 'THREE_CROWS_SETUP', name: '三乌鸦走势', nameEn: 'Three Black Crows Setup', type: 'reversal', direction: 'bearish', confidence: 0.73, description: '上涨后连续出现三根实体递增的阴线，强烈看跌信号后延续下行。', focus: '三连阴', path: [[0, -0.042], [0.18, -0.014], [0.36, 0.018], [0.52, 0.040], [0.64, 0.046], [0.74, 0.020], [0.84, -0.010], [1, -0.062]] },
  { key: 'TWEEZER_TOP_SETUP', name: '镊子顶走势', nameEn: 'Tweezer Top Setup', type: 'reversal', direction: 'bearish', confidence: 0.67, description: '连续两根K线在相同高度见顶，预示多头动能耗竭后下跌。', focus: '双K同高', path: [[0, -0.038], [0.18, -0.010], [0.36, 0.022], [0.52, 0.042], [0.66, 0.044], [0.78, 0.020], [0.84, 0.000], [1, -0.056]] },
  { key: 'TWEEZER_BOTTOM_SETUP', name: '镊子底走势', nameEn: 'Tweezer Bottom Setup', type: 'reversal', direction: 'bullish', confidence: 0.67, description: '连续两根K线在相同低度见底，预示空头动能耗竭后上涨。', focus: '双K同低', path: [[0, 0.038], [0.18, 0.010], [0.36, -0.022], [0.52, -0.042], [0.66, -0.044], [0.78, -0.020], [0.84, 0.000], [1, 0.056]] },
  // ── 经典图表形态补全 II ──
  { key: 'DEAD_CAT_BOUNCE', name: '死猫跳', nameEn: 'Dead Cat Bounce', type: 'continuation', direction: 'bearish', confidence: 0.66, description: '急跌后短暂反弹再次下跌，反弹并非真正反转而是下跌中继。', focus: '假反弹', path: [[0, 0.030], [0.18, -0.020], [0.34, -0.060], [0.48, -0.030], [0.60, -0.038], [0.72, -0.050], [0.84, -0.044], [1, -0.082]] },
  { key: 'PARABOLIC_CURVE_TOP', name: '抛物线顶', nameEn: 'Parabolic Curve Top', type: 'reversal', direction: 'bearish', confidence: 0.71, description: '价格沿抛物线加速上涨后动能耗竭，急速反转下跌。', focus: '加速见顶', path: [[0, -0.050], [0.14, -0.030], [0.28, -0.006], [0.42, 0.024], [0.56, 0.050], [0.68, 0.072], [0.78, 0.058], [0.84, 0.030], [1, -0.054]] },
  { key: 'PARABOLIC_CURVE_BOTTOM', name: '抛物线底', nameEn: 'Parabolic Curve Bottom', type: 'reversal', direction: 'bullish', confidence: 0.71, description: '价格沿抛物线加速下跌后恐慌释放，急速反转上涨。', focus: '加速见底', path: [[0, 0.050], [0.14, 0.030], [0.28, 0.006], [0.42, -0.024], [0.56, -0.050], [0.68, -0.072], [0.78, -0.058], [0.84, -0.030], [1, 0.054]] },
  { key: 'ASCENDING_STAIRCASE', name: '上升阶梯', nameEn: 'Ascending Staircase', type: 'continuation', direction: 'bullish', confidence: 0.72, description: '价格呈阶梯式上涨，每轮拉升后横盘整理再创新高。', focus: '阶梯上攻', path: [[0, -0.040], [0.12, -0.010], [0.22, -0.014], [0.32, 0.012], [0.42, 0.008], [0.52, 0.030], [0.62, 0.026], [0.72, 0.048], [0.84, 0.044], [1, 0.074]] },
  { key: 'DESCENDING_STAIRCASE', name: '下降阶梯', nameEn: 'Descending Staircase', type: 'continuation', direction: 'bearish', confidence: 0.72, description: '价格呈阶梯式下跌，每轮杀跌后横盘整理再创新低。', focus: '阶梯下行', path: [[0, 0.040], [0.12, 0.010], [0.22, 0.014], [0.32, -0.012], [0.42, -0.008], [0.52, -0.030], [0.62, -0.026], [0.72, -0.048], [0.84, -0.044], [1, -0.074]] },
  { key: 'TOWER_TOP', name: '塔形顶', nameEn: 'Tower Top', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '连续大阳线快速拉升后出现连续大阴线快速回落，形成塔状顶部。', focus: '阳转阴', path: [[0, -0.044], [0.16, -0.016], [0.32, 0.030], [0.46, 0.058], [0.58, 0.054], [0.70, 0.028], [0.84, -0.008], [1, -0.058]] },
  { key: 'TOWER_BOTTOM', name: '塔形底', nameEn: 'Tower Bottom', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '连续大阴线快速下跌后出现连续大阳线快速拉升，形成塔状底部。', focus: '阴转阳', path: [[0, 0.044], [0.16, 0.016], [0.32, -0.030], [0.46, -0.058], [0.58, -0.054], [0.70, -0.028], [0.84, 0.008], [1, 0.058]] },
  { key: 'SHAKEOUT_BULLISH', name: '看涨洗盘', nameEn: 'Bullish Shakeout', type: 'continuation', direction: 'bullish', confidence: 0.71, description: '上升趋势中突然急跌诱空，清洗浮筹后迅速恢复上涨。', focus: '急跌诱空', path: [[0, -0.032], [0.16, 0.010], [0.30, 0.028], [0.46, 0.016], [0.56, -0.022], [0.66, -0.040], [0.76, -0.010], [0.84, 0.020], [1, 0.066]] },
  { key: 'SHAKEOUT_BEARISH', name: '看跌洗盘', nameEn: 'Bearish Shakeout', type: 'continuation', direction: 'bearish', confidence: 0.71, description: '下降趋势中突然急涨诱多，清洗空头后迅速恢复下跌。', focus: '急涨诱多', path: [[0, 0.032], [0.16, -0.010], [0.30, -0.028], [0.46, -0.016], [0.56, 0.022], [0.66, 0.040], [0.76, 0.010], [0.84, -0.020], [1, -0.066]] },
  { key: 'BULL_TRAP', name: '多头陷阱', nameEn: 'Bull Trap', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '价格假突破阻力位诱多后迅速反转下跌，多头被套。', focus: '假突破', path: [[0, -0.024], [0.14, 0.010], [0.28, -0.006], [0.42, 0.016], [0.56, 0.004], [0.68, 0.044], [0.78, 0.050], [0.84, 0.022], [1, -0.056]] },
  { key: 'BEAR_TRAP', name: '空头陷阱', nameEn: 'Bear Trap', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '价格假跌破支撑位诱空后迅速反转上涨，空头被套。', focus: '假跌破', path: [[0, 0.024], [0.14, -0.010], [0.28, 0.006], [0.42, -0.016], [0.56, -0.004], [0.68, -0.044], [0.78, -0.050], [0.84, -0.022], [1, 0.056]] },
  { key: 'KICKER_BULLISH', name: '看涨踢脚', nameEn: 'Bullish Kicker', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '下跌趋势中突然出现跳空大阳线，完全逆转前期走势。', focus: '跳空反转', path: [[0, 0.040], [0.18, 0.014], [0.36, -0.016], [0.52, -0.042], [0.64, -0.050], [0.74, -0.044], [0.80, -0.018], [0.84, 0.018], [1, 0.064]] },
  { key: 'KICKER_BEARISH', name: '看跌踢脚', nameEn: 'Bearish Kicker', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '上涨趋势中突然出现跳空大阴线，完全逆转前期走势。', focus: '跳空反转', path: [[0, -0.040], [0.18, -0.014], [0.36, 0.016], [0.52, 0.042], [0.64, 0.050], [0.74, 0.044], [0.80, 0.018], [0.84, -0.018], [1, -0.064]] },
  { key: 'RUNNING_CORRECTION_BULLISH', name: '顺势调整(涨)', nameEn: 'Running Correction Bullish', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '强势上涨中的浅幅调整，低点不断抬高，回调后继续上攻。', focus: '浅幅回调', path: [[0, -0.044], [0.14, -0.014], [0.28, 0.016], [0.40, 0.010], [0.52, 0.026], [0.64, 0.020], [0.76, 0.038], [0.84, 0.034], [1, 0.070]] },
  { key: 'RUNNING_CORRECTION_BEARISH', name: '顺势调整(跌)', nameEn: 'Running Correction Bearish', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '强势下跌中的浅幅反弹，高点不断降低，反弹后继续下杀。', focus: '浅幅反弹', path: [[0, 0.044], [0.14, 0.014], [0.28, -0.016], [0.40, -0.010], [0.52, -0.026], [0.64, -0.020], [0.76, -0.038], [0.84, -0.034], [1, -0.070]] },
  { key: 'COMPLEX_DOUBLE_TOP', name: '复合双顶', nameEn: 'Complex Double Top', type: 'reversal', direction: 'bearish', confidence: 0.74, description: '价格在阻力区多次(3次以上)试探失败，形态更复杂但反转更可靠。', focus: '多次试探失败', path: [[0, -0.026], [0.12, 0.034], [0.22, 0.004], [0.32, 0.038], [0.42, 0.008], [0.52, 0.036], [0.62, 0.012], [0.72, 0.032], [0.84, -0.004], [1, -0.062]] },
  { key: 'COMPLEX_DOUBLE_BOTTOM', name: '复合双底', nameEn: 'Complex Double Bottom', type: 'reversal', direction: 'bullish', confidence: 0.74, description: '价格在支撑区多次(3次以上)探底企稳，形态更复杂但反转更可靠。', focus: '多次探底企稳', path: [[0, 0.026], [0.12, -0.034], [0.22, -0.004], [0.32, -0.038], [0.42, -0.008], [0.52, -0.036], [0.62, -0.012], [0.72, -0.032], [0.84, 0.004], [1, 0.062]] },
  { key: 'COMPLEX_HS_TOP', name: '复合头肩顶', nameEn: 'Complex Head and Shoulders Top', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '多个肩部和头部组成的复杂反转形态，颈线突破后确认。', focus: '多肩结构', path: [[0, -0.020], [0.08, 0.024], [0.16, -0.004], [0.24, 0.032], [0.32, 0.052], [0.40, 0.008], [0.48, 0.048], [0.56, 0.004], [0.64, 0.028], [0.72, -0.002], [0.84, -0.014], [1, -0.064]] },
  { key: 'COMPLEX_HS_BOTTOM', name: '复合头肩底', nameEn: 'Complex Head and Shoulders Bottom', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '多个肩部和头部组成的复杂底部反转形态，颈线突破后确认。', focus: '多肩结构', path: [[0, 0.020], [0.08, -0.024], [0.16, 0.004], [0.24, -0.032], [0.32, -0.052], [0.40, -0.008], [0.48, -0.048], [0.56, -0.004], [0.64, -0.028], [0.72, 0.002], [0.84, 0.014], [1, 0.064]] },
  { key: 'TRIPLE_INSIDE_OUT_BULLISH', name: '三内外上翻', nameEn: 'Triple Inside-Out Up', type: 'reversal', direction: 'bullish', confidence: 0.69, description: '下跌中出现内包线再外包突破，三根K线组合确认反转做多。', focus: '内外翻转', path: [[0, 0.042], [0.18, 0.016], [0.36, -0.014], [0.52, -0.040], [0.66, -0.048], [0.78, -0.028], [0.84, -0.006], [1, 0.056]] },
  { key: 'TRIPLE_INSIDE_OUT_BEARISH', name: '三内外下翻', nameEn: 'Triple Inside-Out Down', type: 'reversal', direction: 'bearish', confidence: 0.69, description: '上涨中出现内包线再外包跌破，三根K线组合确认反转做空。', focus: '内外翻转', path: [[0, -0.042], [0.18, -0.016], [0.36, 0.014], [0.52, 0.040], [0.66, 0.048], [0.78, 0.028], [0.84, 0.006], [1, -0.056]] },
  // ── K线组合走势 II ──
  { key: 'HAMMER_SETUP', name: '锤子线走势', nameEn: 'Hammer Setup', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '下跌末期出现长下影锤子线，底部承接强烈后价格反弹上行。', focus: '锤子反转', path: [[0, 0.038], [0.20, 0.010], [0.40, -0.024], [0.56, -0.048], [0.68, -0.056], [0.78, -0.036], [0.84, -0.016], [1, 0.050]] },
  { key: 'HANGING_MAN_SETUP', name: '上吊线走势', nameEn: 'Hanging Man Setup', type: 'reversal', direction: 'bearish', confidence: 0.65, description: '上涨末期出现长下影上吊线，顶部抛压显现后价格回落下行。', focus: '上吊示警', path: [[0, -0.038], [0.20, -0.010], [0.40, 0.024], [0.56, 0.048], [0.68, 0.056], [0.78, 0.036], [0.84, 0.016], [1, -0.050]] },
  { key: 'SHOOTING_STAR_SETUP', name: '射击之星走势', nameEn: 'Shooting Star Setup', type: 'reversal', direction: 'bearish', confidence: 0.67, description: '上涨末期出现长上影射击之星，上攻受阻后价格反转下跌。', focus: '长上影反转', path: [[0, -0.036], [0.18, -0.008], [0.36, 0.020], [0.52, 0.044], [0.66, 0.052], [0.78, 0.032], [0.84, 0.012], [1, -0.052]] },
  { key: 'INVERTED_HAMMER_SETUP', name: '倒锤子线走势', nameEn: 'Inverted Hammer Setup', type: 'reversal', direction: 'bullish', confidence: 0.65, description: '下跌末期出现长上影倒锤子线，试探性上攻预示底部反转。', focus: '倒锤探底', path: [[0, 0.036], [0.18, 0.008], [0.36, -0.020], [0.52, -0.044], [0.66, -0.052], [0.78, -0.032], [0.84, -0.012], [1, 0.052]] },
  { key: 'DARK_CLOUD_COVER_SETUP', name: '乌云盖顶走势', nameEn: 'Dark Cloud Cover Setup', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '上涨中大阴线深入前一大阳线实体50%以上，预示顶部反转。', focus: '乌云压顶', path: [[0, -0.040], [0.18, -0.012], [0.36, 0.018], [0.52, 0.044], [0.66, 0.054], [0.76, 0.034], [0.84, 0.010], [1, -0.054]] },
  { key: 'PIERCING_PATTERN_SETUP', name: '刺透形态走势', nameEn: 'Piercing Pattern Setup', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '下跌中大阳线深入前一大阴线实体50%以上，预示底部反转。', focus: '刺透反转', path: [[0, 0.040], [0.18, 0.012], [0.36, -0.018], [0.52, -0.044], [0.66, -0.054], [0.76, -0.034], [0.84, -0.010], [1, 0.054]] },
  { key: 'HARAMI_BULLISH_SETUP', name: '看涨孕线走势', nameEn: 'Bullish Harami Setup', type: 'reversal', direction: 'bullish', confidence: 0.64, description: '下跌中小阳线被前一大阴线包裹(孕线)，动能衰竭后反弹上行。', focus: '阴孕阳', path: [[0, 0.036], [0.20, 0.010], [0.40, -0.020], [0.56, -0.044], [0.68, -0.050], [0.78, -0.040], [0.84, -0.022], [1, 0.044]] },
  { key: 'HARAMI_BEARISH_SETUP', name: '看跌孕线走势', nameEn: 'Bearish Harami Setup', type: 'reversal', direction: 'bearish', confidence: 0.64, description: '上涨中小阴线被前一大阳线包裹(孕线)，动能衰竭后回落下行。', focus: '阳孕阴', path: [[0, -0.036], [0.20, -0.010], [0.40, 0.020], [0.56, 0.044], [0.68, 0.050], [0.78, 0.040], [0.84, 0.022], [1, -0.044]] },
  { key: 'DOJI_STAR_BULLISH_SETUP', name: '看涨十字星走势', nameEn: 'Bullish Doji Star Setup', type: 'reversal', direction: 'bullish', confidence: 0.66, description: '下跌末期跳空出现十字星，多空分歧加剧后价格向上反转。', focus: '十字星反转', path: [[0, 0.040], [0.20, 0.014], [0.38, -0.014], [0.54, -0.040], [0.66, -0.052], [0.76, -0.050], [0.84, -0.030], [1, 0.046]] },
  { key: 'DOJI_STAR_BEARISH_SETUP', name: '看跌十字星走势', nameEn: 'Bearish Doji Star Setup', type: 'reversal', direction: 'bearish', confidence: 0.66, description: '上涨末期跳空出现十字星，多空分歧加剧后价格向下反转。', focus: '十字星反转', path: [[0, -0.040], [0.20, -0.014], [0.38, 0.014], [0.54, 0.040], [0.66, 0.052], [0.76, 0.050], [0.84, 0.030], [1, -0.046]] },
  { key: 'THREE_INSIDE_UP_SETUP', name: '三内上涨走势', nameEn: 'Three Inside Up Setup', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '下跌中出现孕线+突破阳线三根组合，确认底部后反弹上行。', focus: '三内翻多', path: [[0, 0.040], [0.20, 0.012], [0.40, -0.018], [0.56, -0.042], [0.68, -0.050], [0.78, -0.032], [0.84, -0.010], [1, 0.054]] },
  { key: 'THREE_INSIDE_DOWN_SETUP', name: '三内下跌走势', nameEn: 'Three Inside Down Setup', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '上涨中出现孕线+跌破阴线三根组合，确认顶部后回落下行。', focus: '三内翻空', path: [[0, -0.040], [0.20, -0.012], [0.40, 0.018], [0.56, 0.042], [0.68, 0.050], [0.78, 0.032], [0.84, 0.010], [1, -0.054]] },
  { key: 'THREE_OUTSIDE_UP_SETUP', name: '三外上涨走势', nameEn: 'Three Outside Up Setup', type: 'reversal', direction: 'bullish', confidence: 0.71, description: '下跌中大阳线吞没前阴线+确认阳线组合，强势底部反转。', focus: '三外翻多', path: [[0, 0.042], [0.18, 0.014], [0.36, -0.016], [0.52, -0.040], [0.66, -0.048], [0.76, -0.024], [0.84, -0.002], [1, 0.058]] },
  { key: 'THREE_OUTSIDE_DOWN_SETUP', name: '三外下跌走势', nameEn: 'Three Outside Down Setup', type: 'reversal', direction: 'bearish', confidence: 0.71, description: '上涨中大阴线吞没前阳线+确认阴线组合，强势顶部反转。', focus: '三外翻空', path: [[0, -0.042], [0.18, -0.014], [0.36, 0.016], [0.52, 0.040], [0.66, 0.048], [0.76, 0.024], [0.84, 0.002], [1, -0.058]] },
  { key: 'ABANDONED_BABY_BULLISH', name: '看涨弃婴', nameEn: 'Bullish Abandoned Baby', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '下跌中跳空十字星后再跳空上涨，极强底部反转信号。', focus: '跳空弃婴', path: [[0, 0.038], [0.18, 0.010], [0.36, -0.020], [0.52, -0.046], [0.66, -0.058], [0.76, -0.052], [0.84, -0.020], [1, 0.058]] },
  { key: 'ABANDONED_BABY_BEARISH', name: '看跌弃婴', nameEn: 'Bearish Abandoned Baby', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '上涨中跳空十字星后再跳空下跌，极强顶部反转信号。', focus: '跳空弃婴', path: [[0, -0.038], [0.18, -0.010], [0.36, 0.020], [0.52, 0.046], [0.66, 0.058], [0.76, 0.052], [0.84, 0.020], [1, -0.058]] },
  { key: 'RISING_THREE_METHODS_SETUP', name: '上升三法走势', nameEn: 'Rising Three Methods Setup', type: 'continuation', direction: 'bullish', confidence: 0.72, description: '大阳线后接三根小阴线回调不破底，再一根大阳线突破确认延续。', focus: '三法上攻', path: [[0, -0.036], [0.16, -0.008], [0.30, 0.024], [0.44, 0.016], [0.54, 0.012], [0.64, 0.008], [0.74, 0.018], [0.84, 0.036], [1, 0.072]] },
  { key: 'FALLING_THREE_METHODS_SETUP', name: '下降三法走势', nameEn: 'Falling Three Methods Setup', type: 'continuation', direction: 'bearish', confidence: 0.72, description: '大阴线后接三根小阳线反弹不破顶，再一根大阴线跌破确认延续。', focus: '三法下攻', path: [[0, 0.036], [0.16, 0.008], [0.30, -0.024], [0.44, -0.016], [0.54, -0.012], [0.64, -0.008], [0.74, -0.018], [0.84, -0.036], [1, -0.072]] },
  // ── K线组合走势 III ──
  { key: 'THREE_LINE_STRIKE_BULLISH', name: '看涨三线打击', nameEn: 'Bullish Three-Line Strike', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '三根阴线后一根大阳线吞没全部，强烈底部反转信号。', focus: '大阳吞没', path: [[0, 0.034], [0.18, 0.008], [0.36, -0.020], [0.52, -0.044], [0.66, -0.056], [0.76, -0.064], [0.84, -0.024], [1, 0.052]] },
  { key: 'THREE_LINE_STRIKE_BEARISH', name: '看跌三线打击', nameEn: 'Bearish Three-Line Strike', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '三根阳线后一根大阴线吞没全部，强烈顶部反转信号。', focus: '大阴吞没', path: [[0, -0.034], [0.18, -0.008], [0.36, 0.020], [0.52, 0.044], [0.66, 0.056], [0.76, 0.064], [0.84, 0.024], [1, -0.052]] },
  { key: 'HIKKAKE_BULLISH', name: '看涨陷阱反转', nameEn: 'Bullish Hikkake', type: 'reversal', direction: 'bullish', confidence: 0.66, description: '内包线后向下假突破失败，反向突破形成看涨反转。', focus: '假破反转', path: [[0, 0.030], [0.16, -0.006], [0.32, 0.010], [0.46, -0.020], [0.58, -0.014], [0.68, -0.038], [0.78, -0.044], [0.84, -0.014], [1, 0.052]] },
  { key: 'HIKKAKE_BEARISH', name: '看跌陷阱反转', nameEn: 'Bearish Hikkake', type: 'reversal', direction: 'bearish', confidence: 0.66, description: '内包线后向上假突破失败，反向跌破形成看跌反转。', focus: '假破反转', path: [[0, -0.030], [0.16, 0.006], [0.32, -0.010], [0.46, 0.020], [0.58, 0.014], [0.68, 0.038], [0.78, 0.044], [0.84, 0.014], [1, -0.052]] },
  { key: 'LADDER_BOTTOM_SETUP', name: '梯底走势', nameEn: 'Ladder Bottom Setup', type: 'reversal', direction: 'bullish', confidence: 0.67, description: '连续三根长阴线后出现小实体犹豫线，最后大阳线确认底部反转。', focus: '梯底反转', path: [[0, 0.044], [0.16, 0.020], [0.32, -0.010], [0.46, -0.036], [0.58, -0.054], [0.68, -0.062], [0.78, -0.056], [0.84, -0.026], [1, 0.048]] },
  { key: 'COUNTERATTACK_BULLISH', name: '看涨反击线走势', nameEn: 'Bullish Counterattack Setup', type: 'reversal', direction: 'bullish', confidence: 0.66, description: '下跌中大阳线收盘价与前一大阴线收盘价相同，买方反击信号。', focus: '反击平收', path: [[0, 0.036], [0.20, 0.010], [0.40, -0.018], [0.56, -0.042], [0.68, -0.052], [0.78, -0.038], [0.84, -0.016], [1, 0.048]] },
  { key: 'COUNTERATTACK_BEARISH', name: '看跌反击线走势', nameEn: 'Bearish Counterattack Setup', type: 'reversal', direction: 'bearish', confidence: 0.66, description: '上涨中大阴线收盘价与前一大阳线收盘价相同，卖方反击信号。', focus: '反击平收', path: [[0, -0.036], [0.20, -0.010], [0.40, 0.018], [0.56, 0.042], [0.68, 0.052], [0.78, 0.038], [0.84, 0.016], [1, -0.048]] },
  { key: 'BELT_HOLD_BULLISH', name: '看涨捉腰带走势', nameEn: 'Bullish Belt Hold Setup', type: 'reversal', direction: 'bullish', confidence: 0.64, description: '下跌中出现开盘即最低价的大阳线(光脚阳线)，底部强势反转。', focus: '光脚阳线', path: [[0, 0.038], [0.20, 0.012], [0.40, -0.016], [0.56, -0.040], [0.68, -0.050], [0.78, -0.036], [0.84, -0.012], [1, 0.048]] },
  { key: 'BELT_HOLD_BEARISH', name: '看跌捉腰带走势', nameEn: 'Bearish Belt Hold Setup', type: 'reversal', direction: 'bearish', confidence: 0.64, description: '上涨中出现开盘即最高价的大阴线(光头阴线)，顶部强势反转。', focus: '光头阴线', path: [[0, -0.038], [0.20, -0.012], [0.40, 0.016], [0.56, 0.040], [0.68, 0.050], [0.78, 0.036], [0.84, 0.012], [1, -0.048]] },
  { key: 'SEPARATING_LINES_BULLISH', name: '看涨分离线走势', nameEn: 'Bullish Separating Lines Setup', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '上涨中阴线后阳线以相同开盘价开出并强势收高，延续上涨。', focus: '同开分离', path: [[0, -0.032], [0.16, -0.006], [0.30, 0.018], [0.44, 0.010], [0.56, 0.024], [0.68, 0.016], [0.78, 0.030], [0.84, 0.028], [1, 0.066]] },
  { key: 'SEPARATING_LINES_BEARISH', name: '看跌分离线走势', nameEn: 'Bearish Separating Lines Setup', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '下跌中阳线后阴线以相同开盘价开出并强势收低，延续下跌。', focus: '同开分离', path: [[0, 0.032], [0.16, 0.006], [0.30, -0.018], [0.44, -0.010], [0.56, -0.024], [0.68, -0.016], [0.78, -0.030], [0.84, -0.028], [1, -0.066]] },
  { key: 'TRI_STAR_BULLISH', name: '看涨三星走势', nameEn: 'Bullish Tri-Star Setup', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '下跌末期连续三根十字星，极端犹豫后价格向上反转。', focus: '三星反转', path: [[0, 0.042], [0.18, 0.016], [0.36, -0.012], [0.52, -0.038], [0.64, -0.050], [0.74, -0.054], [0.82, -0.048], [0.84, -0.024], [1, 0.050]] },
  { key: 'TRI_STAR_BEARISH', name: '看跌三星走势', nameEn: 'Bearish Tri-Star Setup', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '上涨末期连续三根十字星，极端犹豫后价格向下反转。', focus: '三星反转', path: [[0, -0.042], [0.18, -0.016], [0.36, 0.012], [0.52, 0.038], [0.64, 0.050], [0.74, 0.054], [0.82, 0.048], [0.84, 0.024], [1, -0.050]] },
  // ── SMC 形态补全 ──
  { key: 'SMC_LIQUIDITY_SWEEP_BULLISH', name: 'SMC流动性扫盘(涨)', nameEn: 'SMC Liquidity Sweep Bullish', type: 'reversal', direction: 'bullish', confidence: 0.74, description: '价格扫过关键低点止损区后迅速回升，机构吸收流动性后推动上涨。', focus: '扫盘反转', path: [[0, 0.030], [0.16, -0.010], [0.32, 0.014], [0.46, -0.018], [0.58, -0.006], [0.70, -0.052], [0.78, -0.060], [0.84, -0.020], [1, 0.060]] },
  { key: 'SMC_LIQUIDITY_SWEEP_BEARISH', name: 'SMC流动性扫盘(跌)', nameEn: 'SMC Liquidity Sweep Bearish', type: 'reversal', direction: 'bearish', confidence: 0.74, description: '价格扫过关键高点止损区后迅速回落，机构出货后推动下跌。', focus: '扫盘反转', path: [[0, -0.030], [0.16, 0.010], [0.32, -0.014], [0.46, 0.018], [0.58, 0.006], [0.70, 0.052], [0.78, 0.060], [0.84, 0.020], [1, -0.060]] },
  { key: 'SMC_FVG_BULLISH', name: 'SMC公允价值缺口(涨)', nameEn: 'SMC Fair Value Gap Bullish', type: 'continuation', direction: 'bullish', confidence: 0.72, description: '强势上涨中形成价格缺口(FVG)，回测缺口后延续上行。', focus: 'FVG回测', path: [[0, -0.032], [0.14, -0.006], [0.28, 0.030], [0.40, 0.056], [0.52, 0.040], [0.64, 0.034], [0.74, 0.038], [0.84, 0.044], [1, 0.078]] },
  { key: 'SMC_FVG_BEARISH', name: 'SMC公允价值缺口(跌)', nameEn: 'SMC Fair Value Gap Bearish', type: 'continuation', direction: 'bearish', confidence: 0.72, description: '强势下跌中形成价格缺口(FVG)，回测缺口后延续下行。', focus: 'FVG回测', path: [[0, 0.032], [0.14, 0.006], [0.28, -0.030], [0.40, -0.056], [0.52, -0.040], [0.64, -0.034], [0.74, -0.038], [0.84, -0.044], [1, -0.078]] },
  { key: 'SMC_ORDER_BLOCK_BULLISH', name: 'SMC看涨订单块', nameEn: 'SMC Bullish Order Block', type: 'reversal', direction: 'bullish', confidence: 0.73, description: '价格回测机构看涨订单块区域获得支撑后反弹上行。', focus: '订单块支撑', path: [[0, 0.034], [0.16, -0.010], [0.32, 0.020], [0.44, -0.026], [0.56, -0.040], [0.68, -0.050], [0.78, -0.034], [0.84, -0.014], [1, 0.054]] },
  { key: 'SMC_ORDER_BLOCK_BEARISH', name: 'SMC看跌订单块', nameEn: 'SMC Bearish Order Block', type: 'reversal', direction: 'bearish', confidence: 0.73, description: '价格回测机构看跌订单块区域遇阻后回落下行。', focus: '订单块压力', path: [[0, -0.034], [0.16, 0.010], [0.32, -0.020], [0.44, 0.026], [0.56, 0.040], [0.68, 0.050], [0.78, 0.034], [0.84, 0.014], [1, -0.054]] },
  { key: 'SMC_BREAKER_BLOCK_BULLISH', name: 'SMC看涨破坏块', nameEn: 'SMC Bullish Breaker Block', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '失效的看跌订单块转化为看涨破坏块，回测后成为支撑做多。', focus: '破坏块反转', path: [[0, 0.036], [0.14, -0.008], [0.28, 0.022], [0.42, -0.014], [0.56, -0.044], [0.68, -0.056], [0.78, -0.026], [0.84, -0.004], [1, 0.058]] },
  { key: 'SMC_BREAKER_BLOCK_BEARISH', name: 'SMC看跌破坏块', nameEn: 'SMC Bearish Breaker Block', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '失效的看涨订单块转化为看跌破坏块，回测后成为压力做空。', focus: '破坏块反转', path: [[0, -0.036], [0.14, 0.008], [0.28, -0.022], [0.42, 0.014], [0.56, 0.044], [0.68, 0.056], [0.78, 0.026], [0.84, 0.004], [1, -0.058]] },
  // ── Wyckoff 方法 ──
  { key: 'WYCKOFF_ACCUMULATION', name: 'Wyckoff吸筹', nameEn: 'Wyckoff Accumulation', type: 'reversal', direction: 'bullish', confidence: 0.76, description: '经典Wyckoff吸筹结构：PS→SC→AR→ST→Spring→SOS→LPS，机构完成底部吸筹后拉升。', focus: 'Spring启动', path: [[0, 0.036], [0.10, -0.010], [0.18, -0.048], [0.26, -0.014], [0.36, -0.030], [0.46, -0.024], [0.56, -0.036], [0.66, -0.060], [0.74, -0.020], [0.84, 0.006], [1, 0.062]] },
  { key: 'WYCKOFF_DISTRIBUTION', name: 'Wyckoff派发', nameEn: 'Wyckoff Distribution', type: 'reversal', direction: 'bearish', confidence: 0.76, description: '经典Wyckoff派发结构：PSY→BC→AR→ST→UTAD→SOW，机构完成顶部派发后打压。', focus: 'UTAD后崩', path: [[0, -0.036], [0.10, 0.010], [0.18, 0.048], [0.26, 0.014], [0.36, 0.030], [0.46, 0.024], [0.56, 0.036], [0.66, 0.060], [0.74, 0.020], [0.84, -0.006], [1, -0.062]] },
  { key: 'WYCKOFF_SPRING', name: 'Wyckoff弹簧效应', nameEn: 'Wyckoff Spring', type: 'reversal', direction: 'bullish', confidence: 0.74, description: '在吸筹区间中假跌破支撑(Spring)后快速回升，确认底部后上涨。', focus: 'Spring弹起', path: [[0, 0.020], [0.14, -0.014], [0.28, 0.008], [0.40, -0.020], [0.52, -0.010], [0.62, -0.016], [0.72, -0.050], [0.80, -0.018], [0.84, 0.010], [1, 0.060]] },
  { key: 'WYCKOFF_UPTHRUST', name: 'Wyckoff上冲回落', nameEn: 'Wyckoff Upthrust', type: 'reversal', direction: 'bearish', confidence: 0.74, description: '在派发区间中假突破阻力(UTAD)后快速回落，确认顶部后下跌。', focus: '上冲回落', path: [[0, -0.020], [0.14, 0.014], [0.28, -0.008], [0.40, 0.020], [0.52, 0.010], [0.62, 0.016], [0.72, 0.050], [0.80, 0.018], [0.84, -0.010], [1, -0.060]] },
  // ── 其他高级形态 ──
  { key: 'FAILED_BREAKOUT_BEARISH', name: '失败突破(跌)', nameEn: 'Failed Breakout Bearish', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '价格突破关键阻力后无法维持，回落跌破突破点后加速下跌。', focus: '突破失败', path: [[0, -0.024], [0.14, 0.008], [0.28, -0.006], [0.42, 0.018], [0.54, 0.006], [0.66, 0.042], [0.76, 0.048], [0.84, 0.016], [1, -0.058]] },
  { key: 'FAILED_BREAKDOWN_BULLISH', name: '失败跌破(涨)', nameEn: 'Failed Breakdown Bullish', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '价格跌破关键支撑后无法维持，回升突破跌破点后加速上涨。', focus: '跌破失败', path: [[0, 0.024], [0.14, -0.008], [0.28, 0.006], [0.42, -0.018], [0.54, -0.006], [0.66, -0.042], [0.76, -0.048], [0.84, -0.016], [1, 0.058]] },
  { key: 'DOUBLE_INSIDE_DAY_BULLISH', name: '双内包日(涨)', nameEn: 'Double Inside Day Bullish', type: 'continuation', direction: 'bullish', confidence: 0.68, description: '连续两根K线被母线包裹，波动收窄后向上突破延续趋势。', focus: '窄幅蓄势', path: [[0, -0.034], [0.16, -0.006], [0.32, 0.020], [0.46, 0.012], [0.58, 0.016], [0.70, 0.010], [0.84, 0.014], [1, 0.062]] },
  { key: 'DOUBLE_INSIDE_DAY_BEARISH', name: '双内包日(跌)', nameEn: 'Double Inside Day Bearish', type: 'continuation', direction: 'bearish', confidence: 0.68, description: '连续两根K线被母线包裹，波动收窄后向下跌破延续趋势。', focus: '窄幅蓄势', path: [[0, 0.034], [0.16, 0.006], [0.32, -0.020], [0.46, -0.012], [0.58, -0.016], [0.70, -0.010], [0.84, -0.014], [1, -0.062]] },
  { key: 'ADAM_EVE_DOUBLE_BOTTOM', name: 'Adam & Eve双底', nameEn: 'Adam and Eve Double Bottom', type: 'reversal', direction: 'bullish', confidence: 0.74, description: '第一个底部尖锐(Adam)、第二个底部圆弧(Eve)，组合形成更可靠的底部反转。', focus: '尖圆双底', path: [[0, 0.020], [0.16, -0.040], [0.24, -0.050], [0.30, -0.020], [0.40, 0.010], [0.50, -0.016], [0.60, -0.036], [0.70, -0.034], [0.80, -0.010], [0.84, 0.008], [1, 0.064]] },
  { key: 'EVE_ADAM_DOUBLE_TOP', name: 'Eve & Adam双顶', nameEn: 'Eve and Adam Double Top', type: 'reversal', direction: 'bearish', confidence: 0.74, description: '第一个顶部圆弧(Eve)、第二个顶部尖锐(Adam)，组合形成更可靠的顶部反转。', focus: '圆尖双顶', path: [[0, -0.020], [0.16, 0.016], [0.26, 0.036], [0.36, 0.034], [0.46, 0.010], [0.56, -0.010], [0.66, 0.020], [0.74, 0.050], [0.80, 0.040], [0.84, -0.008], [1, -0.064]] },
  { key: 'LEADING_DIAGONAL_BULLISH', name: '引导楔形(涨)', nameEn: 'Leading Diagonal Bullish', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '趋势起始阶段出现的收敛楔形(5浪重叠结构)，完成后延续上涨。', focus: '引导楔形', path: [[0, -0.038], [0.12, 0.004], [0.24, -0.018], [0.38, 0.022], [0.50, -0.002], [0.64, 0.036], [0.76, 0.014], [0.84, 0.044], [1, 0.072]] },
  { key: 'LEADING_DIAGONAL_BEARISH', name: '引导楔形(跌)', nameEn: 'Leading Diagonal Bearish', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '趋势起始阶段出现的收敛楔形(5浪重叠结构)，完成后延续下跌。', focus: '引导楔形', path: [[0, 0.038], [0.12, -0.004], [0.24, 0.018], [0.38, -0.022], [0.50, 0.002], [0.64, -0.036], [0.76, -0.014], [0.84, -0.044], [1, -0.072]] },
  { key: 'MATCHING_LOW_SETUP', name: '相同低价走势', nameEn: 'Matching Low Setup', type: 'reversal', direction: 'bullish', confidence: 0.64, description: '连续两根阴线收盘在相同低价，二次确认支撑后反弹上行。', focus: '双低确认', path: [[0, 0.034], [0.18, 0.008], [0.36, -0.018], [0.52, -0.040], [0.66, -0.048], [0.78, -0.046], [0.84, -0.024], [1, 0.044]] },
  { key: 'MATCHING_HIGH_SETUP', name: '相同高价走势', nameEn: 'Matching High Setup', type: 'reversal', direction: 'bearish', confidence: 0.64, description: '连续两根阳线收盘在相同高价，二次确认阻力后回落下行。', focus: '双高确认', path: [[0, -0.034], [0.18, -0.008], [0.36, 0.018], [0.52, 0.040], [0.66, 0.048], [0.78, 0.046], [0.84, 0.024], [1, -0.044]] },
  { key: 'UPSIDE_GAP_TWO_CROWS', name: '向上跳空双鸦', nameEn: 'Upside Gap Two Crows', type: 'reversal', direction: 'bearish', confidence: 0.65, description: '上涨中跳空出现两根小阴线逐步回落，预示顶部衰竭即将反转。', focus: '跳空双鸦', path: [[0, -0.040], [0.18, -0.014], [0.36, 0.016], [0.52, 0.042], [0.64, 0.056], [0.74, 0.048], [0.82, 0.038], [0.84, 0.018], [1, -0.050]] },
  { key: 'CONCEALING_BABY_SWALLOW', name: '藏婴吞没走势', nameEn: 'Concealing Baby Swallow Setup', type: 'reversal', direction: 'bullish', confidence: 0.66, description: '下跌末期两根光头阴线后出现高开阴线被最后大阴线吞没，极度恐慌后见底反转。', focus: '极端恐慌反转', path: [[0, 0.040], [0.16, 0.016], [0.32, -0.014], [0.48, -0.040], [0.60, -0.054], [0.72, -0.064], [0.80, -0.058], [0.84, -0.028], [1, 0.046]] },
  { key: 'ON_NECK_SETUP', name: '颈上线走势', nameEn: 'On Neck Setup', type: 'continuation', direction: 'bearish', confidence: 0.62, description: '下跌中小阳线收盘刚好触及前一阴线最低价，买方反击极弱延续下跌。', focus: '弱反弹延续', path: [[0, 0.030], [0.16, 0.008], [0.32, -0.016], [0.46, -0.034], [0.58, -0.028], [0.70, -0.040], [0.84, -0.048], [1, -0.076]] },
  { key: 'IN_NECK_SETUP', name: '颈内线走势', nameEn: 'In Neck Setup', type: 'continuation', direction: 'bearish', confidence: 0.62, description: '下跌中小阳线收盘略高于前一阴线最低价，买方反击不足延续下跌。', focus: '浅反弹延续', path: [[0, 0.032], [0.16, 0.010], [0.32, -0.014], [0.46, -0.032], [0.58, -0.026], [0.70, -0.038], [0.84, -0.046], [1, -0.074]] },
  { key: 'THRUSTING_SETUP', name: '插入线走势', nameEn: 'Thrusting Pattern Setup', type: 'continuation', direction: 'bearish', confidence: 0.63, description: '下跌中阳线收盘进入前阴线实体但未超过中点，反弹力度不足延续下跌。', focus: '弱反弹中继', path: [[0, 0.034], [0.16, 0.012], [0.32, -0.012], [0.46, -0.030], [0.58, -0.024], [0.70, -0.036], [0.84, -0.044], [1, -0.072]] },
  // ── 稀有日本蜡烛形态 ──
  { key: 'ADVANCE_BLOCK_SETUP', name: '前进受阻走势', nameEn: 'Advance Block Setup', type: 'reversal', direction: 'bearish', confidence: 0.64, description: '上涨中三白兵实体逐渐缩小且上影加长，买方力量衰竭预示反转。', focus: '三阳递弱', path: [[0, -0.038], [0.16, -0.010], [0.32, 0.016], [0.46, 0.036], [0.58, 0.048], [0.68, 0.054], [0.78, 0.050], [0.84, 0.030], [1, -0.040]] },
  { key: 'DELIBERATION_SETUP', name: '停顿形态走势', nameEn: 'Deliberation Setup', type: 'reversal', direction: 'bearish', confidence: 0.63, description: '上涨中前两根大阳线后第三根变为小实体或十字星，动能突然枯竭。', focus: '三阳停顿', path: [[0, -0.040], [0.16, -0.012], [0.32, 0.018], [0.46, 0.040], [0.58, 0.052], [0.68, 0.056], [0.78, 0.054], [0.84, 0.034], [1, -0.038]] },
  { key: 'IDENTICAL_THREE_CROWS_SETUP', name: '相同三鸦走势', nameEn: 'Identical Three Crows Setup', type: 'reversal', direction: 'bearish', confidence: 0.74, description: '三根阴线每根开盘价等于前一根收盘价，无反弹地连续下跌，极度看空。', focus: '无反弹三阴', path: [[0, -0.036], [0.16, -0.008], [0.32, 0.020], [0.46, 0.044], [0.58, 0.038], [0.68, 0.018], [0.78, -0.004], [0.84, -0.022], [1, -0.066]] },
  { key: 'HOMING_PIGEON_SETUP', name: '归巢鸽走势', nameEn: 'Homing Pigeon Setup', type: 'reversal', direction: 'bullish', confidence: 0.64, description: '下跌中两根阴线第二根被第一根包裹，卖压减弱预示底部反转。', focus: '阴包阴缩量', path: [[0, 0.038], [0.18, 0.012], [0.36, -0.016], [0.52, -0.038], [0.66, -0.048], [0.78, -0.042], [0.84, -0.024], [1, 0.042]] },
  { key: 'UNIQUE_THREE_RIVER_BOTTOM', name: '独特三川底走势', nameEn: 'Unique Three River Bottom Setup', type: 'reversal', direction: 'bullish', confidence: 0.66, description: '大阴线+小实体(锤子/十字星)+阳线组合，卖压逐步衰竭后底部反转。', focus: '三川见底', path: [[0, 0.040], [0.18, 0.014], [0.36, -0.016], [0.52, -0.042], [0.66, -0.054], [0.76, -0.050], [0.84, -0.028], [1, 0.044]] },
  { key: 'THREE_STARS_IN_SOUTH', name: '南方三星走势', nameEn: 'Three Stars in the South Setup', type: 'reversal', direction: 'bullish', confidence: 0.65, description: '下跌末期三根阴线实体和下影逐渐缩短，卖方力量衰竭预示反转。', focus: '三阴递弱', path: [[0, 0.042], [0.16, 0.018], [0.32, -0.010], [0.46, -0.034], [0.58, -0.048], [0.68, -0.054], [0.78, -0.050], [0.84, -0.030], [1, 0.040]] },
  { key: 'STICK_SANDWICH_BULLISH', name: '看涨条形三明治', nameEn: 'Bullish Stick Sandwich', type: 'reversal', direction: 'bullish', confidence: 0.65, description: '阴线-阳线-阴线组合，两根阴线收盘价相同形成支撑，预示反弹。', focus: '双阴夹阳', path: [[0, 0.034], [0.18, 0.008], [0.36, -0.020], [0.50, -0.040], [0.62, -0.032], [0.72, -0.042], [0.84, -0.026], [1, 0.042]] },
  { key: 'STICK_SANDWICH_BEARISH', name: '看跌条形三明治', nameEn: 'Bearish Stick Sandwich', type: 'reversal', direction: 'bearish', confidence: 0.65, description: '阳线-阴线-阳线组合，两根阳线收盘价相同形成阻力，预示回落。', focus: '双阳夹阴', path: [[0, -0.034], [0.18, -0.008], [0.36, 0.020], [0.50, 0.040], [0.62, 0.032], [0.72, 0.042], [0.84, 0.026], [1, -0.042]] },
  { key: 'UPSIDE_TASUKI_GAP', name: '向上跳空并列走势', nameEn: 'Upside Tasuki Gap', type: 'continuation', direction: 'bullish', confidence: 0.68, description: '上涨中阳线跳空高开后小阴线回补部分缺口但未完全封闭，延续上涨。', focus: '跳空不补', path: [[0, -0.036], [0.14, -0.010], [0.28, 0.016], [0.42, 0.038], [0.54, 0.058], [0.64, 0.048], [0.74, 0.044], [0.84, 0.052], [1, 0.078]] },
  { key: 'DOWNSIDE_TASUKI_GAP', name: '向下跳空并列走势', nameEn: 'Downside Tasuki Gap', type: 'continuation', direction: 'bearish', confidence: 0.68, description: '下跌中阴线跳空低开后小阳线回补部分缺口但未完全封闭，延续下跌。', focus: '跳空不补', path: [[0, 0.036], [0.14, 0.010], [0.28, -0.016], [0.42, -0.038], [0.54, -0.058], [0.64, -0.048], [0.74, -0.044], [0.84, -0.052], [1, -0.078]] },
  { key: 'MAT_HOLD_BULLISH', name: '看涨铺垫走势', nameEn: 'Bullish Mat Hold Setup', type: 'continuation', direction: 'bullish', confidence: 0.74, description: '大阳线后接2-3根小阴线在其上半部整理(不跌破中点)，再大阳线突破。', focus: '高位铺垫', path: [[0, -0.038], [0.14, -0.008], [0.28, 0.024], [0.40, 0.048], [0.50, 0.040], [0.58, 0.036], [0.66, 0.032], [0.76, 0.042], [0.84, 0.054], [1, 0.080]] },
  { key: 'MAT_HOLD_BEARISH', name: '看跌铺垫走势', nameEn: 'Bearish Mat Hold Setup', type: 'continuation', direction: 'bearish', confidence: 0.74, description: '大阴线后接2-3根小阳线在其下半部整理(不涨破中点)，再大阴线跌破。', focus: '低位铺垫', path: [[0, 0.038], [0.14, 0.008], [0.28, -0.024], [0.40, -0.048], [0.50, -0.040], [0.58, -0.036], [0.66, -0.032], [0.76, -0.042], [0.84, -0.054], [1, -0.080]] },
  { key: 'SIDE_BY_SIDE_WHITE_BULLISH', name: '并列阳线(涨)', nameEn: 'Bullish Side-by-Side White Lines', type: 'continuation', direction: 'bullish', confidence: 0.66, description: '上涨中跳空后出现两根大小相近的阳线并列，确认跳空有效延续上涨。', focus: '并列确认', path: [[0, -0.034], [0.14, -0.008], [0.28, 0.018], [0.42, 0.040], [0.54, 0.058], [0.66, 0.054], [0.76, 0.056], [0.84, 0.060], [1, 0.082]] },
  { key: 'SIDE_BY_SIDE_BLACK_BEARISH', name: '并列阴线(跌)', nameEn: 'Bearish Side-by-Side Black Lines', type: 'continuation', direction: 'bearish', confidence: 0.66, description: '下跌中跳空后出现两根大小相近的阴线并列，确认跳空有效延续下跌。', focus: '并列确认', path: [[0, 0.034], [0.14, 0.008], [0.28, -0.018], [0.42, -0.040], [0.54, -0.058], [0.66, -0.054], [0.76, -0.056], [0.84, -0.060], [1, -0.082]] },
  { key: 'BREAKAWAY_BULLISH', name: '看涨脱离走势', nameEn: 'Bullish Breakaway Setup', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '下跌中跳空后3-4根小K线横盘，最后大阳线回补缺口并反转上涨。', focus: '脱离反转', path: [[0, 0.036], [0.14, 0.010], [0.28, -0.014], [0.40, -0.038], [0.50, -0.050], [0.58, -0.054], [0.66, -0.052], [0.76, -0.046], [0.84, -0.020], [1, 0.050]] },
  { key: 'BREAKAWAY_BEARISH', name: '看跌脱离走势', nameEn: 'Bearish Breakaway Setup', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '上涨中跳空后3-4根小K线横盘，最后大阴线回补缺口并反转下跌。', focus: '脱离反转', path: [[0, -0.036], [0.14, -0.010], [0.28, 0.014], [0.40, 0.038], [0.50, 0.050], [0.58, 0.054], [0.66, 0.052], [0.76, 0.046], [0.84, 0.020], [1, -0.050]] },
  { key: 'LADDER_TOP_SETUP', name: '梯顶走势', nameEn: 'Ladder Top Setup', type: 'reversal', direction: 'bearish', confidence: 0.67, description: '连续三根长阳线后出现小实体犹豫线，最后大阴线确认顶部反转。', focus: '梯顶反转', path: [[0, -0.044], [0.16, -0.020], [0.32, 0.010], [0.46, 0.036], [0.58, 0.054], [0.68, 0.062], [0.78, 0.056], [0.84, 0.026], [1, -0.048]] },
  { key: 'MEETING_LINES_BULLISH', name: '看涨约会线走势', nameEn: 'Bullish Meeting Lines Setup', type: 'reversal', direction: 'bullish', confidence: 0.62, description: '下跌中大阴线后大阳线收盘价与前一阴线收盘价相同(约会)，预示反转。', focus: '约会支撑', path: [[0, 0.036], [0.20, 0.010], [0.40, -0.016], [0.56, -0.040], [0.68, -0.050], [0.78, -0.036], [0.84, -0.014], [1, 0.046]] },
  { key: 'MEETING_LINES_BEARISH', name: '看跌约会线走势', nameEn: 'Bearish Meeting Lines Setup', type: 'reversal', direction: 'bearish', confidence: 0.62, description: '上涨中大阳线后大阴线收盘价与前一阳线收盘价相同(约会)，预示反转。', focus: '约会压力', path: [[0, -0.036], [0.20, -0.010], [0.40, 0.016], [0.56, 0.040], [0.68, 0.050], [0.78, 0.036], [0.84, 0.014], [1, -0.046]] },
  { key: 'HARAMI_CROSS_BULLISH', name: '看涨十字孕线走势', nameEn: 'Bullish Harami Cross Setup', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '下跌中十字星被前一大阴线包裹，比普通孕线反转信号更强。', focus: '十字孕线', path: [[0, 0.038], [0.20, 0.012], [0.40, -0.018], [0.56, -0.044], [0.68, -0.054], [0.78, -0.048], [0.84, -0.026], [1, 0.048]] },
  { key: 'HARAMI_CROSS_BEARISH', name: '看跌十字孕线走势', nameEn: 'Bearish Harami Cross Setup', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '上涨中十字星被前一大阳线包裹，比普通孕线反转信号更强。', focus: '十字孕线', path: [[0, -0.038], [0.20, -0.012], [0.40, 0.018], [0.56, 0.044], [0.68, 0.054], [0.78, 0.048], [0.84, 0.026], [1, -0.048]] },
  { key: 'DRAGONFLY_DOJI_SETUP', name: '蜻蜓十字走势', nameEn: 'Dragonfly Doji Setup', type: 'reversal', direction: 'bullish', confidence: 0.66, description: '下跌末期出现长下影无上影十字星(蜻蜓)，底部承接极强预示反转。', focus: '蜻蜓见底', path: [[0, 0.040], [0.20, 0.014], [0.38, -0.012], [0.54, -0.038], [0.66, -0.050], [0.76, -0.054], [0.84, -0.028], [1, 0.048]] },
  { key: 'GRAVESTONE_DOJI_SETUP', name: '墓碑十字走势', nameEn: 'Gravestone Doji Setup', type: 'reversal', direction: 'bearish', confidence: 0.66, description: '上涨末期出现长上影无下影十字星(墓碑)，上攻彻底失败预示反转。', focus: '墓碑见顶', path: [[0, -0.040], [0.20, -0.014], [0.38, 0.012], [0.54, 0.038], [0.66, 0.050], [0.76, 0.054], [0.84, 0.028], [1, -0.048]] },
  { key: 'HIGH_WAVE_SETUP', name: '高浪线走势', nameEn: 'High Wave Candle Setup', type: 'reversal', direction: 'bearish', confidence: 0.62, description: '趋势末期连续出现小实体长上下影K线，多空极度犹豫后趋势反转。', focus: '高浪犹豫', path: [[0, -0.036], [0.18, -0.010], [0.36, 0.018], [0.52, 0.040], [0.64, 0.050], [0.74, 0.046], [0.82, 0.042], [0.84, 0.020], [1, -0.044]] },
  { key: 'POPGUN_BULLISH', name: '看涨弹弓走势', nameEn: 'Bullish Popgun Setup', type: 'reversal', direction: 'bullish', confidence: 0.66, description: '内包线后紧接外包线向上突破，波动压缩后释放形成看涨。', focus: '压缩爆发', path: [[0, 0.032], [0.16, -0.004], [0.32, 0.012], [0.46, -0.018], [0.58, -0.010], [0.68, -0.024], [0.78, -0.030], [0.84, -0.008], [1, 0.054]] },
  { key: 'POPGUN_BEARISH', name: '看跌弹弓走势', nameEn: 'Bearish Popgun Setup', type: 'reversal', direction: 'bearish', confidence: 0.66, description: '内包线后紧接外包线向下跌破，波动压缩后释放形成看跌。', focus: '压缩爆发', path: [[0, -0.032], [0.16, 0.004], [0.32, -0.012], [0.46, 0.018], [0.58, 0.010], [0.68, 0.024], [0.78, 0.030], [0.84, 0.008], [1, -0.054]] },
  // ── 价格行为策略形态 ──
  { key: 'NR7_BREAKOUT_BULLISH', name: 'NR7窄幅突破(涨)', nameEn: 'NR7 Narrow Range Breakout Bullish', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '7日内最小振幅K线出现后向上突破，波动收敛后爆发延续上涨。', focus: '窄幅爆发', path: [[0, -0.028], [0.14, -0.008], [0.28, 0.010], [0.40, 0.006], [0.50, 0.012], [0.60, 0.008], [0.70, 0.014], [0.80, 0.010], [0.84, 0.018], [1, 0.068]] },
  { key: 'NR7_BREAKOUT_BEARISH', name: 'NR7窄幅跌破(跌)', nameEn: 'NR7 Narrow Range Breakout Bearish', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '7日内最小振幅K线出现后向下跌破，波动收敛后爆发延续下跌。', focus: '窄幅爆发', path: [[0, 0.028], [0.14, 0.008], [0.28, -0.010], [0.40, -0.006], [0.50, -0.012], [0.60, -0.008], [0.70, -0.014], [0.80, -0.010], [0.84, -0.018], [1, -0.068]] },
  { key: 'INSIDE_BAR_BULLISH', name: '内包线突破(涨)', nameEn: 'Inside Bar Bullish Breakout', type: 'continuation', direction: 'bullish', confidence: 0.68, description: '母线包裹子线后向上突破母线高点，波动收缩后爆发向上。', focus: '内包上破', path: [[0, -0.030], [0.16, -0.004], [0.32, 0.018], [0.46, 0.010], [0.58, 0.016], [0.68, 0.012], [0.78, 0.018], [0.84, 0.020], [1, 0.064]] },
  { key: 'INSIDE_BAR_BEARISH', name: '内包线跌破(跌)', nameEn: 'Inside Bar Bearish Breakout', type: 'continuation', direction: 'bearish', confidence: 0.68, description: '母线包裹子线后向下跌破母线低点，波动收缩后爆发向下。', focus: '内包下破', path: [[0, 0.030], [0.16, 0.004], [0.32, -0.018], [0.46, -0.010], [0.58, -0.016], [0.68, -0.012], [0.78, -0.018], [0.84, -0.020], [1, -0.064]] },
  { key: 'OUTSIDE_BAR_BULLISH', name: '外包线反转(涨)', nameEn: 'Outside Bar Bullish Reversal', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '下跌后出现高低点均超越前一根的大阳外包线，强势吞没后反转上涨。', focus: '外包翻多', path: [[0, 0.038], [0.18, 0.012], [0.36, -0.016], [0.52, -0.040], [0.66, -0.050], [0.78, -0.028], [0.84, -0.004], [1, 0.056]] },
  { key: 'OUTSIDE_BAR_BEARISH', name: '外包线反转(跌)', nameEn: 'Outside Bar Bearish Reversal', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '上涨后出现高低点均超越前一根的大阴外包线，强势吞没后反转下跌。', focus: '外包翻空', path: [[0, -0.038], [0.18, -0.012], [0.36, 0.016], [0.52, 0.040], [0.66, 0.050], [0.78, 0.028], [0.84, 0.004], [1, -0.056]] },
  { key: 'PIN_BAR_BULLISH', name: 'Pin Bar看涨走势', nameEn: 'Bullish Pin Bar Setup', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '关键支撑位出现长下影小实体Pin Bar，下方需求强烈后反弹上行。', focus: 'Pin Bar反转', path: [[0, 0.036], [0.18, 0.008], [0.36, -0.018], [0.52, -0.042], [0.66, -0.056], [0.78, -0.034], [0.84, -0.012], [1, 0.054]] },
  { key: 'PIN_BAR_BEARISH', name: 'Pin Bar看跌走势', nameEn: 'Bearish Pin Bar Setup', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '关键阻力位出现长上影小实体Pin Bar，上方供给强烈后回落下行。', focus: 'Pin Bar反转', path: [[0, -0.036], [0.18, -0.008], [0.36, 0.018], [0.52, 0.042], [0.66, 0.056], [0.78, 0.034], [0.84, 0.012], [1, -0.054]] },
  { key: 'TURTLE_SOUP_BULLISH', name: '海龟汤(涨)', nameEn: 'Turtle Soup Bullish', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '价格短暂跌破近期最低点后立即反转上涨(Larry Connors)，假破诱空。', focus: '假破新低', path: [[0, 0.026], [0.16, -0.010], [0.32, 0.008], [0.46, -0.016], [0.58, -0.008], [0.68, -0.044], [0.78, -0.054], [0.84, -0.018], [1, 0.056]] },
  { key: 'TURTLE_SOUP_BEARISH', name: '海龟汤(跌)', nameEn: 'Turtle Soup Bearish', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '价格短暂突破近期最高点后立即反转下跌，假破诱多。', focus: '假破新高', path: [[0, -0.026], [0.16, 0.010], [0.32, -0.008], [0.46, 0.016], [0.58, 0.008], [0.68, 0.044], [0.78, 0.054], [0.84, 0.018], [1, -0.056]] },
  { key: 'ORB_BULLISH', name: '开盘区间突破(涨)', nameEn: 'Opening Range Breakout Bullish', type: 'continuation', direction: 'bullish', confidence: 0.68, description: '开盘后价格在狭窄区间整理，随后向上突破区间高点延续上涨。', focus: '区间上破', path: [[0, -0.020], [0.12, -0.008], [0.24, 0.004], [0.36, -0.002], [0.48, 0.006], [0.60, 0.000], [0.70, 0.004], [0.78, 0.010], [0.84, 0.020], [1, 0.068]] },
  { key: 'ORB_BEARISH', name: '开盘区间跌破(跌)', nameEn: 'Opening Range Breakout Bearish', type: 'continuation', direction: 'bearish', confidence: 0.68, description: '开盘后价格在狭窄区间整理，随后向下跌破区间低点延续下跌。', focus: '区间下破', path: [[0, 0.020], [0.12, 0.008], [0.24, -0.004], [0.36, 0.002], [0.48, -0.006], [0.60, 0.000], [0.70, -0.004], [0.78, -0.010], [0.84, -0.020], [1, -0.068]] },
  // ── ICT/SMC 高级概念 ──
  { key: 'ICT_OTE_BULLISH', name: 'ICT最优入场(涨)', nameEn: 'ICT Optimal Trade Entry Bullish', type: 'continuation', direction: 'bullish', confidence: 0.73, description: '上涨趋势中价格回调至61.8%-79%斐波那契区间(OTE区)获得支撑后延续上涨。', focus: 'OTE区做多', path: [[0, -0.040], [0.14, -0.010], [0.28, 0.024], [0.40, 0.048], [0.52, 0.032], [0.62, 0.022], [0.72, 0.018], [0.80, 0.026], [0.84, 0.036], [1, 0.074]] },
  { key: 'ICT_OTE_BEARISH', name: 'ICT最优入场(跌)', nameEn: 'ICT Optimal Trade Entry Bearish', type: 'continuation', direction: 'bearish', confidence: 0.73, description: '下跌趋势中价格反弹至61.8%-79%斐波那契区间(OTE区)遇阻后延续下跌。', focus: 'OTE区做空', path: [[0, 0.040], [0.14, 0.010], [0.28, -0.024], [0.40, -0.048], [0.52, -0.032], [0.62, -0.022], [0.72, -0.018], [0.80, -0.026], [0.84, -0.036], [1, -0.074]] },
  { key: 'ICT_SILVER_BULLET_BULLISH', name: 'ICT银弹(涨)', nameEn: 'ICT Silver Bullet Bullish', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '特定时段(10-11/14-15/02-03 EST)内扫盘后在FVG处入场做多。', focus: '时段FVG入场', path: [[0, 0.024], [0.14, -0.010], [0.28, 0.006], [0.42, -0.020], [0.56, -0.008], [0.66, -0.044], [0.76, -0.052], [0.84, -0.016], [1, 0.058]] },
  { key: 'ICT_SILVER_BULLET_BEARISH', name: 'ICT银弹(跌)', nameEn: 'ICT Silver Bullet Bearish', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '特定时段(10-11/14-15/02-03 EST)内扫盘后在FVG处入场做空。', focus: '时段FVG入场', path: [[0, -0.024], [0.14, 0.010], [0.28, -0.006], [0.42, 0.020], [0.56, 0.008], [0.66, 0.044], [0.76, 0.052], [0.84, 0.016], [1, -0.058]] },
  { key: 'SMC_MSS_BULLISH', name: 'SMC市场结构转变(涨)', nameEn: 'SMC Market Structure Shift Bullish', type: 'reversal', direction: 'bullish', confidence: 0.74, description: '下跌结构中价格突破最近一个关键高点(HH)，确认市场结构从空转多。', focus: '结构转多', path: [[0, 0.040], [0.12, 0.010], [0.24, -0.016], [0.36, -0.034], [0.46, -0.020], [0.56, -0.044], [0.66, -0.028], [0.76, -0.050], [0.84, -0.014], [1, 0.058]] },
  { key: 'SMC_MSS_BEARISH', name: 'SMC市场结构转变(跌)', nameEn: 'SMC Market Structure Shift Bearish', type: 'reversal', direction: 'bearish', confidence: 0.74, description: '上涨结构中价格跌破最近一个关键低点(LL)，确认市场结构从多转空。', focus: '结构转空', path: [[0, -0.040], [0.12, -0.010], [0.24, 0.016], [0.36, 0.034], [0.46, 0.020], [0.56, 0.044], [0.66, 0.028], [0.76, 0.050], [0.84, 0.014], [1, -0.058]] },
  { key: 'SMC_CHOCH_BULLISH', name: 'SMC性格变化(涨)', nameEn: 'SMC Change of Character Bullish', type: 'reversal', direction: 'bullish', confidence: 0.73, description: '下跌趋势中首次突破前高(ChoCh)，标志趋势性格从空头转为多头。', focus: 'ChoCh翻多', path: [[0, 0.038], [0.12, 0.012], [0.24, -0.012], [0.36, -0.030], [0.46, -0.016], [0.56, -0.040], [0.66, -0.024], [0.76, -0.046], [0.84, -0.008], [1, 0.054]] },
  { key: 'SMC_CHOCH_BEARISH', name: 'SMC性格变化(跌)', nameEn: 'SMC Change of Character Bearish', type: 'reversal', direction: 'bearish', confidence: 0.73, description: '上涨趋势中首次跌破前低(ChoCh)，标志趋势性格从多头转为空头。', focus: 'ChoCh翻空', path: [[0, -0.038], [0.12, -0.012], [0.24, 0.012], [0.36, 0.030], [0.46, 0.016], [0.56, 0.040], [0.66, 0.024], [0.76, 0.046], [0.84, 0.008], [1, -0.054]] },
  // ── Wyckoff 延续形态 ──
  { key: 'WYCKOFF_REACCUMULATION', name: 'Wyckoff再吸筹', nameEn: 'Wyckoff Re-accumulation', type: 'continuation', direction: 'bullish', confidence: 0.74, description: '上涨趋势中出现横盘整理(再吸筹)，机构继续建仓后推动新一轮上涨。', focus: '中继吸筹', path: [[0, -0.044], [0.12, -0.014], [0.24, 0.014], [0.36, 0.032], [0.46, 0.024], [0.56, 0.028], [0.66, 0.020], [0.76, 0.026], [0.84, 0.034], [1, 0.074]] },
  { key: 'WYCKOFF_REDISTRIBUTION', name: 'Wyckoff再派发', nameEn: 'Wyckoff Re-distribution', type: 'continuation', direction: 'bearish', confidence: 0.74, description: '下跌趋势中出现横盘整理(再派发)，机构继续出货后推动新一轮下跌。', focus: '中继派发', path: [[0, 0.044], [0.12, 0.014], [0.24, -0.014], [0.36, -0.032], [0.46, -0.024], [0.56, -0.028], [0.66, -0.020], [0.76, -0.026], [0.84, -0.034], [1, -0.074]] },
  // ── 分形与其他 ──
  { key: 'FRACTAL_REVERSAL_BULLISH', name: '分形底部反转', nameEn: 'Bullish Fractal Reversal', type: 'reversal', direction: 'bullish', confidence: 0.66, description: '5根K线中间一根最低(Bill Williams分形)，分形低点确认后价格反弹上行。', focus: '分形见底', path: [[0, 0.032], [0.16, 0.004], [0.32, -0.018], [0.46, -0.038], [0.58, -0.050], [0.68, -0.038], [0.78, -0.018], [0.84, -0.004], [1, 0.048]] },
  { key: 'FRACTAL_REVERSAL_BEARISH', name: '分形顶部反转', nameEn: 'Bearish Fractal Reversal', type: 'reversal', direction: 'bearish', confidence: 0.66, description: '5根K线中间一根最高(Bill Williams分形)，分形高点确认后价格回落下行。', focus: '分形见顶', path: [[0, -0.032], [0.16, -0.004], [0.32, 0.018], [0.46, 0.038], [0.58, 0.050], [0.68, 0.038], [0.78, 0.018], [0.84, 0.004], [1, -0.048]] },
  // ── 斐波那契回调形态 ──
  { key: 'FIB_RETRACEMENT_382_BULLISH', name: '斐波那契38.2%回调(涨)', nameEn: 'Fib 38.2% Retracement Bullish', type: 'continuation', direction: 'bullish', confidence: 0.72, description: '上涨趋势中价格回调至38.2%斐波那契位获得支撑后延续上涨，浅回调显示趋势极强。', focus: '38.2%支撑', path: [[0, -0.044], [0.12, -0.016], [0.24, 0.016], [0.36, 0.044], [0.48, 0.034], [0.58, 0.028], [0.68, 0.032], [0.78, 0.040], [0.84, 0.050], [1, 0.082]] },
  { key: 'FIB_RETRACEMENT_382_BEARISH', name: '斐波那契38.2%反弹(跌)', nameEn: 'Fib 38.2% Retracement Bearish', type: 'continuation', direction: 'bearish', confidence: 0.72, description: '下跌趋势中价格反弹至38.2%斐波那契位遇阻后延续下跌，浅反弹显示趋势极弱。', focus: '38.2%压力', path: [[0, 0.044], [0.12, 0.016], [0.24, -0.016], [0.36, -0.044], [0.48, -0.034], [0.58, -0.028], [0.68, -0.032], [0.78, -0.040], [0.84, -0.050], [1, -0.082]] },
  { key: 'FIB_RETRACEMENT_500_BULLISH', name: '斐波那契50%回调(涨)', nameEn: 'Fib 50% Retracement Bullish', type: 'continuation', direction: 'bullish', confidence: 0.74, description: '上涨趋势中价格回调至50%斐波那契位(半分位)获得支撑后恢复上涨。', focus: '50%半分位', path: [[0, -0.042], [0.12, -0.012], [0.24, 0.020], [0.36, 0.048], [0.48, 0.024], [0.58, 0.016], [0.68, 0.022], [0.78, 0.034], [0.84, 0.046], [1, 0.080]] },
  { key: 'FIB_RETRACEMENT_500_BEARISH', name: '斐波那契50%反弹(跌)', nameEn: 'Fib 50% Retracement Bearish', type: 'continuation', direction: 'bearish', confidence: 0.74, description: '下跌趋势中价格反弹至50%斐波那契位(半分位)遇阻后恢复下跌。', focus: '50%半分位', path: [[0, 0.042], [0.12, 0.012], [0.24, -0.020], [0.36, -0.048], [0.48, -0.024], [0.58, -0.016], [0.68, -0.022], [0.78, -0.034], [0.84, -0.046], [1, -0.080]] },
  { key: 'FIB_RETRACEMENT_618_BULLISH', name: '斐波那契61.8%黄金回调(涨)', nameEn: 'Fib 61.8% Golden Retracement Bullish', type: 'continuation', direction: 'bullish', confidence: 0.76, description: '上涨趋势中价格深度回调至61.8%黄金比例位获得强支撑后反弹，最经典的斐波那契交易位。', focus: '黄金回调', path: [[0, -0.040], [0.12, -0.008], [0.24, 0.024], [0.36, 0.052], [0.48, 0.016], [0.58, 0.006], [0.68, 0.014], [0.78, 0.028], [0.84, 0.042], [1, 0.078]] },
  { key: 'FIB_RETRACEMENT_618_BEARISH', name: '斐波那契61.8%黄金反弹(跌)', nameEn: 'Fib 61.8% Golden Retracement Bearish', type: 'continuation', direction: 'bearish', confidence: 0.76, description: '下跌趋势中价格深度反弹至61.8%黄金比例位遇强阻后回落，最经典的斐波那契做空位。', focus: '黄金反弹', path: [[0, 0.040], [0.12, 0.008], [0.24, -0.024], [0.36, -0.052], [0.48, -0.016], [0.58, -0.006], [0.68, -0.014], [0.78, -0.028], [0.84, -0.042], [1, -0.078]] },
  // ── 斐波那契扩展形态 ──
  { key: 'FIB_EXTENSION_1272_BULLISH', name: '斐波那契127.2%扩展(涨)', nameEn: 'Fib 127.2% Extension Bullish', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '价格突破前高后延伸至127.2%斐波那契扩展位，到达后可能出现阶段性整理。', focus: '127.2%目标', path: [[0, -0.044], [0.12, -0.018], [0.24, 0.010], [0.36, 0.032], [0.48, 0.020], [0.58, 0.036], [0.68, 0.050], [0.78, 0.058], [0.84, 0.064], [1, 0.054]] },
  { key: 'FIB_EXTENSION_1272_BEARISH', name: '斐波那契127.2%扩展(跌)', nameEn: 'Fib 127.2% Extension Bearish', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '价格跌破前低后延伸至127.2%斐波那契扩展位，到达后可能出现阶段性反弹。', focus: '127.2%目标', path: [[0, 0.044], [0.12, 0.018], [0.24, -0.010], [0.36, -0.032], [0.48, -0.020], [0.58, -0.036], [0.68, -0.050], [0.78, -0.058], [0.84, -0.064], [1, -0.054]] },
  { key: 'FIB_EXTENSION_1618_BULLISH', name: '斐波那契161.8%黄金扩展(涨)', nameEn: 'Fib 161.8% Golden Extension Bullish', type: 'continuation', direction: 'bullish', confidence: 0.72, description: '价格突破前高后延伸至161.8%黄金扩展位，是最重要的目标价位之一。', focus: '161.8%黄金目标', path: [[0, -0.046], [0.10, -0.020], [0.22, 0.008], [0.34, 0.030], [0.44, 0.018], [0.54, 0.034], [0.64, 0.052], [0.74, 0.064], [0.84, 0.076], [1, 0.066]] },
  { key: 'FIB_EXTENSION_1618_BEARISH', name: '斐波那契161.8%黄金扩展(跌)', nameEn: 'Fib 161.8% Golden Extension Bearish', type: 'continuation', direction: 'bearish', confidence: 0.72, description: '价格跌破前低后延伸至161.8%黄金扩展位，是最重要的支撑目标之一。', focus: '161.8%黄金目标', path: [[0, 0.046], [0.10, 0.020], [0.22, -0.008], [0.34, -0.030], [0.44, -0.018], [0.54, -0.034], [0.64, -0.052], [0.74, -0.064], [0.84, -0.076], [1, -0.066]] },
  { key: 'FIB_CLUSTER_BULLISH', name: '斐波那契簇支撑(涨)', nameEn: 'Fibonacci Cluster Support Bullish', type: 'reversal', direction: 'bullish', confidence: 0.78, description: '多个不同波段的斐波那契回调/扩展在同一价位汇聚形成超强支撑(簇)，反弹概率极高。', focus: '多重斐波共振', path: [[0, 0.034], [0.14, -0.006], [0.28, 0.016], [0.42, -0.020], [0.54, -0.042], [0.64, -0.054], [0.74, -0.028], [0.84, -0.006], [1, 0.062]] },
  { key: 'FIB_CLUSTER_BEARISH', name: '斐波那契簇压力(跌)', nameEn: 'Fibonacci Cluster Resistance Bearish', type: 'reversal', direction: 'bearish', confidence: 0.78, description: '多个不同波段的斐波那契回调/扩展在同一价位汇聚形成超强阻力(簇)，回落概率极高。', focus: '多重斐波共振', path: [[0, -0.034], [0.14, 0.006], [0.28, -0.016], [0.42, 0.020], [0.54, 0.042], [0.64, 0.054], [0.74, 0.028], [0.84, 0.006], [1, -0.062]] },
  // ── 艾略特波浪细分形态 ──
  { key: 'ELLIOTT_WAVE1_BULLISH', name: 'Elliott第1浪启动(涨)', nameEn: 'Elliott Wave 1 Bullish', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '下跌末期第1浪启动，通常被视为反弹而非新趋势，突破后确认趋势转换。', focus: '第1浪启动', path: [[0, 0.044], [0.12, 0.018], [0.24, -0.010], [0.36, -0.034], [0.48, -0.046], [0.58, -0.038], [0.68, -0.020], [0.78, -0.004], [0.84, 0.010], [1, 0.046]] },
  { key: 'ELLIOTT_WAVE1_BEARISH', name: 'Elliott第1浪启动(跌)', nameEn: 'Elliott Wave 1 Bearish', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '上涨末期第1浪下跌启动，通常被视为回调而非新趋势，跌破后确认趋势转换。', focus: '第1浪启动', path: [[0, -0.044], [0.12, -0.018], [0.24, 0.010], [0.36, 0.034], [0.48, 0.046], [0.58, 0.038], [0.68, 0.020], [0.78, 0.004], [0.84, -0.010], [1, -0.046]] },
  { key: 'ELLIOTT_WAVE3_BULLISH', name: 'Elliott第3浪主升(涨)', nameEn: 'Elliott Wave 3 Bullish', type: 'continuation', direction: 'bullish', confidence: 0.82, description: '第2浪回调完成后第3浪启动，通常是最长最强的推动浪，伴随放量和加速。', focus: '第3浪加速', path: [[0, -0.034], [0.10, 0.004], [0.20, 0.030], [0.28, 0.018], [0.36, 0.010], [0.46, 0.022], [0.56, 0.040], [0.66, 0.054], [0.76, 0.066], [0.84, 0.074], [1, 0.094]] },
  { key: 'ELLIOTT_WAVE3_BEARISH', name: 'Elliott第3浪主跌(跌)', nameEn: 'Elliott Wave 3 Bearish', type: 'continuation', direction: 'bearish', confidence: 0.82, description: '第2浪反弹完成后第3浪启动，通常是最长最猛的下跌浪，恐慌性抛售。', focus: '第3浪暴跌', path: [[0, 0.034], [0.10, -0.004], [0.20, -0.030], [0.28, -0.018], [0.36, -0.010], [0.46, -0.022], [0.56, -0.040], [0.66, -0.054], [0.76, -0.066], [0.84, -0.074], [1, -0.094]] },
  { key: 'ELLIOTT_WAVE5_BULLISH', name: 'Elliott第5浪终浪(涨)', nameEn: 'Elliott Wave 5 Bullish', type: 'continuation', direction: 'bullish', confidence: 0.65, description: '第4浪调整完成后最后一浪上涨，动能通常弱于第3浪，背离信号频现。', focus: '终浪冲顶', path: [[0, -0.028], [0.12, 0.006], [0.24, 0.028], [0.36, 0.016], [0.48, 0.010], [0.58, 0.020], [0.68, 0.032], [0.78, 0.040], [0.84, 0.046], [1, 0.036]] },
  { key: 'ELLIOTT_WAVE5_BEARISH', name: 'Elliott第5浪终浪(跌)', nameEn: 'Elliott Wave 5 Bearish', type: 'continuation', direction: 'bearish', confidence: 0.65, description: '第4浪反弹完成后最后一浪下跌，动能通常弱于第3浪，底背离信号频现。', focus: '终浪探底', path: [[0, 0.028], [0.12, -0.006], [0.24, -0.028], [0.36, -0.016], [0.48, -0.010], [0.58, -0.020], [0.68, -0.032], [0.78, -0.040], [0.84, -0.046], [1, -0.036]] },
  { key: 'ELLIOTT_ZIGZAG_BULLISH', name: 'Elliott锯齿形调整(涨)', nameEn: 'Elliott Zigzag Correction Bullish', type: 'continuation', direction: 'bullish', confidence: 0.74, description: '上涨趋势中ABC三浪锯齿形深度调整(5-3-5结构)完成后恢复上涨。', focus: 'ABC锯齿完成', path: [[0, -0.036], [0.10, 0.002], [0.20, 0.032], [0.30, 0.052], [0.40, 0.028], [0.50, 0.014], [0.58, 0.006], [0.66, 0.018], [0.74, 0.004], [0.84, 0.010], [1, 0.070]] },
  { key: 'ELLIOTT_ZIGZAG_BEARISH', name: 'Elliott锯齿形调整(跌)', nameEn: 'Elliott Zigzag Correction Bearish', type: 'continuation', direction: 'bearish', confidence: 0.74, description: '下跌趋势中ABC三浪锯齿形深度反弹(5-3-5结构)完成后恢复下跌。', focus: 'ABC锯齿完成', path: [[0, 0.036], [0.10, -0.002], [0.20, -0.032], [0.30, -0.052], [0.40, -0.028], [0.50, -0.014], [0.58, -0.006], [0.66, -0.018], [0.74, -0.004], [0.84, -0.010], [1, -0.070]] },
  { key: 'ELLIOTT_FLAT_BULLISH', name: 'Elliott平台形调整(涨)', nameEn: 'Elliott Flat Correction Bullish', type: 'continuation', direction: 'bullish', confidence: 0.72, description: '上涨趋势中ABC三浪平台形横向调整(3-3-5结构)完成后恢复上涨。', focus: '平台形完成', path: [[0, -0.038], [0.12, -0.004], [0.24, 0.024], [0.36, 0.046], [0.46, 0.034], [0.56, 0.040], [0.66, 0.028], [0.76, 0.024], [0.84, 0.032], [1, 0.072]] },
  { key: 'ELLIOTT_FLAT_BEARISH', name: 'Elliott平台形调整(跌)', nameEn: 'Elliott Flat Correction Bearish', type: 'continuation', direction: 'bearish', confidence: 0.72, description: '下跌趋势中ABC三浪平台形横向反弹(3-3-5结构)完成后恢复下跌。', focus: '平台形完成', path: [[0, 0.038], [0.12, 0.004], [0.24, -0.024], [0.36, -0.046], [0.46, -0.034], [0.56, -0.040], [0.66, -0.028], [0.76, -0.024], [0.84, -0.032], [1, -0.072]] },
  { key: 'ELLIOTT_TRIANGLE_BULLISH', name: 'Elliott三角形调整(涨)', nameEn: 'Elliott Triangle Correction Bullish', type: 'continuation', direction: 'bullish', confidence: 0.74, description: '第4浪常见的收敛三角形调整(ABCDE五子浪)，完成后第5浪上涨启动。', focus: '第4浪三角完成', path: [[0, -0.030], [0.10, 0.006], [0.24, 0.034], [0.34, 0.050], [0.44, 0.032], [0.52, 0.042], [0.60, 0.036], [0.68, 0.040], [0.76, 0.038], [0.84, 0.042], [1, 0.076]] },
  { key: 'ELLIOTT_TRIANGLE_BEARISH', name: 'Elliott三角形调整(跌)', nameEn: 'Elliott Triangle Correction Bearish', type: 'continuation', direction: 'bearish', confidence: 0.74, description: '第4浪常见的收敛三角形调整(ABCDE五子浪)，完成后第5浪下跌启动。', focus: '第4浪三角完成', path: [[0, 0.030], [0.10, -0.006], [0.24, -0.034], [0.34, -0.050], [0.44, -0.032], [0.52, -0.042], [0.60, -0.036], [0.68, -0.040], [0.76, -0.038], [0.84, -0.042], [1, -0.076]] },
  { key: 'ELLIOTT_EXPANDED_FLAT_BULLISH', name: 'Elliott扩展平台形(涨)', nameEn: 'Elliott Expanded Flat Bullish', type: 'continuation', direction: 'bullish', confidence: 0.72, description: 'B浪超越起点、C浪跌破A浪终点的扩展平台形调整，完成后强势上涨。', focus: '扩展平台完成', path: [[0, -0.034], [0.10, 0.002], [0.22, 0.028], [0.32, 0.044], [0.42, 0.050], [0.50, 0.038], [0.58, 0.020], [0.66, 0.008], [0.74, 0.016], [0.84, 0.028], [1, 0.074]] },
  { key: 'ELLIOTT_EXPANDED_FLAT_BEARISH', name: 'Elliott扩展平台形(跌)', nameEn: 'Elliott Expanded Flat Bearish', type: 'continuation', direction: 'bearish', confidence: 0.72, description: 'B浪跌破起点、C浪突破A浪终点的扩展平台形反弹，完成后强势下跌。', focus: '扩展平台完成', path: [[0, 0.034], [0.10, -0.002], [0.22, -0.028], [0.32, -0.044], [0.42, -0.050], [0.50, -0.038], [0.58, -0.020], [0.66, -0.008], [0.74, -0.016], [0.84, -0.028], [1, -0.074]] },
  { key: 'ELLIOTT_DOUBLE_ZIGZAG_BULLISH', name: 'Elliott双锯齿调整(涨)', nameEn: 'Elliott Double Zigzag Bullish', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '两组ABC锯齿由X浪连接(WXY)的复杂深度调整，完成后恢复上涨。', focus: '双锯齿完成', path: [[0, -0.032], [0.08, 0.006], [0.18, 0.034], [0.28, 0.048], [0.36, 0.024], [0.44, 0.014], [0.52, 0.026], [0.60, 0.010], [0.68, -0.004], [0.76, 0.006], [0.84, 0.016], [1, 0.066]] },
  { key: 'ELLIOTT_DOUBLE_ZIGZAG_BEARISH', name: 'Elliott双锯齿调整(跌)', nameEn: 'Elliott Double Zigzag Bearish', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '两组ABC锯齿由X浪连接(WXY)的复杂深度反弹，完成后恢复下跌。', focus: '双锯齿完成', path: [[0, 0.032], [0.08, -0.006], [0.18, -0.034], [0.28, -0.048], [0.36, -0.024], [0.44, -0.014], [0.52, -0.026], [0.60, -0.010], [0.68, 0.004], [0.76, -0.006], [0.84, -0.016], [1, -0.066]] },
  { key: 'ELLIOTT_TRUNCATION_TOP', name: 'Elliott截断顶(第5浪失败)', nameEn: 'Elliott Truncated 5th Wave Top', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '第5浪未能超越第3浪高点即回落(截断)，显示多头极度疲弱，预示大级别反转。', focus: '第5浪截断', path: [[0, -0.030], [0.10, 0.002], [0.22, 0.034], [0.32, 0.054], [0.42, 0.036], [0.52, 0.044], [0.62, 0.048], [0.72, 0.040], [0.80, 0.022], [0.84, 0.006], [1, -0.054]] },
  { key: 'ELLIOTT_TRUNCATION_BOTTOM', name: 'Elliott截断底(第5浪失败)', nameEn: 'Elliott Truncated 5th Wave Bottom', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '第5浪未能跌破第3浪低点即反弹(截断)，显示空头极度疲弱，预示大级别反转。', focus: '第5浪截断', path: [[0, 0.030], [0.10, -0.002], [0.22, -0.034], [0.32, -0.054], [0.42, -0.036], [0.52, -0.044], [0.62, -0.048], [0.72, -0.040], [0.80, -0.022], [0.84, -0.006], [1, 0.054]] },
  { key: 'ELLIOTT_WXY_BULLISH', name: 'Elliott WXY复合调整(涨)', nameEn: 'Elliott WXY Complex Correction Bullish', type: 'continuation', direction: 'bullish', confidence: 0.68, description: 'W-X-Y三组子浪构成的复杂调整模式，时间长但调整完成后趋势延续上涨。', focus: 'WXY完成', path: [[0, -0.030], [0.08, 0.004], [0.18, 0.030], [0.26, 0.042], [0.34, 0.024], [0.42, 0.032], [0.50, 0.018], [0.58, 0.024], [0.66, 0.012], [0.74, 0.018], [0.84, 0.024], [1, 0.064]] },
  { key: 'ELLIOTT_WXY_BEARISH', name: 'Elliott WXY复合调整(跌)', nameEn: 'Elliott WXY Complex Correction Bearish', type: 'continuation', direction: 'bearish', confidence: 0.68, description: 'W-X-Y三组子浪构成的复杂反弹模式，时间长但反弹完成后趋势延续下跌。', focus: 'WXY完成', path: [[0, 0.030], [0.08, -0.004], [0.18, -0.030], [0.26, -0.042], [0.34, -0.024], [0.42, -0.032], [0.50, -0.018], [0.58, -0.024], [0.66, -0.012], [0.74, -0.018], [0.84, -0.024], [1, -0.064]] },
  // ── 稀有谐波形态 ──
  { key: 'DEEP_CRAB_BULLISH', name: '深度螃蟹(涨)', nameEn: 'Deep Crab Bullish', type: 'reversal', direction: 'bullish', confidence: 0.72, description: 'Crab变体，B点回调至XA的88.6%，D点在XA的161.8%扩展处精确反转做多。', focus: 'D点161.8%', path: [[0, 0.028], [0.10, -0.020], [0.20, 0.016], [0.30, -0.028], [0.40, 0.012], [0.50, -0.024], [0.60, -0.048], [0.70, -0.066], [0.80, -0.036], [0.84, -0.010], [1, 0.054]] },
  { key: 'DEEP_CRAB_BEARISH', name: '深度螃蟹(跌)', nameEn: 'Deep Crab Bearish', type: 'reversal', direction: 'bearish', confidence: 0.72, description: 'Crab变体，B点反弹至XA的88.6%，D点在XA的161.8%扩展处精确反转做空。', focus: 'D点161.8%', path: [[0, -0.028], [0.10, 0.020], [0.20, -0.016], [0.30, 0.028], [0.40, -0.012], [0.50, 0.024], [0.60, 0.048], [0.70, 0.066], [0.80, 0.036], [0.84, 0.010], [1, -0.054]] },
  { key: 'NEN_STAR_BULLISH', name: 'Nen Star(涨)', nameEn: 'Nen Star Bullish', type: 'reversal', direction: 'bullish', confidence: 0.70, description: '五点谐波结构，B点回调至XA的38.2%，D点在BC的127.2%-161.8%扩展处反转。', focus: 'Nen Star反转', path: [[0, 0.030], [0.10, -0.016], [0.20, 0.012], [0.30, -0.022], [0.42, 0.014], [0.52, -0.020], [0.62, -0.044], [0.72, -0.058], [0.80, -0.030], [0.84, -0.008], [1, 0.050]] },
  { key: 'NEN_STAR_BEARISH', name: 'Nen Star(跌)', nameEn: 'Nen Star Bearish', type: 'reversal', direction: 'bearish', confidence: 0.70, description: '五点谐波结构，B点反弹至XA的38.2%，D点在BC的127.2%-161.8%扩展处反转。', focus: 'Nen Star反转', path: [[0, -0.030], [0.10, 0.016], [0.20, -0.012], [0.30, 0.022], [0.42, -0.014], [0.52, 0.020], [0.62, 0.044], [0.72, 0.058], [0.80, 0.030], [0.84, 0.008], [1, -0.050]] },
  { key: 'BLACK_SWAN_BULLISH', name: '黑天鹅(涨)', nameEn: 'Black Swan Bullish', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '反谐波形态，与Crab结构镜像，D点大幅超越X点后在扩展区域反转做多。', focus: '反谐波反转', path: [[0, 0.024], [0.10, -0.014], [0.22, 0.018], [0.34, -0.024], [0.46, 0.008], [0.56, -0.030], [0.66, -0.056], [0.76, -0.070], [0.84, -0.032], [1, 0.048]] },
  { key: 'BLACK_SWAN_BEARISH', name: '黑天鹅(跌)', nameEn: 'Black Swan Bearish', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '反谐波形态，与Crab结构镜像，D点大幅超越X点后在扩展区域反转做空。', focus: '反谐波反转', path: [[0, -0.024], [0.10, 0.014], [0.22, -0.018], [0.34, 0.024], [0.46, -0.008], [0.56, 0.030], [0.66, 0.056], [0.76, 0.070], [0.84, 0.032], [1, -0.048]] },
  { key: 'WHITE_SWAN_BULLISH', name: '白天鹅(涨)', nameEn: 'White Swan Bullish', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '反谐波形态，与Butterfly结构镜像，D点在较浅扩展位反转做多。', focus: '白天鹅反转', path: [[0, 0.026], [0.12, -0.012], [0.24, 0.016], [0.36, -0.020], [0.48, 0.010], [0.58, -0.024], [0.68, -0.044], [0.78, -0.056], [0.84, -0.026], [1, 0.046]] },
  { key: 'WHITE_SWAN_BEARISH', name: '白天鹅(跌)', nameEn: 'White Swan Bearish', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '反谐波形态，与Butterfly结构镜像，D点在较浅扩展位反转做空。', focus: '白天鹅反转', path: [[0, -0.026], [0.12, 0.012], [0.24, -0.016], [0.36, 0.020], [0.48, -0.010], [0.58, 0.024], [0.68, 0.044], [0.78, 0.056], [0.84, 0.026], [1, -0.046]] },
  { key: 'NAVARRO_200_BULLISH', name: 'Navarro 200(涨)', nameEn: 'Navarro 200 Bullish', type: 'reversal', direction: 'bullish', confidence: 0.69, description: '稀有谐波模式，AB=CD且BC延展至200%，D点精确完成后反转做多。', focus: 'Navarro完成', path: [[0, 0.032], [0.10, -0.018], [0.22, 0.014], [0.34, -0.026], [0.46, 0.006], [0.56, -0.022], [0.66, -0.050], [0.76, -0.064], [0.84, -0.028], [1, 0.052]] },
  { key: 'NAVARRO_200_BEARISH', name: 'Navarro 200(跌)', nameEn: 'Navarro 200 Bearish', type: 'reversal', direction: 'bearish', confidence: 0.69, description: '稀有谐波模式，AB=CD且BC延展至200%，D点精确完成后反转做空。', focus: 'Navarro完成', path: [[0, -0.032], [0.10, 0.018], [0.22, -0.014], [0.34, 0.026], [0.46, -0.006], [0.56, 0.022], [0.66, 0.050], [0.76, 0.064], [0.84, 0.028], [1, -0.052]] },
  // ── ICT 高级概念 II ──
  { key: 'ICT_JUDAS_SWING_BULLISH', name: 'ICT犹大摆动(涨)', nameEn: 'ICT Judas Swing Bullish', type: 'reversal', direction: 'bullish', confidence: 0.72, description: '开盘时向下假突破(犹大摆动)诱空后快速反转上涨，经典ICT日内策略。', focus: '开盘假破', path: [[0, 0.016], [0.10, -0.008], [0.20, 0.006], [0.30, -0.012], [0.40, -0.004], [0.50, -0.034], [0.60, -0.042], [0.70, -0.016], [0.78, 0.010], [0.84, 0.026], [1, 0.064]] },
  { key: 'ICT_JUDAS_SWING_BEARISH', name: 'ICT犹大摆动(跌)', nameEn: 'ICT Judas Swing Bearish', type: 'reversal', direction: 'bearish', confidence: 0.72, description: '开盘时向上假突破(犹大摆动)诱多后快速反转下跌，经典ICT日内策略。', focus: '开盘假破', path: [[0, -0.016], [0.10, 0.008], [0.20, -0.006], [0.30, 0.012], [0.40, 0.004], [0.50, 0.034], [0.60, 0.042], [0.70, 0.016], [0.78, -0.010], [0.84, -0.026], [1, -0.064]] },
  { key: 'ICT_POWER_OF_THREE_BULLISH', name: 'ICT三力合一(涨)', nameEn: 'ICT Power of Three Bullish (AMD)', type: 'reversal', direction: 'bullish', confidence: 0.74, description: '经典AMD结构：吸筹(Accumulation)→操纵(Manipulation向下)→派送(Distribution向上)。', focus: 'AMD做多', path: [[0, 0.014], [0.10, -0.006], [0.20, 0.010], [0.30, -0.008], [0.40, 0.006], [0.50, -0.010], [0.58, -0.038], [0.66, -0.046], [0.74, -0.014], [0.80, 0.016], [0.84, 0.032], [1, 0.070]] },
  { key: 'ICT_POWER_OF_THREE_BEARISH', name: 'ICT三力合一(跌)', nameEn: 'ICT Power of Three Bearish (AMD)', type: 'reversal', direction: 'bearish', confidence: 0.74, description: '经典AMD结构：派发(Distribution)→操纵(Manipulation向上)→吸收(Delivery向下)。', focus: 'AMD做空', path: [[0, -0.014], [0.10, 0.006], [0.20, -0.010], [0.30, 0.008], [0.40, -0.006], [0.50, 0.010], [0.58, 0.038], [0.66, 0.046], [0.74, 0.014], [0.80, -0.016], [0.84, -0.032], [1, -0.070]] },
  { key: 'SMC_BPR_BULLISH', name: 'SMC均衡价格区(涨)', nameEn: 'SMC Balanced Price Range Bullish', type: 'continuation', direction: 'bullish', confidence: 0.72, description: '上下两个FVG重叠形成均衡价格区(BPR)，价格回测此区间后延续上涨。', focus: 'BPR支撑', path: [[0, -0.034], [0.12, -0.006], [0.24, 0.022], [0.36, 0.048], [0.48, 0.032], [0.58, 0.026], [0.66, 0.022], [0.74, 0.028], [0.84, 0.038], [1, 0.074]] },
  { key: 'SMC_BPR_BEARISH', name: 'SMC均衡价格区(跌)', nameEn: 'SMC Balanced Price Range Bearish', type: 'continuation', direction: 'bearish', confidence: 0.72, description: '上下两个FVG重叠形成均衡价格区(BPR)，价格回测此区间后延续下跌。', focus: 'BPR压力', path: [[0, 0.034], [0.12, 0.006], [0.24, -0.022], [0.36, -0.048], [0.48, -0.032], [0.58, -0.026], [0.66, -0.022], [0.74, -0.028], [0.84, -0.038], [1, -0.074]] },
  { key: 'SMC_LIQUIDITY_VOID_BULLISH', name: 'SMC流动性真空(涨)', nameEn: 'SMC Liquidity Void Bullish', type: 'continuation', direction: 'bullish', confidence: 0.70, description: '快速上涨留下的大范围价格真空区，回测时价格快速穿越此区域后延续上涨。', focus: '真空回测', path: [[0, -0.036], [0.12, -0.008], [0.26, 0.028], [0.38, 0.056], [0.50, 0.042], [0.60, 0.036], [0.70, 0.032], [0.78, 0.038], [0.84, 0.046], [1, 0.078]] },
  { key: 'SMC_LIQUIDITY_VOID_BEARISH', name: 'SMC流动性真空(跌)', nameEn: 'SMC Liquidity Void Bearish', type: 'continuation', direction: 'bearish', confidence: 0.70, description: '快速下跌留下的大范围价格真空区，反弹时价格快速穿越此区域后延续下跌。', focus: '真空回测', path: [[0, 0.036], [0.12, 0.008], [0.26, -0.028], [0.38, -0.056], [0.50, -0.042], [0.60, -0.036], [0.70, -0.032], [0.78, -0.038], [0.84, -0.046], [1, -0.078]] },
  // ── 其他高级形态 II ──
  { key: 'ANDREWS_PITCHFORK_BULLISH', name: '安德鲁斯叉(涨)', nameEn: "Andrews' Pitchfork Bullish", type: 'continuation', direction: 'bullish', confidence: 0.70, description: '三点定义的中线通道(安德鲁斯叉)，价格沿中线上行，触及下轨获支撑后反弹。', focus: '叉形下轨支撑', path: [[0, -0.036], [0.12, -0.008], [0.24, 0.018], [0.36, 0.008], [0.48, 0.024], [0.58, 0.016], [0.68, 0.032], [0.78, 0.024], [0.84, 0.040], [1, 0.072]] },
  { key: 'ANDREWS_PITCHFORK_BEARISH', name: '安德鲁斯叉(跌)', nameEn: "Andrews' Pitchfork Bearish", type: 'continuation', direction: 'bearish', confidence: 0.70, description: '三点定义的中线通道(安德鲁斯叉)，价格沿中线下行，触及上轨遇阻后回落。', focus: '叉形上轨压力', path: [[0, 0.036], [0.12, 0.008], [0.24, -0.018], [0.36, -0.008], [0.48, -0.024], [0.58, -0.016], [0.68, -0.032], [0.78, -0.024], [0.84, -0.040], [1, -0.072]] },
  { key: 'GAP_FILL_BULLISH', name: '缺口回补做多', nameEn: 'Gap Fill Bullish', type: 'reversal', direction: 'bullish', confidence: 0.68, description: '下跌缺口被完全回补后趋势反转上涨，缺口区域转为支撑。', focus: '缺口回补', path: [[0, 0.034], [0.14, 0.008], [0.28, -0.016], [0.40, -0.042], [0.52, -0.028], [0.62, -0.016], [0.72, -0.008], [0.80, 0.006], [0.84, 0.018], [1, 0.058]] },
  { key: 'GAP_FILL_BEARISH', name: '缺口回补做空', nameEn: 'Gap Fill Bearish', type: 'reversal', direction: 'bearish', confidence: 0.68, description: '上涨缺口被完全回补后趋势反转下跌，缺口区域转为阻力。', focus: '缺口回补', path: [[0, -0.034], [0.14, -0.008], [0.28, 0.016], [0.40, 0.042], [0.52, 0.028], [0.62, 0.016], [0.72, 0.008], [0.80, -0.006], [0.84, -0.018], [1, -0.058]] },
];

const ADDITIONAL_PATTERN_LIBRARY = Object.fromEntries(
  ADDITIONAL_PATTERN_ENTRIES.map((item) => [item.key, item])
);

// 为扩展形态库生成 AI 解读模板 (与 PATTERN_ANALYSIS_TEMPLATES 同构)
const buildAdditionalAnalysisTemplate = (entry) => {
  if (!entry) return null;
  const typeText = entry.type === 'reversal' ? '反转形态'
    : entry.type === 'continuation' ? '持续形态' : '谐波形态';
  const isBull = entry.direction === 'bullish';
  const focus = entry.focus || '关键结构演化';
  return {
    direction: entry.direction || 'neutral',
    confidence: Number(entry.confidence) || 0.72,
    analysis: `【${entry.name}形态】${typeText}信号

📐 形态结构：
• ${entry.description}
• 关注核心：${focus}

📊 关键识别要点：
• 结合摆动高低点确认结构完整性
• 成交量在${isBull ? '突破' : '跌破'}方向应同步放大
• 警惕假突破，等待回测确认

⚠️ 交易策略：
• 入场：结构确认后${isBull ? '顺势做多' : '顺势做空'}
• 止损：置于形态${isBull ? '下方无效位' : '上方无效位'}
• 目标：按形态量度涨幅投影`,
  };
};

const makeAdditionalPointRef = (path, index) => {
  const [r, level] = path[index];
  const previous = path[index - 1]?.[1];
  const next = path[index + 1]?.[1];
  // Adaptive pad: proportional to neighbor spacing; avoids zone overlap for close points
  // and ensures adequate scanning width for wide-spaced points
  const prevR = path[index - 1]?.[0] ?? Math.max(0, r - 0.12);
  const nextR = path[index + 1]?.[0] ?? Math.min(1, r + 0.12);
  const pad = Math.max(0.025, Math.min(0.08, (nextR - prevR) / 2.8));
  const zoneField = (previous === undefined || level >= previous) && (next === undefined || level >= next)
    ? 'high'
    : (previous === undefined || level <= previous) && (next === undefined || level <= next)
      ? 'low'
      : 'close';
  return {
    r,
    zoneFrom: Math.max(0, r - pad),
    zoneTo: Math.min(0.85, r + pad),
    zoneField,
    offset: 0,
  };
};

// Helper: determine if the i-th path point is a local peak (label goes above)
const isPathPointPeak = (path, i) => {
  const level = path[i][1];
  const prev = path[i - 1]?.[1];
  const next = path[i + 1]?.[1];
  if (prev !== undefined && next !== undefined) return level >= prev && level >= next;
  if (prev !== undefined) return level >= prev;
  if (next !== undefined) return level >= next;
  return true;
};

const makeAdditionalPatternDrawingTemplate = (config) => {
  const previewPath = config.path.filter(([r]) => r <= 0.85);
  const refs = previewPath.map((_, index) => makeAdditionalPointRef(previewPath, index));
  const highRefs = refs.filter((ref) => ref.zoneField === 'high');
  const lowRefs = refs.filter((ref) => ref.zoneField === 'low');
  const pivotRefs = refs.filter((ref) => ref.zoneField === 'high' || ref.zoneField === 'low');
  const isBullish = config.direction === 'bullish';
  const key = config.key;
  // Label dy helper: uses path data direction for correct above/below placement
  const labelDy = (pathIdx) => isPathPointPeak(previewPath, pathIdx) ? -15 : 19;

  const template = [
    { kind: 'polyline', color: DRAWING_COLORS.white, width: 2.4, points: refs },
  ];
  const dyForRef = (ref) => ref?.zoneField === 'high' ? -15 : 19;
  const labelRef = (text, point, color, options = {}) => {
    if (!point) return;
    template.push({ kind: 'pointLabel', text, color, point, dy: dyForRef(point), fontSize: 12, ...options });
  };
  const pushZoneBox = (fromRef, toRef, color, fill, topOffset = 0.008, bottomOffset = -0.008) => {
    if (!fromRef || !toRef) return;
    const start = fromRef.r <= toRef.r ? fromRef : toRef;
    const end = fromRef.r <= toRef.r ? toRef : fromRef;
    template.push({
      kind: 'box',
      color,
      fill,
      from: { r: start.r },
      to: { r: end.r },
      top: { zoneFrom: Math.min(start.zoneFrom, end.zoneFrom), zoneTo: Math.max(start.zoneTo, end.zoneTo), zoneField: 'high', offset: topOffset },
      bottom: { zoneFrom: Math.min(start.zoneFrom, end.zoneFrom), zoneTo: Math.max(start.zoneTo, end.zoneTo), zoneField: 'low', offset: bottomOffset },
    });
  };

  // ── 形态分类 ──
  const isFib = key.startsWith('FIB_');
  const isElliott = key.startsWith('ELLIOTT_') || /DIAGONAL/.test(key);
  const isHarmonic = /GARTLEY|BUTTERFLY|BAT(?:_)|CRAB|SHARK|CYPHER|FIVE_(?:O|ZERO)|NEN_STAR|NAVARRO|BLACK_SWAN|WHITE_SWAN|AB_?CD|THREE_DRIVES/.test(key);
  const isTriangle = /TRIANGLE|WEDGE|PENNANT|DIAMOND/.test(key);
  const isChannel = /CHANNEL/.test(key);
  const isTriple = /TRIPLE_TOP|TRIPLE_BOTTOM/.test(key);
  const isICT = /^ICT_|^SMC_/.test(key);
  const isWolfe = /WOLFE/.test(key);
  const isCup = /CUP/.test(key);
  const isBroadening = /BROADENING/.test(key);
  const isRounding = /ROUNDING/.test(key);
  const isVShape = /^V_/.test(key);
  const isIsland = /ISLAND/.test(key);
  const isCandleSignal = /SETUP|TRI_STAR|HARAMI_CROSS|UPSIDE_GAP_TWO_CROWS|KICKER|TRIPLE_INSIDE_OUT|ABANDONED_BABY|THREE_LINE_STRIKE|COUNTERATTACK|BELT_HOLD|SEPARATING_LINES|CONCEALING_BABY|UNIQUE_THREE_RIVER|THREE_STARS_IN_SOUTH|STICK_SANDWICH|TASUKI_GAP|MAT_HOLD|SIDE_BY_SIDE|BREAKAWAY|MEETING_LINES/.test(key);
  const isStaircase = /STAIRCASE/.test(key);
  const isTower = /TOWER|PIPE/.test(key);
  const isTrap = /TRAP|SHAKEOUT|DEAD_CAT|FAILED_BREAK|TURTLE_SOUP/.test(key);
  const isParabolic = /PARABOLIC|BUMP_AND_RUN/.test(key);
  const isScallop = /SCALLOP/.test(key);
  const isFlat = /FLAT_TOP|FLAT_BOTTOM/.test(key);
  const isReversal123 = /REVERSAL_123/.test(key);
  const isQM = /QUASIMODO/.test(key);
  const isMeasured = /MEASURED_MOVE/.test(key);
  const isSpike = /SPIKE_AND_CHANNEL/.test(key);
  const isGap = /GAP_AND_GO|GAP_FILL/.test(key);
  const isFlag = /FLAG/.test(key);
  const isWyckoff = /WYCKOFF/.test(key);
  const isAndrews = /ANDREWS_PITCHFORK/.test(key);
  const isRunningCorrection = /RUNNING_CORRECTION/.test(key);
  const isComplexDouble = /COMPLEX_DOUBLE/.test(key);
  const isComplexHS = /COMPLEX_HS/.test(key);
  const isAdamEve = /ADAM_EVE|EVE_ADAM/.test(key);
  const isORB = /^ORB_/.test(key);
  const isFractal = /FRACTAL_REVERSAL/.test(key);
  const isPriceAction = /POPGUN|NR7|INSIDE_BAR|OUTSIDE_BAR|PIN_BAR|DOUBLE_INSIDE_DAY|HIKKAKE/.test(key);

  let addedSpecificLabels = false;

  if (isFib) {
    // ── 斐波那契: 主趋势腿 + 回调水平线 + 比例标注 ──
    const fibText = key.includes('382') ? '38.2%' : key.includes('500') ? '50.0%' : key.includes('618') ? '61.8%' : key.includes('1272') ? '127.2%' : key.includes('1618') ? '161.8%' : key.includes('CLUSTER') ? '多重共振' : '';
    const isExtension = key.includes('1272') || key.includes('1618');
    const isCluster = key.includes('CLUSTER');

    // Find swing high/low from the first major extreme
    const firstHighRef = highRefs[0];
    const firstLowRef = lowRefs[0];

    if (isCluster) {
      // 簇: 多个斐波那契汇聚区域高亮
      const clusterRef = isBullish
        ? lowRefs[lowRefs.length - 1] || pivotRefs[pivotRefs.length - 1]
        : highRefs[highRefs.length - 1] || pivotRefs[pivotRefs.length - 1];
      if (clusterRef) {
        template.push({ kind: 'hline', text: fibText, color: DRAWING_COLORS.yellow, width: 2, dash: '6 4', point: clusterRef });
        template.push({
          kind: 'box',
          color: 'rgba(234,179,8,0.40)',
          fill: 'rgba(234,179,8,0.08)',
          from: { r: Math.max(0, clusterRef.r - 0.10) },
          to: { r: Math.min(0.85, clusterRef.r + 0.10) },
          top: { zoneFrom: clusterRef.zoneFrom, zoneTo: clusterRef.zoneTo, zoneField: 'high', offset: 0.008 },
          bottom: { zoneFrom: clusterRef.zoneFrom, zoneTo: clusterRef.zoneTo, zoneField: 'low', offset: -0.008 },
        });
      }
    } else if (isExtension) {
      // 扩展: 画主趋势腿 + 突破延伸区域
      if (firstLowRef && firstHighRef) {
        const swingFrom = isBullish ? firstLowRef : firstHighRef;
        const swingTo = isBullish ? firstHighRef : firstLowRef;
        template.push({ kind: 'line', text: '主趋势', color: DRAWING_COLORS.blue, width: 2.2, from: swingFrom, to: swingTo });
      }
      // 扩展目标水平线 (最后一个极值)
      const extRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
      if (extRef) {
        template.push({ kind: 'hline', text: fibText, color: DRAWING_COLORS.yellow, width: 1.8, dash: '6 4', point: extRef });
      }
      // 起始回调低点标注
      const retRef = isBullish ? (lowRefs.length >= 2 ? lowRefs[1] : null) : (highRefs.length >= 2 ? highRefs[1] : null);
      if (retRef) {
        template.push({ kind: 'pointLabel', text: '回调', color: DRAWING_COLORS.orange, point: retRef, dy: isBullish ? 19 : -15, fontSize: 12 });
      }
    } else {
      // 回调: 画主趋势腿 + 回调水平线
      const swingHighRef = isBullish ? firstHighRef : (highRefs.length >= 2 ? highRefs[1] : firstHighRef);
      if (refs.length >= 2) {
        template.push({ kind: 'line', text: '主趋势', color: DRAWING_COLORS.blue, width: 2.2, from: refs[0], to: swingHighRef || refs[Math.min(3, refs.length - 1)] });
      }
      // 回调位水平线 (回调后的第一个极值)
      const retRef = isBullish
        ? lowRefs.find(r => firstHighRef && r.r > firstHighRef.r)
        : highRefs.find(r => firstLowRef && r.r > firstLowRef.r);
      if (retRef) {
        template.push({ kind: 'hline', text: fibText, color: DRAWING_COLORS.yellow, width: 1.8, dash: '6 4', point: retRef });
        template.push({ kind: 'pointLabel', text: isBullish ? '回调支撑' : '反弹压力', color: DRAWING_COLORS.yellow, point: retRef, dy: isBullish ? 19 : -15, fontSize: 12 });
      }
    }
    // 起点标注
    if (refs[0]) {
      template.push({ kind: 'pointLabel', text: isBullish ? '起涨' : '起跌', color: DRAWING_COLORS.blue, point: refs[0], dy: labelDy(0), fontSize: 12 });
    }
    addedSpecificLabels = true;

  } else if (isElliott) {
    // ── Elliott 波浪: 用末尾 N 个 pivot 标注浪号 ──
    const waveMap = {
      DOUBLE_ZIGZAG: ['W', 'X', 'Y'],
      TRUNCATION: ['③', '④', '⑤↓'],
      WXY: ['W', 'X', 'Y'],
      EXPANDED_FLAT: ['A', 'B', 'C'],
      IMPULSE: ['①', '②', '③', '④', '⑤'],
      CORRECTIVE: ['A', 'B', 'C'],
      DIAGONAL: ['①', '②', '③', '④', '⑤'],
      WAVE1: ['起点', '①'],
      WAVE3: ['②', '③'],
      WAVE5: ['④', '⑤'],
      ZIGZAG: ['A', 'B', 'C'],
      FLAT: ['A', 'B', 'C'],
      TRIANGLE: ['A', 'B', 'C', 'D', 'E'],
    };
    let labels = null;
    for (const [fragment, lbl] of Object.entries(waveMap)) {
      if (key.includes(fragment)) { labels = lbl; break; }
    }
    let waveRefs = [];
    if (labels && pivotRefs.length) {
      // Use LAST N pivots — wave labels correspond to the final structure, not the preceding trend
      const count = Math.min(labels.length, pivotRefs.length);
      const startPivotIdx = pivotRefs.length - count;
      waveRefs = pivotRefs.slice(startPivotIdx, startPivotIdx + count);
      for (let i = 0; i < count; i++) {
        const ref = waveRefs[i];
        template.push({
          kind: 'pointLabel', text: labels[i], color: DRAWING_COLORS.blue,
          point: ref, dy: ref.zoneField === 'high' ? -15 : 19, fontSize: 15, fontWeight: 800
        });
      }
      addedSpecificLabels = true;
    }
    // 浪间通道: 0-2通道线 + 1-3通道线
    const isImpulse = key.includes('IMPULSE');
    if (isImpulse && pivotRefs.length >= 5) {
      const startIdx = pivotRefs.length - Math.min(labels ? labels.length : 5, pivotRefs.length);
      // 0-2 线 (调整浪底部/顶部)
      const wave0 = pivotRefs[startIdx];
      const wave2 = pivotRefs[startIdx + 2];
      const wave1 = pivotRefs[startIdx + 1];
      const wave3 = pivotRefs[startIdx + 3];
      if (wave0 && wave2) {
        template.push({ kind: 'line', text: '0-2通道', color: DRAWING_COLORS.support, width: 1.6, dash: '6 4', from: wave0, to: wave2 });
      }
      // 1-3 线 (推动浪顶部/底部)
      if (wave1 && wave3) {
        template.push({ kind: 'line', text: '1-3通道', color: DRAWING_COLORS.resistance, width: 1.6, dash: '6 4', from: wave1, to: wave3 });
      }
    } else {
      // 非推动浪: 简单连接高低点
      if (highRefs.length >= 2) {
        template.push({ kind: 'line', color: DRAWING_COLORS.resistance, width: 1.6, dash: '6 4', from: highRefs[0], to: highRefs[highRefs.length - 1] });
      }
      if (lowRefs.length >= 2) {
        template.push({ kind: 'line', color: DRAWING_COLORS.support, width: 1.6, dash: '6 4', from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
      }
    }
    if (/WAVE3|IMPULSE/.test(key)) {
      const wave3Ref = waveRefs[2] || waveRefs[waveRefs.length - 1] || refs[refs.length - 1];
      labelRef('③主驱动', wave3Ref, DRAWING_COLORS.orange, { dx: 24, fontSize: 12, fontWeight: 800 });
      if (waveRefs[1] && wave3Ref) template.push({ kind: 'arrow', text: '3浪加速', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2.4, from: waveRefs[1], to: wave3Ref });
    } else if (/WAVE5|TRUNCATION/.test(key)) {
      const failRef = waveRefs[waveRefs.length - 1] || refs[refs.length - 1];
      labelRef(key.includes('TRUNCATION') ? '5浪截断' : '5浪背离', failRef, DRAWING_COLORS.orange, { dx: 24, fontSize: 12, fontWeight: 800 });
      if (waveRefs[0]) template.push({ kind: 'hline', text: key.includes('TRUNCATION') ? '3浪极值未破' : '终浪目标线', color: DRAWING_COLORS.yellow, width: 1.5, dash: '6 4', point: waveRefs[0] });
    } else if (/WAVE1/.test(key)) {
      const triggerRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
      labelRef('新趋势试启动', refs[Math.floor(refs.length * 0.55)] || refs[0], DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
      if (triggerRef) template.push({ kind: 'hline', text: isBullish ? '1浪确认高点' : '1浪确认低点', color: DRAWING_COLORS.yellow, width: 1.5, dash: '6 4', point: triggerRef });
    } else if (/ZIGZAG/.test(key) && !/DOUBLE_ZIGZAG/.test(key)) {
      labelRef('5-3-5锯齿', waveRefs[1] || refs[Math.floor(refs.length * 0.45)], DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
      if (waveRefs[0] && waveRefs[2]) template.push({ kind: 'arrow', text: 'C浪完成', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2, from: waveRefs[0], to: waveRefs[2] });
    } else if (/EXPANDED_FLAT|FLAT/.test(key)) {
      const bRef = waveRefs[1] || refs[Math.floor(refs.length * 0.55)];
      const cRef = waveRefs[2] || refs[refs.length - 1];
      labelRef(key.includes('EXPANDED') ? 'B浪越界' : '平台横盘', bRef, DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
      pushZoneBox(waveRefs[0] || refs[1], cRef, 'rgba(96,165,250,0.30)', 'rgba(37,99,235,0.07)', 0.006, -0.006);
    } else if (/TRIANGLE/.test(key)) {
      labelRef('ABCDE收敛', refs[Math.floor(refs.length * 0.62)] || refs[0], DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
      if (highRefs.length >= 2) template.push({ kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.2, from: highRefs[0], to: highRefs[highRefs.length - 1] });
      if (lowRefs.length >= 2) template.push({ kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.2, from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
      if (highRefs.length >= 2 && lowRefs.length >= 2) template.push({ kind: 'polygon', color: 'rgba(232,121,249,0.30)', fill: 'rgba(168,85,247,0.10)', width: 0, points: [highRefs[0], highRefs[highRefs.length - 1], lowRefs[lowRefs.length - 1], lowRefs[0]] });
    } else if (/DOUBLE_ZIGZAG|WXY/.test(key)) {
      labelRef(key.includes('DOUBLE_ZIGZAG') ? 'W-X-Y双锯齿' : 'WXY复合调整', waveRefs[1] || refs[Math.floor(refs.length * 0.48)], DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
      if (waveRefs[0] && waveRefs[2]) template.push({ kind: 'arrow', text: 'Y浪完成', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2, from: waveRefs[1] || waveRefs[0], to: waveRefs[2] });
    } else if (/DIAGONAL/.test(key)) {
      labelRef(key.includes('ENDING') ? '终结楔形' : '引导楔形', refs[Math.floor(refs.length * 0.58)] || refs[0], DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
      pushZoneBox(refs[1] || refs[0], refs[refs.length - 1], 'rgba(148,163,184,0.30)', 'rgba(148,163,184,0.06)', 0.008, -0.008);
    } else if (/CORRECTIVE/.test(key)) {
      labelRef('ABC调整完成', waveRefs[waveRefs.length - 1] || refs[refs.length - 1], DRAWING_COLORS.orange, { dx: 24, fontSize: 12, fontWeight: 800 });
    }

  } else if (isHarmonic) {
    // ── 谐波: 用 path 索引直接标注 XABCD ──
    const isThreeDrives = key.includes('THREE_DRIVES');
    const isABCD = /AB_?CD/.test(key) && !isThreeDrives;

    if (isThreeDrives) {
      // 三推浪: 3 个驱动极值 (看涨=3个低点, 看跌=3个高点)
      const driveRefs = isBullish ? lowRefs : highRefs;
      const driveLabels = ['D1', 'D2', 'D3'];
      const count = Math.min(driveLabels.length, driveRefs.length);
      for (let i = 0; i < count; i++) {
        template.push({
          kind: 'pointLabel', text: driveLabels[i], color: DRAWING_COLORS.orange,
          point: driveRefs[i], dy: isBullish ? 19 : -15, fontSize: 15, fontWeight: 800
        });
      }
      // 衰竭趋势线 (连接三个驱动点)
      if (count >= 2) {
        template.push({ kind: 'line', text: '趋势衰竭', color: DRAWING_COLORS.yellow, width: 1.8, dash: '8 5', from: driveRefs[0], to: driveRefs[count - 1] });
      }
      if (count >= 3) {
        template.push({ kind: 'pointLabel', text: 'D2≈1.272', color: DRAWING_COLORS.yellow, point: driveRefs[1], dx: 24, dy: 0, fontSize: 10, fontWeight: 600 });
        template.push({ kind: 'pointLabel', text: 'D3≈1.618', color: DRAWING_COLORS.yellow, point: driveRefs[2], dx: -42, dy: isBullish ? 28 : -24, fontSize: 10, fontWeight: 600 });
        pushZoneBox(driveRefs[1], driveRefs[2], isBullish ? 'rgba(34,197,94,0.34)' : 'rgba(239,68,68,0.34)', isBullish ? 'rgba(20,83,45,0.08)' : 'rgba(127,29,29,0.08)', 0.008, -0.008);
      }
      addedSpecificLabels = true;
    } else {
      // XABCD / ABCD: 用 refs 直接索引 (path 点就是谐波节点)
      const isShark = key.includes('SHARK');
      const isFiveZero = key.includes('FIVE_ZERO') || key.includes('FIVE_O');
      const harmonicLabels = isABCD ? ['A', 'B', 'C', 'D'] : isShark ? ['0', 'X', 'A', 'B', 'C'] : isFiveZero ? ['0', 'X', 'A', 'B', 'C', 'D'] : ['X', 'A', 'B', 'C', 'D'];
      const count = Math.min(harmonicLabels.length, refs.length);
      for (let i = 0; i < count; i++) {
        template.push({
          kind: 'pointLabel', text: harmonicLabels[i], color: DRAWING_COLORS.orange,
          point: refs[i], dy: labelDy(i), fontSize: 15, fontWeight: 800
        });
      }
      // 谐波比例连接线: 画各段 leg
      const legColor = 'rgba(251,191,36,0.55)';
      for (let i = 0; i < count - 1; i++) {
        template.push({ kind: 'line', color: legColor, width: 1.6, dash: '4 3', from: refs[i], to: refs[i + 1] });
      }
      // Fibonacci 比例标注
      const ratioSpecs = /GARTLEY/.test(key) ? [
        { index: 2, text: 'B=0.618 XA' }, { index: 3, text: 'BC=0.382-0.886 AB' }, { index: 4, text: 'D=0.786 XA' }
      ] : /DEEP_CRAB/.test(key) ? [
        { index: 2, text: 'B≈0.886 XA' }, { index: 3, text: 'BC=0.382-0.886 AB' }, { index: 4, text: 'D=1.618 XA' }
      ] : /CRAB/.test(key) ? [
        { index: 2, text: 'B=0.382-0.618 XA' }, { index: 3, text: 'BC=0.382-0.886 AB' }, { index: 4, text: 'D=1.618 XA' }
      ] : /BAT(?:_)/.test(key) ? [
        { index: 2, text: 'B=0.382-0.50 XA' }, { index: 3, text: 'BC=0.382-0.886 AB' }, { index: 4, text: 'D=0.886 XA' }
      ] : /BUTTERFLY/.test(key) ? [
        { index: 2, text: 'B=0.786 XA' }, { index: 3, text: 'BC=0.382-0.886 AB' }, { index: 4, text: 'D=1.272-1.618 XA' }
      ] : /SHARK/.test(key) ? [
        { index: 3, text: 'B=1.13-1.618 XA' }, { index: 4, text: 'C=0.886-1.13 0X' }
      ] : /CYPHER/.test(key) ? [
        { index: 2, text: 'B越过X' }, { index: 3, text: 'C=1.272-1.414 XA' }, { index: 4, text: 'D=0.786 XC' }
      ] : /FIVE_(?:O|ZERO)/.test(key) ? [
        { index: 3, text: 'B=1.13-1.618 XA' }, { index: 4, text: 'C=1.618-2.24 AB' }, { index: 5, text: 'D=0.50 BC' }
      ] : /NEN_STAR/.test(key) ? [
        { index: 2, text: 'B=0.382 XA' }, { index: 4, text: 'D=1.272-1.618 BC' }
      ] : /NAVARRO/.test(key) ? [
        { index: 3, text: 'BC=2.00 AB' }, { index: 4, text: 'AB=CD完成' }
      ] : /BLACK_SWAN/.test(key) ? [
        { index: 2, text: '反谐波B点' }, { index: 4, text: 'D极端越界' }
      ] : /WHITE_SWAN/.test(key) ? [
        { index: 2, text: '浅扩展B点' }, { index: 4, text: 'D浅扩展PRZ' }
      ] : isABCD ? [
        { index: 2, text: 'BC=0.382-0.886 AB' }, { index: 3, text: 'CD≈AB' }
      ] : [];
      for (const item of ratioSpecs) {
        const ratioRef = refs[Math.min(item.index, count - 1)];
        if (ratioRef) template.push({ kind: 'pointLabel', text: item.text, color: DRAWING_COLORS.yellow, point: ratioRef, dx: item.index >= count - 1 ? -42 : 24, dy: item.index >= count - 1 ? (ratioRef.zoneField === 'low' ? 28 : -24) : 0, fontSize: 10, fontWeight: 600 });
      }
      // PRZ (Potential Reversal Zone) 高亮框: 围绕 D 点
      const dIdx = count - 1;
      if (refs[dIdx]) {
        const dRef = refs[dIdx];
        template.push({
          kind: 'box',
          color: isBullish ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)',
          fill: isBullish ? 'rgba(20,83,45,0.12)' : 'rgba(127,29,29,0.12)',
          from: { r: Math.max(0, dRef.r - 0.06) },
          to: { r: Math.min(0.85, dRef.r + 0.06) },
          top: { zoneFrom: dRef.zoneFrom, zoneTo: dRef.zoneTo, zoneField: 'high', offset: 0.01 },
          bottom: { zoneFrom: dRef.zoneFrom, zoneTo: dRef.zoneTo, zoneField: 'low', offset: -0.01 },
        });
        template.push({ kind: 'pointLabel', text: 'PRZ', color: DRAWING_COLORS.cyan, point: dRef, dx: 28, dy: 0, fontSize: 11 });
      }
      addedSpecificLabels = true;
    }

  } else if ((isTriangle || isChannel) && !isBroadening && !isSpike) {
    // ── 三角/通道/楔形: 上下轨连接实际极值 ──
    const isPennant = /PENNANT/.test(key);
    if (isPennant && refs.length >= 2) {
      // 旗形旗杆: 第一段急速运动
      template.push({
        kind: 'arrow', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 3,
        from: refs[0], to: refs[1], text: '旗杆'
      });
      // 旗面上下轨: 从第2个 pivot 开始 (跳过旗杆起点)
      if (highRefs.length >= 2) {
        const pennantHighs = highRefs.filter(r => r.r >= refs[1].r);
        if (pennantHighs.length >= 2) {
          template.push({ kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: pennantHighs[0], to: pennantHighs[pennantHighs.length - 1] });
        } else if (highRefs.length >= 2) {
          template.push({ kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: highRefs[0], to: highRefs[highRefs.length - 1] });
        }
      }
      if (lowRefs.length >= 2) {
        const pennantLows = lowRefs.filter(r => r.r >= refs[1].r);
        if (pennantLows.length >= 2) {
          template.push({ kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: pennantLows[0], to: pennantLows[pennantLows.length - 1] });
        } else if (lowRefs.length >= 2) {
          template.push({ kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
        }
      }
      template.push({ kind: 'pointLabel', text: '旗面收敛', color: DRAWING_COLORS.blue, point: refs[Math.floor(refs.length * 0.6)] || refs[2], dy: isBullish ? -14 : 18 });
      addedSpecificLabels = true;
    } else {
      if (highRefs.length >= 2) {
        template.push({ kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: highRefs[0], to: highRefs[highRefs.length - 1] });
      }
      if (lowRefs.length >= 2) {
        template.push({ kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
      }
      // 起始极值点标记
      const startMarker = isBullish ? (highRefs[0] || refs[0]) : (lowRefs[0] || refs[0]);
      if (startMarker) template.push({ kind: 'circle', point: startMarker, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 8, width: 2.5 });
      // 通道中轴虚线
      if (isChannel && highRefs.length >= 1 && lowRefs.length >= 1) {
        const midR = Math.min(highRefs[0].r, lowRefs[0].r);
        const midRef = refs.find(r => r.r >= midR) || refs[Math.floor(refs.length / 2)];
        if (midRef) {
          template.push({ kind: 'hline', text: '中轴', color: 'rgba(148,163,184,0.45)', width: 1.2, dash: '3 5', point: { r: midRef.r, field: 'close' } });
        }
      }
    }
    // 三角/楔形/通道区域: 品红填充
    if ((isTriangle || isChannel || isWedge) && highRefs.length >= 2 && lowRefs.length >= 2) {
      const h0 = isPennant && highRefs.filter(r => r.r >= refs[1]?.r).length >= 2 ? highRefs.filter(r => r.r >= refs[1].r)[0] : highRefs[0];
      const hN = isPennant && highRefs.filter(r => r.r >= refs[1]?.r).length >= 2 ? highRefs.filter(r => r.r >= refs[1].r).slice(-1)[0] : highRefs[highRefs.length - 1];
      const l0 = isPennant && lowRefs.filter(r => r.r >= refs[1]?.r).length >= 2 ? lowRefs.filter(r => r.r >= refs[1].r)[0] : lowRefs[0];
      const lN = isPennant && lowRefs.filter(r => r.r >= refs[1]?.r).length >= 2 ? lowRefs.filter(r => r.r >= refs[1].r).slice(-1)[0] : lowRefs[lowRefs.length - 1];
      template.push({
        kind: 'polygon',
        color: 'rgba(232,121,249,0.30)',
        fill: 'rgba(168,85,247,0.10)',
        width: 0,
        points: [h0, hN, lN, l0],
      });
    }

  } else if (isTriple) {
    // ── 三重顶底: 标注三个峰/谷 + 颈线 ──
    const peakRefs = isBullish ? lowRefs : highRefs;
    const peakLabels = isBullish ? ['底1', '底2', '底3'] : ['顶1', '顶2', '顶3'];
    const count = Math.min(peakLabels.length, peakRefs.length);
    for (let i = 0; i < count; i++) {
      template.push({
        kind: 'pointLabel', text: peakLabels[i], color: DRAWING_COLORS.orange,
        point: peakRefs[i], dy: isBullish ? 19 : -15, fontSize: 13, fontWeight: 800
      });
      template.push({ kind: 'circle', point: peakRefs[i], color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 7, width: 2 });
    }
    // 颈线
    const neckRefs = isBullish ? highRefs : lowRefs;
    if (neckRefs.length >= 2) {
      template.push({ kind: 'line', text: 'NECKLINE', color: DRAWING_COLORS.magenta, width: 2.4, dash: '9 6', from: neckRefs[0], to: neckRefs[neckRefs.length - 1] });
    }
    // 阻力/支撑区域高亮
    if (count >= 2) {
      template.push({
        kind: 'box',
        color: isBullish ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
        fill: isBullish ? 'rgba(20,83,45,0.08)' : 'rgba(127,29,29,0.08)',
        from: { r: peakRefs[0].r },
        to: { r: peakRefs[count - 1].r },
        top: { zoneFrom: peakRefs[0].zoneFrom, zoneTo: peakRefs[count - 1].zoneTo, zoneField: 'high', offset: 0.006 },
        bottom: { zoneFrom: peakRefs[0].zoneFrom, zoneTo: peakRefs[count - 1].zoneTo, zoneField: 'low', offset: -0.006 },
      });
    }
    addedSpecificLabels = true;

  } else if (isICT) {
    // ── ICT/SMC: 关键概念术语 + 操纵区域高亮 ──
    const conceptLabel = key.includes('FVG') ? 'FVG' : key.includes('ORDER_BLOCK') || key.includes('_OB_') ? 'OB' :
      key.includes('BPR') ? 'BPR' : key.includes('LIQUIDITY_VOID') ? 'LQ Void' :
      key.includes('JUDAS') ? 'Judas' : key.includes('POWER') ? 'AMD' :
      key.includes('MSS') ? 'MSS' : key.includes('CHOCH') ? 'ChoCh' :
      key.includes('BREAKER') ? 'Breaker' : key.includes('SILVER') ? 'Silver Bullet' :
      key.includes('OTE') ? 'OTE' : key.includes('DISTRIBUTION') ? 'Distribution' :
      key.includes('ACCUMULATION') ? 'Accumulation' : '⚡';
    // 扫盘/操纵区标注
    const sweepRef = isBullish ? (lowRefs[lowRefs.length - 1] || pivotRefs[pivotRefs.length - 1]) : (highRefs[highRefs.length - 1] || pivotRefs[pivotRefs.length - 1]);
    if (sweepRef) {
      template.push({ kind: 'pointLabel', text: conceptLabel, color: DRAWING_COLORS.orange, point: sweepRef, dy: isBullish ? 19 : -15, fontSize: 14, fontWeight: 800 });
      addedSpecificLabels = true;
    }
    // 关键结构线
    if (highRefs.length >= 2) {
      template.push({ kind: 'line', color: DRAWING_COLORS.resistance, width: 1.8, dash: '5 4', from: highRefs[0], to: highRefs[highRefs.length - 1] });
    }
    if (lowRefs.length >= 2) {
      template.push({ kind: 'line', color: DRAWING_COLORS.support, width: 1.8, dash: '5 4', from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
    }
    if (key.includes('LIQUIDITY_SWEEP')) {
      const liquidityRef = isBullish ? (lowRefs[lowRefs.length - 1] || sweepRef) : (highRefs[highRefs.length - 1] || sweepRef);
      const reclaimRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
      pushZoneBox(liquidityRef, reclaimRef, isBullish ? 'rgba(34,197,94,0.38)' : 'rgba(239,68,68,0.38)', isBullish ? 'rgba(20,83,45,0.10)' : 'rgba(127,29,29,0.10)', 0.01, -0.01);
      labelRef(isBullish ? 'SSL扫低' : 'BSL扫高', liquidityRef, DRAWING_COLORS.orange, { dx: 24, fontSize: 12, fontWeight: 800 });
      if (reclaimRef) template.push({ kind: 'hline', text: isBullish ? '收回高点确认' : '跌回低点确认', color: DRAWING_COLORS.cyan, width: 1.8, dash: '6 4', point: reclaimRef });
      if (liquidityRef && reclaimRef) template.push({ kind: 'arrow', text: isBullish ? '扫低→拉回' : '扫高→打回', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2.2, from: liquidityRef, to: reclaimRef });
    } else if (key.includes('FVG') || key.includes('BPR') || key.includes('LIQUIDITY_VOID')) {
      const zoneRef = pivotRefs[Math.max(0, pivotRefs.length - 2)] || sweepRef;
      const zoneEnd = pivotRefs[pivotRefs.length - 1] || refs[refs.length - 1];
      pushZoneBox(zoneRef, zoneEnd, 'rgba(234,179,8,0.38)', 'rgba(234,179,8,0.08)', 0.012, -0.012);
      labelRef(key.includes('BPR') ? 'BPR均衡区' : key.includes('LIQUIDITY_VOID') ? '流动性真空' : 'FVG失衡区', zoneRef, DRAWING_COLORS.yellow, { dx: 24, fontSize: 12 });
      if (zoneRef && zoneEnd) template.push({ kind: 'arrow', text: key.includes('LIQUIDITY_VOID') ? '快速穿越' : '回补后延续', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 1.8, from: zoneRef, to: zoneEnd });
    } else if (key.includes('ORDER_BLOCK') || key.includes('BREAKER')) {
      const obRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
      const obStart = pivotRefs[Math.max(0, pivotRefs.length - 3)] || obRef;
      pushZoneBox(obStart, obRef, isBullish ? 'rgba(34,197,94,0.38)' : 'rgba(239,68,68,0.38)', isBullish ? 'rgba(20,83,45,0.10)' : 'rgba(127,29,29,0.10)', 0.01, -0.01);
      labelRef(key.includes('BREAKER') ? 'Breaker区' : 'Order Block', obRef, DRAWING_COLORS.yellow, { dx: 24, fontSize: 12 });
      if (obRef && refs[refs.length - 1]) template.push({ kind: 'arrow', text: key.includes('BREAKER') ? '失效OB转向' : 'OB回测反应', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2, from: obRef, to: refs[refs.length - 1] });
    } else if (key.includes('OTE')) {
      const pullbackRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
      const swingRef = isBullish ? highRefs[0] : lowRefs[0];
      pushZoneBox(pivotRefs[Math.max(0, pivotRefs.length - 2)], pullbackRef, 'rgba(234,179,8,0.34)', 'rgba(234,179,8,0.08)', 0.01, -0.01);
      labelRef('OTE 0.62-0.79', pullbackRef, DRAWING_COLORS.yellow, { dx: 26, fontSize: 12 });
      if (swingRef && pullbackRef) template.push({ kind: 'arrow', text: 'Fib回撤腿', color: DRAWING_COLORS.cyan, width: 1.5, dash: '5 4', from: swingRef, to: pullbackRef });
    } else if (key.includes('MSS') || key.includes('CHOCH')) {
      const structureRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
      if (structureRef) template.push({ kind: 'hline', text: key.includes('MSS') ? 'MSS结构线' : 'ChoCh结构线', color: DRAWING_COLORS.cyan, width: 1.8, dash: '6 4', point: structureRef });
      if (sweepRef && structureRef) template.push({ kind: 'arrow', text: key.includes('MSS') ? '位移破结构' : '结构转变', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2, from: sweepRef, to: structureRef });
    } else if (key.includes('JUDAS')) {
      const openRef = refs[Math.floor(refs.length * 0.28)] || refs[0];
      const judasRef = sweepRef;
      labelRef('Opening Range', openRef, DRAWING_COLORS.blue, { fontSize: 11 });
      labelRef(isBullish ? 'Judas诱空' : 'Judas诱多', judasRef, DRAWING_COLORS.orange, { dx: 24, fontWeight: 800 });
      if (openRef && judasRef) template.push({ kind: 'arrow', text: '开盘操纵', color: DRAWING_COLORS.yellow, width: 1.8, from: openRef, to: judasRef });
      if (judasRef && refs[refs.length - 1]) template.push({ kind: 'arrow', text: '真实方向', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2.2, from: judasRef, to: refs[refs.length - 1] });
    } else if (key.includes('POWER')) {
      const accumulationRef = refs[Math.floor(refs.length * 0.25)] || refs[0];
      const manipulationRef = sweepRef;
      const distributionRef = refs[refs.length - 1];
      pushZoneBox(refs[0], accumulationRef, 'rgba(96,165,250,0.28)', 'rgba(37,99,235,0.06)', 0.006, -0.006);
      labelRef('A 吸筹', accumulationRef, DRAWING_COLORS.blue);
      labelRef('M 操纵', manipulationRef, DRAWING_COLORS.orange, { fontWeight: 800 });
      labelRef('D 派送', distributionRef, DRAWING_COLORS.cyan);
      if (manipulationRef && distributionRef) template.push({ kind: 'arrow', text: 'AMD真实派送', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2.2, from: manipulationRef, to: distributionRef });
    } else if (key.includes('SILVER')) {
      const windowRef = refs[Math.floor(refs.length * 0.55)] || sweepRef;
      pushZoneBox(windowRef, refs[refs.length - 1], 'rgba(34,211,238,0.32)', 'rgba(14,116,144,0.08)', 0.008, -0.008);
      labelRef('Silver Bullet窗口', windowRef, DRAWING_COLORS.cyan, { dx: 24, fontSize: 12 });
      if (sweepRef && windowRef) template.push({ kind: 'arrow', text: '流动性→位移', color: DRAWING_COLORS.yellow, width: 1.8, from: sweepRef, to: windowRef });
    } else if (key.includes('ACCUMULATION') || key.includes('DISTRIBUTION')) {
      const baseRef = refs[Math.floor(refs.length * 0.35)] || refs[0];
      const manipulationRef = sweepRef;
      const chochRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
      pushZoneBox(refs[1] || refs[0], refs[Math.floor(refs.length * 0.65)] || refs[refs.length - 1], 'rgba(96,165,250,0.30)', 'rgba(37,99,235,0.07)', 0.008, -0.008);
      labelRef(key.includes('DISTRIBUTION') ? '机构派发区' : '机构吸筹区', baseRef, DRAWING_COLORS.blue, { fontSize: 12 });
      labelRef(isBullish ? '向下诱空' : '向上诱多', manipulationRef, DRAWING_COLORS.orange, { fontWeight: 800 });
      if (chochRef) template.push({ kind: 'hline', text: 'ChoCh确认', color: DRAWING_COLORS.cyan, width: 1.8, dash: '6 4', point: chochRef });
      if (manipulationRef && chochRef) template.push({ kind: 'arrow', text: '操纵后结构转变', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2, from: manipulationRef, to: chochRef });
    }
    // 操纵区域高亮框
    if (pivotRefs.length >= 2) {
      const zoneStart = pivotRefs[Math.max(0, pivotRefs.length - 3)];
      const zoneEnd = pivotRefs[pivotRefs.length - 1];
      template.push({
        kind: 'box',
        color: isBullish ? 'rgba(34,197,94,0.40)' : 'rgba(239,68,68,0.40)',
        fill: isBullish ? 'rgba(20,83,45,0.12)' : 'rgba(127,29,29,0.12)',
        from: { r: zoneStart.r },
        to: { r: zoneEnd.r },
        top: { zoneFrom: zoneStart.zoneFrom, zoneTo: zoneEnd.zoneTo, zoneField: 'high', offset: 0.01 },
        bottom: { zoneFrom: zoneStart.zoneFrom, zoneTo: zoneEnd.zoneTo, zoneField: 'low', offset: -0.01 },
      });
    }

  } else if (isWolfe) {
    // ── Wolfe 波: 用 path 索引标注 1-5 点 + 结构线 ──
    const wolfeLabels = ['1', '2', '3', '4', '5'];
    const count = Math.min(wolfeLabels.length, refs.length);
    for (let i = 0; i < count; i++) {
      template.push({
        kind: 'pointLabel', text: wolfeLabels[i], color: DRAWING_COLORS.blue,
        point: refs[i], dy: labelDy(i), fontSize: 15, fontWeight: 800
      });
    }
    if (refs[0]) template.push({ kind: 'circle', point: refs[0], color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 8, width: 2.5 });
    if (count >= 5) {
      template.push({ kind: 'line', text: '1-3-5', color: DRAWING_COLORS.magenta, width: 2.2, dash: '6 4', from: refs[0], to: refs[4] });
      template.push({ kind: 'line', text: '2-4', color: DRAWING_COLORS.magenta, width: 2.2, dash: '6 4', from: refs[1], to: refs[3] });
      template.push({ kind: 'polygon', color: 'rgba(232,121,249,0.25)', fill: 'rgba(168,85,247,0.08)', width: 0, points: [refs[0], refs[2], refs[4]] });
      template.push({ kind: 'line', text: 'EPA目标', color: DRAWING_COLORS.cyan, width: 1.4, dash: '4 6', from: refs[0], to: refs[3] });
    } else if (count >= 3) {
      template.push({ kind: 'line', color: DRAWING_COLORS.magenta, width: 2.2, dash: '6 4', from: refs[0], to: refs[2] });
    }
    addedSpecificLabels = true;

  } else if (isCup) {
    // ── 杯柄: 杯口/杯底/柄部 + 杯口线 ──
    const isInverted = /INVERTED/.test(key);
    const rimRefs = isInverted ? lowRefs : highRefs;
    const baseRefs = isInverted ? highRefs : lowRefs;
    const rimDy = isInverted ? 19 : -15;
    const baseDy = isInverted ? -15 : 19;
    const baseRef = baseRefs[Math.floor(baseRefs.length / 2)] || baseRefs[0];
    if (baseRef) template.push({ kind: 'circle', point: baseRef, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 9, width: 2.5 });
    if (rimRefs.length >= 1) {
      template.push({ kind: 'pointLabel', text: '杯口', color: DRAWING_COLORS.yellow, point: rimRefs[0], dy: rimDy, fontSize: 13 });
    }
    if (baseRefs.length >= 1) {
      template.push({ kind: 'pointLabel', text: isInverted ? '杯顶' : '杯底', color: DRAWING_COLORS.blue, point: baseRef, dy: baseDy, fontSize: 13 });
    }
    if (rimRefs.length >= 2) {
      template.push({ kind: 'pointLabel', text: '柄', color: DRAWING_COLORS.orange, point: rimRefs[rimRefs.length - 1], dy: rimDy, fontSize: 13 });
      template.push({ kind: 'line', text: '杯口线', color: DRAWING_COLORS.magenta, width: 2.4, dash: '9 6', from: rimRefs[0], to: rimRefs[rimRefs.length - 1] });
    }
    // 杯形区域填充
    pushZoneBox(refs[1] || refs[0], refs[refs.length - 1], 'rgba(232,121,249,0.22)', 'rgba(168,85,247,0.06)', 0.006, -0.006);
    addedSpecificLabels = true;

  } else if (isQM) {
    const finalRef = refs[refs.length - 1];
    const sweepRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
    const qmRefs = isBullish ? highRefs : lowRefs;
    const qmRef = qmRefs[Math.max(0, qmRefs.length - 2)] || qmRefs[0] || pivotRefs[1];
    labelRef(isBullish ? 'LL扫流动性' : 'HH扫流动性', sweepRef, isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, { fontSize: 13, fontWeight: 800 });
    labelRef('QM区', qmRef, DRAWING_COLORS.yellow, { dx: 24, fontSize: 12 });
    if (qmRef) {
      template.push({ kind: 'hline', text: 'QM颈线', color: DRAWING_COLORS.yellow, width: 1.8, dash: '7 5', point: qmRef });
      pushZoneBox(qmRef, finalRef, isBullish ? 'rgba(34,197,94,0.34)' : 'rgba(239,68,68,0.34)', isBullish ? 'rgba(20,83,45,0.08)' : 'rgba(127,29,29,0.08)', 0.006, -0.006);
    }
    if (sweepRef && finalRef) {
      template.push({ kind: 'arrow', text: isBullish ? '扫低反转' : '扫高反转', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2.2, from: sweepRef, to: finalRef });
    }
    addedSpecificLabels = true;

  } else if (isReversal123) {
    const point1 = isBullish ? lowRefs[0] : highRefs[0];
    const point2 = isBullish ? highRefs[0] : lowRefs[0];
    const point3 = isBullish ? (lowRefs[1] || lowRefs[0]) : (highRefs[1] || highRefs[0]);
    labelRef('1', point1, DRAWING_COLORS.orange, { fontSize: 15, fontWeight: 800 });
    labelRef('2', point2, DRAWING_COLORS.blue, { fontSize: 15, fontWeight: 800 });
    labelRef('3', point3, DRAWING_COLORS.orange, { fontSize: 15, fontWeight: 800 });
    if (point2) template.push({ kind: 'hline', text: isBullish ? '点2突破线' : '点2跌破线', color: DRAWING_COLORS.yellow, width: 1.8, dash: '7 5', point: point2 });
    if (point3) template.push({ kind: 'hline', text: '点3失效位', color: DRAWING_COLORS.red, width: 1.4, dash: '4 4', point: point3 });
    if (point1 && point2) template.push({ kind: 'arrow', text: '1-2量度', color: DRAWING_COLORS.cyan, width: 1.6, from: point1, to: point2 });
    addedSpecificLabels = true;

  } else if (isMeasured) {
    const startRef = refs[0];
    const leg1Ref = refs[Math.min(1, refs.length - 1)];
    const pullbackRef = refs[Math.min(2, refs.length - 1)];
    const targetRef = refs[refs.length - 1];
    [['A', startRef], ['B', leg1Ref], ['C', pullbackRef], ['D', targetRef]].forEach(([text, point]) => labelRef(text, point, DRAWING_COLORS.orange, { fontSize: 14, fontWeight: 800 }));
    if (startRef && leg1Ref) template.push({ kind: 'arrow', text: '第一段', color: DRAWING_COLORS.blue, width: 2, from: startRef, to: leg1Ref });
    if (pullbackRef && targetRef) template.push({ kind: 'arrow', text: '等幅投射', color: DRAWING_COLORS.yellow, width: 2, dash: '6 4', from: pullbackRef, to: targetRef });
    if (pullbackRef) template.push({ kind: 'hline', text: isBullish ? '回调承接' : '反弹压力', color: isBullish ? DRAWING_COLORS.support : DRAWING_COLORS.resistance, width: 1.5, dash: '4 4', point: pullbackRef });
    addedSpecificLabels = true;

  } else if (isSpike) {
    const finalRef = refs[refs.length - 1];
    const spikeEnd = refs[Math.min(1, refs.length - 1)];
    template.push({ kind: 'arrow', text: 'spike', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 3, from: refs[0], to: spikeEnd });
    if (highRefs.length >= 2) template.push({ kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: highRefs[0], to: highRefs[highRefs.length - 1] });
    if (lowRefs.length >= 2) template.push({ kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
    labelRef(isBullish ? '下轨回踩' : '上轨反抽', isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1], DRAWING_COLORS.yellow);
    pushZoneBox(spikeEnd, finalRef, 'rgba(96,165,250,0.30)', 'rgba(37,99,235,0.07)', 0.006, -0.006);
    addedSpecificLabels = true;

  } else if (isFlag) {
    const poleEnd = refs[Math.min(1, refs.length - 1)];
    const flagStartR = poleEnd?.r ?? 0.28;
    const flagHighs = highRefs.filter(r => r.r >= flagStartR);
    const flagLows = lowRefs.filter(r => r.r >= flagStartR);
    template.push({ kind: 'arrow', text: '旗杆', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 3, from: refs[0], to: poleEnd });
    if (flagHighs.length >= 2) template.push({ kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: flagHighs[0], to: flagHighs[flagHighs.length - 1] });
    if (flagLows.length >= 2) template.push({ kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: flagLows[0], to: flagLows[flagLows.length - 1] });
    if (flagHighs.length >= 2 && flagLows.length >= 2) template.push({ kind: 'polygon', color: 'rgba(232,121,249,0.30)', fill: 'rgba(168,85,247,0.10)', width: 0, points: [flagHighs[0], flagHighs[flagHighs.length - 1], flagLows[flagLows.length - 1], flagLows[0]] });
    labelRef(isBullish ? '浅回调' : '弱反弹', refs[Math.floor(refs.length * 0.65)] || poleEnd, isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red);
    addedSpecificLabels = true;

  } else if (isBroadening) {
    if (highRefs.length >= 2) template.push({ kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: highRefs[0], to: highRefs[highRefs.length - 1] });
    if (lowRefs.length >= 2) template.push({ kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.4, from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
    if (highRefs.length >= 2 && lowRefs.length >= 2) template.push({ kind: 'polygon', color: 'rgba(232,121,249,0.30)', fill: 'rgba(168,85,247,0.10)', width: 0, points: [highRefs[0], highRefs[highRefs.length - 1], lowRefs[lowRefs.length - 1], lowRefs[0]] });
    const startMarker = highRefs[0] || refs[0];
    if (startMarker) template.push({ kind: 'circle', point: startMarker, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 8, width: 2.5 });
    labelRef('波幅扩散', refs[Math.floor(refs.length * 0.55)] || refs[0], DRAWING_COLORS.orange);
    addedSpecificLabels = true;

  } else if (isGap) {
    const gapStart = refs[Math.max(1, Math.floor(refs.length * 0.28))] || refs[1];
    const gapEnd = refs[Math.max(2, Math.floor(refs.length * 0.42))] || refs[2];
    pushZoneBox(gapStart, gapEnd, 'rgba(234,179,8,0.38)', 'rgba(234,179,8,0.08)', 0.012, -0.012);
    labelRef(key.includes('FILL') || key.includes('BREAKAWAY') ? '缺口回补区' : '未回补缺口', gapEnd, DRAWING_COLORS.yellow, { dx: 24 });
    if (gapStart && gapEnd) template.push({ kind: 'arrow', text: isBullish ? '跳空上行' : '跳空下行', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2.2, from: gapStart, to: gapEnd });
    addedSpecificLabels = true;

  } else if (isVShape) {
    const extremeRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
    const finalRef = refs[refs.length - 1];
    if (extremeRef) template.push({ kind: 'circle', point: extremeRef, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 9, width: 2.5 });
    labelRef(isBullish ? '恐慌低点' : '疯狂高点', extremeRef, DRAWING_COLORS.orange, { fontSize: 13, fontWeight: 800 });
    if (extremeRef && finalRef) template.push({ kind: 'arrow', text: isBullish ? 'V形拉升' : 'V形下杀', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2.6, from: extremeRef, to: finalRef });
    pushZoneBox(extremeRef, finalRef, isBullish ? 'rgba(34,197,94,0.34)' : 'rgba(239,68,68,0.34)', isBullish ? 'rgba(20,83,45,0.08)' : 'rgba(127,29,29,0.08)', 0.008, -0.008);
    addedSpecificLabels = true;

  } else if (isRounding || isScallop) {
    const rimRefs = isBullish ? highRefs : lowRefs;
    const baseRefs = isBullish ? lowRefs : highRefs;
    const baseRef = baseRefs[Math.floor(baseRefs.length / 2)] || baseRefs[0];
    if (baseRef) template.push({ kind: 'circle', point: baseRef, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 9, width: 2.5 });
    if (rimRefs.length >= 2) template.push({ kind: 'line', text: isBullish ? '杯口/颈线' : '弧顶颈线', color: DRAWING_COLORS.magenta, width: 2.4, dash: '7 5', from: rimRefs[0], to: rimRefs[rimRefs.length - 1] });
    labelRef(isBullish ? '圆弧筑底' : '圆弧派发', baseRef, DRAWING_COLORS.blue, { fontSize: 13 });
    pushZoneBox(refs[1] || refs[0], refs[refs.length - 1], 'rgba(232,121,249,0.22)', 'rgba(168,85,247,0.06)', 0.006, -0.006);
    addedSpecificLabels = true;

  } else if (isIsland) {
    const islandStart = refs[Math.max(1, Math.floor(refs.length * 0.30))] || refs[1];
    const islandEnd = refs[Math.max(2, Math.floor(refs.length * 0.70))] || refs[refs.length - 1];
    pushZoneBox(islandStart, islandEnd, 'rgba(96,165,250,0.42)', 'rgba(37,99,235,0.10)', 0.01, -0.01);
    labelRef(isBullish ? '低位孤岛' : '高位孤岛', islandStart, DRAWING_COLORS.blue, { fontSize: 13 });
    labelRef(isBullish ? '反向跳空' : '跳空跌离', islandEnd, DRAWING_COLORS.yellow, { dx: 24 });
    addedSpecificLabels = true;

  } else if (isTrap || isParabolic) {
    const trapRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
    const triggerRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
    labelRef(isBullish ? '假跌破诱空' : '假突破诱多', trapRef, DRAWING_COLORS.orange, { fontSize: 13, fontWeight: 800 });
    if (triggerRef) template.push({ kind: 'hline', text: isBullish ? '收回确认' : '跌回确认', color: DRAWING_COLORS.yellow, width: 1.6, dash: '6 4', point: triggerRef });
    pushZoneBox(trapRef, triggerRef, isBullish ? 'rgba(34,197,94,0.34)' : 'rgba(239,68,68,0.34)', isBullish ? 'rgba(20,83,45,0.08)' : 'rgba(127,29,29,0.08)', 0.008, -0.008);
    addedSpecificLabels = true;

  } else if (isFlat) {
    const levelRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
    const oppositeRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
    if (levelRef) template.push({ kind: 'hline', text: isBullish ? '平顶阻力' : '平底支撑', color: isBullish ? DRAWING_COLORS.resistance : DRAWING_COLORS.support, width: 2, point: levelRef });
    if (oppositeRef) template.push({ kind: 'hline', text: '整理防守', color: DRAWING_COLORS.yellow, width: 1.4, dash: '4 4', point: oppositeRef });
    labelRef(isBullish ? '多次试压' : '多次试撑', levelRef, DRAWING_COLORS.orange);
    addedSpecificLabels = true;

  } else if (isStaircase) {
    for (let i = 1; i < refs.length - 1; i += 2) {
      template.push({ kind: 'hline', text: i === 1 ? '台阶平台' : undefined, color: 'rgba(148,163,184,0.58)', width: 1.1, dash: '3 4', point: refs[i] });
    }
    labelRef(isBullish ? '阶梯上攻' : '阶梯下行', refs[Math.floor(refs.length * 0.6)] || refs[0], DRAWING_COLORS.blue);
    addedSpecificLabels = true;

  } else if (isRunningCorrection) {
    const shallowRefs = isBullish ? lowRefs : highRefs;
    const trendRefs = isBullish ? highRefs : lowRefs;
    if (shallowRefs.length >= 2) template.push({ kind: 'line', text: isBullish ? '抬高低点' : '降低高点', color: DRAWING_COLORS.magenta, width: 2.2, dash: '6 4', from: shallowRefs[0], to: shallowRefs[shallowRefs.length - 1] });
    if (trendRefs.length >= 2) template.push({ kind: 'line', text: isBullish ? '浅回调上沿' : '浅反弹下沿', color: DRAWING_COLORS.magenta, width: 2.2, dash: '4 4', from: trendRefs[0], to: trendRefs[trendRefs.length - 1] });
    if (shallowRefs.length >= 2 && trendRefs.length >= 2) template.push({ kind: 'polygon', color: 'rgba(232,121,249,0.25)', fill: 'rgba(168,85,247,0.06)', width: 0, points: [shallowRefs[0], shallowRefs[shallowRefs.length - 1], trendRefs[trendRefs.length - 1], trendRefs[0]] });
    pushZoneBox(refs[Math.floor(refs.length * 0.28)] || refs[1], refs[refs.length - 1], 'rgba(96,165,250,0.30)', 'rgba(37,99,235,0.07)', 0.006, -0.006);
    labelRef(isBullish ? '运行式浅回调' : '运行式浅反弹', refs[Math.floor(refs.length * 0.55)] || refs[0], DRAWING_COLORS.blue, { fontSize: 12 });
    labelRef(isBullish ? '趋势未破' : '反弹受限', shallowRefs[shallowRefs.length - 1], DRAWING_COLORS.yellow, { dx: 24 });
    addedSpecificLabels = true;

  } else if (isComplexDouble) {
    const testRefs = isBullish ? lowRefs : highRefs;
    const neckRefs = isBullish ? highRefs : lowRefs;
    const labels = isBullish ? ['底1', '底2', '底3', '底4'] : ['顶1', '顶2', '顶3', '顶4'];
    for (let i = 0; i < Math.min(labels.length, testRefs.length); i++) {
      labelRef(labels[i], testRefs[i], DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
    }
    if (testRefs.length >= 2) pushZoneBox(testRefs[0], testRefs[testRefs.length - 1], isBullish ? 'rgba(34,197,94,0.34)' : 'rgba(239,68,68,0.34)', isBullish ? 'rgba(20,83,45,0.08)' : 'rgba(127,29,29,0.08)', 0.008, -0.008);
    if (neckRefs.length >= 2) template.push({ kind: 'line', text: 'NECKLINE', color: DRAWING_COLORS.magenta, width: 2.4, dash: '8 5', from: neckRefs[0], to: neckRefs[neckRefs.length - 1] });
    labelRef(isBullish ? '多次探底企稳' : '多次试探失败', testRefs[Math.floor(testRefs.length / 2)] || refs[0], isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, { fontSize: 13, fontWeight: 800 });
    addedSpecificLabels = true;

  } else if (isComplexHS) {
    const shoulderRefs = isBullish ? lowRefs : highRefs;
    const neckRefs = isBullish ? highRefs : lowRefs;
    const headRef = shoulderRefs[Math.floor(shoulderRefs.length / 2)] || shoulderRefs[0];
    const hsLabels = isBullish ? ['左肩1', '左肩2', '头', '右肩1', '右肩2'] : ['左肩1', '左肩2', '头', '右肩1', '右肩2'];
    for (let i = 0; i < Math.min(hsLabels.length, shoulderRefs.length); i++) {
      const text = shoulderRefs[i] === headRef ? '头部' : hsLabels[i];
      labelRef(text, shoulderRefs[i], text === '头部' ? DRAWING_COLORS.orange : DRAWING_COLORS.blue, { fontSize: text === '头部' ? 13 : 11, fontWeight: text === '头部' ? 800 : 700 });
    }
    if (neckRefs.length >= 2) template.push({ kind: 'line', text: 'NECKLINE', color: DRAWING_COLORS.magenta, width: 2.4, dash: '8 5', from: neckRefs[0], to: neckRefs[neckRefs.length - 1] });
    if (headRef) template.push({ kind: 'circle', point: headRef, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 9, width: 2.5 });
    pushZoneBox(refs[1] || refs[0], refs[refs.length - 1], 'rgba(148,163,184,0.30)', 'rgba(148,163,184,0.06)', 0.008, -0.008);
    labelRef(isBullish ? '复合头肩底' : '复合头肩顶', refs[Math.floor(refs.length * 0.55)] || refs[0], DRAWING_COLORS.cyan, { fontSize: 12 });
    addedSpecificLabels = true;

  } else if (isAdamEve) {
    const isBottom = key.includes('BOTTOM');
    const adamRef = isBottom ? lowRefs[0] : highRefs[highRefs.length - 1];
    const eveRef = isBottom ? lowRefs[lowRefs.length - 1] : highRefs[0];
    const neckRefs = isBottom ? highRefs : lowRefs;
    if (adamRef) template.push({ kind: 'circle', point: adamRef, color: DRAWING_COLORS.orange, fill: 'rgba(249,115,22,0.35)', radius: 8, width: 2.5 });
    if (eveRef) template.push({ kind: 'circle', point: eveRef, color: DRAWING_COLORS.blue, fill: 'rgba(96,165,250,0.35)', radius: 8, width: 2.5 });
    labelRef('Adam尖点', adamRef, DRAWING_COLORS.orange, { fontSize: 13, fontWeight: 800 });
    labelRef('Eve圆弧', eveRef, DRAWING_COLORS.blue, { fontSize: 13, fontWeight: 800 });
    if (neckRefs.length >= 2) template.push({ kind: 'line', text: 'NECKLINE', color: DRAWING_COLORS.magenta, width: 2.4, dash: '8 5', from: neckRefs[0], to: neckRefs[neckRefs.length - 1] });
    pushZoneBox(adamRef, eveRef, isBullish ? 'rgba(34,197,94,0.34)' : 'rgba(239,68,68,0.34)', isBullish ? 'rgba(20,83,45,0.08)' : 'rgba(127,29,29,0.08)', 0.008, -0.008);
    addedSpecificLabels = true;

  } else if (isORB || isFractal || isPriceAction) {
    const motherRef = refs[Math.max(1, Math.floor(refs.length * 0.35))] || refs[1];
    const compressionRef = refs[Math.max(2, Math.floor(refs.length * 0.65))] || refs[refs.length - 1];
    const breakoutRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
    const trapRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
    const title = key.includes('ORB') ? '开盘区间' : key.includes('FRACTAL') ? (isBullish ? '五K分形底' : '五K分形顶') : key.includes('HIKKAKE') ? '内包假破' : key.includes('POPGUN') ? '内包→外包' : key.includes('NR7') ? 'NR7窄幅K' : key.includes('INSIDE') ? '母子内包' : key.includes('OUTSIDE') ? '外包吞没' : key.includes('PIN_BAR') ? 'Pin Bar尾巴' : '价格行为压缩';
    pushZoneBox(motherRef, compressionRef, 'rgba(96,165,250,0.30)', 'rgba(37,99,235,0.07)', 0.008, -0.008);
    labelRef(title, motherRef, DRAWING_COLORS.blue, { fontSize: 12, fontWeight: 700 });
    if (key.includes('HIKKAKE') && trapRef) labelRef(isBullish ? '向下假破' : '向上假破', trapRef, DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
    if (key.includes('FRACTAL') && trapRef) labelRef(isBullish ? '中间K最低' : '中间K最高', trapRef, DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
    if (key.includes('PIN_BAR') && trapRef) labelRef(isBullish ? '长下影拒绝' : '长上影拒绝', trapRef, DRAWING_COLORS.orange, { fontSize: 12, fontWeight: 800 });
    if (breakoutRef) template.push({ kind: 'hline', text: isBullish ? '触发上破' : '触发下破', color: DRAWING_COLORS.yellow, width: 1.6, dash: '6 4', point: breakoutRef });
    if (compressionRef && refs[refs.length - 1]) template.push({ kind: 'arrow', text: isBullish ? '压缩后上破' : '压缩后下破', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2, from: compressionRef, to: refs[refs.length - 1] });
    addedSpecificLabels = true;

  } else if (isCandleSignal || isTower) {
    const candleSpec = /KICKER/.test(key) ? { labels: isBullish ? ['原趋势阴线', '跳空大阳'] : ['原趋势阳线', '跳空大阴'], title: isBullish ? '看涨踢脚' : '看跌踢脚', invalid: '跳空缺口失效' }
      : /TRIPLE_INSIDE_OUT/.test(key) ? { labels: isBullish ? ['母阴', '内包K', '外包上破'] : ['母阳', '内包K', '外包下破'], title: isBullish ? '三内外上翻' : '三内外下翻', invalid: '母K极值失效' }
      : /ABANDONED_BABY/.test(key) ? { labels: isBullish ? ['长阴', '弃婴十字', '跳空阳'] : ['长阳', '弃婴十字', '跳空阴'], title: isBullish ? '底部弃婴' : '顶部弃婴', invalid: '弃婴极值失效' }
      : /THREE_LINE_STRIKE/.test(key) ? { labels: isBullish ? ['阴1', '阴2', '阴3', '打击阳'] : ['阳1', '阳2', '阳3', '打击阴'], title: isBullish ? '三阴后一阳吞没' : '三阳后一阴吞没', invalid: '打击K失效' }
      : /COUNTERATTACK|MEETING_LINES/.test(key) ? { labels: isBullish ? ['长阴', '反击阳'] : ['长阳', '反击阴'], title: key.includes('MEETING') ? '约会线平收' : '反击线平收', invalid: '平收位失效' }
      : /BELT_HOLD/.test(key) ? { labels: isBullish ? ['光脚大阳'] : ['光头大阴'], title: isBullish ? '开盘即低点' : '开盘即高点', invalid: '腰带K极值失效' }
      : /SEPARATING_LINES/.test(key) ? { labels: isBullish ? ['回调阴', '同开强阳'] : ['反弹阳', '同开强阴'], title: '同开分离延续', invalid: '同开位失效' }
      : /CONCEALING_BABY/.test(key) ? { labels: ['光头阴1', '光头阴2', '藏婴', '恐慌吞没'], title: '藏婴吞没见底', invalid: '恐慌低点失效' }
      : /UNIQUE_THREE_RIVER/.test(key) ? { labels: ['大阴', '锤/十字', '确认阳'], title: '独特三川底', invalid: '三川低点失效' }
      : /THREE_STARS_IN_SOUTH/.test(key) ? { labels: ['阴1长影', '阴2缩短', '阴3枯竭'], title: '南方三星卖压递减', invalid: '三星低点失效' }
      : /STICK_SANDWICH/.test(key) ? { labels: isBullish ? ['阴线', '夹心阳', '同收阴'] : ['阳线', '夹心阴', '同收阳'], title: isBullish ? '双阴同收支撑' : '双阳同收压力', invalid: '同收位失效' }
      : /TASUKI_GAP/.test(key) ? { labels: isBullish ? ['跳空阳', '部分回补阴'] : ['跳空阴', '部分回补阳'], title: isBullish ? '上跳Tasuki缺口' : '下跳Tasuki缺口', invalid: '缺口完全回补' }
      : /MAT_HOLD/.test(key) ? { labels: isBullish ? ['大阳', '高位铺垫', '突破阳'] : ['大阴', '低位铺垫', '跌破阴'], title: isBullish ? 'Mat Hold高位不破' : 'Mat Hold低位不破', invalid: '中点失守' }
      : /SIDE_BY_SIDE/.test(key) ? { labels: isBullish ? ['跳空阳1', '并列阳2'] : ['跳空阴1', '并列阴2'], title: isBullish ? '并列阳确认缺口' : '并列阴确认缺口', invalid: '并列缺口失效' }
      : /BREAKAWAY/.test(key) ? { labels: isBullish ? ['下跳脱离', '小K横盘', '回补大阳'] : ['上跳脱离', '小K横盘', '回补大阴'], title: isBullish ? '脱离底部反转' : '脱离顶部反转', invalid: '脱离缺口失效' }
      : /ENGULFING|THREE_OUTSIDE/.test(key) ? { labels: isBullish ? ['前阴', '吞没阳', '确认阳'] : ['前阳', '吞没阴', '确认阴'], title: '实体吞没', invalid: isBullish ? '吞没低点失效' : '吞没高点失效' }
      : /MORNING|EVENING/.test(key) ? { labels: isBullish ? ['长阴', '星线', '确认阳'] : ['长阳', '星线', '确认阴'], title: isBullish ? '启明星三K' : '黄昏星三K', invalid: '星线极值失效' }
      : /THREE_SOLDIERS|THREE_CROWS|IDENTICAL_THREE_CROWS/.test(key) ? { labels: isBullish ? ['阳1', '阳2', '阳3'] : ['阴1', '阴2', '阴3'], title: isBullish ? '三白兵推进' : '三乌鸦压制', invalid: '三连K失效位' }
      : /TWEEZER|MATCHING/.test(key) ? { labels: isBullish ? ['同低1', '同低2'] : ['同高1', '同高2'], title: isBullish ? '双K同低' : '双K同高', invalid: isBullish ? '同低失效' : '同高失效' }
      : /HAMMER|HANGING_MAN|SHOOTING_STAR/.test(key) ? { labels: /SHOOTING|INVERTED/.test(key) ? ['小实体', '长上影'] : ['小实体', '长下影'], title: config.focus, invalid: isBullish ? '下影低点失效' : '上影高点失效' }
      : /DARK_CLOUD|PIERCING/.test(key) ? { labels: isBullish ? ['前阴实体', '刺透阳线'] : ['前阳实体', '乌云阴线'], title: isBullish ? '刺透50%' : '深入50%', invalid: '覆盖K失效位' }
      : /HARAMI/.test(key) ? { labels: /CROSS/.test(key) ? ['母K', '十字子K'] : ['母K', '子K'], title: isBullish ? '阴孕阳' : '阳孕阴', invalid: '母K极值失效' }
      : /DOJI|TRI_STAR|HIGH_WAVE/.test(key) ? { labels: /TRI_STAR/.test(key) ? ['十字1', '十字2', '十字3'] : ['长影线', '十字星'], title: /TRI_STAR/.test(key) ? '三星犹豫' : config.focus, invalid: '十字星极值失效' }
      : /THREE_INSIDE/.test(key) ? { labels: isBullish ? ['母阴', '孕阳', '突破阳'] : ['母阳', '孕阴', '跌破阴'], title: isBullish ? '三内翻多' : '三内翻空', invalid: '母K极值失效' }
      : /RISING_THREE_METHODS|FALLING_THREE_METHODS/.test(key) ? { labels: isBullish ? ['长阳', '三小回调', '续涨阳'] : ['长阴', '三小反弹', '续跌阴'], title: isBullish ? '上升三法' : '下降三法', invalid: '三法整理失效' }
      : /UPSIDE_GAP_TWO_CROWS/.test(key) ? { labels: ['跳空阳', '乌鸦1', '乌鸦2'], title: '向上缺口双鸦', invalid: '缺口回补失败' }
      : /ON_NECK|IN_NECK|THRUSTING/.test(key) ? { labels: ['长阴', '反抽K'], title: key.includes('ON_NECK') ? '颈上线' : key.includes('IN_NECK') ? '入颈线' : '插入线', invalid: '反抽高点失效' }
      : /ADVANCE_BLOCK|DELIBERATION|LADDER/.test(key) ? { labels: isBullish ? ['推进1', '推进2', '衰竭3'] : ['压制1', '压制2', '反转K'], title: config.focus, invalid: '组合极值失效' }
      : /HOMING_PIGEON/.test(key) ? { labels: ['大阴', '小阴内包'], title: '归巢鸽', invalid: '内包低点失效' }
      : { labels: [config.focus, '确认K'], title: config.focus, invalid: '信号失效位' };
    const signalRefs = refs.slice(Math.max(0, refs.length - Math.max(candleSpec.labels.length, 2)));
    const signalStart = signalRefs[0] || refs[Math.max(0, refs.length - 2)];
    const signalEnd = signalRefs[signalRefs.length - 1] || refs[refs.length - 1];
    const signalRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
    for (let i = 0; i < candleSpec.labels.length; i++) {
      labelRef(candleSpec.labels[i], signalRefs[i] || signalEnd, i === candleSpec.labels.length - 1 ? (isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red) : DRAWING_COLORS.blue, { fontSize: 11, fontWeight: 700 });
    }
    pushZoneBox(signalStart, signalEnd, isBullish ? 'rgba(34,197,94,0.34)' : 'rgba(239,68,68,0.34)', isBullish ? 'rgba(20,83,45,0.08)' : 'rgba(127,29,29,0.08)', 0.008, -0.008);
    labelRef(candleSpec.title, signalEnd, isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, { dx: 24, fontSize: 13, fontWeight: 800 });
    if (/TWEEZER|MATCHING/.test(key) && signalRef) template.push({ kind: 'hline', text: isBullish ? '共同低点' : '共同高点', color: DRAWING_COLORS.yellow, width: 1.7, dash: '5 4', point: signalRef });
    if (/GAP|STAR/.test(key)) pushZoneBox(signalStart, signalRefs[1] || signalEnd, 'rgba(234,179,8,0.30)', 'rgba(234,179,8,0.07)', 0.006, -0.006);
    if (signalRef) template.push({ kind: 'hline', text: candleSpec.invalid, color: DRAWING_COLORS.red, width: 1.3, dash: '4 4', point: signalRef });
    addedSpecificLabels = true;

  } else if (isWyckoff) {
    const wyckoffSpec = key.includes('REACCUMULATION') ? { labels: ['AR', 'ST', 'Creek', 'SOS', 'LPS'], event: 'SOS越溪', trigger: 'LPS回踩', eventSide: 'high', zoneText: '再吸筹区间' }
      : key.includes('REDISTRIBUTION') ? { labels: ['AR', 'ST', 'Ice', 'SOW', 'LPSY'], event: 'SOW破冰', trigger: 'LPSY反抽', eventSide: 'low', zoneText: '再派发区间' }
      : key.includes('SPRING') ? { labels: ['TR低点', 'ST', 'Spring', 'Test', 'SOS'], event: 'Spring假破', trigger: '收回TR', eventSide: 'low', zoneText: '吸筹交易区间' }
      : key.includes('UPTHRUST') ? { labels: ['TR高点', 'ST', 'UTAD', 'SOW', 'LPSY'], event: 'UTAD诱多', trigger: '跌回TR', eventSide: 'high', zoneText: '派发交易区间' }
      : isBullish ? { labels: ['PS', 'SC', 'AR', 'ST', 'Spring', 'SOS', 'LPS'], event: 'Spring', trigger: 'SOS确认', eventSide: 'low', zoneText: '吸筹区间' }
      : { labels: ['PSY', 'BC', 'AR', 'ST', 'UTAD', 'SOW', 'LPSY'], event: 'UTAD', trigger: 'SOW确认', eventSide: 'high', zoneText: '派发区间' };
    const wyRefs = pivotRefs.length ? pivotRefs : refs;
    for (let i = 0; i < wyckoffSpec.labels.length; i++) {
      const idx = Math.min(wyRefs.length - 1, Math.round((wyRefs.length - 1) * (i / Math.max(1, wyckoffSpec.labels.length - 1))));
      labelRef(wyckoffSpec.labels[i], wyRefs[idx], wyckoffSpec.labels[i] === wyckoffSpec.event ? DRAWING_COLORS.orange : DRAWING_COLORS.blue, { fontSize: wyckoffSpec.labels[i] === wyckoffSpec.event ? 13 : 11, fontWeight: wyckoffSpec.labels[i] === wyckoffSpec.event ? 800 : 700 });
    }
    const rangeHigh = highRefs[0] || highRefs[highRefs.length - 1];
    const rangeLow = lowRefs[0] || lowRefs[lowRefs.length - 1];
    const eventRef = wyckoffSpec.eventSide === 'low' ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
    const confirmRef = isBullish ? highRefs[highRefs.length - 1] : lowRefs[lowRefs.length - 1];
    if (rangeHigh) template.push({ kind: 'hline', text: isBullish ? 'TR上沿/Creek' : 'TR上沿/供应', color: DRAWING_COLORS.resistance, width: 1.6, dash: '5 5', point: rangeHigh });
    if (rangeLow) template.push({ kind: 'hline', text: isBullish ? 'TR下沿/支撑' : 'TR下沿/Ice', color: DRAWING_COLORS.support, width: 1.6, dash: '5 5', point: rangeLow });
    pushZoneBox(refs[1] || refs[0], refs[refs.length - 1], 'rgba(96,165,250,0.32)', 'rgba(37,99,235,0.07)', 0.008, -0.008);
    labelRef(wyckoffSpec.zoneText, refs[Math.floor(refs.length * 0.45)] || refs[0], DRAWING_COLORS.cyan, { fontSize: 12 });
    labelRef(wyckoffSpec.event, eventRef, DRAWING_COLORS.orange, { dx: 26, fontSize: 13, fontWeight: 800 });
    if (confirmRef) template.push({ kind: 'hline', text: wyckoffSpec.trigger, color: DRAWING_COLORS.yellow, width: 1.5, dash: '6 4', point: confirmRef });
    if (eventRef && refs[refs.length - 1]) template.push({ kind: 'arrow', text: isBullish ? '吸筹后上攻' : '派发后下跌', color: isBullish ? DRAWING_COLORS.green : DRAWING_COLORS.red, width: 2, from: eventRef, to: refs[refs.length - 1] });
    addedSpecificLabels = true;

  } else if (isAndrews) {
    const anchorA = refs[0];
    const anchorB = refs[Math.min(2, refs.length - 1)];
    const anchorC = refs[Math.min(4, refs.length - 1)];
    const finalRef = refs[refs.length - 1];
    labelRef('A', anchorA, DRAWING_COLORS.orange, { fontSize: 14, fontWeight: 800 });
    labelRef('B', anchorB, DRAWING_COLORS.orange, { fontSize: 14, fontWeight: 800 });
    labelRef('C', anchorC, DRAWING_COLORS.orange, { fontSize: 14, fontWeight: 800 });
    if (anchorA && finalRef) template.push({ kind: 'line', text: '中线', color: DRAWING_COLORS.cyan, width: 2.2, from: anchorA, to: finalRef });
    if (highRefs.length >= 2) template.push({ kind: 'line', text: 'RESISTANCE LINE', color: DRAWING_COLORS.magenta, width: 2.2, dash: '5 4', from: highRefs[0], to: highRefs[highRefs.length - 1] });
    if (lowRefs.length >= 2) template.push({ kind: 'line', text: 'SUPPORT LINE', color: DRAWING_COLORS.magenta, width: 2.2, dash: '5 4', from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
    if (highRefs.length >= 2 && lowRefs.length >= 2) template.push({ kind: 'polygon', color: 'rgba(232,121,249,0.25)', fill: 'rgba(168,85,247,0.06)', width: 0, points: [highRefs[0], highRefs[highRefs.length - 1], lowRefs[lowRefs.length - 1], lowRefs[0]] });
    addedSpecificLabels = true;

  } else {
    // ── 默认: 通用压力/支撑线 ──
    if (highRefs.length >= 2) {
      template.push({ kind: 'line', text: '压力线', color: DRAWING_COLORS.resistance, width: 2.1, from: highRefs[0], to: highRefs[highRefs.length - 1] });
    }
    if (lowRefs.length >= 2) {
      template.push({ kind: 'line', text: '支撑线', color: DRAWING_COLORS.support, width: 2.1, from: lowRefs[0], to: lowRefs[lowRefs.length - 1] });
    }
    // 反转形态: 增加反转区域高亮
    if (config.type === 'reversal' && pivotRefs.length >= 2) {
      const extremeRef = isBullish ? lowRefs[lowRefs.length - 1] : highRefs[highRefs.length - 1];
      if (extremeRef) {
        template.push({
          kind: 'box',
          color: isBullish ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
          fill: isBullish ? 'rgba(20,83,45,0.10)' : 'rgba(127,29,29,0.10)',
          from: { r: Math.max(0, extremeRef.r - 0.08) },
          to: { r: Math.min(0.85, extremeRef.r + 0.08) },
          top: { zoneFrom: extremeRef.zoneFrom, zoneTo: extremeRef.zoneTo, zoneField: 'high', offset: 0.008 },
          bottom: { zoneFrom: extremeRef.zoneFrom, zoneTo: extremeRef.zoneTo, zoneField: 'low', offset: -0.008 },
        });
      }
    }
  }

  // 焦点标注 (仅在无专属标注时添加，避免标注过多)
  if (!addedSpecificLabels) {
    template.push(
      { kind: 'pointLabel', text: config.focus, color: DRAWING_COLORS.orange, point: refs[Math.floor(refs.length * 0.55)] || refs[0], dy: isBullish ? -14 : 18 }
    );
  }

  const lateRef = refs[refs.length - 1] || refs[0];
  const lastHighRef = highRefs[highRefs.length - 1];
  const lastLowRef = lowRefs[lowRefs.length - 1];
  const triggerRef = isBullish ? lastHighRef : lastLowRef;
  const invalidationRef = isBullish ? lastLowRef : lastHighRef;

  if (isFib) {
    if (triggerRef) {
      template.push({ kind: 'hline', text: isBullish ? '延续确认' : '转弱确认', color: DRAWING_COLORS.cyan, width: 1.5, dash: '5 5', point: triggerRef });
    }
    if (invalidationRef) {
      template.push({ kind: 'hline', text: 'Fib失效位', color: DRAWING_COLORS.red, width: 1.4, dash: '4 4', point: { ...invalidationRef, offset: isBullish ? -0.012 : 0.012 } });
    }
  } else if (isElliott) {
    if (triggerRef) {
      template.push({ kind: 'pointLabel', text: '浪级确认', color: DRAWING_COLORS.cyan, point: triggerRef, dy: triggerRef.zoneField === 'high' ? -15 : 19, fontSize: 12 });
    }
    if (invalidationRef) {
      template.push({ kind: 'hline', text: '波浪失效', color: DRAWING_COLORS.red, width: 1.4, dash: '4 4', point: invalidationRef });
    }
  } else if (isHarmonic) {
    const reactionRef = pivotRefs[Math.max(0, pivotRefs.length - 2)];
    if (reactionRef) {
      template.push({ kind: 'hline', text: 'T1反应位', color: DRAWING_COLORS.yellow, width: 1.4, dash: '5 5', point: reactionRef });
    }
    if (lateRef) {
      template.push({ kind: 'pointLabel', text: 'PRZ反应确认', color: DRAWING_COLORS.cyan, point: lateRef, dy: isBullish ? -15 : 19, fontSize: 12 });
    }
  } else if (isTriangle || isChannel) {
    template.push({
      kind: 'box',
      color: isBullish ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)',
      fill: isBullish ? 'rgba(20,83,45,0.07)' : 'rgba(127,29,29,0.07)',
      from: { r: 0.72 },
      to: { r: 0.85 },
      top: { zoneFrom: 0.68, zoneTo: 0.85, zoneField: 'high', offset: 0.006 },
      bottom: { zoneFrom: 0.68, zoneTo: 0.85, zoneField: 'low', offset: -0.006 },
    });
    if (lateRef) {
      template.push({ kind: 'pointLabel', text: isBullish ? '突破确认区' : '跌破确认区', color: DRAWING_COLORS.yellow, point: lateRef, dy: isBullish ? -15 : 19, fontSize: 12 });
    }
  } else if (isTriple) {
    if (triggerRef) {
      template.push({ kind: 'pointLabel', text: isBullish ? '颈线突破确认' : '颈线跌破确认', color: DRAWING_COLORS.yellow, point: lateRef || triggerRef, dy: isBullish ? -15 : 19, fontSize: 12 });
    }
    if (invalidationRef) {
      template.push({ kind: 'hline', text: '三测失效位', color: DRAWING_COLORS.red, width: 1.4, dash: '4 4', point: invalidationRef });
    }
  } else if (isICT) {
    const liquidityRef = isBullish ? lastLowRef : lastHighRef;
    if (liquidityRef) {
      template.push({ kind: 'hline', text: isBullish ? 'SSL流动性' : 'BSL流动性', color: DRAWING_COLORS.yellow, width: 1.4, dash: '5 5', point: liquidityRef });
    }
    if (lateRef) {
      template.push({ kind: 'pointLabel', text: 'displacement确认', color: DRAWING_COLORS.cyan, point: lateRef, dy: isBullish ? -15 : 19, fontSize: 12 });
    }
  } else if (isWolfe) {
    if (lateRef) {
      template.push({ kind: 'pointLabel', text: 'EPA目标线', color: DRAWING_COLORS.yellow, point: lateRef, dy: isBullish ? -15 : 19, fontSize: 12 });
    }
  } else if (isCup) {
    if (triggerRef) {
      template.push({ kind: 'hline', text: '杯口突破线', color: DRAWING_COLORS.cyan, width: 1.5, dash: '5 5', point: triggerRef });
    }
    if (lateRef) {
      template.push({ kind: 'pointLabel', text: '手柄确认', color: DRAWING_COLORS.yellow, point: lateRef, dy: isBullish ? -15 : 19, fontSize: 12 });
    }
  } else {
    if (triggerRef) {
      template.push({ kind: 'hline', text: isBullish ? '确认突破位' : '确认跌破位', color: DRAWING_COLORS.cyan, width: 1.4, dash: '5 5', point: triggerRef });
    }
    if (invalidationRef) {
      template.push({ kind: 'hline', text: '结构失效位', color: DRAWING_COLORS.red, width: 1.3, dash: '4 4', point: invalidationRef });
    }
  }

  // ── 通用: entry / riskBox / target (按形态类别差异化) ──
  const _stopOffset = isHarmonic ? (isBullish ? -0.01 : 0.01) : (isTriangle || isChannel) ? (isBullish ? -0.015 : 0.015) : isBullish ? -0.02 : 0.02;
  const _targetOffset = isHarmonic ? (isBullish ? 0.18 : -0.18)
    : (isTriangle || isChannel) ? (isBullish ? 0.24 : -0.24)
    : isElliott ? (isBullish ? 0.38 : -0.38)
    : isFib ? (isBullish ? 0.22 : -0.22)
    : isBullish ? 0.32 : -0.32;
  const _stopZone = isHarmonic ? { zoneFrom: 0.62, zoneTo: 0.85 } : { zoneFrom: 0.68, zoneTo: 0.85 };
  const _targetZone = isHarmonic ? { zoneFrom: 0.20, zoneTo: 0.60 } : { zoneFrom: 0.0, zoneTo: 0.85 };
  template.push(
    { kind: 'pointLabel', text: 'entry', color: DRAWING_COLORS.green, point: { r: 0.98, field: 'close' }, dx: 34, dy: 4, showDot: true },
    { kind: 'circle', point: { r: 0.98, field: 'close' }, color: DRAWING_COLORS.green, fill: 'rgba(34,197,94,0.25)' },
    { kind: 'riskBox', direction: config.direction,
      entry: { r: 0.98, field: 'close' },
      stop: { zoneFrom: _stopZone.zoneFrom, zoneTo: _stopZone.zoneTo, zoneField: isBullish ? 'low' : 'high', offset: _stopOffset },
      target: { zoneFrom: _targetZone.zoneFrom, zoneTo: _targetZone.zoneTo, zoneField: isBullish ? 'high' : 'low', offset: _targetOffset },
      from: { r: 0.74 }, to: { r: 0.83 } },
    { kind: 'arrow', color: DRAWING_COLORS.cyan, width: 3, from: { r: 0.83, field: 'close' }, to: { section: 'future', r: 0.85, field: isBullish ? 'high' : 'low' }, text: isBullish ? '突破目标' : '跌破目标' },
    { kind: 'pointLabel', text: 'target', color: DRAWING_COLORS.cyan, point: { section: 'future', r: 0.85, field: isBullish ? 'high' : 'low' }, dx: -30, dy: isBullish ? -18 : 20 }
  );

  // ── 形态完成度指示 ──
  const completionPct = isHarmonic ? '~90%' : isElliott ? '~80%' : (isTriangle || isChannel) ? '~85%' : '~85%';
  template.push({
    kind: 'pointLabel', text: `形态 ${completionPct}`,
    color: 'rgba(148,163,184,0.7)', point: { r: 0.88, field: 'close' },
    dx: 0, dy: -28, fontSize: 9, fontWeight: 400
  });

  return template;
};

Object.assign(PATTERNS, Object.fromEntries(
  ADDITIONAL_PATTERN_ENTRIES.map((config) => [config.key, {
    name: config.name,
    nameEn: config.nameEn,
    type: config.type,
    direction: config.direction,
    description: config.description,
  }])
));

const _makeAnalysis = (config) => {
  const k = config.key;
  const bull = config.direction === 'bullish';
  const dir = bull ? '看涨' : '看跌';
  const act = bull ? '做多' : '做空';
  const brk = bull ? '突破' : '跌破';
  const stp = bull ? '低点下方' : '高点上方';
  const tgtDir = bull ? '向上' : '向下';

  const isHarmonic = /GARTLEY|BUTTERFLY|BAT(?:_)|CRAB|SHARK|CYPHER|FIVE_O|NEN_STAR|NAVARRO|BLACK_SWAN|WHITE_SWAN|ABCD|THREE_DRIVES/.test(k);
  const isElliott = k.startsWith('ELLIOTT_');
  const isFib = k.startsWith('FIB_');
  const isTriangle = /TRIANGLE|PENNANT|DIAMOND/.test(k);
  const isWedge = /WEDGE/.test(k);
  const isChannel = /CHANNEL/.test(k) && !/SPIKE_AND_CHANNEL/.test(k);
  const isFlag = /FLAG/.test(k);
  const isTriple = /TRIPLE_TOP|TRIPLE_BOTTOM/.test(k);
  const isICT = /^ICT_|^SMC_/.test(k);
  const isWolfe = /WOLFE/.test(k);
  const isCup = /CUP/.test(k);
  const isBroadening = /BROADENING/.test(k);
  const isVShape = /^V_/.test(k);
  const isIsland = /ISLAND/.test(k);
  const isEngulfing = /ENGULFING|MORNING|EVENING|SOLDIER|CROW|TWEEZER|KICKER|INSIDE_OUT/.test(k);
  const isStaircase = /STAIRCASE/.test(k);
  const isTower = /TOWER|PIPE/.test(k);
  const isTrap = /TRAP|SHAKEOUT|DEAD_CAT/.test(k);
  const isParabolic = /PARABOLIC|BUMP/.test(k);
  const isScallop = /SCALLOP/.test(k);
  const isFlat = /FLAT_TOP|FLAT_BOTTOM/.test(k);
  const isReversal123 = /REVERSAL_123/.test(k);
  const isQM = /QUASIMODO/.test(k);
  const isMeasured = /MEASURED_MOVE/.test(k);
  const isSpike = /SPIKE_AND_CHANNEL/.test(k);
  const isGap = /GAP_AND_GO/.test(k);
  const isDiagonal = /DIAGONAL/.test(k);
  const isRunning = /RUNNING_CORRECTION/.test(k);
  const isComplex = /COMPLEX/.test(k);

  if (isHarmonic) {
    const isABCD = /ABCD/.test(k);
    const isDrives = /THREE_DRIVES/.test(k);
    const patternName = isDrives ? '三推浪' : isABCD ? 'AB=CD' : k.replace(/_BULLISH|_BEARISH/g, '').replace(/_/g, ' ');
    const dRatio = /GARTLEY/.test(k) ? '0.786 XA' : /BAT(?:_)/.test(k) ? '0.886 XA' : /BUTTERFLY/.test(k) ? '1.272 XA' : /CRAB/.test(k) ? '1.618 XA' : /SHARK/.test(k) ? '0.886-1.13 0X' : /CYPHER/.test(k) ? '0.786 XC' : /FIVE_O/.test(k) ? '50% BC' : '';
    return `【${config.name}】${config.description}

📐 形态结构：
• 核心：${isDrives ? '三段同向推动波逐步衰竭' : isABCD ? 'AB与CD两段等幅运动' : 'XABCD五点谐波回撤结构'}
• D点位置：${dRatio || '基于各leg间Fibonacci比例确定'}
• 完成确认：D点到达PRZ（潜在反转区）后出现反向K线信号
• 当前阶段：${isDrives ? '第三推接近完成' : 'D点已形成，等待反转确认'}

📊 关键识别要点：
• ${isDrives ? '每段推动力度递减，第三推通常最弱' : isABCD ? 'AB与CD的幅度和时间应大致对等' : '各leg需满足特定Fibonacci比例关系'}
• D点附近出现${bull ? '长下影线或吞没阳线' : '长上影线或吞没阴线'}为反转信号
• PRZ区域若与其他支撑/阻力重合，反转概率更高
• ${/BUTTERFLY|CRAB/.test(k) ? 'D点超过X点是此形态的特征，不代表失效' : 'D点不应超过X点，否则形态失效'}

⚠️ 交易策略：
• 入场：D点出现反转K线确认后${act}
• 止损：D点极值外侧（${stp}）
• 目标：T1=C点位置，T2=A点位置
• 注意：需等D点确认再入场，不可提前猜底/顶`;
  }

  if (isElliott) {
    const isImpulse = /IMPULSE/.test(k);
    const isCorrective = /CORRECTIVE/.test(k);
    return `【${config.name}】${config.description}

📐 形态结构：
• ${isImpulse ? '推动浪：五浪结构(1-2-3-4-5)，其中1/3/5为推动浪，2/4为调整浪' : isCorrective ? '调整浪：三浪结构(A-B-C)，完成对前期趋势的回调修正' : '波浪子结构：符合Elliott波浪理论的特定子结构'}
• ${isImpulse ? '第3浪通常最长最强，不能是最短的一浪' : 'C浪通常具有推动浪特征，力度较强'}
• ${isImpulse ? '第4浪底部不可重叠第1浪顶部（非重叠规则）' : 'B浪不可超过A浪起点'}
• 当前阶段：${isImpulse ? '推动结构延续，等待最终浪完成' : '调整结构接近完成，等待恢复主趋势'}

📊 关键识别要点：
• ${isImpulse ? '浪3放量突破、浪5可能出现量价背离' : 'C浪末端出现动能衰竭信号'}
• 通道线：${isImpulse ? '连接浪2和浪4的底部画通道，浪5通常在通道上沿遇阻' : '调整浪常在前期推动浪的38.2%-61.8%区域结束'}
• 子浪划分：每个推动浪内部可再分为5个子浪
• 时间比例：各浪之间存在Fibonacci时间关系

⚠️ 交易策略：
• 入场：${isImpulse ? '浪4回调结束后跟随浪5' : '调整浪C完成后跟随主趋势'}${act}
• 止损：${isImpulse ? '浪4起点（不可回到浪1区域）' : 'C浪极值外侧'}
• 目标：${isImpulse ? '浪3等幅或1.618延伸' : '突破B浪高/低点后按主趋势波段量度'}
• 注意：波浪划分存在主观性，需结合其他指标验证`;
  }

  if (isFib) {
    const fibText = /382/.test(k) ? '38.2%' : /500/.test(k) ? '50.0%' : /618/.test(k) ? '61.8%' : /1272/.test(k) ? '127.2%' : /1618/.test(k) ? '161.8%' : /CLUSTER/.test(k) ? '多重共振' : '';
    const isExt = /1272|1618/.test(k);
    const isCluster = /CLUSTER/.test(k);
    return `【${config.name}】${config.description}

📐 形态结构：
• 核心比例：${fibText}
• ${isCluster ? '多个Fibonacci水平线在同一价格区域交汇，形成强共振区' : isExt ? '价格超过前期波段终点，达到Fibonacci延伸位' : '价格回调至前期波段的Fibonacci比例位后企稳'}
• 基准波段：以最近一段明确的趋势波段为量度基准
• 当前阶段：价格已到达${fibText}关键位，等待方向确认

📊 关键识别要点：
• ${isCluster ? '共振区是多个独立Fibonacci水平的交汇，概率权重最高' : isExt ? '延伸目标位常与波段等幅投射重合' : `${fibText}是机构常用的入场/出场水平`}
• 在该水平出现${bull ? '企稳信号（锤子线/吞没阳线）' : '见顶信号（射击之星/吞没阴线）'}更可靠
• 若价格快速穿越该位而无停留，需关注下一个Fibonacci水平
• 与整数关口、前期高低点重合时效力倍增

⚠️ 交易策略：
• 入场：${fibText}位出现反转K线后${act}
• 止损：${isExt ? '下一个Fibonacci延伸位外侧' : '下一个Fibonacci回调位外侧'}
• 目标：${isExt ? '前期波段的下一个延伸位' : '回到原趋势方向的前期极值'}
• 注意：Fibonacci位是概率区域而非精确点位，允许一定误差`;
  }

  if (isTriangle) {
    const isPennant = /PENNANT/.test(k);
    const isDiamond = /DIAMOND/.test(k);
    const isSym = /SYMMETRICAL/.test(k);
    return `【${config.name}】${config.description}

📐 形态结构：
• ${isPennant ? '旗杆：形态前的急速运动段，代表强趋势推动力' : isDiamond ? '先扩散后收敛：波幅先放大再缩小，形成菱形' : isSym ? '对称收敛：高点降低、低点抬高，多空逐步均衡' : '收敛结构：价格在上下轨之间波幅逐步缩窄'}
• ${isPennant ? '旗面：急速运动后的小型收敛三角整理，时间较短' : '上下轨：连接高点形成上轨，连接低点形成下轨'}
• 收敛特征：${isDiamond ? '前半段波幅扩大，后半段波幅收窄' : '波动空间逐渐减小，能量逐步积聚'}
• 当前阶段：${isPennant ? '旗面整理接近尾声' : '收敛末端即将选择方向'}

📊 关键识别要点：
• ${isPennant ? '旗面持续时间通常很短（约旗杆时间的1/3-1/2）' : isDiamond ? '菱形结构至少需要4-5个转折点' : '至少需要2次触及上轨和下轨'}
• ${brk}方向通常发生在形态的2/3至3/4处
• ${brk}时放量可提高信号可信度
• ${isPennant ? '旗面回调幅度不超过旗杆的38.2%' : '假突破后快速回到结构内需警惕'}

⚠️ 交易策略：
• 入场：价格${brk}${isPennant ? '旗面' : isDiamond ? '收敛' : '三角'}边界后${act}
• 止损：${isPennant ? '旗面反向极值外侧' : '最近一次反向极值外侧'}
• 目标：${isPennant ? '旗杆长度从突破点等距投射' : isDiamond ? '菱形最宽处高度' : '三角形底边高度'}${tgtDir}投射
• 注意：三角形/旗形突破方向与前期趋势一致时成功率更高`;
  }

  if (isWedge) {
    return `【${config.name}】${config.description}

📐 形态结构：
• 双轨收敛：上轨和下轨同向运动但逐渐靠拢
• ${bull ? '下降楔形：高低点同步下移，但下降幅度递减' : '上升楔形：高低点同步抬升，但上涨幅度递减'}
• 动能变化：${bull ? '空头力量逐步衰竭，每次下探深度变浅' : '多头力量逐步衰竭，每次上攻高度变矮'}
• 当前阶段：楔形末端，波幅高度压缩，即将变盘

📊 关键识别要点：
• 楔形至少需要4-5个高低点交替
• 末端波幅显著缩窄，K线实体变小
• ${bull ? '突破上轨' : '跌破下轨'}是确认信号
• 量能在楔形内部通常持续萎缩

⚠️ 交易策略：
• 入场：价格${brk}楔形${bull ? '上轨' : '下轨'}后${act}
• 止损：${brk}前最近${stp}
• 目标：楔形最宽处高度${tgtDir}投射
• 注意：楔形${brk}后常有快速运动，需及时入场`;
  }

  if (isChannel) {
    const isBreakdown = /BREAKDOWN|BREAKOUT/.test(k);
    return `【${config.name}】${config.description}

📐 形态结构：
• 平行通道：上轨和下轨保持大致平行
• ${isBreakdown ? '通道终结：价格突破通道边界，趋势发生转变' : '通道延续：价格在通道内有序运行，触及边界后回归'}
• ${isBreakdown ? '破位特征：' + (bull ? '从下降通道向上突破上轨' : '从上升通道向下跌破下轨') : '回归特征：价格在通道内低吸高抛'}
• 当前阶段：${isBreakdown ? '通道边界已被突破，等待方向确认' : '价格回踩通道边界，等待延续'}

📊 关键识别要点：
• 有效通道至少需要2次触及上轨和下轨
• ${isBreakdown ? '破位后回测原通道边界不再回入是确认信号' : '触及通道边界时量能萎缩是健康回踩'}
• 通道运行时间越长，${isBreakdown ? '破位后力度越大' : '趋势延续性越强'}
• ${isBreakdown ? '注意假突破：快速回到通道内意味着破位失败' : '中轴线可作为短线多空分界'}

⚠️ 交易策略：
• 入场：${isBreakdown ? '确认通道破位后顺势' + act : '回踩通道' + (bull ? '下轨' : '上轨') + '后' + act}
• 止损：${isBreakdown ? '原通道内部（破位K线另一侧）' : '通道外侧'}
• 目标：${isBreakdown ? '通道宽度等距投射' : '通道另一侧边界'}
• 注意：${isBreakdown ? '真正破位后通常有强势延续' : '通道末端波幅缩窄需警惕破位'}`;
  }

  if (isICT) {
    return `【${config.name}】${config.description}

📐 形态结构（Smart Money Concepts）：
• 订单流逻辑：机构通过制造流动性池→扫盘→反转的方式操作
• ${bull ? '积累/扫盘低点：向下诱空获取卖方流动性后反转上行' : '派发/扫盘高点：向上诱多获取买方流动性后反转下行'}
• 结构转变：ChoCh（Change of Character）确认趋势方向改变
• 当前阶段：${bull ? '结构转多，等待回调至需求区做多' : '结构转空，等待反弹至供应区做空'}

📊 关键识别要点：
• 流动性扫取：价格突破前期关键高/低点后迅速反转
• FVG（公允价值缺口）：单边快速运动留下的价格空白区
• Order Block：最后一根反向K线标记机构入场区域
• displacement：快速大幅运动确认机构意图

⚠️ 交易策略：
• 入场：结构转变确认后，回调至OB/FVG区域${act}
• 止损：流动性扫取极值外侧
• 目标：对侧流动性池（${bull ? 'BSL买方流动性' : 'SSL卖方流动性'}）
• 注意：需在高时间框架趋势方向一致时操作`;
  }

  if (isWolfe) {
    return `【${config.name}】${config.description}

📐 形态结构（Wolfe Wave）：
• 五点结构：1-2-3-4-5五个转折点组成楔形
• 关键共线：1-3-5三点大致共线，2-4两点大致共线
• 第5浪：${bull ? '向下超射至1-3延长线后反转上行' : '向上超射至1-3延长线后反转下行'}
• EPA目标线：连接1-4两点的延长线即为理想目标区域

📊 关键识别要点：
• 1-3-5共线性越好，形态越可靠
• 第5浪常超过1-3连线（超射），但不应过度
• 时间对称性：各浪时间间隔大致对等
• 2-4线与1-3线收敛角度应适中

⚠️ 交易策略：
• 入场：第5浪完成（触及1-3延长线）后${act}
• 止损：第5浪极值外侧
• 目标：1-4连线的延长线（EPA目标）
• 注意：到达EPA目标线后应及时获利，不可贪心延持`;
  }

  if (isCup) {
    return `【${config.name}】${config.description}

📐 形态结构（杯柄形态）：
• 杯体：圆弧形${bull ? '底部' : '顶部'}，反映筹码逐步换手
• 杯口：${bull ? '前高附近的阻力位' : '前低附近的支撑位'}
• 手柄：回到杯口后的小幅${bull ? '回调' : '反弹'}，通常为杯深的1/3以内
• 当前阶段：手柄整理末端，等待杯口${brk}确认

📊 关键识别要点：
• 杯体形状越圆润越好，V形底/顶效果较差
• 杯深通常为前期趋势波段的12%-33%
• 手柄回调不应超过杯深的50%
• ${brk}杯口时放量是关键确认信号

⚠️ 交易策略：
• 入场：价格${brk}杯口线后${act}
• 止损：手柄${stp}
• 目标：杯深度从杯口${tgtDir}等距投射
• 注意：杯柄形态通常出现在已有趋势中，独立出现的效果较差`;
  }

  if (isTriple) {
    return `【${config.name}】${config.description}

📐 形态结构：
• ${bull ? '三个底部：价格三次下探至相近支撑位获得承接' : '三个顶部：价格三次冲击相近阻力位均未能突破'}
• 颈线：连接${bull ? '三底之间的反弹高点' : '三顶之间的回落低点'}
• 结构强度：比双顶/双底多一次验证，${bull ? '支撑' : '阻力'}更可靠
• 当前阶段：第三次${bull ? '探底' : '冲顶'}完成，颈线${brk}在即

📊 关键识别要点：
• 三个${bull ? '底部' : '顶部'}高度误差应在3%以内
• ${bull ? '每次探底量能递减，最后一次放量企稳更可靠' : '每次冲顶量能递减，反映买方力量持续减弱'}
• 颈线可以是水平或略有倾斜
• 形态形成时间越长，${brk}后力度越大

⚠️ 交易策略：
• 入场：价格${brk}颈线后${act}
• 止损：第三个${bull ? '底部低点下方' : '顶部高点上方'}
• 目标：颈线到${bull ? '底部' : '顶部'}的距离${tgtDir}投射
• 注意：${brk}后常有回测颈线的动作`;
  }

  if (isBroadening) {
    return `【${config.name}】${config.description}

📐 形态结构（扩散形态）：
• 波幅扩大：高点越来越高，低点越来越低
• 不稳定信号：市场分歧加大，多空争夺激烈
• ${bull ? '底部承接逐步增强，最终向上突破' : '顶部抛压失控，最终向下崩溃'}
• 当前阶段：扩散末端，等待最终方向选择

📊 关键识别要点：
• 至少需要3个依次扩大的高低点
• 成交量在扩散过程中通常放大
• 常出现在市场高波动期或重大事件前后
• 扩散形态内部的假突破频率较高

⚠️ 交易策略：
• 入场：确认${brk}扩散边界后${act}
• 止损：扩散区间反向极值外侧
• 目标：扩散最宽处高度${tgtDir}投射
• 注意：扩散形态难度较高，建议减小仓位操作`;
  }

  if (isEngulfing) {
    return `【${config.name}】${config.description}

📐 形态结构（K线组合信号）：
• 前期趋势：${bull ? '下跌趋势末端出现反转K线组合' : '上涨趋势末端出现反转K线组合'}
• 信号K线：${config.focus}
• 确认逻辑：${bull ? '大阳线/组合信号出现后次日不跌破信号低点' : '大阴线/组合信号出现后次日不突破信号高点'}
• 当前阶段：信号K线已出现，等待后续确认

📊 关键识别要点：
• 出现在明确趋势末端效果最佳
• 信号K线实体越大、影线越短，信号越强
• 伴随放量的信号可信度更高
• 在关键支撑/阻力位附近出现的信号价值倍增

⚠️ 交易策略：
• 入场：信号K线确认后次日${act}
• 止损：信号K线${stp}
• 目标：前期趋势波段的38.2%-61.8%回撤
• 注意：单一K线信号需结合大周期趋势和位置判断`;
  }

  if (isVShape) {
    return `【${config.name}】${config.description}

📐 形态结构：
• 急速运动：${bull ? '价格急速下杀至极端位置' : '价格急速拉升至极端高度'}
• V型反转：${bull ? '触及恐慌低点后立即快速反转拉升' : '触及疯狂高点后立即快速反转下杀'}
• 无震荡过渡：不同于圆弧或平台底/顶，V形没有缓冲阶段
• 当前阶段：尖顶/底已形成，反转动能释放中

📊 关键识别要点：
• 极端K线：${bull ? '长下影锤子线或巨阴后巨阳' : '长上影射击之星或巨阳后巨阴'}
• 反转速度极快，犹豫即错过
• 通常伴随极端情绪（恐慌/贪婪）和巨大成交量
• V形反转后常有小幅回测确认

⚠️ 交易策略：
• 入场：反转确认后${act}（需果断）
• 止损：V形尖端极值外侧
• 目标：V形起点（反转前的起涨/起跌位置）
• 注意：V形反转风险高，建议分批建仓、严格止损`;
  }

  if (isIsland) {
    return `【${config.name}】${config.description}

📐 形态结构：
• ${bull ? '跳空下行：价格向下跳空进入低位区域' : '跳空上行：价格向上跳空进入高位区域'}
• 孤岛震荡：在跳空区域内短暂横盘
• 反向跳空：${bull ? '向上跳空离开低位孤岛' : '向下跳空离开高位孤岛'}
• 当前阶段：孤岛反转完成，趋势改变确认中

📊 关键识别要点：
• 两个方向相反的跳空缺口形成"孤岛"
• 孤岛区域停留时间通常很短（3-10根K线）
• 两个缺口都不应被回补
• 反向跳空的量能越大，反转越可靠

⚠️ 交易策略：
• 入场：反向跳空出现后${act}
• 止损：孤岛区域${bull ? '低点' : '高点'}外侧
• 目标：孤岛前的趋势起点位置
• 注意：若任一缺口被回补，形态可能失效`;
  }

  if (isTrap || isParabolic) {
    return `【${config.name}】${config.description}

📐 形态结构：
• ${config.focus}
• 诱导阶段：${bull ? '价格假跌破引诱空头入场' : '价格假突破引诱多头入场'}
• 反转确认：${bull ? '快速收回跌破位上方，空头被迫止损推动上涨' : '快速跌回突破位下方，多头被迫止损加速下跌'}
• 当前阶段：诱导完成，反转力量正在释放

📊 关键识别要点：
• 假${bull ? '跌破' : '突破'}的持续时间很短（通常1-3根K线）
• 快速反转伴随显著放量
• ${bull ? '止损盘被触发形成多杀多→空杀空连锁' : '止损盘被触发形成空杀空→多杀多连锁'}
• 关键位置附近最容易出现此类陷阱

⚠️ 交易策略：
• 入场：确认${bull ? '假跌破反转' : '假突破反转'}后${act}
• 止损：诱导极值外侧
• 目标：诱导前的最近一个波段高低点
• 注意：需等反转确认，不可在诱导阶段就反向操作`;
  }

  if (isStaircase) {
    return `【${config.name}】${config.description}

📐 形态结构：
• 阶梯式推进：每轮${bull ? '拉升' : '杀跌'}后横盘整理，再${bull ? '创新高' : '创新低'}
• 推动段：短时间内快速${bull ? '上涨' : '下跌'}
• 整理段：在新的平台上横盘消化，准备下一轮推进
• 当前阶段：又一轮整理接近尾声

📊 关键识别要点：
• 每个"台阶"的高度大致相当
• 整理段不应回吐推动段的50%以上
• 整理时量能萎缩，推动时量能放大
• 阶梯结构被破坏（回撤超过一个台阶）意味着趋势可能结束

⚠️ 交易策略：
• 入场：整理平台${brk}后${act}
• 止损：当前台阶${stp}
• 目标：一个台阶高度${tgtDir}投射
• 注意：阶梯末期台阶高度若明显缩小，需警惕动能衰竭`;
  }

  if (isTower) {
    return `【${config.name}】${config.description}

📐 形态结构：
• ${config.focus}
• ${bull ? '塔底/管底：连续大阴线快速下跌后连续大阳线快速拉升' : '塔顶/管顶：连续大阳线快速拉升后连续大阴线快速回落'}
• 反转特征：多空力量在短期内完成彻底转换
• 当前阶段：反转K线组合已形成

📊 关键识别要点：
• K线实体长度依次增大，反映力量逐步增强
• 反转K线出现在关键支撑/阻力位效果更佳
• 量能配合：反转段放量确认
• 后续K线不破反转K线极值是确认信号

⚠️ 交易策略：
• 入场：反转K线组合完成后${act}
• 止损：反转K线极值${stp}
• 目标：前期趋势波段的50%-100%回撤
• 注意：需等反转K线收盘确认，盘中信号可能失效`;
  }

  if (isFlag) {
    return `【${config.name}】${config.description}

📐 形态结构：
• 旗杆：急速${bull ? '上涨' : '下跌'}形成的推动段
• 旗面：推动后的${bull ? '缓跌' : '缓涨'}回调整理通道
• 旗面通道：上下边界大致平行
• 当前阶段：旗面回调末端，等待${brk}延续

📊 关键识别要点：
• 旗杆角度陡峭（越强越好）
• 旗面回调幅度不超过旗杆的38.2%-50%
• 旗面内量能持续萎缩
• ${brk}旗面${bull ? '上沿' : '下沿'}时放量确认

⚠️ 交易策略：
• 入场：价格${brk}旗面${bull ? '上沿' : '下沿'}后${act}
• 止损：旗面${bull ? '最低点下方' : '最高点上方'}
• 目标：从${brk}点量度一个旗杆长度${tgtDir}投射
• 注意：强势趋势中的旗形成功率约65-70%`;
  }

  if (isReversal123) {
    return `【${config.name}】${config.description}

📐 形态结构：
• 点1：${bull ? '下跌趋势中的最低点' : '上涨趋势中的最高点'}
• 点2：${bull ? '从点1反弹的高点' : '从点1回落的低点'}
• 点3：${bull ? '回调但未跌破点1的更高低点' : '反弹但未突破点1的更低高点'}
• 当前阶段：${brk}点2后确认反转

📊 关键识别要点：
• 点3是关键：必须${bull ? '高于点1' : '低于点1'}（表明趋势减弱）
• ${brk}点2是触发信号
• 点1到点2的距离决定量度目标
• 形态越清晰、时间跨度越大越可靠

⚠️ 交易策略：
• 入场：价格${brk}点2后${act}
• 止损：点3${stp}
• 目标：1-2距离从点2${tgtDir}投射
• 注意：经典的趋势反转确认方法`;
  }

  if (isQM) {
    return `【${config.name}】${config.description}

📐 形态结构（Quasimodo / Over and Under）：
• ${bull ? '下跌中出现更低低点（洗盘）' : '上涨中出现更高高点（诱多）'}
• 随后${bull ? '快速反转突破前高，形成结构性反转' : '快速反转跌破前低，形成结构性反转'}
• 结合SMC逻辑：扫取流动性后反转
• 当前阶段：结构反转确认，等待回调入场

📊 关键识别要点：
• ${bull ? '更低低点扫取了卖方流动性' : '更高高点扫取了买方流动性'}
• 反转的V字结构越急速越可靠
• QM颈线（前期${bull ? '高点' : '低点'}）是关键参考
• 与Order Block区域重合时效力增强

⚠️ 交易策略：
• 入场：回调至QM区域（前期结构位）后${act}
• 止损：${bull ? '更低低点' : '更高高点'}外侧
• 目标：前期波段高度等距投射
• 注意：QM是SMC/ICT体系的核心反转模型`;
  }

  if (isMeasured || isSpike || isGap || isRunning || isScallop || isFlat || isDiagonal || isComplex) {
    const typeLabel = isMeasured ? '量度运动' : isSpike ? '尖峰通道' : isGap ? '跳空启动' : isRunning ? '顺势调整' : isScallop ? '贝壳形' : isFlat ? '平顶/平底' : isDiagonal ? '终结楔形' : '复合形态';
    return `【${config.name}】${config.description}

📐 形态结构（${typeLabel}）：
• 核心特征：${config.focus}
• ${isMeasured ? '两段等幅运动：第二段运动幅度与第一段大致相等' : isSpike ? '初始尖峰急速运动后进入有序的缓慢通道' : isGap ? '跳空缺口不回补，沿缺口方向持续运动' : isRunning ? '强势趋势中极浅幅度的回调/反弹，不改变主趋势' : isScallop ? '弧形回调/反弹后延续原趋势' : isFlat ? '多次试探同一水平位后最终突破/跌破' : isDiagonal ? '趋势末端5浪收敛楔形，浪间严重重叠' : '比经典形态更复杂的变体，但反转可靠性更高'}
• 方向偏向：${dir}
• 当前阶段：形态接近完成，等待确认

📊 关键识别要点：
• ${isMeasured ? '两段波幅对等是核心验证条件' : isSpike ? '通道方向与尖峰方向一致' : isGap ? '缺口被回补则信号失效' : isRunning ? '回调深度不超过前期推动的38.2%' : isScallop ? '弧形回调时量能递减' : isFlat ? '每次试探都在几乎相同的价位' : isDiagonal ? '5浪间存在严重重叠，区别于推动浪' : '需要更多的耐心等待形态完全成形'}
• 突破/跌破关键边界后形态有效性大幅提高
• 成交量配合可提高信号可信度
• 假突破后快速回到结构内需警惕

⚠️ 交易策略：
• 入场：关键位确认${brk}后${act}
• 止损：形态末端反向极值外侧
• 目标：${isMeasured ? '第一段运动幅度等距投射' : isSpike ? '通道宽度投射' : isGap ? '缺口前波段幅度投射' : isFlat ? '整理区间高度投射' : isDiagonal ? '楔形高度投射，通常反转迅猛' : '形态高度或最近波段空间量度'}
• 注意：${isDiagonal ? '终结楔形完成后反转通常非常迅速' : isComplex ? '复合形态耐心等待完成，不可提前入场' : '结合趋势和多周期验证可提高成功率'}`;
  }

  // ── 兜底通用（不应触发，以防万一）──
  return `【${config.name}】${config.description}

📐 形态结构：
• 核心特征：${config.focus}
• 类型：${config.type === 'reversal' ? '反转形态' : '持续形态'}
• 方向偏向：${dir}
• 当前阶段：形态接近完成

📊 关键识别要点：
• 观察完整结构是否成立
• ${brk}关键边界后有效性提高
• 量能配合可增强信号可信度

⚠️ 交易策略：
• 入场：确认后${act}
• 止损：反向极值外侧
• 目标：按形态高度量度`;
};

Object.assign(PATTERN_ANALYSIS_TEMPLATES, Object.fromEntries(
  ADDITIONAL_PATTERN_ENTRIES.map((config) => [config.key, {
    direction: config.direction,
    confidence: config.confidence,
    analysis: _makeAnalysis(config),
  }])
));

Object.assign(PATTERN_CANDLE_COUNTS, Object.fromEntries(
  ADDITIONAL_PATTERN_ENTRIES.map((config) => [config.key, { previewCount: 144, replayCount: 26 }])
));

Object.assign(PATTERN_DRAWING_TEMPLATES, Object.fromEntries(
  ADDITIONAL_PATTERN_ENTRIES.map((config) => [config.key, makeAdditionalPatternDrawingTemplate(config)])
));

/**
 * 生成唯一 ID
 * @param {string} userId - 用户 ID
 * @returns {string} 唯一 ID
 */
function generateUniqueId(userId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const userHash = userId ? userId.split('@')[0].substring(0, 5) : 'anon';
  return `pattern_${userHash}_${timestamp}_${random}`;
}

/**
 * PatternEngine - 独立的形态分析引擎
 * 每个用户有独立的实例，避免状态冲突
 */
class PatternEngine {
  constructor(userId) {
    this.userId = userId;
    this.sessionId = null; // 数据库会话 ID
    this.state = PATTERN_PHASES.IDLE;
    this.pattern = null;
    this.patternName = null;
    this.patternDirection = null;
    this.patternDescription = null;
    this.previewCandles = [];
    this.replayCandles = [];
    this.replayIndex = 0;
    this.userDecision = null;
    this.aiDecision = null;
    this.aiConfidence = 0;
    this.aiAnalysis = '';
    this.signals = [];
    this.startedAt = null;
    this.endedAt = null;
    this.replayTimer = null;
    this.finalDirection = null;
    this.priceChange = 0;
    this.userCorrect = false;
    this.aiCorrect = false;
    this.explanation = '';
    this.patternLines = [];
    this.previewPatternDrawings = [];
    this.fullPatternDrawings = [];
    this.replayStarted = false;
  }

  getPatternCandleCounts(patternKey) {
    const config = PATTERN_CANDLE_COUNTS[patternKey];
    if (config) {
      return {
        previewCount: Math.max(PATTERN_MIN_PREVIEW_CANDLE_COUNT, Math.round(Number(config.previewCount) || PATTERN_MIN_PREVIEW_CANDLE_COUNT)),
        replayCount: Math.max(PATTERN_MIN_REPLAY_CANDLE_COUNT, Math.round(Number(config.replayCount) || PATTERN_MIN_REPLAY_CANDLE_COUNT)),
      };
    }
    // 扩展形态库: 预览截止到突破前最后一个路径锚点 (通常 t≈0.84)，
    // 回放段呈现最终突破走势，与基础形态的决策设计保持一致
    const entry = ADDITIONAL_PATTERN_LIBRARY[patternKey];
    const total = (PATTERN_CANDLE_COUNTS.RANDOM.previewCount || 120)
      + (PATTERN_CANDLE_COUNTS.RANDOM.replayCount || 40);
    const tSplit = Array.isArray(entry?.path) && entry.path.length >= 2
      ? Math.min(0.9, Math.max(0.62, entry.path[entry.path.length - 2][0]))
      : 0.84;
    const previewCount = Math.max(PATTERN_MIN_PREVIEW_CANDLE_COUNT, Math.round(total * tSplit));
    const replayCount = Math.max(PATTERN_MIN_REPLAY_CANDLE_COUNT, total - previewCount);
    return { previewCount, replayCount };
  }

  getPatternDrawingTemplate(patternKey) {
    return PATTERN_DRAWING_TEMPLATES[patternKey] || PATTERN_DRAWING_TEMPLATES.RANDOM || [];
  }

  /**
   * 将回放 K 线钳制到止损/止盈范围内：
   * - 回放蜡烛的影线不得触及止损价位
   * - 确保回放蜡烛至少触碰一次止盈，之后进入随机波动
   * 这样教学绘图中形态总是"按预期方向运行"，但不会在尾段重复刷同向蜡烛。
   */
  clampReplayCandlesToRisk(allCandles, previewCount, patternKey) {
    const template = this.getPatternDrawingTemplate(patternKey);
    const riskBox = template.find(item => item && item.kind === 'riskBox');
    if (!riskBox) return;

    const direction = riskBox.direction; // 'bullish' | 'bearish'
    const totalCount = allCandles.length;
    const structureCandles = allCandles.slice(0, previewCount);
    if (structureCandles.length < 2) return;

    const safePrice = (v, fb) => Number.isFinite(Number(v)) ? Number(v) : fb;
    const randomNormal = () => {
      const u1 = Math.max(Math.random(), 1e-6);
      const u2 = Math.max(Math.random(), 1e-6);
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    const roundPrice = (v) => Number(Math.max(structureCandles[0].close * 0.2, Number(v) || structureCandles[0].close).toFixed(2));
    const structureHighs = structureCandles.map(c => safePrice(c.high, c.close));
    const structureLows = structureCandles.map(c => safePrice(c.low, c.close));
    const structureHigh = Math.max(...structureHighs);
    const structureLow = Math.min(...structureLows);
    const structureRange = Math.max(structureHigh - structureLow, Math.abs(structureCandles[0].close) * 0.01, 1);

    const priceFromZoneRef = (ref) => {
      if (!ref || ref.zoneFrom === undefined || ref.zoneTo === undefined || !ref.zoneField) return null;
      const startIdx = Math.max(0, Math.min(structureCandles.length - 1, Math.floor(totalCount * Math.max(0, Math.min(1, ref.zoneFrom)))));
      const endIdx = Math.min(structureCandles.length, Math.ceil(totalCount * Math.max(0, Math.min(1, ref.zoneTo))));
      const zone = allCandles.slice(startIdx, Math.max(startIdx + 1, endIdx));
      if (!zone.length) return null;
      let price;
      if (ref.zoneField === 'high') price = Math.max(...zone.map(c => safePrice(c.high, c.close)));
      else if (ref.zoneField === 'low') price = Math.min(...zone.map(c => safePrice(c.low, c.close)));
      else price = zone.reduce((a, c) => a + safePrice(c.close, 0), 0) / zone.length;
      return price + structureRange * Number(ref.offset || 0);
    };

    const stopPrice = priceFromZoneRef(riskBox.stop);
    const targetPrice = priceFromZoneRef(riskBox.target);
    if (stopPrice == null) return;

    // 钳制回放 K 线不触发止损
    for (let i = previewCount; i < allCandles.length; i++) {
      const c = allCandles[i];
      if (direction === 'bearish') {
        // 看跌 → 止损在上方，high 不得超过 stopPrice
        if (c.high > stopPrice) c.high = stopPrice;
        if (c.open > stopPrice) c.open = stopPrice;
        if (c.close > stopPrice) c.close = stopPrice;
        if (c.low > c.high) c.low = c.high;
      } else {
        // 看涨 → 止损在下方，low 不得低于 stopPrice
        if (c.low < stopPrice) c.low = stopPrice;
        if (c.open < stopPrice) c.open = stopPrice;
        if (c.close < stopPrice) c.close = stopPrice;
        if (c.high < c.low) c.high = c.low;
      }
    }

    if (targetPrice != null) {
      const replayLen = allCandles.length - previewCount;
      if (replayLen < 3) return;

      const touchesTarget = (c) => direction === 'bearish' ? c.low <= targetPrice : c.high >= targetPrice;
      const clampStop = (c) => {
        if (direction === 'bearish') {
          if (c.high > stopPrice) c.high = stopPrice;
          if (c.open > stopPrice) c.open = stopPrice;
          if (c.close > stopPrice) c.close = stopPrice;
          if (c.low > c.high) c.low = c.high;
        } else {
          if (c.low < stopPrice) c.low = stopPrice;
          if (c.open < stopPrice) c.open = stopPrice;
          if (c.close < stopPrice) c.close = stopPrice;
          if (c.high < c.low) c.high = c.low;
        }
        c.open = roundPrice(c.open);
        c.close = roundPrice(c.close);
        c.high = roundPrice(Math.max(c.high, c.open, c.close));
        c.low = roundPrice(Math.min(c.low, c.open, c.close));
      };
      const appendNaturalCandle = (towardTarget) => {
        const prev = allCandles[allCandles.length - 1];
        const prevPrev = allCandles[allCandles.length - 2] || prev;
        const recent = allCandles.slice(Math.max(previewCount, allCandles.length - 18));
        const avgBody = Math.max(1, recent.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / Math.max(1, recent.length));
        const avgUpperWick = Math.max(0.5, recent.reduce((sum, c) => sum + Math.max(0, c.high - Math.max(c.open, c.close)), 0) / Math.max(1, recent.length));
        const avgLowerWick = Math.max(0.5, recent.reduce((sum, c) => sum + Math.max(0, Math.min(c.open, c.close) - c.low), 0) / Math.max(1, recent.length));
        const interval = Math.max(1, (safePrice(prev.time, 0) - safePrice(prevPrev.time, safePrice(prev.time, 0) - 60000)) || 60000);
        const dir = direction === 'bearish' ? -1 : 1;
        const remaining = Math.abs(targetPrice - safePrice(prev.close, targetPrice));
        const open = safePrice(prev.close, targetPrice) + randomNormal() * avgBody * 0.18;
        let body = randomNormal() * avgBody * (0.75 + Math.random() * 0.65);
        if (towardTarget) {
          const pull = Math.min(remaining * (0.10 + Math.random() * 0.10), avgBody * (1.15 + Math.random() * 0.75));
          body += dir * pull;
          if (remaining <= avgBody * (1.8 + Math.random() * 0.8)) {
            body = (targetPrice - open) + dir * avgBody * (0.20 + Math.random() * 0.45);
          }
        }
        const close = open + body;
        const upperWick = avgUpperWick * (0.65 + Math.random() * 0.95);
        const lowerWick = avgLowerWick * (0.65 + Math.random() * 0.95);
        const candle = {
          time: safePrice(prev.time, Date.now()) + interval,
          open: roundPrice(open),
          high: roundPrice(Math.max(open, close) + upperWick),
          low: roundPrice(Math.min(open, close) - lowerWick),
          close: roundPrice(close),
          volume: Math.floor(recent.reduce((sum, c) => sum + safePrice(c.volume, 0), 0) / Math.max(1, recent.length) * (0.82 + Math.random() * 0.36)),
        };
        clampStop(candle);
        allCandles.push(candle);
        return candle;
      };

      let naturalHitIndex = -1;
      for (let i = previewCount; i < allCandles.length; i++) {
        if (direction === 'bearish' && allCandles[i].low <= targetPrice) { naturalHitIndex = i; break; }
        if (direction !== 'bearish' && allCandles[i].high >= targetPrice) { naturalHitIndex = i; break; }
      }

      let guard = 0;
      while (naturalHitIndex === -1 && guard < 240) {
        const candle = appendNaturalCandle(true);
        if (touchesTarget(candle)) naturalHitIndex = allCandles.length - 1;
        guard++;
      }

      const postHitCount = 5 + Math.floor(Math.random() * 6);
      while (naturalHitIndex >= 0 && allCandles.length < naturalHitIndex + 1 + postHitCount) {
        appendNaturalCandle(false);
      }
      if (naturalHitIndex >= 0) allCandles.length = naturalHitIndex + 1 + postHitCount;
    }
  }

  /**
   * 生成形态 K 线数据
   * @param {string} pattern - 形态类型
   * @param {number} count - K 线数量
   * @param {number} basePrice - 基准价格（使用真实市场价格）
   * @returns {Array} K 线数据
   */
  generatePatternCandles(pattern, count = 100, basePrice = 65000) {
    const safeCount = Math.max(20, Number(count) || 100);
    const safeBasePrice = Math.max(1, Number(basePrice) || 65000);
    const candles = [];
    const interval = 60;
    const baseTime = Math.floor(Date.now() / 1000) - safeCount * interval;
    let previousClose = safeBasePrice;
    let lastTarget = safeBasePrice;
    let volatilityRegime = 1;

    const randomNormal = () => {
      const u1 = Math.max(Math.random(), 1e-6);
      const u2 = Math.max(Math.random(), 1e-6);
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    const clampPrice = (value) => Math.max(safeBasePrice * 0.2, Number(value) || safeBasePrice);
    const profile = {
      amp: 0.88 + Math.random() * 0.28,
      necklineBias: randomNormal() * 0.0035,
      leftShoulder: 0.58 + Math.random() * 0.16,
      rightShoulder: 0.48 + Math.random() * 0.18,
      headPeak: 0.92 + Math.random() * 0.11,
      doubleSecond: 0.90 + Math.random() * 0.14,
      firstTop: 0.94 + Math.random() * 0.10,
      firstBottom: 0.94 + Math.random() * 0.10,
      breakMove: 0.58 + Math.random() * 0.22,
      shoulderBreak: 0.50 + Math.random() * 0.22,
      ascResistance: 1.025 + Math.random() * 0.012,
      ascSupport: 0.945 + Math.random() * 0.012,
      descSupport: 0.965 - Math.random() * 0.012,
      descResistance: 1.045 - Math.random() * 0.012,
      bullFlagBase: 0.945 + Math.random() * 0.01,
      bullFlagTop: 1.035 + Math.random() * 0.018,
      bullFlagRetrace: 0.026 + Math.random() * 0.014,
      bullFlagBreakout: 0.032 + Math.random() * 0.020,
      bearFlagTop: 1.045 + Math.random() * 0.014,
      bearFlagBottom: 0.955 + Math.random() * 0.014,
      bearFlagRetrace: 0.026 + Math.random() * 0.014,
      bearFlagBreakdown: 0.032 + Math.random() * 0.020,
      boxTop: 1.024 + Math.random() * 0.016,
      boxBottom: 0.976 - Math.random() * 0.016,
      boxBreakout: 0.032 + Math.random() * 0.018,
      boxPeriod: 5.2 + Math.random() * 1.8,
      wedgeBreakout: 0.034 + Math.random() * 0.020,
      wedgePeriod: 5.4 + Math.random() * 1.8,
      smcOb: 1.016 + Math.random() * 0.014,
      smcAccum: 0.934 + Math.random() * 0.014,
      smcAccumAmp: 0.18 + Math.random() * 0.06,
      smcManip: 0.45 + Math.random() * 0.18,
      trianglePeriod: 5.1 + Math.random() * 1.9,
      flagPeriod: 4.2 + Math.random() * 2.2,
      roughness: 0.0009 + Math.random() * 0.0011,
      phaseA: Math.random() * Math.PI * 2,
      phaseB: Math.random() * Math.PI * 2,
      phaseC: Math.random() * Math.PI * 2,
    };
    let pathDrift = randomNormal() * safeBasePrice * profile.roughness * 0.6;

    let momentum = 0; // 价格动量跟踪
    let lastBody = 0; // 上一根实体大小
    let consecutiveDir = 0; // 连续同方向计数 (正=连续阳线, 负=连续阴线)

    const addCandle = (targetPrice, i, volumeBase = 220) => {
      const target = clampPrice(targetPrice);
      const targetDelta = target - previousClose;
      const targetMomentum = target - lastTarget;

      // GARCH-like 波动率聚类: 大波动后容易继续大波动
      const shock = Math.random() < 0.04 ? 1.4 + Math.random() * 1.6 : 0;
      const bodyFeedback = Math.min(1.8, (lastBody / (safeBasePrice * 0.002)) * 0.34);
      volatilityRegime = Math.max(0.55, Math.min(2.6,
        volatilityRegime * 0.76 + (0.7 + Math.random() * 0.95 + shock + bodyFeedback) * 0.24
      ));
      const baseVol = safeBasePrice * (0.0013 + profile.roughness * 0.22);
      const volatility = baseVol * volatilityRegime;

      // 动量衰减 + 趋势跟踪
      momentum = momentum * 0.45 + targetDelta * 0.10 + targetMomentum * 0.05;

      // 开盘价: 可能有跳空 (gap)
      const gapChance = Math.random();
      const gap = gapChance < 0.075 ? randomNormal() * volatility * 0.75 :
                  gapChance < 0.22 ? randomNormal() * volatility * 0.26 : 0;
      const open = clampPrice(previousClose + gap + randomNormal() * volatility * 0.12);

      // 收盘价: 受趋势+动量+随机三部分影响
      const trendPull = targetDelta * (0.08 + Math.random() * 0.10);
      const momentumPull = momentum * (0.02 + Math.random() * 0.05);
      const noise = randomNormal() * volatility * (0.52 + Math.random() * 0.45);
      const candleType = Math.random();
      const counterMove = candleType > 0.80 ? -Math.sign(targetDelta || randomNormal()) * volatility * (0.32 + Math.random() * 0.55) : 0;
      let close = clampPrice(open + trendPull + momentumPull + noise + counterMove);
      if (candleType < 0.04) {
        close = clampPrice(open + randomNormal() * volatility * (0.06 + Math.random() * 0.10));
      } else {
        // 连续同向过多时强制出现反向蜡烛 (概率随连续次数递增)
        const consecCount = Math.abs(consecutiveDir);
        const consecFlipProb = Math.min(0.85, consecCount * 0.18);
        if (consecCount >= 2 && Math.random() < consecFlipProb) {
          const forceDir = -Math.sign(consecutiveDir);
          const forceBody = volatility * (0.18 + Math.random() * 0.45);
          close = clampPrice(open + forceDir * forceBody);
        } else {
          const currentBody = Math.abs(close - open);
          const minBody = volatility * (0.15 + Math.random() * 0.20);
          if (currentBody < minBody) {
            const direction = Math.sign(close - open || randomNormal() || 1);
            close = clampPrice(open + direction * minBody);
          }
        }
      }
      const body = Math.abs(close - open);
      const isBullish = close >= open;

      // 多样化蜡烛类型: 偶尔出现十字星/锤子线/射击之星
      let upperWick, lowerWick;

      if (candleType < 0.04) {
        // 十字星 (doji): 很小实体，长上下影
        const dojiWick = volatility * (0.55 + Math.random() * 0.65);
        upperWick = dojiWick * (0.55 + Math.random() * 0.45);
        lowerWick = dojiWick * (0.55 + Math.random() * 0.45);
      } else if (candleType < 0.08) {
        // 锤子线/上吊线: 短上影，长下影
        upperWick = volatility * (0.12 + Math.random() * 0.18);
        lowerWick = (body + volatility) * (0.70 + Math.random() * 0.55);
      } else if (candleType < 0.12) {
        // 射击之星/倒锤子: 长上影，短下影
        upperWick = (body + volatility) * (0.70 + Math.random() * 0.55);
        lowerWick = volatility * (0.12 + Math.random() * 0.18);
      } else {
        // 普通蜡烛: 上下影线比例与方向相关
        const wickBase = volatility * (0.16 + Math.random() * 0.32) + body * (0.06 + Math.random() * 0.16);
        const spike = Math.random() < 0.03 ? volatility * (0.45 + Math.random() * 0.85) : 0;
        upperWick = wickBase * (isBullish ? 0.36 + Math.random() * 0.42 : 0.48 + Math.random() * 0.52) + (Math.random() < 0.5 ? spike : 0);
        lowerWick = wickBase * (isBullish ? 0.48 + Math.random() * 0.52 : 0.36 + Math.random() * 0.42) + (Math.random() >= 0.5 ? spike : 0);
      }

      const high = Math.max(open, close) + upperWick;
      const low = Math.max(safeBasePrice * 0.2, Math.min(open, close) - lowerWick);
      const volume = Math.floor(volumeBase + volatilityRegime * 180 + (body / safeBasePrice) * 120000 + Math.random() * 300 + (body > baseVol * 2 ? 250 : 0));

      candles.push({
        time: baseTime + i * interval,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
      });
      previousClose = close;
      lastTarget = target;
      lastBody = body;
      // 更新连续方向计数
      const candleDir = close >= open ? 1 : -1;
      consecutiveDir = (candleDir === Math.sign(consecutiveDir) || consecutiveDir === 0) ? consecutiveDir + candleDir : candleDir;
    };

    // 平滑插值 (ease in-out)
    const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    // 局部进度
    const localT = (t, from, to) => Math.max(0, Math.min(1, (t - from) / (to - from)));
    const roughenTarget = (value, t, i, strength = 1) => {
      pathDrift = pathDrift * 0.88 + randomNormal() * safeBasePrice * profile.roughness * strength;
      const wave = safeBasePrice * strength * (
        Math.sin(t * Math.PI * 11.5 + profile.phaseA) * profile.roughness * 1.15 +
        Math.sin(i * 0.47 + profile.phaseB) * profile.roughness * 0.60 +
        Math.sin(i * 1.13 + profile.phaseC) * profile.roughness * 0.28
      );
      const sweep = Math.random() < 0.014 ? randomNormal() * safeBasePrice * profile.roughness * (3.0 + Math.random() * 2.2) * strength : 0;
      return value + wave + pathDrift + sweep;
    };
    const interpolateAdditionalPatternTarget = (config, t) => {
      const path = Array.isArray(config?.path) ? config.path : [];
      if (path.length < 2) return safeBasePrice;
      let from = path[0];
      let to = path[path.length - 1];
      for (let j = 1; j < path.length; j++) {
        if (t <= path[j][0]) {
          from = path[j - 1];
          to = path[j];
          break;
        }
      }
      const span = Math.max(0.0001, to[0] - from[0]);
      const progress = Math.max(0, Math.min(1, (t - from[0]) / span));
      let smoothProgress = ease(progress);
      // Final replay segment: add natural pullback oscillation to prevent
      // monotonic candle sequences (all bullish or all bearish)
      if (to === path[path.length - 1] && span > 0.05) {
        const waveFreq = 2.0 + (profile.trianglePeriod - 5.1) * 0.25;
        const waveAmp = 0.14 + (profile.amp - 0.88) * 0.12;
        // Envelope fades to zero at both ends so start/end levels are preserved
        const envelope = Math.sin(progress * Math.PI);
        smoothProgress += Math.sin(progress * Math.PI * waveFreq + profile.phaseA) * waveAmp * envelope;
        smoothProgress = Math.max(-0.06, Math.min(1.12, smoothProgress));
      }
      const level = from[1] + (to[1] - from[1]) * smoothProgress;
      const innerWave = Math.sin(t * Math.PI * (profile.trianglePeriod + 1.8) + profile.phaseB) * 0.0028;
      return safeBasePrice * (1 + (level + innerWave) * profile.amp);
    };

    for (let i = 0; i < safeCount; i++) {
      const t = i / Math.max(1, safeCount - 1);
      let target;
      const additionalPattern = ADDITIONAL_PATTERN_LIBRARY[pattern];

      if (additionalPattern) {
        target = interpolateAdditionalPatternTarget(additionalPattern, t);
      } else {
      switch (pattern) {
        // ─────────────────────────────────────────────────────
        // 头肩顶: preview=形态形成到右肩回落至颈线 | replay=跌破颈线
        // 阶段: 0-0.14(左肩) | 0.14-0.26(回落) | 0.26-0.44(头) | 0.44-0.56(回落) | 0.56-0.70(右肩) | 0.70-0.84(回落) | 0.84-1(跌破)
        // ─────────────────────────────────────────────────────
        case 'HEAD_SHOULDERS': {
          const amp = safeBasePrice * 0.08 * profile.amp;
          const neckline = safeBasePrice * (1 + profile.necklineBias);
          const leftShoulder  = neckline + amp * profile.leftShoulder;
          const head          = neckline + amp * profile.headPeak;
          const rightShoulder = neckline + amp * profile.rightShoulder;
          const breakDown     = neckline - amp * profile.shoulderBreak;

          if (t < 0.14) {
            target = neckline + ease(localT(t, 0, 0.14)) * (leftShoulder - neckline);
          } else if (t < 0.26) {
            target = leftShoulder - ease(localT(t, 0.14, 0.26)) * (leftShoulder - neckline);
          } else if (t < 0.44) {
            target = neckline + ease(localT(t, 0.26, 0.44)) * (head - neckline);
          } else if (t < 0.56) {
            target = head - ease(localT(t, 0.44, 0.56)) * (head - neckline);
          } else if (t < 0.70) {
            target = neckline + ease(localT(t, 0.56, 0.70)) * (rightShoulder - neckline);
          } else if (t < 0.84) {
            target = rightShoulder - ease(localT(t, 0.70, 0.84)) * (rightShoulder - neckline);
          } else {
            // REPLAY: 跌破颈线
            target = neckline - ease(localT(t, 0.84, 1)) * (neckline - breakDown);
          }
          break;
        }

        case 'HEAD_SHOULDERS_BOTTOM': {
          const amp = safeBasePrice * 0.08 * profile.amp;
          const neckline = safeBasePrice * (1 + profile.necklineBias);
          const leftShoulder  = neckline - amp * profile.leftShoulder;
          const head          = neckline - amp * profile.headPeak;
          const rightShoulder = neckline - amp * profile.rightShoulder;
          const breakUp       = neckline + amp * profile.shoulderBreak;

          if (t < 0.14) {
            target = neckline - ease(localT(t, 0, 0.14)) * (neckline - leftShoulder);
          } else if (t < 0.26) {
            target = leftShoulder + ease(localT(t, 0.14, 0.26)) * (neckline - leftShoulder);
          } else if (t < 0.44) {
            target = neckline - ease(localT(t, 0.26, 0.44)) * (neckline - head);
          } else if (t < 0.56) {
            target = head + ease(localT(t, 0.44, 0.56)) * (neckline - head);
          } else if (t < 0.70) {
            target = neckline - ease(localT(t, 0.56, 0.70)) * (neckline - rightShoulder);
          } else if (t < 0.84) {
            target = rightShoulder + ease(localT(t, 0.70, 0.84)) * (neckline - rightShoulder);
          } else {
            target = neckline + ease(localT(t, 0.84, 1)) * (breakUp - neckline);
          }
          break;
        }

        // ─────────────────────────────────────────────────────
        // 双顶: preview=两顶+回落到颈线附近盘整 | replay=跌破
        // 阶段: 0-0.20(顶1) | 0.20-0.35(回落) | 0.35-0.52(顶2) | 0.52-0.68(回落) | 0.68-0.85(颈线盘整) | 0.85-1(跌破)
        // ─────────────────────────────────────────────────────
        case 'DOUBLE_TOP': {
          const amp = safeBasePrice * 0.07 * profile.amp;
          const base = safeBasePrice;
          const top1 = base + amp * profile.firstTop;
          const top2 = base + amp * profile.doubleSecond;
          const neckline = base * (1 + profile.necklineBias);
          const breakDown = neckline - amp * profile.breakMove;

          if (t < 0.20) {
            target = base + ease(localT(t, 0, 0.20)) * (top1 - base);
          } else if (t < 0.35) {
            target = top1 - ease(localT(t, 0.20, 0.35)) * (top1 - neckline);
          } else if (t < 0.52) {
            target = neckline + ease(localT(t, 0.35, 0.52)) * (top2 - neckline);
          } else if (t < 0.68) {
            target = top2 - ease(localT(t, 0.52, 0.68)) * (top2 - neckline);
          } else if (t < 0.85) {
            // 颈线附近小幅盘整 (犹豫区间，制造悬念)
            const consolT = localT(t, 0.68, 0.85);
            target = neckline + Math.sin(consolT * Math.PI * 3) * amp * 0.08;
          } else {
            // REPLAY: 跌破颈线
            target = neckline - ease(localT(t, 0.85, 1)) * (neckline - breakDown);
          }
          break;
        }

        // ─────────────────────────────────────────────────────
        // 双底: preview=两底+反弹到颈线盘整 | replay=突破
        // 阶段: 0-0.20(底1) | 0.20-0.35(反弹) | 0.35-0.52(底2) | 0.52-0.68(反弹) | 0.68-0.85(颈线盘整) | 0.85-1(突破)
        // ─────────────────────────────────────────────────────
        case 'DOUBLE_BOTTOM': {
          const amp = safeBasePrice * 0.07 * profile.amp;
          const base = safeBasePrice;
          const bot1 = base - amp * profile.firstBottom;
          const bot2 = base - amp * profile.doubleSecond;
          const neckline = base * (1 + profile.necklineBias);
          const breakUp = neckline + amp * profile.breakMove;

          if (t < 0.20) {
            target = base - ease(localT(t, 0, 0.20)) * (base - bot1);
          } else if (t < 0.35) {
            target = bot1 + ease(localT(t, 0.20, 0.35)) * (neckline - bot1);
          } else if (t < 0.52) {
            target = neckline - ease(localT(t, 0.35, 0.52)) * (neckline - bot2);
          } else if (t < 0.68) {
            target = bot2 + ease(localT(t, 0.52, 0.68)) * (neckline - bot2);
          } else if (t < 0.85) {
            // 颈线盘整
            const consolT = localT(t, 0.68, 0.85);
            target = neckline + Math.sin(consolT * Math.PI * 3) * amp * 0.08;
          } else {
            // REPLAY: 突破颈线
            target = neckline + ease(localT(t, 0.85, 1)) * (breakUp - neckline);
          }
          break;
        }

        // ─────────────────────────────────────────────────────
        // 上升三角形: preview=三角收敛 | replay=向上突破
        // ─────────────────────────────────────────────────────
        case 'ASCENDING_TRIANGLE': {
          const resistance = safeBasePrice * profile.ascResistance;
          const initialSupport = safeBasePrice * profile.ascSupport;
          const swingPeriod = profile.trianglePeriod;
          const triangleEnd = 0.85;

          if (t < triangleEnd) {
            const progress = t / triangleEnd;
            const currentSupport = initialSupport + progress * (resistance - initialSupport) * 0.85;
            const swingPhase = Math.sin(progress * Math.PI * swingPeriod);
            const mid = (resistance + currentSupport) / 2;
            const halfRange = (resistance - currentSupport) / 2;
            target = mid + swingPhase * halfRange;
          } else {
            // REPLAY: 向上突破
            const breakoutT = localT(t, triangleEnd, 1);
            target = resistance + ease(breakoutT) * safeBasePrice * 0.04;
          }
          break;
        }

        // ─────────────────────────────────────────────────────
        // 下降三角形: preview=三角收敛 | replay=向下跌破
        // ─────────────────────────────────────────────────────
        case 'DESCENDING_TRIANGLE': {
          const support = safeBasePrice * profile.descSupport;
          const initialResistance = safeBasePrice * profile.descResistance;
          const swingPeriod = profile.trianglePeriod;
          const triangleEnd = 0.85;

          if (t < triangleEnd) {
            const progress = t / triangleEnd;
            const currentResistance = initialResistance - progress * (initialResistance - support) * 0.85;
            const swingPhase = Math.sin(progress * Math.PI * swingPeriod);
            const mid = (currentResistance + support) / 2;
            const halfRange = (currentResistance - support) / 2;
            target = mid + swingPhase * halfRange;
          } else {
            // REPLAY: 向下跌破
            const breakoutT = localT(t, triangleEnd, 1);
            target = support - ease(breakoutT) * safeBasePrice * 0.04;
          }
          break;
        }

        // ─────────────────────────────────────────────────────
        // 牛旗: preview=旗杆+旗面回调 | replay=向上突破
        // 阶段: 0-0.28(旗杆急涨) | 0.28-0.85(旗面缓跌回调) | 0.85-1(突破)
        // ─────────────────────────────────────────────────────
        case 'BULL_FLAG': {
          const flagpoleBase = safeBasePrice * profile.bullFlagBase;
          const flagpoleTop = safeBasePrice * profile.bullFlagTop;
          const flagBottom = flagpoleTop - safeBasePrice * profile.bullFlagRetrace;
          const breakoutTarget = flagpoleTop + safeBasePrice * profile.bullFlagBreakout;

          if (t < 0.28) {
            target = flagpoleBase + ease(localT(t, 0, 0.28)) * (flagpoleTop - flagpoleBase);
          } else if (t < 0.85) {
            // 旗面回调 (缓慢下倾 + 小幅波动)
            const flagT = localT(t, 0.28, 0.85);
            const flagMid = flagpoleTop - flagT * (flagpoleTop - flagBottom);
            const swing = Math.sin(flagT * Math.PI * profile.flagPeriod + profile.phaseB) * safeBasePrice * 0.0065;
            target = flagMid + swing;
          } else {
            // REPLAY: 向上突破
            target = flagBottom + ease(localT(t, 0.85, 1)) * (breakoutTarget - flagBottom);
          }
          break;
        }

        // ─────────────────────────────────────────────────────
        // 熊旗: preview=旗杆+旗面回调 | replay=向下跌破
        // 阶段: 0-0.28(旗杆急跌) | 0.28-0.85(旗面缓涨回调) | 0.85-1(跌破)
        // ─────────────────────────────────────────────────────
        case 'BEAR_FLAG': {
          const flagpoleTop = safeBasePrice * profile.bearFlagTop;
          const flagpoleBottom = safeBasePrice * profile.bearFlagBottom;
          const flagTop = flagpoleBottom + safeBasePrice * profile.bearFlagRetrace;
          const breakdownTarget = flagpoleBottom - safeBasePrice * profile.bearFlagBreakdown;

          if (t < 0.28) {
            target = flagpoleTop - ease(localT(t, 0, 0.28)) * (flagpoleTop - flagpoleBottom);
          } else if (t < 0.85) {
            // 旗面反弹 (缓慢上倾 + 小幅波动)
            const flagT = localT(t, 0.28, 0.85);
            const flagMid = flagpoleBottom + flagT * (flagTop - flagpoleBottom);
            const swing = Math.sin(flagT * Math.PI * profile.flagPeriod + profile.phaseB) * safeBasePrice * 0.0065;
            target = flagMid + swing;
          } else {
            // REPLAY: 向下跌破
            target = flagTop - ease(localT(t, 0.85, 1)) * (flagTop - breakdownTarget);
          }
          break;
        }

        case 'RECTANGLE_BOX_BULLISH': {
          const boxTop = safeBasePrice * profile.boxTop;
          const boxBottom = safeBasePrice * profile.boxBottom;
          const boxMid = (boxTop + boxBottom) / 2;
          const halfRange = (boxTop - boxBottom) / 2;
          const boxEnd = 0.85;

          if (t < boxEnd) {
            const progress = t / boxEnd;
            const swing = Math.sin(progress * Math.PI * profile.boxPeriod + profile.phaseB) * halfRange * 0.88;
            const compression = 1 - progress * 0.18;
            target = boxMid + swing * compression;
          } else {
            target = boxTop + ease(localT(t, boxEnd, 1)) * safeBasePrice * profile.boxBreakout;
          }
          break;
        }

        case 'RECTANGLE_BOX_BEARISH': {
          const boxTop = safeBasePrice * profile.boxTop;
          const boxBottom = safeBasePrice * profile.boxBottom;
          const boxMid = (boxTop + boxBottom) / 2;
          const halfRange = (boxTop - boxBottom) / 2;
          const boxEnd = 0.85;

          if (t < boxEnd) {
            const progress = t / boxEnd;
            const swing = Math.cos(progress * Math.PI * profile.boxPeriod + profile.phaseB) * halfRange * 0.88;
            const compression = 1 - progress * 0.18;
            target = boxMid + swing * compression;
          } else {
            target = boxBottom - ease(localT(t, boxEnd, 1)) * safeBasePrice * profile.boxBreakout;
          }
          break;
        }

        case 'FALLING_WEDGE': {
          const upperStart = safeBasePrice * 1.055;
          const upperEnd = safeBasePrice * 0.994;
          const lowerStart = safeBasePrice * 0.965;
          const lowerEnd = safeBasePrice * 0.948;
          const wedgeEnd = 0.85;

          if (t < wedgeEnd) {
            const progress = t / wedgeEnd;
            const upper = upperStart + (upperEnd - upperStart) * progress;
            const lower = lowerStart + (lowerEnd - lowerStart) * progress;
            const mid = (upper + lower) / 2;
            const halfRange = (upper - lower) / 2;
            const swing = Math.sin(progress * Math.PI * profile.wedgePeriod + profile.phaseB);
            target = mid + swing * halfRange * 0.92;
          } else {
            target = upperEnd + ease(localT(t, wedgeEnd, 1)) * safeBasePrice * profile.wedgeBreakout;
          }
          break;
        }

        case 'RISING_WEDGE': {
          const upperStart = safeBasePrice * 1.035;
          const upperEnd = safeBasePrice * 1.052;
          const lowerStart = safeBasePrice * 0.955;
          const lowerEnd = safeBasePrice * 1.020;
          const wedgeEnd = 0.85;

          if (t < wedgeEnd) {
            const progress = t / wedgeEnd;
            const upper = upperStart + (upperEnd - upperStart) * progress;
            const lower = lowerStart + (lowerEnd - lowerStart) * progress;
            const mid = (upper + lower) / 2;
            const halfRange = (upper - lower) / 2;
            const swing = Math.sin(progress * Math.PI * profile.wedgePeriod + profile.phaseB);
            target = mid + swing * halfRange * 0.92;
          } else {
            target = lowerEnd - ease(localT(t, wedgeEnd, 1)) * safeBasePrice * profile.wedgeBreakout;
          }
          break;
        }

        // ─────────────────────────────────────────────────────
        // SMC 看涨积累: preview=形态形成到ChoCh | replay=入场向-ob推进
        // 阶段: 0-0.08(初跌) | 0.08-0.48(积累) | 0.48-0.58(洗盘) | 0.58-0.68(V回复) | 0.68-0.82(ChoCh) | 0.82-1(突破)
        // ─────────────────────────────────────────────────────
        case 'SMC_BULLISH_ACCUMULATION': {
          const range = safeBasePrice * 0.08 * profile.amp;
          const obLevel = safeBasePrice * profile.smcOb;
          const accumLevel = safeBasePrice * profile.smcAccum;
          const accumAmp = range * profile.smcAccumAmp;
          const manipLow = accumLevel - range * profile.smcManip;

          if (t < 0.08) {
            target = obLevel - ease(localT(t, 0, 0.08)) * (obLevel - accumLevel);
          } else if (t < 0.48) {
            const accumT = localT(t, 0.08, 0.48);
            target = accumLevel + Math.sin(accumT * Math.PI * 5) * accumAmp;
          } else if (t < 0.58) {
            target = accumLevel - ease(localT(t, 0.48, 0.58)) * (accumLevel - manipLow);
          } else if (t < 0.68) {
            target = manipLow + ease(localT(t, 0.58, 0.68)) * (accumLevel + accumAmp * 1.5 - manipLow);
          } else if (t < 0.82) {
            const chochBase = accumLevel + accumAmp * 1.5;
            target = chochBase + ease(localT(t, 0.68, 0.82)) * range * 0.4;
          } else {
            // REPLAY: 入场 + 向 -ob 推进
            const entryBase = accumLevel + accumAmp * 1.5 + range * 0.4;
            const breakoutT = localT(t, 0.82, 1);
            target = entryBase + ease(breakoutT) * (obLevel - entryBase) * 0.9;
          }
          break;
        }

        // ─────────────────────────────────────────────────────
        // 随机走势: 几何布朗运动
        // ─────────────────────────────────────────────────────
        case 'RANDOM':
        default: {
          const drift = 0.00008;
          const sigma = 0.018;
          const dt = interval / 86400;
          target = lastTarget * (1 + drift * dt + sigma * Math.sqrt(dt) * randomNormal());
          break;
        }
      }
      }
      // 微弱附加波动 (不干扰主结构)
      const microSwing = safeBasePrice * (Math.sin(i * 0.73 + profile.phaseA) * 0.0008 + Math.sin(i * 0.21 + profile.phaseC) * 0.0005);
      const targetStrength = pattern === 'RANDOM' ? 1.45 : (t > 0.82 ? 1.18 : 1);
      addCandle(roughenTarget(target + microSwing, t, i, targetStrength), i);
    }
    return candles;
  }

  /**
   * 检测技术信号
   * @param {Array} candles - K 线数据
   * @returns {Array} 技术信号列表
   */
  detectTechnicalSignals(candles) {
    if (!Array.isArray(candles) || candles.length < 20) return [];
    const signals = [];
    const closes = candles.map((c) => Number(c.close || 0));

    // SMA
    const sma = (values, period) => {
      if (!Array.isArray(values) || values.length < period) return [];
      const out = [];
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        if (i >= period - 1) out.push(sum / period);
      }
      return out;
    };

    // EMA
    const ema = (values, period) => {
      if (!Array.isArray(values) || values.length < period) return [];
      const out = [];
      const k = 2 / (period + 1);
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      out.push(seed);
      for (let i = period; i < values.length; i++) {
        out.push(values[i] * k + out[out.length - 1] * (1 - k));
      }
      return out;
    };

    // RSI
    const rsi = (values, period = 14) => {
      if (!Array.isArray(values) || values.length <= period) return null;
      let gains = 0;
      let losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = values[i] - values[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
      }
      let avgGain = gains / period;
      let avgLoss = losses / period;
      for (let i = period + 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
      }
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - 100 / (1 + rs);
    };

    // MACD
    const macd = (values, fast = 12, slow = 26, signal = 9) => {
      const fastEma = ema(values, fast);
      const slowEma = ema(values, slow);
      if (!fastEma.length || !slowEma.length) return [];
      const gap = slow - fast;
      const macdLine = [];
      for (let i = 0; i < slowEma.length; i++) {
        const fastIdx = i + gap;
        if (fastIdx >= 0 && fastIdx < fastEma.length) {
          macdLine.push(fastEma[fastIdx] - slowEma[i]);
        }
      }
      const signalLine = ema(macdLine, signal);
      const signalGap = macdLine.length - signalLine.length;
      const out = [];
      for (let i = 0; i < signalLine.length; i++) {
        const macdValue = macdLine[i + signalGap];
        const signalValue = signalLine[i];
        out.push({
          macd: macdValue,
          signal: signalValue,
          histogram: macdValue - signalValue,
        });
      }
      return out;
    };

    // 均线信号
    const ma5 = sma(closes, 5);
    const ma20 = sma(closes, 20);
    const ma50 = sma(closes, 50);

    if (ma5.length >= 2 && ma20.length >= 2) {
      const last5 = ma5[ma5.length - 1];
      const prev5 = ma5[ma5.length - 2];
      const last20 = ma20[ma20.length - 1];
      const prev20 = ma20[ma20.length - 2];

      if (last5 > last20 && prev5 <= prev20) {
        signals.push({
          type: 'golden_cross',
          name: '金叉',
          description: 'MA5 上穿 MA20，短线偏多。',
          strength: 'strong',
          direction: 'bullish',
        });
      } else if (last5 < last20 && prev5 >= prev20) {
        signals.push({
          type: 'death_cross',
          name: '死叉',
          description: 'MA5 下穿 MA20，短线偏空。',
          strength: 'strong',
          direction: 'bearish',
        });
      }

      const last50 = ma50[ma50.length - 1];
      if (last50 !== undefined) {
        if (last5 > last20 && last20 > last50) {
          signals.push({
            type: 'ma_bull_arrangement',
            name: '多头排列',
            description: 'MA5 > MA20 > MA50。',
            strength: 'very_strong',
            direction: 'bullish',
          });
        } else if (last5 < last20 && last20 < last50) {
          signals.push({
            type: 'ma_bear_arrangement',
            name: '空头排列',
            description: 'MA5 < MA20 < MA50。',
            strength: 'very_strong',
            direction: 'bearish',
          });
        }
      }
    }

    // RSI 信号
    const rsiValue = rsi(closes, 14);
    if (rsiValue !== null) {
      if (rsiValue > 70) {
        signals.push({
          type: 'rsi_overbought',
          name: 'RSI 超买',
          description: `RSI ${rsiValue.toFixed(1)}，警惕回调。`,
          strength: 'medium',
          direction: 'bearish',
        });
      } else if (rsiValue < 30) {
        signals.push({
          type: 'rsi_oversold',
          name: 'RSI 超卖',
          description: `RSI ${rsiValue.toFixed(1)}，警惕反弹。`,
          strength: 'medium',
          direction: 'bullish',
        });
      }
    }

    // MACD 信号
    const macdResult = macd(closes, 12, 26, 9);
    if (macdResult.length >= 2) {
      const prev = macdResult[macdResult.length - 2];
      const last = macdResult[macdResult.length - 1];
      if (last.macd > last.signal && prev.macd <= prev.signal) {
        signals.push({
          type: 'macd_bullish',
          name: 'MACD 金叉',
          description: 'MACD 上穿信号线。',
          strength: 'strong',
          direction: 'bullish',
        });
      } else if (last.macd < last.signal && prev.macd >= prev.signal) {
        signals.push({
          type: 'macd_bearish',
          name: 'MACD 死叉',
          description: 'MACD 下穿信号线。',
          strength: 'strong',
          direction: 'bearish',
        });
      }
    }

    // 支撑阻力
    const recent = candles.slice(-20);
    const highs = recent.map((c) => Number(c.high || c.close || 0));
    const lows = recent.map((c) => Number(c.low || c.close || 0));
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    const currentPrice = Number(candles[candles.length - 1].close || 0);

    if (currentPrice >= resistance * 0.985) {
      signals.push({
        type: 'resistance_test',
        name: '测试阻力位',
        description: `价格接近阻力位 ${resistance.toFixed(2)}。`,
        strength: 'medium',
        direction: 'neutral',
        price: resistance,
      });
    }
    if (currentPrice <= support * 1.015) {
      signals.push({
        type: 'support_test',
        name: '测试支撑位',
        description: `价格接近支撑位 ${support.toFixed(2)}。`,
        strength: 'medium',
        direction: 'neutral',
        price: support,
      });
    }

    // K 线形态
    const prev = candles[candles.length - 2];
    const last = candles[candles.length - 1];
    const body = Math.abs(last.close - last.open);
    const upperShadow = last.high - Math.max(last.open, last.close);
    const lowerShadow = Math.min(last.open, last.close) - last.low;

    if (lowerShadow > body * 2 && upperShadow < body) {
      signals.push({
        type: 'hammer',
        name: '锤子线',
        description: '下影线明显，可能止跌。',
        strength: 'medium',
        direction: 'bullish',
      });
    }
    if (upperShadow > body * 2 && lowerShadow < body) {
      signals.push({
        type: 'shooting_star',
        name: '射击之星',
        description: '上影线明显，可能转弱。',
        strength: 'medium',
        direction: 'bearish',
      });
    }

    const prevBull = prev.close > prev.open;
    const prevBear = prev.close < prev.open;
    const currBull = last.close > last.open;
    const currBear = last.close < last.open;

    if (prevBear && currBull && last.open <= prev.close && last.close >= prev.open) {
      signals.push({
        type: 'bullish_engulfing',
        name: '看涨吞没',
        description: '阳线吞没前一根阴线。',
        strength: 'strong',
        direction: 'bullish',
      });
    }
    if (prevBull && currBear && last.open >= prev.close && last.close <= prev.open) {
      signals.push({
        type: 'bearish_engulfing',
        name: '看跌吞没',
        description: '阴线吞没前一根阳线。',
        strength: 'strong',
        direction: 'bearish',
      });
    }

    return signals;
  }

  /**
   * 分析信号并生成 AI 决策
   * @param {Array} candles - K 线数据
   * @param {Array} signals - 技术信号
   * @returns {Object} AI 决策
   */
  analyzeAndDecide(candles, signals) {
    let bullishScore = 0;
    let bearishScore = 0;

    for (const signal of signals) {
      const weight = signal.strength === 'very_strong' ? 3 : signal.strength === 'strong' ? 2 : 1;
      if (signal.direction === 'bullish') bullishScore += weight;
      else if (signal.direction === 'bearish') bearishScore += weight;
    }

    // 价格趋势分析
    if (candles.length >= 10) {
      const recentCloses = candles.slice(-10).map((c) => c.close);
      const trend = (recentCloses[9] - recentCloses[0]) / recentCloses[0];
      if (trend > 0.005) bullishScore += 2;
      else if (trend < -0.005) bearishScore += 2;
    }

    const total = bullishScore + bearishScore;
    let direction = 'neutral';
    let confidence = 0;

    if (total > 0) {
      if (bullishScore > bearishScore) {
        direction = 'bullish';
        confidence = bullishScore / total;
      } else if (bearishScore > bullishScore) {
        direction = 'bearish';
        confidence = bearishScore / total;
      } else {
        direction = 'neutral';
        confidence = 0.5;
      }
    }

    const analysis = this.generateAnalysisText(direction, bullishScore, bearishScore, signals);

    return {
      direction,
      confidence: Math.min(0.95, Math.max(0.1, confidence)),
      analysis,
      bullishScore,
      bearishScore,
    };
  }

  /**
   * 生成分析文本
   */
  generateAnalysisText(direction, bullishScore, bearishScore, signals) {
    const bullishSignals = signals.filter((s) => s.direction === 'bullish');
    const bearishSignals = signals.filter((s) => s.direction === 'bearish');

    let text = '';

    if (direction === 'bullish') {
      text = `看涨信号占优（多头 ${bullishScore} vs 空头 ${bearishScore}）。`;
      if (bullishSignals.length > 0) {
        text += `主要看涨信号：${bullishSignals
          .slice(0, 3)
          .map((s) => s.name)
          .join('、')}。`;
      }
    } else if (direction === 'bearish') {
      text = `看跌信号占优（空头 ${bearishScore} vs 多头 ${bullishScore}）。`;
      if (bearishSignals.length > 0) {
        text += `主要看跌信号：${bearishSignals
          .slice(0, 3)
          .map((s) => s.name)
          .join('、')}。`;
      }
    } else {
      text = `多空信号均衡（多头 ${bullishScore} vs 空头 ${bearishScore}），建议观望。`;
    }

    return text;
  }

  /**
   * 生成形态解释
   */
  generatePatternExplanation(patternName, patternDirection, finalDirection, priceChange) {
    const changeText = (priceChange * 100).toFixed(2) + '%';
    const directionText =
      finalDirection === 'bullish' ? '上涨' : finalDirection === 'bearish' ? '下跌' : '震荡';
    const patternDirText =
      patternDirection === 'bullish' ? '整体趋势向上' : patternDirection === 'bearish' ? '整体趋势向下' : '整体呈现震荡格局';

    return `${patternName}形态分析：

这段走势呈现典型的${patternName}形态特征，${patternDirText}。

实际走势最终${directionText}，幅度为${changeText}。

技术要点：
- 形态识别：${patternName}
- 预期方向：${patternDirection === 'bullish' ? '看涨' : patternDirection === 'bearish' ? '看跌' : '中性'}
- 实际结果：${directionText}
- 涨跌幅度：${changeText}`;
  }

  generatePatternDrawings(candles, patternKey, revealMode = 'preview') {
    if (!Array.isArray(candles) || candles.length < 8) return [];
    const drawings = [];
    const isFull = revealMode === 'full';
    const { previewCount, replayCount } = this.getPatternCandleCounts(patternKey);
    const totalCount = previewCount + replayCount;
    const decisionIndex = Math.min(
      isFull ? previewCount - 1 : candles.length - 1,
      candles.length - 1
    );
    const structureCandles = candles.slice(0, decisionIndex + 1);
    const safePrice = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const structureHighs = structureCandles.map((c) => safePrice(c.high, safePrice(c.close)));
    const structureLows = structureCandles.map((c) => safePrice(c.low, safePrice(c.close)));
    const futureCandles = candles.slice(decisionIndex + 1);
    const structureHigh = Math.max(...structureHighs);
    const structureLow = Math.min(...structureLows);
    const structureRange = Math.max(structureHigh - structureLow, Math.abs(safePrice(structureCandles[0]?.close, 1)) * 0.01, 1);
    const futureHigh = Math.max(...(futureCandles.length ? futureCandles : structureCandles).map((c) => safePrice(c.high, safePrice(c.close))));
    const futureLow = Math.min(...(futureCandles.length ? futureCandles : structureCandles).map((c) => safePrice(c.low, safePrice(c.close))));
    const futureRange = Math.max(futureHigh - futureLow, structureRange);
    const template = this.getPatternDrawingTemplate(patternKey);
    const clampRatio = (value) => Math.max(0, Math.min(1, Number(value) || 0));
    const candleFromRef = (ref = {}) => {
      if (ref.section === 'future' && futureCandles.length) {
        const index = Math.max(0, Math.min(futureCandles.length - 1, Math.round((futureCandles.length - 1) * clampRatio(ref.r))));
        return futureCandles[index] || structureCandles[structureCandles.length - 1];
      }
      // r is in t-space (0-1 over totalCount), convert to structure candle index
      const fullIndex = Math.round((totalCount - 1) * clampRatio(ref.r));
      const index = Math.max(0, Math.min(structureCandles.length - 1, fullIndex));
      return structureCandles[index] || structureCandles[structureCandles.length - 1];
    };
    // Zone-based anchoring: find the REAL extreme candle inside the zone.
    // Returns price + the anchor candle itself so drawings (trendlines,
    // polylines, labels, circles) attach to the actual swing point in both
    // time and price, instead of the zone center.
    const zoneAnchorFromRef = (ref = {}) => {
      if (ref.zoneFrom === undefined || ref.zoneTo === undefined || !ref.zoneField) return null;
      const sourceCandles = ref.section === 'future' && futureCandles.length ? futureCandles : structureCandles;
      // zoneFrom/zoneTo are in t-space (0-1 over totalCount), convert to source indices
      const scanLen = (ref.section === 'future') ? sourceCandles.length : totalCount;
      const startIdx = Math.max(0, Math.min(sourceCandles.length - 1, Math.floor(scanLen * clampRatio(ref.zoneFrom))));
      const endIdx = Math.min(sourceCandles.length, Math.ceil(scanLen * clampRatio(ref.zoneTo)));
      const zone = sourceCandles.slice(startIdx, Math.max(startIdx + 1, endIdx));
      if (!zone.length) return null;
      let zonePrice;
      let anchorOffset = Math.floor((zone.length - 1) / 2);
      if (ref.zoneField === 'high' || ref.zoneField === 'low') {
        const isHigh = ref.zoneField === 'high';
        const center = (zone.length - 1) / 2;
        let bestPrice = isHigh ? -Infinity : Infinity;
        let tieDist = Infinity;
        zone.forEach((c, zi) => {
          const v = isHigh ? safePrice(c.high, safePrice(c.close)) : safePrice(c.low, safePrice(c.close));
          const better = isHigh ? v > bestPrice : v < bestPrice;
          if (better) {
            bestPrice = v;
            tieDist = Math.abs(zi - center);
            anchorOffset = zi;
          } else if (v === bestPrice && Math.abs(zi - center) < tieDist) {
            tieDist = Math.abs(zi - center);
            anchorOffset = zi;
          }
        });
        zonePrice = bestPrice;
      } else {
        zonePrice = zone.reduce((a, c) => a + safePrice(c.close), 0) / zone.length;
        let bestDiff = Infinity;
        zone.forEach((c, zi) => {
          const diff = Math.abs(safePrice(c.close) - zonePrice);
          if (diff < bestDiff) {
            bestDiff = diff;
            anchorOffset = zi;
          }
        });
      }
      const anchorCandle = zone[anchorOffset];
      const anchorIndex = sourceCandles.indexOf(anchorCandle);
      return {
        candles: sourceCandles,
        index: anchorIndex >= 0 ? anchorIndex : startIdx + anchorOffset,
        source: ref.section === 'future' && futureCandles.length ? 'future' : 'structure',
        candle: anchorCandle,
        price: zonePrice,
      };
    };
    const priceFromRef = (ref = {}) => {
      const sourceCandles = ref.section === 'future' && futureCandles.length ? futureCandles : structureCandles;
      const highs = sourceCandles.map((c) => safePrice(c.high, safePrice(c.close)));
      const lows = sourceCandles.map((c) => safePrice(c.low, safePrice(c.close)));
      const high = Math.max(...highs);
      const low = Math.min(...lows);
      const range = Math.max(high - low, ref.section === 'future' ? futureRange : structureRange);
      // Zone-based: use the real extreme found by zoneAnchorFromRef
      if (ref.zoneFrom !== undefined && ref.zoneTo !== undefined && ref.zoneField) {
        const zoneAnchor = zoneAnchorFromRef(ref);
        if (zoneAnchor) return zoneAnchor.price + range * Number(ref.offset || 0);
      }
      if (Number.isFinite(Number(ref.level))) return low + range * Number(ref.level);
      const candle = candleFromRef(ref);
      const fieldPrice = safePrice(candle?.[ref.field || 'close'], safePrice(candle?.close, low));
      return fieldPrice + range * Number(ref.offset || 0);
    };
    const pointFromRef = (ref = {}) => {
      // Zone-based refs anchor to the actual extreme candle's time
      const zoneAnchor = zoneAnchorFromRef(ref);
      if (zoneAnchor) {
        return {
          time: zoneAnchor.candle.time,
          price: priceFromRef(ref),
        };
      }
      const candle = candleFromRef(ref);
      return {
        time: candle.time,
        price: priceFromRef(ref),
      };
    };
    const ratioFromRef = (ref = {}) => {
      const ratio = Number(ref.r);
      if (Number.isFinite(ratio)) return clampRatio(ratio);
      const zoneFrom = Number(ref.zoneFrom);
      const zoneTo = Number(ref.zoneTo);
      if (Number.isFinite(zoneFrom) && Number.isFinite(zoneTo)) return clampRatio((zoneFrom + zoneTo) / 2);
      return 0;
    };
    const candleIndexFromRef = (ref = {}) => {
      if (ref.section === 'future' && futureCandles.length) {
        const zoneAnchor = zoneAnchorFromRef(ref);
        if (zoneAnchor && zoneAnchor.source === 'future') {
          return { candles: zoneAnchor.candles, index: zoneAnchor.index, source: 'future' };
        }
        const index = Math.max(0, Math.min(futureCandles.length - 1, Math.round((futureCandles.length - 1) * ratioFromRef(ref))));
        return { candles: futureCandles, index, source: 'future' };
      }
      // Zone-based refs: index of the actual extreme candle so swing filling
      // between anchors scans the correct candle window
      const zoneAnchor = zoneAnchorFromRef(ref);
      if (zoneAnchor) return { candles: zoneAnchor.candles, index: zoneAnchor.index, source: 'structure' };
      const fullIndex = Math.round((totalCount - 1) * ratioFromRef(ref));
      const index = Math.max(0, Math.min(structureCandles.length - 1, fullIndex));
      return { candles: structureCandles, index, source: 'structure' };
    };
    const getWhitePolylineProfile = () => {
      const normalizedKey = String(patternKey || '').toUpperCase();
      if (/ELLIOTT|DIAGONAL|GARTLEY|BUTTERFLY|BAT(?:_)|CRAB|SHARK|CYPHER|FIVE_(?:O|ZERO)|NEN_STAR|NAVARRO|BLACK_SWAN|WHITE_SWAN|AB_?CD|THREE_DRIVES/.test(normalizedKey)) {
        return { mode: 'anchors', maxPoints: 9, minMove: 0.016, window: 2 };
      }
      if (/TRIANGLE|WEDGE|PENNANT|FLAG|CHANNEL|BROADENING|DIAMOND|WYCKOFF|SMC_|ICT_/.test(normalizedKey)) {
        return { mode: 'swing', maxPoints: 18, minMove: 0.009, window: 2 };
      }
      if (/HEAD_SHOULDERS|DOUBLE_|TRIPLE_|ADAM_EVE|EVE_ADAM|ROUNDING|CUP|QUASIMODO|REVERSAL_123/.test(normalizedKey)) {
        return { mode: 'swing', maxPoints: 13, minMove: 0.011, window: 2 };
      }
      if (/SETUP|TRI_STAR|HARAMI|KICKER|ABANDONED|COUNTERATTACK|BELT_HOLD|TASUKI|MAT_HOLD|SIDE_BY_SIDE|BREAKAWAY|ORB_|FRACTAL|POPGUN|NR7|INSIDE_BAR|OUTSIDE_BAR|PIN_BAR|HIKKAKE/.test(normalizedKey)) {
        return { mode: 'swing', maxPoints: 9, minMove: 0.012, window: 1 };
      }
      return { mode: 'swing', maxPoints: 14, minMove: 0.010, window: 2 };
    };
    const candlePolylinePrice = (sourceCandles, index, kind = 'close') => {
      const candle = sourceCandles[index];
      const close = safePrice(candle?.close, structureLow);
      const open = safePrice(candle?.open, close);
      const high = safePrice(candle?.high, Math.max(open, close));
      const low = safePrice(candle?.low, Math.min(open, close));
      if (kind === 'high') return Math.max(close, high - (high - low) * 0.18);
      if (kind === 'low') return Math.min(close, low + (high - low) * 0.18);
      return close * 0.76 + ((open + close) / 2) * 0.24;
    };
    const candidateOrder = (candidate) => (candidate.source === 'future' ? structureCandles.length : 0) + candidate.index;
    const isMoreExtremeCandidate = (next, current) => next.kind === 'high' ? next.price >= current.price : next.price <= current.price;
    const normalizeCandidateKind = (candidate, previous) => {
      if (candidate.kind !== 'close') return candidate.kind;
      if (!previous) return 'close';
      return candidate.price >= previous.price ? 'high' : 'low';
    };
    const reduceSwingCandidates = (candidates, profile) => {
      const minMovePrice = Math.max(structureRange * profile.minMove, structureRange * 0.0025);
      const ordered = candidates
        .filter(candidate => candidate && Number.isFinite(Number(candidate.price)))
        .sort((a, b) => candidateOrder(a) - candidateOrder(b));
      const merged = [];
      for (const candidate of ordered) {
        const last = merged[merged.length - 1];
        if (last && last.source === candidate.source && last.index === candidate.index) {
          if (candidate.anchor && !last.anchor) merged[merged.length - 1] = candidate;
          else if (candidate.kind !== 'close' && last.kind !== 'close' && candidate.kind === last.kind && isMoreExtremeCandidate(candidate, last)) merged[merged.length - 1] = candidate;
          continue;
        }
        merged.push(candidate);
      }
      const swings = [];
      for (const rawCandidate of merged) {
        const last = swings[swings.length - 1];
        const candidate = { ...rawCandidate, kind: normalizeCandidateKind(rawCandidate, last) };
        if (!last) {
          swings.push(candidate);
          continue;
        }
        const move = Math.abs(candidate.price - last.price);
        if (candidate.kind === last.kind && candidate.kind !== 'close') {
          if ((candidate.anchor && !last.anchor) || (!last.anchor && isMoreExtremeCandidate(candidate, last))) {
            swings[swings.length - 1] = candidate;
          } else if (candidate.anchor && move >= minMovePrice) {
            swings.push(candidate);
          }
          continue;
        }
        if (candidate.anchor || last.anchor || move >= minMovePrice) {
          swings.push(candidate);
        }
      }
      return swings;
    };
    const limitSwingCandidates = (swings, profile) => {
      const anchorCount = swings.filter(candidate => candidate.anchor).length;
      const maxPoints = Math.max(2, profile.maxPoints, anchorCount);
      if (swings.length <= maxPoints) return swings;
      const selected = new Set([0, swings.length - 1]);
      swings.forEach((candidate, index) => {
        if (candidate.anchor) selected.add(index);
      });
      const scored = swings
        .map((candidate, index) => {
          if (selected.has(index)) return null;
          const prev = swings[index - 1];
          const next = swings[index + 1];
          const score = Math.abs(candidate.price - (prev?.price ?? candidate.price)) + Math.abs((next?.price ?? candidate.price) - candidate.price);
          return { index, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);
      for (const item of scored) {
        if (selected.size >= maxPoints) break;
        selected.add(item.index);
      }
      return swings.filter((_, index) => selected.has(index));
    };
    const expandPolylineWithCandles = (item) => {
      const sourcePoints = Array.isArray(item.points) ? item.points : [];
      if (sourcePoints.length < 2 || item.color !== DRAWING_COLORS.white) {
        return sourcePoints.map(pointFromRef);
      }
      const profile = getWhitePolylineProfile();
      if (profile.mode === 'anchors') return sourcePoints.map(pointFromRef);
      const anchors = sourcePoints.map((ref) => ({
        ref,
        point: pointFromRef(ref),
        anchor: true,
        kind: ref.zoneField === 'high' || ref.field === 'high' ? 'high' : ref.zoneField === 'low' || ref.field === 'low' ? 'low' : 'close',
        ...candleIndexFromRef(ref),
      }));
      const candidates = [];
      for (let i = 0; i < anchors.length; i++) {
        candidates.push({
          source: anchors[i].source,
          index: anchors[i].index,
          kind: anchors[i].kind,
          anchor: true,
          time: anchors[i].point.time,
          price: anchors[i].point.price,
        });
      }
      for (let i = 0; i < anchors.length - 1; i++) {
        const from = anchors[i];
        const to = anchors[i + 1];
        if (from.source === to.source && from.candles === to.candles) {
          const direction = to.index >= from.index ? 1 : -1;
          const start = Math.min(from.index, to.index);
          const end = Math.max(from.index, to.index);
          const window = Math.max(1, Math.min(profile.window, Math.floor((end - start) / 3)));
          for (let index = start + 1; index < end; index += 1) {
            const candle = from.candles[index];
            if (!candle) continue;
            const left = Math.max(start, index - window);
            const right = Math.min(end, index + window);
            let isHigh = true;
            let isLow = true;
            for (let j = left; j <= right; j++) {
              if (j === index) continue;
              const compareCandle = from.candles[j];
              if (!compareCandle) continue;
              if (safePrice(candle.high, candle.close) < safePrice(compareCandle.high, compareCandle.close)) isHigh = false;
              if (safePrice(candle.low, candle.close) > safePrice(compareCandle.low, compareCandle.close)) isLow = false;
            }
            if (isHigh || isLow) {
              let kind = isHigh && isLow
                ? Math.abs(safePrice(candle.high, candle.close) - safePrice(from.candles[index - direction]?.close, candle.close)) >= Math.abs(safePrice(from.candles[index - direction]?.close, candle.close) - safePrice(candle.low, candle.close)) ? 'high' : 'low'
                : isHigh ? 'high' : 'low';
              candidates.push({
                source: from.source,
                index,
                kind,
                anchor: false,
                time: candle.time,
                price: candlePolylinePrice(from.candles, index, kind),
              });
            }
          }
        }
      }
      const swings = limitSwingCandidates(reduceSwingCandidates(candidates, profile), profile);
      return swings.length >= 2 ? swings.map(({ time, price }) => ({ time, price })) : sourcePoints.map(pointFromRef);
    };
    const makeRect = (fromRef, toRef, topRef, bottomRef) => {
      const from = pointFromRef(fromRef);
      const to = pointFromRef(toRef);
      const top = priceFromRef(topRef);
      const bottom = priceFromRef(bottomRef);
      return [
        { time: from.time, price: top },
        { time: to.time, price: top },
        { time: to.time, price: bottom },
        { time: from.time, price: bottom },
      ];
    };
    const pushRiskBox = (item) => {
      const entry = pointFromRef(item.entry);
      const stopPrice = priceFromRef(item.stop);
      const targetPrice = priceFromRef(item.target);
      const from = pointFromRef(item.from);
      const to = pointFromRef(item.fullTo || item.to);
      const isBear = item.direction === 'bearish';
      const targetColor = isBear ? 'rgba(8,145,178,0.30)' : 'rgba(34,197,94,0.26)';
      // Target zone
      drawings.push({
        type: 'polygon',
        points: [
          { time: from.time, price: entry.price },
          { time: to.time, price: entry.price },
          { time: to.time, price: targetPrice },
          { time: from.time, price: targetPrice },
        ],
        color: DRAWING_COLORS.cyan,
        fill: targetColor,
        width: 1.2,
        fillPartial: true,
      });
      // Stop zone
      drawings.push({
        type: 'polygon',
        points: [
          { time: from.time, price: entry.price },
          { time: to.time, price: entry.price },
          { time: to.time, price: stopPrice },
          { time: from.time, price: stopPrice },
        ],
        color: DRAWING_COLORS.red,
        fill: 'rgba(185,28,28,0.30)',
        width: 1.2,
        fillPartial: true,
      });
      // Entry dashed line
      drawings.push({
        type: 'hline',
        price: entry.price,
        text: '',
        color: DRAWING_COLORS.green,
        width: 1.2,
        dash: '6 4',
      });
      // Target dashed line
      drawings.push({
        type: 'hline',
        price: targetPrice,
        text: '',
        color: DRAWING_COLORS.cyan,
        width: 1.0,
        dash: '4 6',
      });
      // Stop dashed line
      drawings.push({
        type: 'hline',
        price: stopPrice,
        text: '',
        color: DRAWING_COLORS.red,
        width: 1.0,
        dash: '4 6',
      });
      // ENTRY label
      drawings.push({
        type: 'label',
        time: to.time,
        price: entry.price,
        text: isBear ? 'ENTRY SHORT' : 'ENTRY LONG',
        color: DRAWING_COLORS.green,
        background: 'rgba(34,197,94,0.88)',
        textColor: '#ffffff',
        fontSize: 11,
        fontWeight: 700,
        align: isBear ? 'top' : 'bottom',
      });
      // TARGET label
      drawings.push({
        type: 'label',
        time: to.time,
        price: targetPrice,
        text: 'TARGET',
        color: DRAWING_COLORS.cyan,
        background: isBear ? 'rgba(8,145,178,0.88)' : 'rgba(34,197,94,0.82)',
        textColor: '#ffffff',
        fontSize: 11,
        fontWeight: 700,
        align: isBear ? 'bottom' : 'top',
      });
      // STOP-LOSS label
      drawings.push({
        type: 'label',
        time: to.time,
        price: stopPrice,
        text: 'STOP-LOSS',
        color: DRAWING_COLORS.red,
        background: 'rgba(220,38,38,0.88)',
        textColor: '#ffffff',
        fontSize: 11,
        fontWeight: 700,
        align: isBear ? 'top' : 'bottom',
      });
      // Expectation arrow from entry to target
      drawings.push({
        type: 'arrow',
        time1: entry.time,
        price1: entry.price,
        time2: entry.time,
        price2: targetPrice,
        color: isBear ? DRAWING_COLORS.cyan : DRAWING_COLORS.green,
        width: 2.4,
        dash: '',
      });
    };

    template.forEach((item) => {
      if (!item) return;
      if (item.kind === 'arrow' && item.to?.section === 'future') return;
      if (item.kind === 'polyline') {
        drawings.push({
          type: 'polyline',
          points: expandPolylineWithCandles(item),
          color: item.color,
          width: item.width,
          dash: item.dash,
        });
      } else if (item.kind === 'line' || item.kind === 'arrow') {
        const from = pointFromRef(item.from);
        const to = pointFromRef(item.to);
        drawings.push({
          type: item.kind === 'arrow' ? 'arrow' : 'trendline',
          time1: from.time,
          price1: from.price,
          time2: to.time,
          price2: to.price,
          text: item.text,
          textPosition: 'middle',
          color: item.color,
          width: item.width,
          dash: item.dash,
        });
      } else if (item.kind === 'hline') {
        drawings.push({
          type: 'hline',
          price: priceFromRef(item.point),
          text: item.text,
          color: item.color,
          width: item.width,
          dash: item.dash,
        });
      } else if (item.kind === 'polygon') {
        const pts = (item.points || []).map(pointFromRef);
        if (pts.length >= 3) {
          drawings.push({
            type: 'polygon',
            points: pts,
            color: item.color,
            fill: item.fill,
            width: item.width ?? 1.4,
            fillPartial: true,
          });
        }
      } else if (item.kind === 'box') {
        drawings.push({
          type: 'polygon',
          points: makeRect(item.from, item.to, item.top, item.bottom),
          color: item.color,
          fill: item.fill,
          width: item.width || 1.4,
          fillPartial: true,
        });
      } else if (item.kind === 'pointLabel') {
        const point = pointFromRef(item.point);
        drawings.push({
          type: 'pointLabel',
          time: point.time,
          price: point.price,
          text: item.text,
          dx: item.dx,
          dy: item.dy,
          color: item.color,
          showDot: Boolean(item.showDot),
          dotFill: item.dotFill,
          dotStroke: item.dotStroke,
          dotRadius: item.dotRadius,
          fontSize: item.fontSize || 13,
          fontWeight: item.fontWeight || 800,
          textAnchor: item.textAnchor,
        });
      } else if (item.kind === 'circle') {
        const point = pointFromRef(item.point);
        drawings.push({
          type: 'circle',
          time: point.time,
          price: point.price,
          color: item.color,
          fill: item.fill || 'rgba(255,255,255,0.08)',
          radius: item.radius || 7,
          width: item.width || 2,
        });
      } else if (item.kind === 'label') {
        const point = pointFromRef(item.point);
        drawings.push({
          type: 'label',
          time: point.time,
          price: point.price,
          text: item.text,
          color: item.color,
          align: item.align,
          background: item.background,
          textColor: item.textColor,
          fontSize: item.fontSize,
          fontWeight: item.fontWeight,
        });
      } else if (item.kind === 'riskBox') {
        pushRiskBox(item);
      }
    });

    return drawings;
  }

  /**
   * 将方向统一为 long/short/neutral
   */
  normalizeDirection(dir) {
    const map = {
      bullish: 'long',
      bearish: 'short',
      long: 'long',
      short: 'short',
      neutral: 'neutral',
    };
    return map[dir] || 'neutral';
  }

  /**
   * 开始新的形态分析
   * @param {number} basePrice - 基准价格
   * @returns {Object} 分析结果
   */
  start(basePrice = 65000) {
    if (this.replayTimer) {
      clearTimeout(this.replayTimer);
      this.replayTimer = null;
    }
    // 全量形态池: 基础形态 + 扩展形态库 (276 种)
    const patternKeys = [
      ...Object.keys(PATTERNS),
      ...Object.keys(ADDITIONAL_PATTERN_LIBRARY).filter((key) => !PATTERNS[key]),
    ];
    const randomPatternKey = patternKeys[Math.floor(Math.random() * patternKeys.length)];
    const pattern = PATTERNS[randomPatternKey] || ADDITIONAL_PATTERN_LIBRARY[randomPatternKey];
    const { previewCount, replayCount } = this.getPatternCandleCounts(randomPatternKey);

    const scenarioCandles = this.generatePatternCandles(
      randomPatternKey,
      previewCount + replayCount,
      basePrice
    );
    // 钳制回放K线：不触发止损 + 确保触达止盈
    this.clampReplayCandlesToRisk(scenarioCandles, previewCount, randomPatternKey);
    const previewCandles = scenarioCandles.slice(0, previewCount);
    const replayCandles = scenarioCandles.slice(previewCount);
    const signals = this.detectTechnicalSignals(previewCandles);
    // 使用预设形态分析模板，直接展示详细教学信息
    // 扩展形态库使用自动生成的 AI 解读模板
    const analysisTemplate = PATTERN_ANALYSIS_TEMPLATES[randomPatternKey]
      || buildAdditionalAnalysisTemplate(ADDITIONAL_PATTERN_LIBRARY[randomPatternKey])
      || PATTERN_ANALYSIS_TEMPLATES.RANDOM;
    // Defer drawing generation to submitChoice/revealAI to save CPU at start
    const previewPatternDrawings = [];
    const fullPatternDrawings = [];

    // 生成唯一会话 ID
    this.sessionId = generateUniqueId(this.userId);

    // 保存状态
    this.state = PATTERN_PHASES.PHASE1;
    this.pattern = randomPatternKey;
    this.patternName = pattern.name;
    this.patternDirection = pattern.direction;
    this.patternDescription = pattern.description;
    this.previewCandles = previewCandles;
    this.replayCandles = replayCandles;
    this.replayIndex = 0;
    this.userDecision = null;
    this.aiDecision = this.normalizeDirection(analysisTemplate.direction);
    this.aiConfidence = analysisTemplate.confidence;
    this.aiAnalysis = analysisTemplate.analysis;
    this.signals = signals;
    this.previewPatternDrawings = previewPatternDrawings;
    this.fullPatternDrawings = fullPatternDrawings;
    this._drawingsComputed = false;
    this.replayStarted = false;
    this.startedAt = Date.now();
    this.endedAt = null;

    return {
      success: true,
      sessionId: this.sessionId,
      pattern: randomPatternKey,
      patternName: pattern.name,
      patternDescription: pattern.description,
      candles: previewCandles,
      previewCount: previewCandles.length,
      replayCount: replayCandles.length,
      signals,
      previewPatternDrawings: [],
      teachingPatternDrawings: [],
      fullPatternDrawings: [],
      aiDecision: null,
      aiConfidence: 0,
      aiAnalysis: '',
    };
  }

  /**
   * 懒加载绘图数据 - 避免在 start() 中消耗 CPU
   */
  _ensureDrawingsComputed() {
    if (this._drawingsComputed) return;
    this._drawingsComputed = true;
    this.previewPatternDrawings = this.generatePatternDrawings(this.previewCandles, this.pattern, 'preview');
    this.fullPatternDrawings = this.generatePatternDrawings(
      [...this.previewCandles, ...this.replayCandles], this.pattern, 'full'
    );
  }

  /**
   * 阶段1结束 → 用户提交看涨/看跌选择 → 进入阶段2
   * @param {string} direction - 用户选择的方向 (long/short)
   * @returns {Object} 决策结果 + 教学绘图数据
   */
  submitChoice(direction) {
    if (!['long', 'short'].includes(direction)) {
      return { success: false, error: '请选择看涨或看跌' };
    }

    if (this.state !== PATTERN_PHASES.PHASE1) {
      return { success: false, error: '当前不在选择阶段' };
    }

    this._ensureDrawingsComputed();
    this.userDecision = direction;
    this.state = PATTERN_PHASES.PHASE2;

    return {
      success: true,
      userDecision: direction,
      teachingPatternDrawings: this.fullPatternDrawings,
    };
  }

  /**
   * 阶段2结束 → 查看AI形态解读 → 进入阶段3
   * @returns {Object} AI解读数据 + 阶段3回放信息
   */
  revealAI() {
    if (this.state !== PATTERN_PHASES.PHASE2) {
      return { success: false, error: '当前不在教学绘图阶段' };
    }

    this._ensureDrawingsComputed();
    this.state = PATTERN_PHASES.PHASE3;
    this.replayStarted = true;
    this.replayIndex = 0;

    return {
      success: true,
      aiDecision: this.aiDecision,
      aiConfidence: this.aiConfidence,
      aiAnalysis: this.aiAnalysis,
      fullPatternDrawings: this.fullPatternDrawings,
      replayCount: this.replayCandles.length,
    };
  }

  /**
   * 获取下一根回放 K 线
   * @returns {Object|null} K 线数据或 null
   */
  getNextReplayCandle() {
    if (this.state !== PATTERN_PHASES.PHASE3) return null;
    if (this.replayIndex >= this.replayCandles.length) return null;

    const candle = this.replayCandles[this.replayIndex];
    this.replayIndex++;

    return {
      candle,
      index: this.replayIndex - 1,
      total: this.replayCandles.length,
      currentTime: candle.time,
    };
  }

  /**
   * 检查回放是否完成
   */
  isReplayComplete() {
    return this.replayIndex >= this.replayCandles.length;
  }

  /**
   * 获取最终结果
   * @returns {Object} 结果数据
   */
  getResult() {
    if (this.state !== PATTERN_PHASES.PHASE3) {
      return { success: false, error: '当前不在回放阶段' };
    }

    const firstCandle = this.previewCandles[this.previewCandles.length - 1] || this.replayCandles[0];
    const lastCandle = this.replayCandles[this.replayCandles.length - 1];
    const referencePrice = firstCandle.close || firstCandle.open;
    const priceChange = (lastCandle.close - referencePrice) / referencePrice;

    let finalDirection = 'neutral';
    if (priceChange > 0.005) {
      finalDirection = 'bullish';
    } else if (priceChange < -0.005) {
      finalDirection = 'bearish';
    }

    // 统一方向比较
    const normalizedFinal = this.normalizeDirection(finalDirection);
    const userCorrect = this.userDecision === normalizedFinal || (this.userDecision === 'neutral' && normalizedFinal === 'neutral');
    const aiCorrect = this.aiDecision === normalizedFinal;

    const explanation = this.generatePatternExplanation(
      this.patternName,
      this.patternDirection,
      finalDirection,
      priceChange
    );
    const patternLines = this.fullPatternDrawings.length
      ? this.fullPatternDrawings
      : this.generatePatternDrawings([...this.previewCandles, ...this.replayCandles], this.pattern, 'full');

    // 更新状态
    this.state = PATTERN_PHASES.RESULT;
    this.finalDirection = finalDirection;
    this.priceChange = priceChange;
    this.userCorrect = userCorrect;
    this.aiCorrect = aiCorrect;
    this.explanation = explanation;
    this.patternLines = patternLines;
    this.fullPatternDrawings = patternLines;
    this.endedAt = Date.now();

    return {
      success: true,
      sessionId: this.sessionId,
      pattern: this.pattern,
      patternName: this.patternName,
      patternDescription: this.patternDescription,
      finalDirection: normalizedFinal,
      priceChange,
      userDecision: this.userDecision,
      aiDecision: this.aiDecision,
      userCorrect,
      aiCorrect,
      signals: this.signals,
      patternDirection: this.patternDirection,
      explanation,
      patternLines,
      fullPatternDrawings: patternLines,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
    };
  }

  /**
   * 重置引擎状态
   */
  reset() {
    if (this.replayTimer) {
      clearTimeout(this.replayTimer);
      this.replayTimer = null;
    }
    this.sessionId = null;
    this.state = PATTERN_PHASES.IDLE;
    this.pattern = null;
    this.patternName = null;
    this.patternDirection = null;
    this.patternDescription = null;
    this.previewCandles = [];
    this.replayCandles = [];
    this.replayIndex = 0;
    this.userDecision = null;
    this.aiDecision = null;
    this.aiConfidence = 0;
    this.aiAnalysis = '';
    this.signals = [];
    this.startedAt = null;
    this.endedAt = null;
    this.finalDirection = null;
    this.priceChange = 0;
    this.userCorrect = false;
    this.aiCorrect = false;
    this.explanation = '';
    this.patternLines = [];
    this.previewPatternDrawings = [];
    this.fullPatternDrawings = [];
    this.replayStarted = false;
  }
}

// 用户引擎实例管理器
class PatternEngineManager {
  constructor() {
    this.engines = new Map();
  }

  getEngine(userId) {
    if (!this.engines.has(userId)) {
      this.engines.set(userId, new PatternEngine(userId));
    }
    return this.engines.get(userId);
  }

  removeEngine(userId) {
    this.engines.delete(userId);
  }

  cleanup(maxAge = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [userId, engine] of this.engines.entries()) {
      if (engine.startedAt && now - engine.startedAt > maxAge) {
        this.engines.delete(userId);
      }
    }
  }
}

export { PatternEngine, PatternEngineManager, PATTERNS, PATTERN_PHASES };
