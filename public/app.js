/**
 * HTAT - 前端应用逻辑
 *
 * 功能：
 * - 邮箱验证登录
 * - SSE 连接接收实时数据
 * - 用户交易交互
 * - AI 持仓和操作记录展示
 */

'use strict';

const DAILY_FREE_CREDITS = 100;
const CHART_DEFAULT_TIMEFRAME = '15m';
const CHART_HISTORY_LIMIT = 1000;
const CHART_HISTORY_FETCH_TIMEOUT_MS = 8000;
const CHART_HISTORY_PREFETCH_COUNT = 1000;                   // 每次向左回溯加载的历史块大小
const CHART_HISTORY_HORIZON_SEC = 3 * 365 * 24 * 60 * 60;    // 历史回溯最深 3 年
const MAX_USER_MARKERS = 6;
const CHART_DEFAULT_SYMBOL = 'BTC';
const CHART_SYMBOL_STORAGE_KEY = 'TdbChartSymbol';
const CHART_TIMEFRAME_STORAGE_KEY = 'TdbChartTimeframe';
const CHART_TIMEFRAME_STORAGE_MIGRATION_KEY = 'TdbChartTimeframeMigratedTo5m';
const MIN_USER_TRADE_MARGIN = 1;
const CHART_SYMBOLS = Object.freeze({
  BTC: { key: 'BTC', label: 'BTC', tradingOverlay: true },
  XAU: { key: 'XAU', label: 'XAU', tradingOverlay: true },
});
// 图表分区：中国站仅支持黄金（XAU），国际站支持 BTC + 黄金，用户可随时切换
const CHART_REGIONS = Object.freeze({
  cn: { key: 'cn', symbols: Object.freeze(['XAU']) },
  global: { key: 'global', symbols: Object.freeze(['BTC', 'XAU']) },
});
const CHART_DEFAULT_REGION = 'global';
const CHART_REGION_STORAGE_KEY = 'TdbChartRegion';
const CHART_TIMEFRAMES = Object.freeze({
  '15m': { key: '15m', label: '15m', ms: 15 * 60 * 1000 },
  '1h': { key: '1h', label: '1h', ms: 60 * 60 * 1000 },
  '4h': { key: '4h', label: '4h', ms: 4 * 60 * 60 * 1000 },
});
const CHART_FALLBACK_MIN_VISIBLE_BARS = Object.freeze({
  '15m': 12,
  '1h': 8,
  '4h': 6,
});
const MOBILE_CHART_OVERLAY_BREAKPOINT = 896;
const MOBILE_CHART_ROTATE_COPY = Object.freeze({
  'zh-CN': { title: '请横屏使用', desc: '为了获得最佳图表体验，请将设备横屏' },
  en: { title: 'Please rotate to landscape', desc: 'For the best chart experience, rotate your device to landscape' },
  'zh-TW': { title: '請橫屏使用', desc: '為了獲得最佳圖表體驗，請將裝置橫向使用' },
  ja: { title: '横向でご利用ください', desc: '最適なチャート体験のため、端末を横向きにしてください' },
  ko: { title: '가로 모드로 사용해 주세요', desc: '최적의 차트 경험을 위해 기기를 가로로 돌려 주세요' },
  es: { title: 'Usa el modo horizontal', desc: 'Para ver mejor el gráfico, gira tu dispositivo en horizontal' },
  ar: { title: 'يرجى الاستخدام بالوضع الأفقي', desc: 'لأفضل تجربة للرسم البياني، قم بتدوير جهازك أفقيًا' },
  hi: { title: 'कृपया लैंडस्केप मोड का उपयोग करें', desc: 'सर्वश्रेष्ठ चार्ट अनुभव के लिए अपने डिवाइस को क्षैतिज करें' },
  ms: { title: 'Sila gunakan mod landskap', desc: 'Untuk pengalaman carta terbaik, putar peranti anda ke mod landskap' },
  bn: { title: 'অনুগ্রহ করে ল্যান্ডস্কেপ মোড ব্যবহার করুন', desc: 'সেরা চার্ট অভিজ্ঞতার জন্য আপনার ডিভাইসটি আড়াআড়ি ঘোরান' },
  ru: { title: 'Используйте горизонтальный режим', desc: 'Для лучшего просмотра графика поверните устройство горизонтально' },
  pt: { title: 'Use no modo horizontal', desc: 'Para a melhor visualização do gráfico, gire o dispositivo na horizontal' },
  de: { title: 'Bitte im Querformat verwenden', desc: 'Für das beste Chart-Erlebnis drehen Sie Ihr Gerät ins Querformat' },
  fr: { title: 'Utilisez le mode paysage', desc: 'Pour une meilleure lecture du graphique, tournez votre appareil en mode paysage' },
  id: { title: 'Gunakan mode lanskap', desc: 'Untuk pengalaman grafik terbaik, putar perangkat ke mode lanskap' },
  vi: { title: 'Vui lòng dùng chế độ ngang', desc: 'Để xem biểu đồ tốt nhất, hãy xoay thiết bị sang chế độ ngang' },
});

// =============================================================================
// 全局状态
// =============================================================================

const state = {
  // 认证状态
  isLoggedIn: false,
  user: null,
  token: null,
  pendingEmail: null, // 待验证的邮箱地址
  loginMode: 'password', // password | code | register

  // 应用状态
  isStarted: false,
  isPaused: true,
  isInitialized: false,
  speed: 1,
  marketSource: null,
  replaySymbol: null,
  trendCandleCount: 0,
  chartTimeframe: CHART_DEFAULT_TIMEFRAME,
  chartSymbol: CHART_DEFAULT_SYMBOL,
  chartRegion: CHART_DEFAULT_REGION,
  chartSummary: null,
  userPositions: [],
  userPosition: null,
  aiPositions: [],
  aiPosition: null,
  userHistory: [],
  aiLog: [],
  // 全局盈亏
  globalAiPnl: 0,
  globalUserPnl: 0,

  // AI 虚拟账户余额（等于所有用户总余额）
  aiVirtualBalance: 0,

  // 当前价格
  currentPrice: 0,

  // 各品种实时价格（用于本地 PnL 计算）
  symbolPrices: {},

  // 累计盈亏（本地计算）
  userTotalPnl: 0,

  // 积分（余额）
  credits: {
    purchased: 0,
    profit: 0,
    freeCredits: 0,
    freeClaimed: false,
    total: 0,
    remaining: 0,
  },

  // 杠杆倍数
  leverage: 20,

  // 当前模式: 'trading' | 'prediction'
  currentMode: 'trading',

  // 图表标记（本次走势）
  userMarkers: [],

  // 策略库
  strategies: [],
  userStrategies: [],
  userStrategySummary: {
    total: 0,
    enabled: 0,
    profitable: 0,
    losing: 0,
    totalTrades: 0,
  },
  selectedUserStrategyId: null,
  selectedUserStrategyDetail: null,
};

const MODE_CHART_DOM = {
  trading: { sectionId: 'chart-section', containerId: 'chart-container' },
  prediction: { sectionId: 'prediction-chart-section', containerId: 'prediction-chart-container' },
  pattern: { sectionId: 'pattern-chart-section', containerId: 'pattern-chart-container' },
};
let chartHistoryRequestToken = 0;
let isTradingChartHistoryReloading = false;
let bufferedTradingChartCandles = [];
// 历史懒加载（向左回溯）状态：loading 防重入，exhausted 表示已到 3 年尽头，horizonSec 为深度下界
const chartHistoryPrefetch = { loading: false, exhausted: false, horizonSec: 0 };
const CHART_LAYOUT_REFRESH_DELAYS = Object.freeze([0, 120, 320]);
const CHART_TIMEFRAME_TOUCH_CLICK_SUPPRESS_MS = 450;
let pendingChartLayoutRefreshTimers = [];
let lastChartSymbolPointerHandledAt = 0;
let lastChartTimeframeTriggerPointerHandledAt = 0;
let lastChartTimeframeMenuPointerHandledAt = 0;

function getPositionSymbol(position) {
  return normalizeChartSymbol(position?.symbol || CHART_DEFAULT_SYMBOL);
}

function getPositionForSymbol(positions, symbol = state.chartSymbol) {
  const targetSymbol = normalizeChartSymbol(symbol);
  return (Array.isArray(positions) ? positions : []).find((position) => (
    position && getPositionSymbol(position) === targetSymbol
  )) || null;
}

function getCurrentChartAIPositions() {
  const targetSymbol = normalizeChartSymbol(state.chartSymbol);
  return (Array.isArray(state.aiPositions) ? state.aiPositions : []).filter((position) => (
    position && getPositionSymbol(position) === targetSymbol
  ));
}

function syncCurrentPositionsForChartSymbol() {
  state.userPosition = getPositionForSymbol(state.userPositions);
  state.aiPosition = getPositionForSymbol(state.aiPositions);
}

function setUserPositionsState(userPositions) {
  state.userPositions = Array.isArray(userPositions) ? userPositions.filter(Boolean) : [];
  syncCurrentPositionsForChartSymbol();
}

function setAIPositionsState(aiPositions) {
  state.aiPositions = Array.isArray(aiPositions) ? aiPositions.filter(Boolean) : [];
  syncCurrentPositionsForChartSymbol();
}

function syncUserPositionsFromPayload(positions) {
  if (!positions || typeof positions !== 'object') {
    setUserPositionsState([]);
    return;
  }
  const userPositions = Array.isArray(positions.userPositions)
    ? positions.userPositions
    : (positions.user ? [positions.user] : []);
  setUserPositionsState(userPositions);
}

function syncAIPositionsFromPayload(positions) {
  if (!positions || typeof positions !== 'object') {
    setAIPositionsState([]);
    return;
  }
  const aiPositions = Array.isArray(positions.aiPositions)
    ? positions.aiPositions
    : (positions.ai ? [positions.ai] : []);
  setAIPositionsState(aiPositions);
}

function syncPositionsFromPayload(positions) {
  syncUserPositionsFromPayload(positions);
  syncAIPositionsFromPayload(positions);
}

/**
 * 客户端本地 PnL 计算（使用最新 symbolPrices）
 * 避免服务端每 tick 为每个用户计算并序列化 PnL
 */
function recalcPositionPnL(position, currentPrice) {
  if (!position || !currentPrice || !position.openPrice) return position;
  const margin = Number(position.margin ?? position.quantity ?? 0);
  const leverage = Number(position.leverage) || 1;
  const openPrice = Number(position.openPrice);
  if (!openPrice || !margin) return position;
  const priceChangeRatio = position.side === 'long'
    ? (currentPrice - openPrice) / openPrice
    : (openPrice - currentPrice) / openPrice;
  const pnl = Number((priceChangeRatio * margin * leverage).toFixed(2));
  const pnlPercent = margin > 0 ? Number(((pnl / margin) * 100).toFixed(2)) : 0;
  return { ...position, pnl, pnlPercent, currentPrice };
}

function recalcAllPositionsPnL() {
  const prices = state.symbolPrices || {};
  // 重新计算用户仓位 PnL
  if (state.userPositions.length > 0) {
    state.userPositions = state.userPositions.map((pos) => {
      const symbol = getPositionSymbol(pos);
      const price = Number(prices[symbol]) || (symbol === 'BTC' ? state.currentPrice : 0);
      return price > 0 ? recalcPositionPnL(pos, price) : pos;
    });
    syncCurrentPositionsForChartSymbol();
  }
  // 重新计算 AI 仓位 PnL
  if (state.aiPositions.length > 0) {
    state.aiPositions = state.aiPositions.map((pos) => {
      const symbol = getPositionSymbol(pos);
      const price = Number(prices[symbol]) || (symbol === 'BTC' ? state.currentPrice : 0);
      return price > 0 ? recalcPositionPnL(pos, price) : pos;
    });
    syncCurrentPositionsForChartSymbol();
  }
}

function upsertPositionInList(positions, position) {
  if (!position) return Array.isArray(positions) ? positions.filter(Boolean) : [];
  const currentPositions = Array.isArray(positions) ? positions.filter(Boolean) : [];
  const positionSymbol = getPositionSymbol(position);
  const positionId = position.id;
  let didUpdate = false;
  const nextPositions = currentPositions.map((currentPosition) => {
    const samePosition = positionId
      ? currentPosition?.id === positionId
      : getPositionSymbol(currentPosition) === positionSymbol;
    if (!samePosition) return currentPosition;
    didUpdate = true;
    return { ...currentPosition, ...position, symbol: position.symbol || positionSymbol };
  });
  if (!didUpdate) {
    nextPositions.push({ ...position, symbol: position.symbol || positionSymbol });
  }
  return nextPositions;
}

function removePositionFromList(positions, positionOrSymbol = state.chartSymbol) {
  const currentPositions = Array.isArray(positions) ? positions.filter(Boolean) : [];
  const removeId = typeof positionOrSymbol === 'object' ? positionOrSymbol?.id : null;
  const removeSymbol = typeof positionOrSymbol === 'object'
    ? getPositionSymbol(positionOrSymbol)
    : normalizeChartSymbol(positionOrSymbol);
  return currentPositions.filter((position) => {
    if (removeId && position?.id === removeId) return false;
    return getPositionSymbol(position) !== removeSymbol;
  });
}

function upsertUserPosition(position) {
  state.userPositions = upsertPositionInList(state.userPositions, position);
  syncCurrentPositionsForChartSymbol();
}

function removeUserPosition(positionOrSymbol = state.chartSymbol) {
  state.userPositions = removePositionFromList(state.userPositions, positionOrSymbol);
  syncCurrentPositionsForChartSymbol();
}

function isPredictionModeActive() {
  return state.currentMode === 'prediction';
}

function getModeChartManager(mode) {
  if (window.getChartManager) {
    return window.getChartManager(mode);
  }
  if (mode === 'trading') return window.chartManager || null;
  if (mode === 'pattern') return window.patternChartManager || null;
  return null;
}

function getTradingChartManager() {
  return getModeChartManager('trading');
}

function getPredictionChartManager() {
  return getModeChartManager('prediction');
}

function getModeChartSection(mode) {
  const ids = MODE_CHART_DOM[mode] || MODE_CHART_DOM.trading;
  return document.getElementById(ids.sectionId);
}

function getModeChartContainer(mode) {
  const ids = MODE_CHART_DOM[mode] || MODE_CHART_DOM.trading;
  return document.getElementById(ids.containerId);
}

function clearPendingChartLayoutRefreshes() {
  if (!pendingChartLayoutRefreshTimers.length) return;
  pendingChartLayoutRefreshTimers.forEach((timerId) => clearTimeout(timerId));
  pendingChartLayoutRefreshTimers = [];
}

function ensureChartManagersReady() {
  if (window.initChartManagers) {
    return window.initChartManagers();
  }
  if (window.initChart) {
    return window.initChart();
  }
  return null;
}

function ensureModeChartManagerReady(mode = state.currentMode) {
  const chartManager = getModeChartManager(mode);
  if (chartManager && typeof chartManager.init === 'function' && !chartManager.initialized) {
    chartManager.init();
  }
  return chartManager;
}

function refreshModeChartLayout(mode = state.currentMode, options = {}) {
  if (elements.appContent?.classList.contains('hidden')) return;
  const chartSection = getModeChartSection(mode);
  if (!chartSection || chartSection.offsetParent === null) return;
  const chartManager = ensureModeChartManagerReady(mode);
  if (chartManager && typeof chartManager.refreshLayout === 'function') {
    chartManager.refreshLayout({ forceViewport: options.forceViewport !== false });
  }
}

function scheduleModeChartLayoutRefresh(mode = state.currentMode, options = {}) {
  clearPendingChartLayoutRefreshes();
  const delays = Array.isArray(options.delays) && options.delays.length
    ? options.delays
    : CHART_LAYOUT_REFRESH_DELAYS;
  delays.forEach((delay, index) => {
    const timerId = setTimeout(() => {
      pendingChartLayoutRefreshTimers = pendingChartLayoutRefreshTimers.filter((id) => id !== timerId);
      refreshModeChartLayout(mode, index === 0 ? options : { ...options, forceViewport: false });
    }, Math.max(0, Number(delay) || 0));
    pendingChartLayoutRefreshTimers.push(timerId);
  });
}

function normalizeChartTimeframe(timeframe) {
  // 历史遗留的 1s/5m/3s 存量值在此归一为默认 15m（localStorage 旧值自动迁移）
  const normalized = String(timeframe || CHART_DEFAULT_TIMEFRAME).trim().toLowerCase();
  return CHART_TIMEFRAMES[normalized] ? normalized : CHART_DEFAULT_TIMEFRAME;
}

function normalizeChartSymbol(symbol) {
  const normalized = String(symbol || CHART_DEFAULT_SYMBOL).trim().toUpperCase();
  return CHART_SYMBOLS[normalized] ? normalized : CHART_DEFAULT_SYMBOL;
}

function loadStoredChartTimeframe() {
  try {
    const storedTimeframe = localStorage.getItem(CHART_TIMEFRAME_STORAGE_KEY);
    const hasMigratedDefault = localStorage.getItem(CHART_TIMEFRAME_STORAGE_MIGRATION_KEY) === '1';
    if (!hasMigratedDefault && (!storedTimeframe || storedTimeframe === '1s')) {
      localStorage.setItem(CHART_TIMEFRAME_STORAGE_KEY, CHART_DEFAULT_TIMEFRAME);
      localStorage.setItem(CHART_TIMEFRAME_STORAGE_MIGRATION_KEY, '1');
      return CHART_DEFAULT_TIMEFRAME;
    }
    const normalizedTimeframe = normalizeChartTimeframe(storedTimeframe);
    if (storedTimeframe !== normalizedTimeframe) {
      localStorage.setItem(CHART_TIMEFRAME_STORAGE_KEY, normalizedTimeframe);
    }
    if (!hasMigratedDefault) {
      localStorage.setItem(CHART_TIMEFRAME_STORAGE_MIGRATION_KEY, '1');
    }
    return normalizedTimeframe;
  } catch (_) {
    return CHART_DEFAULT_TIMEFRAME;
  }
}

function saveStoredChartTimeframe(timeframe) {
  try {
    localStorage.setItem(CHART_TIMEFRAME_STORAGE_KEY, normalizeChartTimeframe(timeframe));
    localStorage.setItem(CHART_TIMEFRAME_STORAGE_MIGRATION_KEY, '1');
  } catch (_) {}
}

function loadStoredChartSymbol() {
  try {
    const storedSymbol = localStorage.getItem(CHART_SYMBOL_STORAGE_KEY);
    const normalizedSymbol = normalizeChartSymbol(storedSymbol);
    if (storedSymbol !== normalizedSymbol) {
      localStorage.setItem(CHART_SYMBOL_STORAGE_KEY, normalizedSymbol);
    }
    return normalizedSymbol;
  } catch (_) {
    return CHART_DEFAULT_SYMBOL;
  }
}

function saveStoredChartSymbol(symbol) {
  try {
    localStorage.setItem(CHART_SYMBOL_STORAGE_KEY, normalizeChartSymbol(symbol));
  } catch (_) {}
}

function normalizeChartRegion(region) {
  const normalized = String(region || CHART_DEFAULT_REGION).trim().toLowerCase();
  return CHART_REGIONS[normalized] ? normalized : CHART_DEFAULT_REGION;
}

function loadStoredChartRegion() {
  try {
    const storedRegion = localStorage.getItem(CHART_REGION_STORAGE_KEY);
    const normalizedRegion = normalizeChartRegion(storedRegion);
    if (storedRegion !== normalizedRegion) {
      localStorage.setItem(CHART_REGION_STORAGE_KEY, normalizedRegion);
    }
    return normalizedRegion;
  } catch (_) {
    return CHART_DEFAULT_REGION;
  }
}

function saveStoredChartRegion(region) {
  try {
    localStorage.setItem(CHART_REGION_STORAGE_KEY, normalizeChartRegion(region));
  } catch (_) {}
}

function getChartRegionSymbols(region = state.chartRegion) {
  return CHART_REGIONS[normalizeChartRegion(region)].symbols;
}

function isChartSymbolAllowed(symbol = state.chartSymbol, region = state.chartRegion) {
  return getChartRegionSymbols(region).includes(normalizeChartSymbol(symbol));
}

function getChartSymbolConfig(symbol = state.chartSymbol) {
  return CHART_SYMBOLS[normalizeChartSymbol(symbol)] || CHART_SYMBOLS[CHART_DEFAULT_SYMBOL];
}

function isTradingChartSymbolActive(symbol = state.chartSymbol) {
  return Boolean(getChartSymbolConfig(symbol).tradingOverlay);
}

function getChartSymbolButtons() {
  return Array.from(elements.chartSymbolSelector?.querySelectorAll('.chart-symbol-btn') || []);
}

function syncChartSymbolButtons() {
  const activeSymbol = normalizeChartSymbol(state.chartSymbol);
  const regionSymbols = getChartRegionSymbols();
  for (const button of getChartSymbolButtons()) {
    const buttonSymbol = normalizeChartSymbol(button.dataset.symbol);
    button.classList.toggle('active', buttonSymbol === activeSymbol);
    button.classList.toggle('hidden', !regionSymbols.includes(buttonSymbol));
    button.disabled = false;
  }
}

function getChartRegionButtons() {
  return Array.from(elements.chartRegionSelector?.querySelectorAll('.chart-region-btn') || []);
}

function syncChartRegionButtons() {
  const activeRegion = normalizeChartRegion(state.chartRegion);
  for (const button of getChartRegionButtons()) {
    button.classList.toggle('active', normalizeChartRegion(button.dataset.region) === activeRegion);
  }
}

function applyChartRegion(region) {
  const normalizedRegion = normalizeChartRegion(region);
  const regionConfig = CHART_REGIONS[normalizedRegion];
  state.chartRegion = normalizedRegion;
  saveStoredChartRegion(normalizedRegion);
  syncChartRegionButtons();
  syncChartSymbolButtons();

  // 当前品种在新区不可用（如 BTC 切到中国站）时，回落到区内首选品种
  if (!regionConfig.symbols.includes(state.chartSymbol)) {
    setChartSymbol(regionConfig.symbols[0], { forceReload: true });
  }
}

function getChartRequestLabel(timeframe = state.chartTimeframe, symbol = state.chartSymbol) {
  return `${getChartSymbolConfig(symbol).label} ${normalizeChartTimeframe(timeframe)}`;
}

function getChartTimeframeConfig(timeframe = state.chartTimeframe) {
  return CHART_TIMEFRAMES[normalizeChartTimeframe(timeframe)] || CHART_TIMEFRAMES[CHART_DEFAULT_TIMEFRAME];
}

function normalizeChartCandle(candle) {
  if (!candle) return null;
  const numericTime = Number(candle.time || 0);
  const time = Number.isFinite(numericTime) && numericTime > 0
    ? Math.floor(numericTime > 1e11 ? numericTime / 1000 : numericTime)
    : 0;
  const open = Number(candle.open);
  const high = Number(candle.high);
  const low = Number(candle.low);
  const close = Number(candle.close);
  const volume = Number(candle.volume || 0);
  if (!time || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
    return null;
  }
  return {
    time,
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : 0,
  };
}

// 校验历史 K 线是否严格对齐目标周期网格（时间戳整除周期、严格递增）。
// 后端兜底路径可能返回未聚合的原始 1s K 线，直接渲染会导致周期错乱、时间轴标签重复。
function isChartHistoryAlignedToTimeframe(candles, timeframe = state.chartTimeframe) {
  const timeframeConfig = getChartTimeframeConfig(timeframe);
  const intervalSec = Math.floor(Number(timeframeConfig?.ms || 0) / 1000);
  if (!Number.isFinite(intervalSec) || intervalSec <= 1) return true;
  const list = Array.isArray(candles) ? candles : [];
  let previousTime = 0;
  for (const candle of list) {
    const normalizedCandle = normalizeChartCandle(candle);
    if (!normalizedCandle) return false;
    if (normalizedCandle.time % intervalSec !== 0 || normalizedCandle.time <= previousTime) return false;
    previousTime = normalizedCandle.time;
  }
  return true;
}

function aggregateCandlesForTimeframe(candles, timeframe = state.chartTimeframe) {
  const timeframeConfig = getChartTimeframeConfig(timeframe);
  const buckets = new Map();
  const normalizedCandles = Array.isArray(candles)
    ? candles
      .map((candle) => normalizeChartCandle(candle))
      .filter(Boolean)
      .sort((left, right) => left.time - right.time)
    : [];

  for (const candle of normalizedCandles) {
    const bucketTime = Math.floor((candle.time * 1000) / timeframeConfig.ms) * timeframeConfig.ms / 1000;
    const existing = buckets.get(bucketTime);
    if (!existing) {
      buckets.set(bucketTime, {
        time: bucketTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
      continue;
    }

    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume += candle.volume;
  }

  return Array.from(buckets.values()).sort((left, right) => left.time - right.time);
}

function buildDisplayCandleFromRaw(rawCandle, previousCandle = null, timeframe = state.chartTimeframe) {
  const normalizedRawCandle = normalizeChartCandle(rawCandle);
  if (!normalizedRawCandle) return null;
  const timeframeConfig = getChartTimeframeConfig(timeframe);
  const bucketTime = Math.floor((normalizedRawCandle.time * 1000) / timeframeConfig.ms) * timeframeConfig.ms / 1000;
  const normalizedPreviousCandle = normalizeChartCandle(previousCandle);
  const isSameBucket = Boolean(normalizedPreviousCandle && Number(normalizedPreviousCandle.time || 0) === bucketTime);
  return {
    time: bucketTime,
    open: isSameBucket ? normalizedPreviousCandle.open : normalizedRawCandle.open,
    high: isSameBucket ? Math.max(normalizedPreviousCandle.high, normalizedRawCandle.high) : normalizedRawCandle.high,
    low: isSameBucket ? Math.min(normalizedPreviousCandle.low, normalizedRawCandle.low) : normalizedRawCandle.low,
    close: normalizedRawCandle.close,
    volume: isSameBucket ? Number(normalizedPreviousCandle.volume || 0) + normalizedRawCandle.volume : normalizedRawCandle.volume,
  };
}

function dedupeRealtimeCandles(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  const candlesByTime = new Map();
  for (const candle of candles) {
    const normalizedCandle = normalizeChartCandle(candle);
    if (!normalizedCandle) continue;
    candlesByTime.set(normalizedCandle.time, normalizedCandle);
  }
  return Array.from(candlesByTime.values()).sort((left, right) => left.time - right.time);
}

function getChartTimeframeButtons() {
  return Array.from(elements.chartTimeframeMenu?.querySelectorAll('.chart-timeframe-btn') || []);
}

function isPrimaryTouchLikePointerEvent(event) {
  if (!event || event.defaultPrevented) return false;
  const pointerType = String(event.pointerType || '').toLowerCase();
  if (pointerType && pointerType !== 'touch' && pointerType !== 'pen') return false;
  if (typeof event.button === 'number' && event.button !== 0) return false;
  return true;
}

function shouldIgnoreSyntheticChartTimeframeClick(lastHandledAt) {
  return Number.isFinite(lastHandledAt)
    && lastHandledAt > 0
    && (Date.now() - lastHandledAt) < CHART_TIMEFRAME_TOUCH_CLICK_SUPPRESS_MS;
}

function toggleChartTimeframeMenu(event) {
  event?.stopPropagation?.();
  if (elements.chartTimeframeTrigger?.disabled) return;
  const shouldOpen = elements.chartTimeframeMenu?.classList.contains('hidden') ?? false;
  setChartTimeframeMenuOpen(shouldOpen);
}

function applyChartTimeframeSelection(button) {
  if (!button || button.disabled) return;
  setChartTimeframe(button.dataset.timeframe);
  setChartTimeframeMenuOpen(false);
}

function applyChartSymbolSelection(button) {
  if (!button) return;
  setChartSymbol(button.dataset.symbol);
}

function setChartTimeframeMenuOpen(isOpen) {
  if (!elements.chartTimeframeMenu || !elements.chartTimeframeTrigger || !elements.chartTimeframeSelector) return;
  const shouldOpen = Boolean(isOpen);
  elements.chartTimeframeMenu.classList.toggle('hidden', !shouldOpen);
  elements.chartTimeframeSelector.classList.toggle('open', shouldOpen);
  elements.chartTimeframeTrigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
}

function syncChartTimeframeButtons() {
  const activeTimeframe = normalizeChartTimeframe(state.chartTimeframe);
  const activeLabel = getChartTimeframeConfig(activeTimeframe)?.label || activeTimeframe;
  if (elements.chartTimeframeCurrent) {
    elements.chartTimeframeCurrent.textContent = activeLabel;
  }
  if (elements.chartTimeframeTrigger) {
    elements.chartTimeframeTrigger.disabled = false;
  }
  for (const button of getChartTimeframeButtons()) {
    const buttonTimeframe = normalizeChartTimeframe(button.dataset.timeframe);
    button.classList.toggle('active', buttonTimeframe === activeTimeframe);
    button.disabled = false;
  }
}

function syncTradingChartTimeframePresentation(tradingChartManager = getTradingChartManager(), timeframe = state.chartTimeframe) {
  if (!tradingChartManager || typeof tradingChartManager.setTimeframe !== 'function') return;
  tradingChartManager.setTimeframe(getChartTimeframeConfig(timeframe));
}

function syncTradingChartDecorations(tradingChartManager = getTradingChartManager()) {
  if (!tradingChartManager) return;
  syncCurrentPositionsForChartSymbol();
  if (isTradingChartSymbolActive()) {
    restoreUserMarkers();
    tradingChartManager.setUserPosition(state.userPosition);
    tradingChartManager.setAIPositions(getCurrentChartAIPositions());
    return;
  }
  tradingChartManager.clearUserMarkers();
  tradingChartManager.setUserPosition(null);
  tradingChartManager.setAIPositions([]);
}

function getEffectiveHistoryFallbackCandles(rawCandles, chartSymbol = state.chartSymbol) {
  return isTradingChartSymbolActive(chartSymbol) ? rawCandles : [];
}

function getChartFallbackMinVisibleBars(timeframe = state.chartTimeframe) {
  const normalizedTimeframe = normalizeChartTimeframe(timeframe);
  return CHART_FALLBACK_MIN_VISIBLE_BARS[normalizedTimeframe] || 1;
}

function buildFallbackTradingChartHistory(rawCandles, timeframe = state.chartTimeframe) {
  const targetTimeframe = normalizeChartTimeframe(timeframe);
  const candles = aggregateCandlesForTimeframe(rawCandles, targetTimeframe);
  return {
    timeframe: targetTimeframe,
    candles,
    usable: candles.length >= getChartFallbackMinVisibleBars(targetTimeframe),
  };
}

function applyTradingChartHistory(candles, options = {}) {
  const tradingChartManager = getTradingChartManager();
  if (!tradingChartManager) return;
  let history = Array.isArray(candles) ? candles : [];
  const targetTimeframe = normalizeChartTimeframe(options.timeframe || state.chartTimeframe);
  if (history.length && !isChartHistoryAlignedToTimeframe(history, targetTimeframe)) {
    history = aggregateCandlesForTimeframe(history, targetTimeframe);
  }
  const trendCount = Number.isFinite(Number(options.trendCount))
    ? Number(options.trendCount)
    : Number(state.trendCandleCount || 0);

  syncTradingChartTimeframePresentation(tradingChartManager, targetTimeframe);

  if (options.hardReset || history.length === 0) {
    tradingChartManager.reset();
    resetChartHistoryPrefetchState(history);
  }
  if (history.length > 0) {
    tradingChartManager.loadHistory(history, trendCount);
  }
  // 挂接历史懒加载回调（幂等）：可视区接近数据左缘时向左回溯
  tradingChartManager.onHistoryPrefetchNeeded = () => void loadMoreTradingChartHistory();

  syncTradingChartDecorations(tradingChartManager);
}

function resetChartHistoryPrefetchState(history = []) {
  chartHistoryPrefetch.loading = false;
  chartHistoryPrefetch.exhausted = false;
  const lastCandle = Array.isArray(history) && history.length ? normalizeChartCandle(history[history.length - 1]) : null;
  const lastTime = Number(lastCandle?.time || 0);
  chartHistoryPrefetch.horizonSec = lastTime > 0 ? lastTime - CHART_HISTORY_HORIZON_SEC : 0;
}

// TradingView 式历史懒加载：滚动接近左缘时请求更早的一整块历史 K 线并无缝拼接
async function loadMoreTradingChartHistory() {
  const tradingChartManager = getTradingChartManager();
  if (!tradingChartManager) return false;
  if (chartHistoryPrefetch.loading || chartHistoryPrefetch.exhausted || isTradingChartHistoryReloading) return false;
  if (typeof tradingChartManager.getFirstCandleTime !== 'function' || typeof tradingChartManager.prependHistory !== 'function') return false;

  const firstTime = Number(tradingChartManager.getFirstCandleTime() || 0);
  if (!firstTime) return false;
  if (chartHistoryPrefetch.horizonSec > 0 && firstTime <= chartHistoryPrefetch.horizonSec) {
    chartHistoryPrefetch.exhausted = true;
    return false;
  }

  const requestedTimeframe = normalizeChartTimeframe(state.chartTimeframe);
  const requestedChartSymbol = normalizeChartSymbol(state.chartSymbol);
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timeoutId = null;

  chartHistoryPrefetch.loading = true;
  if (typeof tradingChartManager.setHistoryLoading === 'function') {
    tradingChartManager.setHistoryLoading(true);
  }
  try {
    if (controller) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, CHART_HISTORY_FETCH_TIMEOUT_MS);
    }
    const response = await fetch(`/api/candles?count=${CHART_HISTORY_PREFETCH_COUNT}&timeframe=${encodeURIComponent(requestedTimeframe)}&symbol=${encodeURIComponent(requestedChartSymbol)}&endTime=${firstTime - 1}`, {
      headers: getAuthHeaders(),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const candles = await response.json();
    // 请求期间周期/品种被切换：丢弃结果，避免错位拼接
    if (requestedTimeframe !== normalizeChartTimeframe(state.chartTimeframe) || requestedChartSymbol !== normalizeChartSymbol(state.chartSymbol)) {
      return false;
    }
    const added = tradingChartManager.prependHistory(candles);
    const firstReturned = Array.isArray(candles) && candles.length ? normalizeChartCandle(candles[0]) : null;
    // 到底判定：无新增，或返回最早时间已触及 3 年下界（不用 length<1000，避免 XAU 周末跳空短块误判）
    if (added === 0 || (chartHistoryPrefetch.horizonSec > 0 && firstReturned && firstReturned.time <= chartHistoryPrefetch.horizonSec)) {
      chartHistoryPrefetch.exhausted = true;
    }
    return added > 0;
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('加载更早的历史 K 线失败:', error);
    }
    return false;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    chartHistoryPrefetch.loading = false;
    if (typeof tradingChartManager.setHistoryLoading === 'function') {
      tradingChartManager.setHistoryLoading(false);
    }
  }
}

function loadTradingChartFromRawCandles(rawCandles, options = {}) {
  const targetTimeframe = normalizeChartTimeframe(options.timeframe || state.chartTimeframe);
  const fallbackHistory = buildFallbackTradingChartHistory(rawCandles, targetTimeframe);
  if (!fallbackHistory.usable) {
    return false;
  }
  applyTradingChartHistory(fallbackHistory.candles, {
    ...options,
    timeframe: targetTimeframe,
  });
  return true;
}

function applyRealtimeTradingChartCandle(rawCandle, tradingChartManager = getTradingChartManager(), timeframe = state.chartTimeframe) {
  if (!tradingChartManager || !rawCandle) return;
  const targetTimeframe = normalizeChartTimeframe(timeframe);
  syncTradingChartTimeframePresentation(tradingChartManager, targetTimeframe);
  const displayCandle = buildDisplayCandleFromRaw(
    rawCandle,
    tradingChartManager.getLastCandle?.() || null,
    targetTimeframe,
  );
  if (displayCandle) {
    tradingChartManager.addCandle(displayCandle);
  }
}

async function refreshTradingChartHistory(options = {}) {
  const tradingChartManager = getTradingChartManager();
  if (!tradingChartManager) return false;
  const requestToken = ++chartHistoryRequestToken;
  const requestedTimeframe = normalizeChartTimeframe(options.timeframe || state.chartTimeframe);
  const requestedChartSymbol = normalizeChartSymbol(options.symbol || state.chartSymbol);
  const previousTimeframe = normalizeChartTimeframe(state.chartTimeframe);
  const shouldCommitTimeframe = options.commitTimeframeOnSuccess === true && requestedTimeframe !== previousTimeframe;
  const suppressReadyStatus = options.suppressReadyStatus === true;
  let effectiveTimeframe = previousTimeframe;
  let didApplyHistory = false;
  isTradingChartHistoryReloading = true;
  bufferedTradingChartCandles = [];
  syncChartTimeframeButtons();
  syncChartSymbolButtons();
  const _chartLabel = getChartRequestLabel(requestedTimeframe, requestedChartSymbol);
  const _loadingMsg = translateOr('chart.loadingChart', '正在加载 {0} 图表...').replace('{0}', _chartLabel);
  showChartLoading(_loadingMsg);
  updateTickInfo(_loadingMsg);

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timeoutId = null;

  try {
    if (controller) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, CHART_HISTORY_FETCH_TIMEOUT_MS);
    }
    const response = await fetch(`/api/candles?count=${CHART_HISTORY_LIMIT}&timeframe=${encodeURIComponent(requestedTimeframe)}&symbol=${encodeURIComponent(requestedChartSymbol)}`, {
      headers: getAuthHeaders(),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const candles = await response.json();
    if (requestToken === chartHistoryRequestToken) {
      applyTradingChartHistory(candles, {
        trendCount: options.trendCount,
        hardReset: options.hardReset,
        timeframe: requestedTimeframe,
      });
      effectiveTimeframe = requestedTimeframe;
      if (shouldCommitTimeframe) {
        state.chartTimeframe = requestedTimeframe;
        saveStoredChartTimeframe(requestedTimeframe);
      }
      didApplyHistory = true;
    }
  } catch (error) {
    console.error('刷新主图周期 K 线失败:', error);
    const fallbackCandles = getEffectiveHistoryFallbackCandles(options.fallbackCandles, requestedChartSymbol);
    if (requestToken === chartHistoryRequestToken && Array.isArray(fallbackCandles) && fallbackCandles.length) {
      const didApplyFallbackHistory = loadTradingChartFromRawCandles(fallbackCandles, {
        trendCount: options.trendCount,
        hardReset: options.hardReset,
        timeframe: requestedTimeframe,
      });
      if (didApplyFallbackHistory) {
        effectiveTimeframe = requestedTimeframe;
        if (shouldCommitTimeframe) {
          state.chartTimeframe = requestedTimeframe;
          saveStoredChartTimeframe(requestedTimeframe);
        }
        didApplyHistory = true;
      }
    }
    if (requestToken === chartHistoryRequestToken && !didApplyHistory) {
      const _failLabel = getChartRequestLabel(requestedTimeframe, requestedChartSymbol);
      const _failMsg = translateOr('chart.loadFailed', '加载 {0} 图表失败，正在等待重试...').replace('{0}', _failLabel);
      showChartLoading(_failMsg);
      updateTickInfo(_failMsg);
    }
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (requestToken === chartHistoryRequestToken) {
      isTradingChartHistoryReloading = false;
      const queuedCandles = dedupeRealtimeCandles(bufferedTradingChartCandles);
      bufferedTradingChartCandles = [];
      syncChartTimeframeButtons();
      syncChartSymbolButtons();
      const latestTradingChartManager = getTradingChartManager();
      if (latestTradingChartManager && queuedCandles.length) {
        for (const candle of queuedCandles) {
          applyRealtimeTradingChartCandle(candle, latestTradingChartManager, effectiveTimeframe);
        }
      }
      if (didApplyHistory) {
        if (suppressReadyStatus) {
          hideChartLoading();
        } else {
          setRealtimeReadyStatus();
        }
      }
    }
  }

  return didApplyHistory;
}

function setChartTimeframe(timeframe, options = {}) {
  const normalizedTimeframe = normalizeChartTimeframe(timeframe);
  const changed = normalizedTimeframe !== state.chartTimeframe;
  if (changed) {
    state.chartTimeframe = normalizedTimeframe;
    saveStoredChartTimeframe(normalizedTimeframe);
    syncTradingChartTimeframePresentation();
    syncChartTimeframeButtons();
  }
  if ((changed || options.forceReload) && state.isLoggedIn) {
    void refreshTradingChartHistory({
      trendCount: state.trendCandleCount,
      timeframe: normalizedTimeframe,
      commitTimeframeOnSuccess: false,
    });
    return;
  }

  if (!changed && !options.forceReload) return;
}

function setChartSymbol(symbol, options = {}) {
  const normalizedSymbol = normalizeChartSymbol(symbol);
  // 分区过滤：拒绝切换到当前区不支持的品种（如中国站切 BTC）
  if (!isChartSymbolAllowed(normalizedSymbol)) return;
  const changed = normalizedSymbol !== state.chartSymbol;
  if (!changed && !options.forceReload) return;

  state.chartSymbol = normalizedSymbol;
  saveStoredChartSymbol(normalizedSymbol);
  syncCurrentPositionsForChartSymbol();
  chartSummarySignature = '';
  state.chartSummary = {
    currentPrice: 0,
    priceChange24h: null,
    volatility: 0,
    marketSource: null,
    replaySymbol: null,
    chartSymbol: normalizedSymbol,
    displaySymbol: getChartSymbolConfig(normalizedSymbol).label,
    tradingOverlay: isTradingChartSymbolActive(normalizedSymbol),
  };

  syncChartSymbolButtons();
  updateUserPositionCard();
  updateAIPositionCard();
  const tradingChartManager = getTradingChartManager();
  if (tradingChartManager) {
    syncTradingChartDecorations(tradingChartManager);
  }
  updateChartSummary(state.chartSummary);
  updateTradeButtons();

  if (!state.isLoggedIn) return;

  void refreshTradingChartHistory({
    trendCount: state.trendCandleCount,
    hardReset: true,
    suppressReadyStatus: true,
    symbol: normalizedSymbol,
  });
  initSSE();
}

function translateOr(key, fallback) {
  const translated = window.i18n?.t?.(key);
  return translated && translated !== key ? translated : fallback;
}

function getClaimFreeTitle() {
  return translateOr('nav.claimFreeTitle', `领取每日免费积分（${DAILY_FREE_CREDITS} 积分）`);
}

const MIN_TRANSFER_REDEEM_CREDITS = 10000;
const MAX_REDEEM_CODE_CREDITS = 9999999999;

function getRedeemRequiredMessage() {
  return translateOr('purchase.redeemRequired', '请输入兑换码');
}

function getRedeemFailedMessage() {
  return translateOr('purchase.redeemFailed', '兑换失败，请检查兑换码');
}

function getConvertRequiredMessage() {
  return translateOr('purchase.convertRequired', '请输入要转换的积分数量');
}

function getConvertMinMessage() {
  return translateOr('purchase.convertMin', '积分转换兑换码最低需要 10000 积分');
}

function getConvertMaxMessage() {
  return translateOr('purchase.convertMax', `单个兑换码最多支持 ${MAX_REDEEM_CODE_CREDITS} 积分`);
}

function getConvertFailedMessage() {
  return translateOr('purchase.convertFailed', '积分转换兑换码失败，请稍后再试');
}

function getGeneratedCodeEmptyText() {
  return translateOr('purchase.generatedCodeEmpty', '--');
}

function formatGeneratedCodeText(code) {
  if (!code) {
    return getGeneratedCodeEmptyText();
  }
  return String(code);
}

function isMobileDevice() {
  if (typeof navigator !== 'undefined' && navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
    return navigator.userAgentData.mobile;
  }
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

function isAndroidDevice() {
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
  return /Android/i.test(ua);
}

function extractTaobaoItemId(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.searchParams.get('id') || '';
  } catch (error) {
    return '';
  }
}

function buildTaobaoWebUrls(webUrl) {
  const itemId = extractTaobaoItemId(webUrl);
  const desktopUrl = itemId
    ? `https://item.taobao.com/item.htm?ft=t&id=${encodeURIComponent(itemId)}`
    : webUrl;
  const mobileUrl = itemId
    ? `https://h5.m.taobao.com/awp/core/detail.htm?id=${encodeURIComponent(itemId)}`
    : desktopUrl;
  return { itemId, desktopUrl, mobileUrl };
}

function buildTaobaoAppUrls(webUrl) {
  const { itemId, mobileUrl } = buildTaobaoWebUrls(webUrl);
  const urls = [
    `taobao://m.taobao.com/tbopen/index.html?h5Url=${encodeURIComponent(mobileUrl)}`,
    `tbopen://m.taobao.com/tbopen/index.html?action=ali.open.nav&module=h5&bootImage=0&h5Url=${encodeURIComponent(mobileUrl)}`,
  ];

  if (itemId) {
    urls.unshift(`taobao://item.taobao.com/item.htm?id=${encodeURIComponent(itemId)}`);
  }
  if (isAndroidDevice()) {
    urls.unshift(`intent://m.taobao.com/tbopen/index.html?h5Url=${encodeURIComponent(mobileUrl)}#Intent;scheme=taobao;package=com.taobao.taobao;S.browser_fallback_url=${encodeURIComponent(mobileUrl)};end`);
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

function openDeepLink(url, useIframe = false) {
  if (!url) return null;

  if (useIframe && document.body) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    return iframe;
  }

  if (document.body) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    return anchor;
  }

  window.location.assign(url);
  return null;
}

async function copyTextToClipboard(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      console.warn('Clipboard API failed:', error);
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch (error) {
    console.warn('Fallback copy failed:', error);
    return false;
  }
}

function tryOpenTaobaoApp(webUrl) {
  if (!webUrl) return;

  const { desktopUrl, mobileUrl } = buildTaobaoWebUrls(webUrl);
  const fallbackUrl = mobileUrl || desktopUrl || webUrl;
  const appUrls = buildTaobaoAppUrls(webUrl);
  let appOpened = false;
  let fallbackTimer = null;
  const attemptTimers = [];
  const cleanupNodes = [];

  const cleanup = () => {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    while (attemptTimers.length) {
      clearTimeout(attemptTimers.pop());
    }
    while (cleanupNodes.length) {
      const node = cleanupNodes.pop();
      node?.remove();
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      appOpened = true;
      cleanup();
    }
  };

  const handlePageHide = () => {
    appOpened = true;
    cleanup();
  };

  const registerCleanupNode = (node) => {
    if (!node) return;
    cleanupNodes.push(node);
    setTimeout(() => {
      const index = cleanupNodes.indexOf(node);
      if (index >= 0) {
        cleanupNodes.splice(index, 1);
      }
      node.remove();
    }, 1200);
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);

  if (appUrls.length) {
    registerCleanupNode(openDeepLink(appUrls[0]));
    for (let index = 1; index < appUrls.length; index += 1) {
      attemptTimers.push(setTimeout(() => {
        if (appOpened) {
          return;
        }
        registerCleanupNode(openDeepLink(appUrls[index], true));
      }, index * 180));
    }
  }

  fallbackTimer = setTimeout(() => {
    cleanup();
    if (!appOpened) {
      window.location.assign(fallbackUrl);
    }
  }, 1500);
}

let userPositionCardSignature = '';
let tradeButtonsSignature = '';
let globalPnlDisplaySignature = '';
let userPnLStatsSignature = '';
let aiPnLStatsSignature = '';
let chartSummarySignature = '';
let tickRenderFrame = 0;
let tickDeferredUiTimer = null;
let pendingTickCandles = [];
let pendingTickEngineState = null;
let pendingTickChartState = null;
let lastSimTimeUiAt = 0;
const TICK_DEFERRED_UI_DELAY = 160;
const SIM_TIME_UI_INTERVAL = 1000;
const RECENT_OPERATION_LIMIT = 20;

function normalizeRecentOperationKeyPart(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(8);
  return String(value);
}

function normalizeRecentOperationTimeMs(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  return Math.round(numericValue > 1e11 ? numericValue : numericValue * 1000);
}

function getRecentOperationRecordKey(record) {
  if (!record || typeof record !== 'object') return '';
  const eventId = record.eventId ?? record.version ?? null;
  const timeMs = normalizeRecentOperationTimeMs(record.time ?? record.closeTime ?? 0);
  if (eventId !== null && eventId !== undefined && eventId !== '') {
    return [
      'event',
      normalizeRecentOperationKeyPart(eventId),
      normalizeRecentOperationKeyPart(timeMs),
    ].join('|');
  }
  return [
    'fallback',
    normalizeRecentOperationKeyPart(timeMs),
    normalizeRecentOperationKeyPart(record.action || 'open'),
    normalizeRecentOperationKeyPart(record.side || ''),
    normalizeRecentOperationKeyPart(record.price || 0),
    normalizeRecentOperationKeyPart(record.quantity || 0),
    normalizeRecentOperationKeyPart(record._posId || record.positionId || record.id || ''),
  ].join('|');
}

function mergeRecentOperationRecords(...groups) {
  const merged = [];
  const seen = new Set();
  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const record of group) {
      if (!record || typeof record !== 'object') continue;
      const key = getRecentOperationRecordKey(record);
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      merged.push(record);
      if (merged.length >= RECENT_OPERATION_LIMIT) {
        return merged;
      }
    }
  }
  return merged;
}

function limitUserHistoryRecords(records) {
  return mergeRecentOperationRecords(records);
}

function limitRecentOperationRecords(records) {
  return Array.isArray(records) ? records.slice(0, RECENT_OPERATION_LIMIT) : [];
}

function getCurrentLanguageKey() {
  return window.i18n?.getCurrentLanguage?.() || document.documentElement.lang || 'default';
}

function getUserPositionCardSignature(pos = state.userPosition) {
  if (!pos) return `${getCurrentLanguageKey()}|v2|empty`;
  return [
    getCurrentLanguageKey(),
    'v2',
    String(pos.id || ''),
    String(pos.side || ''),
    Number(pos.openPrice || 0).toFixed(2),
    Number(pos.margin ?? pos.quantity ?? 0).toFixed(2),
    String(pos.openTime || ''),
  ].join('|');
}

function getTradeButtonsSignature() {
  return [
    getCurrentLanguageKey(),
    normalizeChartSymbol(state.chartSymbol),
    state.userPosition ? 'position' : 'flat',
    state.isLoggedIn ? '1' : '0',
    state.isStarted ? '1' : '0',
    (state.credits.remaining || state.credits.total || 0) >= MIN_USER_TRADE_MARGIN ? '1' : '0',
  ].join('|');
}

function syncUserPositionCardValues(card, pos) {
  if (!card || !pos) return;
  const pnlClass = pos.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
  const pnlSign = pos.pnl >= 0 ? '+' : '';
  const unit = (window.i18n?.t || ((key) => key))('trade.pnlUnit');
  const openPriceEl = card.querySelector('.position-price .open-price-value');
  const currentPriceEl = card.querySelector('.position-price .current-price');
  const marginEl = card.querySelector('.position-stat[data-stat="margin"] .value');
  const positionValueEl = card.querySelector('.position-stat[data-stat="positionValue"] .value');
  const pnlAmountEl = card.querySelector('.position-stat[data-stat="pnlAmount"] .value');
  const pnlRateEl = card.querySelector('.position-stat[data-stat="pnlRate"] .value');

  card.className = `position-card has-position ${pos.side}`;
  if (openPriceEl) openPriceEl.textContent = formatPrice(pos.openPrice);
  if (currentPriceEl) {
    currentPriceEl.className = `current-price ${pnlClass}`;
    currentPriceEl.textContent = formatPrice(state.currentPrice);
  }
  if (marginEl) marginEl.textContent = (pos.margin || pos.quantity || 0).toFixed(2);
  if (positionValueEl) positionValueEl.textContent = ((pos.margin || pos.quantity || 0) * (pos.leverage || 1)).toFixed(2);
  if (pnlAmountEl) {
    pnlAmountEl.className = `value pnl ${pnlClass}`;
    pnlAmountEl.textContent = `${pnlSign}${Math.abs(pos.pnl).toFixed(2)}${unit}`;
  }
  if (pnlRateEl) {
    pnlRateEl.className = `value pnl ${pnlClass}`;
    pnlRateEl.textContent = `${pnlSign}${pos.pnlPercent.toFixed(2)}%`;
  }
}

// =============================================================================
// DOM 元素缓存
// =============================================================================

const $ = (id) => document.getElementById(id);

// 延迟初始化 elements 对象（在 DOMContentLoaded 后填充）
let elements = {};

/**
 * 缓存所有 DOM 元素引用
 */
function cacheElements() {
  elements = {
    // 登录
    loginPage: $('login-page'),
    loginTabs: $('login-tabs'),
    stepPassword: $('step-password'),
    stepEmail: $('step-email'),
    stepCode: $('step-code'),
    stepRegister: $('step-register'),
    maskedEmail: $('masked-email'),
    regMaskedEmail: $('reg-masked-email'),
    emailInput: $('email-input'),
    codeInput: $('code-input'),
    passwordEmailInput: $('password-email-input'),
    passwordInput: $('password-input'),
    regCodeInput: $('reg-code-input'),
    regPasswordInput: $('reg-password-input'),
    regPasswordConfirm: $('reg-password-confirm'),
    btnSendCode: $('btn-send-code'),
    btnLogin: $('btn-login'),
    btnPasswordLogin: $('btn-password-login'),
    btnRegister: $('btn-register'),
    btnRegisterBack: $('btn-register-back'),
    btnRegResend: $('btn-reg-resend'),
    regResendCountdown: $('reg-resend-countdown'),
    btnResendCode: $('btn-resend'),
    resendCountdown: $('resend-countdown'),
    codeTimer: $('code-timer'),
    errorToast: $('error-toast'),
    errorMessage: $('error-message'),
    errorClose: $('error-close'),
    successToast: $('success-toast'),
    successMessage: $('success-message'),
    btnBack: $('btn-back'),

    // 应用内容
    appContent: $('app-content'),
    userEmail: $('user-email'),
    userAvatar: $('user-avatar'),
    adminEntryLink: $('admin-entry-link'),
    logoutBtn: $('logout-btn'),

    // 图表
    chartSection: $('chart-section'),
    chartContainer: $('chart-container'),
    chartLoading: $('chart-loading'),
    chartLoadingText: $('chart-loading-text'),
    chartLoadingDetail: $('chart-loading-detail'),
    chartSymbolSelector: $('chart-symbol-selector'),
    chartRegionSelector: $('chart-region-selector'),
    chartTimeframeSelector: $('chart-timeframe-selector'),
    chartTimeframeTrigger: $('chart-timeframe-trigger'),
    chartTimeframeCurrent: $('chart-timeframe-current'),
    chartTimeframeMenu: $('chart-timeframe-menu'),
    chartSymbolBadge: $('chart-symbol-badge'),
    landscapeOverlay: $('landscape-overlay'),
    landscapeOverlayTitle: $('landscape-overlay-title'),
    landscapeOverlayDesc: $('landscape-overlay-desc'),
    landscapeCloseBtn: $('landscape-close-btn'),
    fullscreenBtn: $('fullscreen-btn'),
    fullscreenBtnText: $('fullscreen-btn-text'),
    headerFullscreenBtn: $('header-fullscreen-btn'),

    // 用户面板
    userPositionCard: $('user-position-card'),
    userHistory: $('user-history'),
    userTotalPnl: $('user-total-pnl'),
    userGlobalPnl: $('user-global-pnl'),
    strategyLibBtn: $('strategy-lib-btn'),
    strategyLibModal: $('strategy-lib-modal'),
    strategyUploadName: $('strategy-upload-name'),
    strategyUploadContent: $('strategy-upload-content'),
    strategyUploadStatus: $('strategy-upload-status'),
    strategyUploadPreview: $('strategy-upload-preview'),
    strategyUploadSubmit: $('strategy-upload-submit'),
    strategyUploadReset: $('strategy-upload-reset'),
    strategyStatsSummary: $('strategy-stats-summary'),
    strategyStatsList: $('strategy-stats-list'),
    strategyStatsDetail: $('strategy-stats-detail'),
    strategyStatsRefresh: $('strategy-stats-refresh'),

    // AI 面板
    aiTotalPnl: $('ai-total-pnl'),
    aiPositionCard: $('ai-position-card'),
    aiLog: $('ai-log'),
    aiLogCount: $('ai-log-count'),

    // 控制按钮
    btnLong: $('btn-long'),
    btnShort: $('btn-short'),
    btnClose: $('btn-close'),
    tradeQuantity: $('trade-quantity'),
    tradeQuantityPlus10: $('trade-quantity-plus-10'),

    // 积分
    creditsDisplay: $('credits-display'),
    creditsRemaining: $('credits-remaining'),
    creditsBtn: $('credits-btn'),
    claimFreeBtn: $('claim-free-btn'),

    // 状态
    connectionStatus: $('connection-status'),
    tickInfo: $('tick-info'),
  };
}

// =============================================================================
// 连接状态
// =============================================================================

const DEFAULT_TICK_INFO = '等待数据...';
const DEFAULT_CHART_LOADING_TITLE = '加载图表中...';
const DEFAULT_CHART_LOADING_DETAIL = '正在准备实时数据...';

function updateConnectionStatus(status, label = '') {
  const el = elements.connectionStatus;
  if (!el) return;

  const normalizedStatus = status === true
    ? 'connected'
    : (status === false ? 'disconnected' : String(status || 'disconnected'));
  const normalizedLabel = label || (normalizedStatus === 'connected'
    ? '已连接'
    : (normalizedStatus === 'loading' ? '加载中...' : '重连中...'));

  el.className = `status-indicator ${normalizedStatus}`;
  el.innerHTML = `<span class="status-dot"></span><span>${normalizedLabel}</span>`;
}

function updateTickInfo(message = DEFAULT_TICK_INFO) {
  if (elements.tickInfo) {
    elements.tickInfo.textContent = message || DEFAULT_TICK_INFO;
  }
}

function setChartLoadingVisible(visible, detail = DEFAULT_CHART_LOADING_DETAIL, title = DEFAULT_CHART_LOADING_TITLE) {
  if (elements.chartLoadingText) {
    elements.chartLoadingText.textContent = title || DEFAULT_CHART_LOADING_TITLE;
  }

  if (elements.chartLoadingDetail) {
    elements.chartLoadingDetail.textContent = detail || DEFAULT_CHART_LOADING_DETAIL;
  }

  if (elements.chartLoading) {
    elements.chartLoading.classList.add('hidden');
  }
}

function showChartLoading(detail = DEFAULT_CHART_LOADING_DETAIL, title = DEFAULT_CHART_LOADING_TITLE) {
  setChartLoadingVisible(true, detail, title);
}

function hideChartLoading() {
  setChartLoadingVisible(false);
}

function getReconnectDisplayDetail(message = '') {
  const normalizedMessage = String(message || '').toLowerCase();
  if (normalizedMessage.includes('init timeout') || normalizedMessage.includes('ready timeout')) {
    return '首批数据返回较慢，正在自动重试...';
  }
  if (normalizedMessage.includes('tick watchdog')) {
    return '实时数据更新暂时中断，正在重新连接...';
  }
  if (normalizedMessage.includes('connection error')) {
    return '实时连接断开，正在重新连接...';
  }
  return '连接暂不可用，正在尝试恢复...';
}

function setRealtimeReadyStatus(updatedAt = Date.now()) {
  state.realtimeReadyAt = updatedAt || Date.now();
  if (!isTradingChartHistoryReloading) {
    updateTickInfo(`实时更新中 · ${formatTime(updatedAt)}`);
    hideChartLoading();
  }
}

// =============================================================================
// 宸ュ叿鍑芥暟
// =============================================================================

function formatPrice(price) {
  if (!price && price !== 0) return '--';
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '00:00';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatEmail(email) {
  if (!email) return '--';
  const parts = email.split('@');
  if (parts[0].length > 12) {
    return parts[0].slice(0, 6) + '***@' + parts[1];
  }
  return email;
}

function formatSignedValue(value, digits = 2, suffix = '') {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return `0.00${suffix}`;
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(digits)}${suffix}`;
}

function formatDateTime(timestamp) {
  const numeric = Number(timestamp || 0);
  if (!numeric) return '--';
  return new Date(numeric).toLocaleString('zh-CN', { hour12: false });
}

function getSignedToneClass(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? 'positive' : numeric < 0 ? 'negative' : '';
}

// =============================================================================
// =============================================================================
// 屏幕方向检测
// =============================================================================

let isShowingLandscapeHint = false;
let mobileChartOverlayFrame = 0;
let hasAttemptedLandscapeAutoFullscreen = false;
let userDismissedFullscreenPrompt = false;
const LANDSCAPE_WIDTH = MOBILE_CHART_OVERLAY_BREAKPOINT; // 小于此宽度且竖屏时显示提示
const COMPACT_LANDSCAPE_HEIGHT = 560; // 高度小于此值时为紧凑横屏模式

function getDocumentFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
}

function isMobileChartViewport(width = window.innerWidth, height = window.innerHeight) {
  if (!isMobileDevice()) return false;
  const hasCoarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
  const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return Math.min(width, height) <= LANDSCAPE_WIDTH && (hasCoarsePointer || isTouchDevice);
}

function clearLandscapeOverlayStyles() {
  if (!elements.landscapeOverlay) return;
  elements.landscapeOverlay.style.top = '';
  elements.landscapeOverlay.style.left = '';
  elements.landscapeOverlay.style.width = '';
  elements.landscapeOverlay.style.height = '';
  elements.landscapeOverlay.dataset.overlayState = '';
}

function getRotateOverlayCopy() {
  const currentLanguage = window.i18n?.getCurrentLanguage?.() || document.documentElement.lang || 'en';
  const lang = MOBILE_CHART_ROTATE_COPY[currentLanguage]
    ? currentLanguage
    : String(currentLanguage || '').split('-')[0];
  return MOBILE_CHART_ROTATE_COPY[lang] || MOBILE_CHART_ROTATE_COPY.en;
}

/**
 * 统一更新横屏相关的 CSS 类
 * - is-landscape / is-portrait: 基础方向
 * - is-mobile-landscape: 移动设备横屏
 * - is-compact-landscape: 移动设备横屏且高度较小（适合 iPhone SE 等小屏设备）
 */
function updateOrientationClasses() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;
  const isMobile = isMobileChartViewport(width, height);
  const isCompactLandscape = isLandscape && isMobile && height <= COMPACT_LANDSCAPE_HEIGHT;
  const isMobileLandscape = isLandscape && isMobile;

  const html = document.documentElement;
  html.classList.toggle('is-landscape', isLandscape);
  html.classList.toggle('is-portrait', !isLandscape);
  html.classList.toggle('is-mobile-landscape', isMobileLandscape);
  html.classList.toggle('is-compact-landscape', isCompactLandscape);
}

/**
 * 检查是否应该显示全屏提示
 * iOS: 提示添加到主屏幕
 * Android/Desktop: 提示进入全屏
 */
function shouldShowFullscreenPrompt() {
  if (!isMobileDevice()) return false;
  if (!state.isLoggedIn) return false;
  const activeChartSection = getModeChartSection(state.currentMode) || elements.chartSection;
  if (!activeChartSection) return false;
  
  // iOS 设备检查是否已在主屏幕模式
  if (isIOSDevice()) {
    return !isStandaloneMode();
  }
  // Android/Desktop 检查是否已全屏
  return !getDocumentFullscreenElement();
}

/**
 * 检查是否为 iOS 设备
 */
function isIOSDevice() {
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * 检查是否在主屏幕模式（standalone）
 */
function isStandaloneMode() {
  return window.navigator.standalone === true 
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches;
}

function checkScreenOrientation() {
  if (mobileChartOverlayFrame) {
    return;
  }

  if (typeof window.requestAnimationFrame === 'function') {
    mobileChartOverlayFrame = window.requestAnimationFrame(() => {
      mobileChartOverlayFrame = 0;
      syncScreenOrientation();
    });
    return;
  }

  syncScreenOrientation();
}

function syncScreenOrientation() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;
  const isMobile = isMobileChartViewport(width, height);

  // 更新 CSS 类
  updateOrientationClasses();

  // 检查是否处于全屏状态
  const isFullscreen = Boolean(getDocumentFullscreenElement()) || isStandaloneMode();

  // 离开横屏时重置用户手动关闭标记
  if (!isLandscape || !isMobile || !state.isLoggedIn) {
    userDismissedFullscreenPrompt = false;
    hasAttemptedLandscapeAutoFullscreen = false;
  }

  // 检查是否需要显示提示
  const needsPrompt = shouldShowFullscreenPrompt();
  const overlayState = !isLandscape ? 'rotate' : !isFullscreen ? 'fullscreen' : '';

  if (!needsPrompt || !elements.landscapeOverlay) {
    isShowingLandscapeHint = false;
    elements.landscapeOverlay?.classList.add('hidden');
    clearLandscapeOverlayStyles();
    return;
  }

  if (!overlayState) {
    isShowingLandscapeHint = false;
    elements.landscapeOverlay.classList.add('hidden');
    clearLandscapeOverlayStyles();
    return;
  }

  // 用户已手动关闭全屏提示（或全屏失败后点了「我知道了」），不再自动弹出
  if (overlayState === 'fullscreen' && userDismissedFullscreenPrompt) {
    isShowingLandscapeHint = false;
    elements.landscapeOverlay.classList.add('hidden');
    clearLandscapeOverlayStyles();
    return;
  }

  isShowingLandscapeHint = true;
  elements.landscapeOverlay.dataset.overlayState = overlayState;
  elements.landscapeOverlay.classList.remove('hidden');

  // 应用翻译
  applyFullscreenPromptTranslations(overlayState);
  updateFullscreenButton();

  if (overlayState === 'fullscreen' && !hasAttemptedLandscapeAutoFullscreen) {
    hasAttemptedLandscapeAutoFullscreen = true;
    tryAutoFullscreen();
  }

  if (overlayState !== 'fullscreen') {
    hasAttemptedLandscapeAutoFullscreen = false;
  }
}

// 应用全屏提示翻译（已用 data-i18n 属性 + MutationObserver 自动处理，保留作为手动调用入口）
function applyFullscreenPromptTranslations(overlayState = 'fullscreen') {
  const titleEl = elements.landscapeOverlayTitle;
  const descEl = elements.landscapeOverlayDesc;
  if (!titleEl || !descEl) return;

  if (overlayState === 'rotate') {
    const copy = getRotateOverlayCopy();
    titleEl.textContent = copy.title;
    descEl.textContent = copy.desc;
    return;
  }

  // iOS 设备显示"添加到主屏幕"提示
  if (isIOSDevice()) {
    titleEl.textContent = window.i18n?.t?.('fullscreen.iosTitle') || '添加到主屏幕';
    descEl.textContent = window.i18n?.t?.('fullscreen.iosDesc') || '请点击底部分享按钮，然后选择"添加到主屏幕"';
    return;
  }

  const t = window.i18n?.t ?? ((key) => {
    if (key === 'fullscreen.title') return 'Please Use Fullscreen';
    if (key === 'fullscreen.desc') return 'For the best browsing experience,\nplease click the button below to enter fullscreen';
    return key;
  });
  titleEl.textContent = t('fullscreen.title');
  descEl.textContent = t('fullscreen.desc');
}

// 尝试自动全屏（仅 Android/Desktop，无用户手势会被浏览器拒绝，正常行为）
function tryAutoFullscreen() {
  if (isIOSDevice()) return;
  if (getDocumentFullscreenElement() || isStandaloneMode()) return;
  requestBrowserFullscreen().catch(() => { /* expected: requires user gesture */ });
}

// 全屏切换函数
function toggleFullscreen() {
  // iOS 设备提示添加到主屏幕
  if (isIOSDevice() && !isStandaloneMode()) {
    applyFullscreenPromptTranslations('fullscreen');
    elements.landscapeOverlay?.classList.remove('hidden');
    return;
  }

  if (!getDocumentFullscreenElement()) {
    // 立即隐藏遮罩，避免用户感知延迟
    elements.landscapeOverlay?.classList.add('hidden');
    requestBrowserFullscreen().then(() => {
      // 验证是否真正进入了全屏
      if (!getDocumentFullscreenElement() && !isStandaloneMode()) {
        // 浏览器 API 返回成功但实际未进入全屏
        showFullscreenUnavailable();
        return;
      }
      updateFullscreenButton();
      checkScreenOrientation();
    }).catch(() => {
      // 全屏请求失败 → 显示 fullscreen-unavailable 提示 + 关闭按钮
      showFullscreenUnavailable();
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch?.(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

/**
 * 依次尝试多个元素的 requestFullscreen，解决部分浏览器对 documentElement 不支持的问题
 */
async function requestBrowserFullscreen() {
  const targets = [document.documentElement, document.body];
  for (const elem of targets) {
    try {
      if (typeof elem.requestFullscreen === 'function') {
        await elem.requestFullscreen();
        // 验证是否真正进入全屏
        if (getDocumentFullscreenElement()) return;
        continue; // 浏览器 resolve 了但实际未生效，尝试下一个目标
      }
      if (typeof elem.webkitRequestFullscreen === 'function') {
        elem.webkitRequestFullscreen();
        // webkitRequestFullscreen 不返回 Promise，等待一帧确认
        await new Promise((r) => setTimeout(r, 200));
        if (getDocumentFullscreenElement()) return;
      }
    } catch (_) { /* try next target */ }
  }
  throw new Error('Fullscreen not supported');
}

/**
 * 全屏不可用时显示提示并提供关闭按钮
 */
function showFullscreenUnavailable() {
  if (!elements.landscapeOverlay) return;
  elements.landscapeOverlay.dataset.overlayState = 'fullscreen-unavailable';
  elements.landscapeOverlay.classList.remove('hidden');
  const t = window.i18n?.t ?? ((k) => k);
  if (elements.landscapeOverlayTitle) {
    elements.landscapeOverlayTitle.textContent = t('fullscreen.notSupported');
  }
  if (elements.landscapeOverlayDesc) {
    elements.landscapeOverlayDesc.textContent = '';
  }
  // 显示「我知道了」按钮
  const dismissBtn = document.getElementById('landscape-dismiss-btn');
  if (dismissBtn) dismissBtn.classList.remove('hidden');
}

// 更新全屏按钮图标
function updateFullscreenButton() {
  const btn = elements.fullscreenBtn;
  const headerBtn = elements.headerFullscreenBtn;
  const isFs = Boolean(getDocumentFullscreenElement()) || isStandaloneMode();
  const t = window.i18n?.t ?? ((k) => k);

  // 更新弹窗全屏按钮文字（由 data-i18n 属性自动翻译）
  if (btn && elements.fullscreenBtnText) {
    const key = isFs ? 'fullscreen.exitBtn' : 'fullscreen.btn';
    elements.fullscreenBtnText.textContent = t(key);
  }

  // 更新顶部导航栏全屏按钮
  if (headerBtn) {
    const key = isFs ? 'fullscreen.exitBtn' : 'fullscreen.btn';
    headerBtn.title = t(key);
    if (isFs) {
      headerBtn.classList.add('fullscreen-active');
    } else {
      headerBtn.classList.remove('fullscreen-active');
    }
  }
}

// 初始化横屏/方向监听器（合并多个事件源，使用防抖减少重复调用）
function initOrientationListener() {
  // 初始检查
  checkScreenOrientation();

  // 统一的布局刷新处理器（带防抖）
  let layoutRefreshTimer = null;
  const handleLayoutChange = () => {
    checkScreenOrientation();
    if (state.isLoggedIn) {
      // 使用防抖避免重复刷新
      if (layoutRefreshTimer) clearTimeout(layoutRefreshTimer);
      layoutRefreshTimer = setTimeout(() => {
        layoutRefreshTimer = null;
        scheduleModeChartLayoutRefresh(state.currentMode, { forceViewport: true });
      }, 150);
    }
  };

  // 合并 resize 和 orientationchange 事件
  window.addEventListener('resize', handleLayoutChange);
  window.addEventListener('orientationchange', () => {
    // orientationchange 事件需要延迟以等待尺寸更新
    setTimeout(handleLayoutChange, 100);
  });

  // 监听屏幕方向变化（移动设备）
  if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
    screen.orientation.addEventListener('change', () => {
      setTimeout(handleLayoutChange, 100);
    });
  }

  // 监听全屏状态变化
  const handleFullscreenChange = () => {
    updateFullscreenButton();
    checkScreenOrientation();
    if (state.isLoggedIn) {
      scheduleModeChartLayoutRefresh(state.currentMode, { forceViewport: true });
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('msfullscreenchange', handleFullscreenChange);

  // 全屏按钮点击事件
  const fullscreenBtn = elements.fullscreenBtn;
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  // 顶部导航栏全屏按钮
  const headerFullscreenBtn = elements.headerFullscreenBtn;
  if (headerFullscreenBtn) {
    headerFullscreenBtn.addEventListener('click', toggleFullscreen);
    // 初始化按钮状态
    updateFullscreenButton();
  }

  updateFullscreenButton();
}

function setLoading(btn, loading) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function showError(message) {
  // 显示错误消息
  if (elements.errorToast) {
    elements.errorMessage.textContent = message;
    elements.errorToast.classList.remove('hidden');
    elements.errorToast.classList.add('show');
    setTimeout(() => {
      hideError();
    }, 5000);
  } else {
    alert(message);
  }
}

function hideError() {
  if (elements.errorToast) {
    elements.errorToast.classList.remove('show');
  }
}

function showSuccessToast(message) {
  if (elements.successToast) {
    elements.successMessage.textContent = message;
    elements.successToast.classList.add('show');
    setTimeout(() => {
      elements.successToast.classList.remove('show');
    }, 3000);
  }
}

/**
 * 显示提示信息
 */
function showToast(message, type = 'info') {
  console.log(`[${type}] ${message}`);
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  return headers;
}

function setAuthCookie(token) {
  try {
    if (!token) return;
    document.cookie = `TdbToken=${encodeURIComponent(token)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {
    console.error('Failed to persist auth cookie:', e);
  }
}

function clearAuthCookie() {
  try {
    document.cookie = 'TdbToken=; path=/; max-age=0; SameSite=Lax';
  } catch (e) {
    console.error('Failed to clear auth cookie:', e);
  }
}

async function refreshUserPositionFromApi() {
  if (!state.isLoggedIn || !state.token) {
    return state.userPosition;
  }
  try {
    const response = await fetch('/api/positions', {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (response.status === 401 || data?.unauthorized) {
      return state.userPosition;
    }
    if (!data || typeof data !== 'object') {
      return state.userPosition;
    }
    syncPositionsFromPayload(data);
    const tradingChartManager = getTradingChartManager();
    if (tradingChartManager) {
      syncTradingChartDecorations(tradingChartManager);
    }
    updateUserPositionCard();
    updateAIPositionCard();
    updateTradeButtons();
    return state.userPosition;
  } catch (e) {
    console.error('Failed to refresh user position from API:', e);
    return state.userPosition;
  }
}

// =============================================================================
// 认证模块
// =============================================================================

/**
 * 检查本地存储的登录状态
 */
function loadAuthState() {
  try {
  const token = localStorage.getItem('TdbToken');
  const userStr = localStorage.getItem('TdbUser');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      state.token = token;
      state.user = user;
      state.isLoggedIn = true;
      setAuthCookie(token);
      return true;
    }
  } catch (e) {
    console.error('Failed to load auth state:', e);
  }
  return false;
}

/**
 * 保存登录状态到本地存储
 */
function saveAuthState(token, user) {
  try {
  localStorage.setItem('TdbToken', token);
  localStorage.setItem('TdbUser', JSON.stringify(user));
  setAuthCookie(token);
  } catch (e) {
    console.error('Failed to save auth state:', e);
  }
}

/**
 * 清除登录状态
 */
function clearAuthState() {
  try {
  localStorage.removeItem('TdbToken');
  localStorage.removeItem('TdbUser');
  clearAuthCookie();
  } catch (e) {
    console.error('Failed to clear auth state:', e);
  }
  state.token = null;
  state.user = null;
  state.isLoggedIn = false;
  state.userTotalPnl = 0;
}

function getUserScopedStorageKey(baseKey, user = state.user) {
  const email = String(user?.email || '').trim().toLowerCase();
  return email ? `${baseKey}:${email}` : '';
}

function clearCurrentUserSessionState() {
  setUserPositionsState([]);
  state.userHistory = [];
  state.userMarkers = [];
  const tradingChartManager = getTradingChartManager();
  if (tradingChartManager) {
    tradingChartManager.clearUserMarkers();
    tradingChartManager.setUserPosition(null);
  }
  updateUserHistory();
  updateUserPnLStats();
  updateUserPositionCard();
  updateTradeButtons();
}

function hydrateCurrentUserTradingState() {
  loadUserHistory();
  loadUserMarkers();
  restoreUserMarkers();
}

/**
 * 显示登录界面
 */
function showLogin() {
  clearPendingChartLayoutRefreshes();
  if (elements.loginPage) {
    elements.loginPage.classList.remove('hidden');
  }
  if (elements.appContent) {
    elements.appContent.classList.add('hidden');
  }
  hideError();
  // 重置为默认的密码登录模式（switchLoginMode 会清掉所有步骤的 active）
  state.pendingEmail = null;
  switchLoginMode('password');
  // 清空所有表单输入
  if (elements.emailInput) {
    elements.emailInput.value = '';
    elements.emailInput.disabled = false;
  }
  if (elements.codeInput) {
    elements.codeInput.value = '';
  }
  if (elements.passwordEmailInput) {
    elements.passwordEmailInput.value = '';
  }
  if (elements.passwordInput) {
    elements.passwordInput.value = '';
  }
  if (elements.regCodeInput) {
    elements.regCodeInput.value = '';
  }
  if (elements.regPasswordInput) {
    elements.regPasswordInput.value = '';
  }
  if (elements.regPasswordConfirm) {
    elements.regPasswordConfirm.value = '';
  }
  const strengthBox = document.getElementById('password-strength');
  if (strengthBox) {
    strengthBox.classList.add('hidden');
  }
  // 重置验证码点
  updateCodeDots('');
  // 重置倒计时
  if (resendTimer) {
    clearInterval(resendTimer);
    resendTimer = null;
  }
  if (elements.resendCountdown) {
    elements.resendCountdown.textContent = '60';
  }
  if (elements.btnResendCode) {
    elements.btnResendCode.disabled = true;
  }
  syncAdminEntryVisibility();
  updateConnectionStatus('disconnected', '未连接');
  updateTickInfo(DEFAULT_TICK_INFO);
  hideChartLoading();
  checkScreenOrientation();
}

function syncAdminEntryVisibility() {
  const shouldShow = !!state.user?.isAdmin;
  if (elements.adminEntryLink) {
    elements.adminEntryLink.classList.toggle('hidden', !shouldShow);
  }
}

/**
 * 显示应用界面
 */
function showApp() {
  if (elements.loginPage) {
    elements.loginPage.classList.add('hidden');
  }
  if (elements.appContent) {
    elements.appContent.classList.remove('hidden');
  }
  ensureChartManagersReady();

  // 更新用户信息显示
  if (state.user && elements.userEmail) {
    elements.userEmail.textContent = formatEmail(state.user.maskedEmail || state.user.email);
  }
  syncAdminEntryVisibility();
  updateConnectionStatus('loading', '恢复中');
  updateTickInfo('正在恢复你的交易会话...');
  showChartLoading('正在恢复实时行情与图表数据...');
  checkScreenOrientation();
  scheduleModeChartLayoutRefresh(state.currentMode, { forceViewport: true });
}

async function refreshCurrentUserProfile() {
  if (!state.token) return true;
  try {
    const response = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (response.status === 401 || data.authorized === false) {
      logout();
      return false;
    }

    if (data.authorized && data.user) {
      state.user = data.user;
      saveAuthState(state.token, data.user);
      syncAdminEntryVisibility();
    }
  } catch (err) {
    console.error('Refresh current user error:', err);
  }
  return true;
}

/**
 * 发送验证码
 */
async function sendVerifyCode() {
  // 获取邮箱输入框元素和值
  const emailInputEl = document.getElementById('email-input');
  const email = emailInputEl?.value.trim();

  const i18n = window.i18n || {};
  const t = i18n.t || ((k) => k);

  if (!email) {
    // 输入框红框提示
    if (emailInputEl) {
      emailInputEl.style.borderColor = 'rgba(255, 59, 92, 0.8)';
      emailInputEl.style.boxShadow = '0 0 0 4px rgba(255, 59, 92, 0.15)';
      setTimeout(() => {
        emailInputEl.style.borderColor = '';
        emailInputEl.style.boxShadow = '';
      }, 3000);
    }
    showTempError(t('error.emailRequired'));
    return;
  }

  // 简单邮箱格式验证
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    showTempError(t('error.invalidEmail'));
    return;
  }

  hideError();
  setLoading(elements.btnSendCode, true);

  try {
    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    // 先获取响应文本用于调试
    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[Login] send-code response parse failed');
      showError(t('error.serverFormat'));
      return;
    }

    if (!response.ok) {
      showError(data.error || t('error.sendFailed'));
      return;
    }

    if (data.success) {
      // 保存邮箱地址到 state，供验证码登录/注册使用
      state.pendingEmail = email;

      // 隐藏第一步
      if (elements.stepEmail) {
        elements.stepEmail.classList.remove('active');
      }

      // 隐藏邮箱中间部分
      const [local, domain] = email.split('@');
      const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : local;
      const maskedText = maskedLocal + '@' + domain;

      if (state.loginMode === 'register') {
        // 注册：进入设置密码步骤
        if (elements.stepRegister) {
          elements.stepRegister.classList.add('active');
        }
        if (elements.regMaskedEmail) {
          elements.regMaskedEmail.textContent = maskedText;
        }
        if (elements.regCodeInput) {
          elements.regCodeInput.focus();
        }
        startRegResendCountdown();
      } else {
        // 验证码登录：进入验证码步骤
        if (elements.stepCode) {
          elements.stepCode.classList.add('active');
        }
        if (elements.maskedEmail) {
          elements.maskedEmail.textContent = maskedText;
        }
        if (elements.codeInput) {
          elements.codeInput.focus();
        }
        startResendCountdown();
      }
      startCodeTimer();

      showSuccessToast(t('success.codeSent'));
    } else {
      showTempError(data.error || t('error.sendFailed'));
    }
  } catch (e) {
    console.error('Send code error:', e);
    showTempError(t('error.networkError'));
  } finally {
    setLoading(elements.btnSendCode, false);
  }
}

/**
 * 验证登录
 */
async function verifyLogin() {
  const t = window.i18n?.t ?? ((k) => k);
  // 使用保存的邮箱地址，而不是从 maskedEmail 获取
  const email = state.pendingEmail;
  const code = elements.codeInput?.value.trim();

  if (!email) {
    showTempError(t('error.emailLost'));
    return;
  }

  if (!code || code.length !== 6) {
    showTempError(t('error.codeLength'));
    return;
  }

  hideError();
  setLoading(elements.btnLogin, true);

  try {
    const requestBody = { email, code };

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[Login] login response parse failed');
      showError(t('error.serverFormat'));
      setLoading(elements.btnLogin, false);
      return;
    }

    if (data.success && data.token) {
      handleAuthSuccess(data);
    } else {
      handleAuthFailure(data, t('error.verifyFailed'));
    }
  } catch (e) {
    console.error('Login error:', e);
    showTempError(t('error.networkError'));
  } finally {
    setLoading(elements.btnLogin, false);
  }
}

/**
 * 临时错误提示（统一走底部 toast）
 */
function showTempError(message, duration = 3000) {
  showError(message);
}

/**
 * 登录/注册成功后的统一处理
 */
function handleAuthSuccess(data) {
  state.token = data.token;
  state.user = data.user;
  state.isLoggedIn = true;
  saveAuthState(data.token, data.user);

  showApp();
  hydrateCurrentUserTradingState();
  updateUserHistory();
  updateUserPnLStats();

  initSSE();
  void restorePrimaryChart().catch((error) => {
    console.error('初始主图历史恢复失败:', error);
  });
  fetchCredits().catch(err => console.error('初始获取积分失败:', err));
  fetchUserSummary().catch(err => console.error('初始获取用户摘要失败:', err));
}

/**
 * 登录/注册失败的统一处理（含锁定与引导注册）
 */
function handleAuthFailure(data, fallbackMessage) {
  const t = window.i18n?.t ?? ((k) => k);
  if (data.locked && data.lockedUntil) {
    const remainingSeconds = Math.ceil((data.lockedUntil - Date.now()) / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    showTempError(`${t('error.locked')} ${minutes}m ${seconds}s ${t('error.after')}`, 5000);
    startLockCountdown(remainingSeconds);
    return;
  }
  showTempError(data.error || fallbackMessage);
  // 未注册：保留验证码，直接进入注册第二步设置密码
  if (data.needRegister) {
    const pendingCode = elements.codeInput?.value.trim() || '';
    switchLoginMode('register');
    if (state.pendingEmail && elements.regMaskedEmail) {
      const [local, domain] = state.pendingEmail.split('@');
      const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : local;
      elements.regMaskedEmail.textContent = maskedLocal + '@' + domain;
    }
    elements.stepEmail?.classList.remove('active');
    elements.stepRegister?.classList.add('active');
    if (elements.regCodeInput && pendingCode) {
      elements.regCodeInput.value = pendingCode;
    }
    elements.regPasswordInput?.focus();
  }
}

/**
 * 密码登录
 */
async function passwordLogin() {
  const t = window.i18n?.t ?? ((k) => k);
  const email = elements.passwordEmailInput?.value.trim();
  const password = elements.passwordInput?.value || '';

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    showTempError(t('error.invalidEmail'));
    return;
  }
  if (!password) {
    showTempError(t('error.passwordRequired'));
    return;
  }

  hideError();
  setLoading(elements.btnPasswordLogin, true);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[Login] password login response parse failed');
      showError(t('error.serverFormat'));
      return;
    }

    if (data.success && data.token) {
      handleAuthSuccess(data);
    } else {
      handleAuthFailure(data, t('error.loginFailed'));
    }
  } catch (e) {
    console.error('Password login error:', e);
    showTempError(t('error.networkError'));
  } finally {
    setLoading(elements.btnPasswordLogin, false);
  }
}

/**
 * 注册：验证码 + 设置密码
 */
async function registerAndLogin() {
  const t = window.i18n?.t ?? ((k) => k);
  const email = state.pendingEmail;
  const code = elements.regCodeInput?.value.trim();
  const password = elements.regPasswordInput?.value || '';
  const confirmPassword = elements.regPasswordConfirm?.value || '';

  if (!email) {
    showTempError(t('error.emailLost'));
    return;
  }
  if (!code || code.length !== 6) {
    showTempError(t('error.codeLength'));
    return;
  }
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    showTempError(t('error.passwordWeak'));
    return;
  }
  if (password !== confirmPassword) {
    showTempError(t('error.passwordMismatch'));
    return;
  }

  hideError();
  setLoading(elements.btnRegister, true);

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[Register] register response parse failed');
      showError(t('error.serverFormat'));
      return;
    }

    if (data.success && data.token) {
      handleAuthSuccess(data);
    } else {
      handleAuthFailure(data, t('error.registerFailed'));
      // 已注册：自动切到密码登录
      if (data.alreadyRegistered) {
        switchLoginMode('password');
        if (elements.passwordEmailInput) {
          elements.passwordEmailInput.value = email;
        }
      }
    }
  } catch (e) {
    console.error('Register error:', e);
    showTempError(t('error.networkError'));
  } finally {
    setLoading(elements.btnRegister, false);
  }
}

/**
 * 切换登录模式（password | code | register）
 */
function switchLoginMode(mode) {
  state.loginMode = mode;
  hideError();

  document.querySelectorAll('#login-tabs .login-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.loginMode === mode);
  });

  [elements.stepPassword, elements.stepEmail, elements.stepCode, elements.stepRegister].forEach((step) => {
    step?.classList.remove('active');
  });

  if (mode === 'password') {
    elements.stepPassword?.classList.add('active');
    // 同步另一侧已输入的邮箱
    if (elements.passwordEmailInput && !elements.passwordEmailInput.value && elements.emailInput?.value) {
      elements.passwordEmailInput.value = elements.emailInput.value;
    }
    elements.passwordEmailInput?.focus();
  } else {
    // code / register 共用邮箱输入步骤
    elements.stepEmail?.classList.add('active');
    if (elements.emailInput && !elements.emailInput.value && elements.passwordEmailInput?.value) {
      elements.emailInput.value = elements.passwordEmailInput.value;
    }
    elements.emailInput?.focus();
  }
}

/**
 * 锁定倒计时
 */
let lockTimer = null;
function startLockCountdown(seconds) {
  const t = window.i18n?.t ?? ((k) => k);
  if (lockTimer) {
    clearInterval(lockTimer);
  }

  if (elements.btnLogin) {
    elements.btnLogin.disabled = true;
  }
  if (elements.codeInput) {
    elements.codeInput.disabled = true;
  }

  function updateCountdown() {
    seconds--;
    if (seconds <= 0) {
      clearInterval(lockTimer);
      lockTimer = null;
      if (elements.btnLogin) {
        elements.btnLogin.disabled = false;
      }
      if (elements.codeInput) {
        elements.codeInput.disabled = false;
      }
      showError(t('toast.unlocked'));
      return;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
    if (elements.errorMessage) {
      elements.errorMessage.textContent = `${t('error.locked')} ${timeStr} ${t('error.after')}`;
    }
  }

  updateCountdown();
  lockTimer = setInterval(updateCountdown, 1000);
}

/**
 * 重新发送验证码
 */
async function resendCode(forRegister = false) {
  const t = window.i18n?.t ?? ((k) => k);
  const email = elements.emailInput?.value.trim() || state.pendingEmail;
  if (!email) return;

  const btn = forRegister ? elements.btnRegResend : elements.btnResendCode;

  hideError();
  if (btn) {
    btn.disabled = true;
  }

  try {
    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (data.success) {
      if (forRegister) {
        startRegResendCountdown();
      } else {
        startResendCountdown();
      }
      startCodeTimer();
      showSuccessToast(t('success.resendSuccess'));
    } else {
      showError(data.error || t('error.resendFailed'));
      if (btn) {
        btn.disabled = false;
      }
    }
  } catch (e) {
    console.error('Resend code error:', e);
      showError(t('error.networkError'));
    if (btn) {
      btn.disabled = false;
    }
  }
}

/**
 * 验证码输入框变化处理
 */
function handleCodeInput(e) {
  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
  e.target.value = value;
  updateCodeDots(value);

  // 如果输入了 6 位数字，自动提交
  if (value.length === 6) {
    setTimeout(() => verifyLogin(), 100);
  }
}

/**
 * 更新验证码点显示
 */
function updateCodeDots(value) {
  if (!elements.codeDots) return;
  const dots = elements.codeDots.querySelectorAll('.dot');
  dots.forEach((dot, i) => {
    if (i < value.length) {
      dot.classList.add('filled');
    } else {
      dot.classList.remove('filled');
    }
  });
}

/**
 * 验证码计时器
 */
let codeTimerInterval = null;
function startCodeTimer() {
  const t = window.i18n?.t ?? ((k) => k);
  if (codeTimerInterval) {
    clearInterval(codeTimerInterval);
  }

  let seconds = 59;
  updateTimerDisplay(seconds);

  codeTimerInterval = setInterval(() => {
    seconds--;
    updateTimerDisplay(seconds);

    if (seconds <= 0) {
      clearInterval(codeTimerInterval);
      codeTimerInterval = null;
      if (elements.codeTimer) {
        elements.codeTimer.textContent = t('error.codeExpired');
        elements.codeTimer.classList.add('warning');
      }
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  if (elements.codeTimer) {
    elements.codeTimer.textContent = seconds + 's';
    if (seconds <= 10) {
      elements.codeTimer.classList.add('warning');
    } else {
      elements.codeTimer.classList.remove('warning');
    }
  }
}

/**
 * 发送验证码倒计时
 */
let resendTimer = null;
function startResendCountdown() {
  const t = window.i18n?.t ?? ((k) => k);
  let seconds = 60;
  if (elements.resendCountdown) {
    elements.resendCountdown.textContent = seconds;
  }
  if (elements.btnResendCode) {
    elements.btnResendCode.disabled = true;
  }

  if (resendTimer) {
    clearInterval(resendTimer);
  }

  resendTimer = setInterval(() => {
    seconds--;
    if (elements.resendCountdown) {
      elements.resendCountdown.textContent = seconds;
    }
    if (seconds <= 0) {
      clearInterval(resendTimer);
      resendTimer = null;
      if (elements.btnResendCode) {
        elements.btnResendCode.disabled = false;
        elements.btnResendCode.innerHTML = t('login.resend');
      }
    }
  }, 1000);
}

/**
 * 注册验证码重发倒计时
 */
let regResendTimer = null;
function startRegResendCountdown() {
  const t = window.i18n?.t ?? ((k) => k);
  let seconds = 60;
  if (elements.regResendCountdown) {
    elements.regResendCountdown.textContent = seconds;
  }
  if (elements.btnRegResend) {
    elements.btnRegResend.disabled = true;
  }

  if (regResendTimer) {
    clearInterval(regResendTimer);
  }

  regResendTimer = setInterval(() => {
    seconds--;
    if (elements.regResendCountdown) {
      elements.regResendCountdown.textContent = seconds;
    }
    if (seconds <= 0) {
      clearInterval(regResendTimer);
      regResendTimer = null;
      if (elements.btnRegResend) {
        elements.btnRegResend.disabled = false;
        elements.btnRegResend.innerHTML = t('login.resend');
      }
    }
  }, 1000);
}

/**
 * 退出登录
 */
function logout() {
  // 关闭 SSE 连接
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  isConnectionReady = false;
  isInitialSnapshotReady = false;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (initTimeout) {
    clearTimeout(initTimeout);
    initTimeout = null;
  }
  if (tickWatchdog) {
    clearInterval(tickWatchdog);
    tickWatchdog = null;
  }
  reconnectAttempts = 0;
  lastTickAt = 0;
  state.isInitialized = false;
  hideStrategyLibModal();
  state.userStrategies = [];
  state.userStrategySummary = { total: 0, enabled: 0, profitable: 0, losing: 0, totalTrades: 0 };
  state.selectedUserStrategyId = null;
  state.selectedUserStrategyDetail = null;
  clearAuthState();
  clearCurrentUserSessionState();
  showLogin();
}

// =============================================================================
// SSE 连接
// =============================================================================

let eventSource = null;
let reconnectTimeout = null;
let isConnectionReady = false;
let isInitialSnapshotReady = false;
let initTimeout = null;
let reconnectAttempts = 0;
let lastTickAt = 0;
let lastStreamActivityAt = 0;
let tickWatchdog = null;
const MAX_RECONNECT_DELAY = 30000; // 最大重连间隔 30 秒
const TICK_STALE_THRESHOLD = 30000;
const SSE_INIT_TIMEOUT = 8000;
const SSE_RECONNECT_LOG_THROTTLE = 10000;
let lastSSEReconnectLogAt = 0;
let lastSSEReconnectMessage = '';

function recordSSEActivity(type = 'stream', now = Date.now()) {
  const effectiveNow = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  lastStreamActivityAt = effectiveNow;
  if (type === 'tick') {
    lastTickAt = effectiveNow;
  }
}

function classifySSETickHealth({
  now = Date.now(),
  lastTick = lastTickAt,
  lastStreamActivity = lastStreamActivityAt,
  threshold = TICK_STALE_THRESHOLD,
} = {}) {
  const effectiveNow = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const effectiveThreshold = Math.max(0, Number(threshold || 0));
  const effectiveLastTick = Number(lastTick || 0);
  const effectiveLastStreamActivity = Number(lastStreamActivity || 0);

  if (!effectiveLastTick) {
    return 'uninitialized';
  }
  if (effectiveNow - effectiveLastTick < effectiveThreshold) {
    return 'healthy';
  }
  if (effectiveLastStreamActivity && effectiveNow - effectiveLastStreamActivity < effectiveThreshold) {
    return 'tick_stalled';
  }
  return 'stream_stalled';
}

if (window.__TdbTestHooks) {
  window.__TdbTestHooks.classifySSETickHealth = classifySSETickHealth;
}

function clearSSEInitTimeout() {
  if (initTimeout) {
    clearTimeout(initTimeout);
    initTimeout = null;
  }
}

function clearSSETimers() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  clearSSEInitTimeout();
}

function stopTickWatchdog() {
  if (tickWatchdog) {
    clearInterval(tickWatchdog);
    tickWatchdog = null;
  }
}

function scheduleSSEReconnect(message, level = 'warn') {
  const now = Date.now();
  const hasPendingReconnect = !!reconnectTimeout;
  const shouldLog = !!message && (
    !hasPendingReconnect
    || message !== lastSSEReconnectMessage
    || now - lastSSEReconnectLogAt >= SSE_RECONNECT_LOG_THROTTLE
  );
  if (shouldLog) {
    console[level](message);
    lastSSEReconnectLogAt = now;
    lastSSEReconnectMessage = message;
  }

  stopTickWatchdog();
  clearSSEInitTimeout();
  isConnectionReady = false;
  isInitialSnapshotReady = false;
  lastTickAt = 0;
  lastStreamActivityAt = 0;
  updateConnectionStatus('disconnected', '重试中');
  const reconnectDetail = getReconnectDisplayDetail(message);
  updateTickInfo(reconnectDetail);
  showChartLoading(reconnectDetail);

  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (!state.isLoggedIn) {
    return;
  }

  if (hasPendingReconnect) {
    return;
  }

  const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    if (state.isLoggedIn) {
      initSSE();
    }
  }, delay);
}

function startTickWatchdog() {
  stopTickWatchdog();
  tickWatchdog = setInterval(() => {
    if (!state.isLoggedIn || !eventSource || !isConnectionReady || !isInitialSnapshotReady || !lastTickAt) {
      return;
    }

    const tickHealth = classifySSETickHealth();
    if (tickHealth === 'healthy' || tickHealth === 'uninitialized') {
      return;
    }

    scheduleSSEReconnect(
      tickHealth === 'tick_stalled'
        ? 'SSE tick stalled while heartbeat is still alive, reconnecting...'
        : 'SSE tick watchdog triggered, reconnecting...'
    );
  }, 3000);
}

function buildSSEStreamUrl() {
  const params = new URLSearchParams({
    timeframe: normalizeChartTimeframe(state.chartTimeframe),
    symbol: normalizeChartSymbol(state.chartSymbol),
    count: String(CHART_HISTORY_LIMIT),
  });
  return `/api/stream?${params.toString()}`;
}

function initSSE() {
  if (eventSource) {
    eventSource.close();
  }
  eventSource = null;
  clearSSETimers();
  stopTickWatchdog();
  isConnectionReady = false;
  isInitialSnapshotReady = false;
  lastTickAt = 0;
  lastStreamActivityAt = 0;

  updateConnectionStatus('loading', '连接中...');
  updateTickInfo('正在建立实时连接...');
  showChartLoading(`正在连接 ${getChartRequestLabel(state.chartTimeframe, state.chartSymbol)} 实时数据...`);

  if (initTimeout) {
    clearTimeout(initTimeout);
    initTimeout = null;
  }

  try {
    if (state.token) {
      setAuthCookie(state.token);
    }
    eventSource = new EventSource(buildSSEStreamUrl());
    const source = eventSource;

    eventSource.addEventListener('ready', (e) => {
      if (eventSource !== source) return;
      try {
        JSON.parse(e.data);
      } catch (error) {
        console.error('[SSE ready] parse error:', error);
      }
      recordSSEActivity('stream');
      isConnectionReady = true;
      clearSSEInitTimeout();
      updateConnectionStatus('connected', '同步中');
      updateTickInfo('实时连接已建立，正在同步首批数据...');
      showChartLoading('实时连接已建立，正在同步首批图表与持仓...');
    });

    initTimeout = setTimeout(() => {
      if (!isConnectionReady && eventSource === source) {
        scheduleSSEReconnect('SSE ready timeout, reconnecting...', 'error');
      }
    }, SSE_INIT_TIMEOUT);

    eventSource.addEventListener('init', (e) => {
      if (eventSource !== source) return;
      const data = JSON.parse(e.data);
      isConnectionReady = true;
      isInitialSnapshotReady = true;
      recordSSEActivity('tick');
      reconnectAttempts = 0;
      lastSSEReconnectLogAt = 0;
      lastSSEReconnectMessage = '';
      clearSSEInitTimeout();
      startTickWatchdog();
      updateConnectionStatus(true);
      updateTickInfo('已收到首批数据，正在同步图表与持仓...');
      showChartLoading('已收到首批数据，正在同步图表与持仓...');
      handleInit(data);
    });

    eventSource.addEventListener('ping', () => {
      if (eventSource !== source) return;
      recordSSEActivity('stream');
    });

    eventSource.addEventListener('tick', (e) => {
      if (eventSource !== source) return;
      recordSSEActivity('stream');
      try {
        const data = JSON.parse(e.data);
        handleTick(data);
        recordSSEActivity('tick');
      } catch (error) {
        console.error('[SSE tick] handle error:', error);
      }
    });

    eventSource.addEventListener('trade', (e) => {
      const data = JSON.parse(e.data);
      handleTrade(data);
    });

    eventSource.addEventListener('ai_action', (e) => {
      const data = JSON.parse(e.data);
      handleAIAction(data);
    });

    eventSource.addEventListener('reset', (e) => {
      const data = JSON.parse(e.data);
      handleReset(data);
    });

    eventSource.addEventListener('balance_sync', (e) => {
      const data = JSON.parse(e.data);
      if (data.aiVirtualBalance !== undefined) {
        state.aiVirtualBalance = Number(data.aiVirtualBalance || 0);
        updateAIPnLStats();
      }
    });

    // 强制平仓事件
    eventSource.addEventListener('liquidation', (e) => {
      const data = JSON.parse(e.data);
      handleLiquidation(data);
    });

    // 对战模式事件
    eventSource.addEventListener('battle_start', (e) => {
      if (!isPredictionModeActive()) return;
      const data = JSON.parse(e.data);
      if (document.getElementById('battle-modal')) {
        showBattleModal();
        battleState.pattern = data.pattern;
        battleState.patternName = data.patternName;
        battleState.patternDescription = data.patternDescription || '';
        battleState.candles = data.candles;
        battleState.signals = data.signals;
        // 预选阶段不含 AI 决策，清空字段
        battleState.aiDecision = null;
        battleState.aiConfidence = 0;
        battleState.aiAnalysis = '';
        updateBattleUI(data);
        showBattlePhase('preview');
        const predictionChartManager = getPredictionChartManager();
        if (predictionChartManager) {
          predictionChartManager.reset();
          predictionChartManager.loadHistory(data.candles);
        }
      }
    });

    // AI 揭晓事件（用户下注后触发）
    eventSource.addEventListener('battle_ai_reveal', (e) => {
      const data = JSON.parse(e.data);
      battleState.userDecision = data.userDecision;
      battleState.userBet = data.userBet;
      battleState.aiDecision = data.aiDecision;
      battleState.aiConfidence = data.aiConfidence;
      battleState.aiAnalysis = data.aiAnalysis || '';
      updateBattleRevealUI(data);
      showBattlePhase('reveal');
    });

    eventSource.addEventListener('battle_tick', (e) => {
      const data = JSON.parse(e.data);
      if (data.candle) {
        const predictionChartManager = getPredictionChartManager();
        if (predictionChartManager) {
          predictionChartManager.addCandle(data.candle);
        } else {
          console.warn('[对战 K 线] chartManager 未初始化:', data.candle);
        }
      }
      const currentEl = document.getElementById('replay-current');
      if (currentEl) {
        currentEl.textContent = data.index + 1;
      }
    });

    eventSource.addEventListener('battle_result', (e) => {
      const data = JSON.parse(e.data);
      handleBattleResult(data);
    });

    eventSource.addEventListener('battle_replay_start', (e) => {
      const data = JSON.parse(e.data);
      // 用户和AI的决策已通过 submitBattleDecision 存入UI
      // 确保多客户端/重连场景下同步决策显示
      if (data.userDecision) {
        battleState.userDecision = data.userDecision;
      }
      if (data.aiDecision) {
        battleState.aiDecision = data.aiDecision;
      }
    });

    // Pattern Mode 事件
    eventSource.addEventListener('pattern_tick', (e) => {
      const data = JSON.parse(e.data);
      if (data.userId !== state.user?.email) return;
      if (data.candle) {
        const patternChartManager = getPatternChartManager();
        if (patternChartManager) {
          patternChartManager.addCandle(data.candle);
          if (data.currentTime !== undefined) {
            patternChartManager.setDrawingPlaybackTime(data.currentTime);
          }
        }
      }
      patternState.replayIndex = data.index + 1;
      patternState.totalCandles = data.total;

      // 更新进度显示
      const progressEl = document.getElementById('pattern-replay-progress');
      if (progressEl) {
        progressEl.textContent = `${data.index + 1} / ${data.total}`;
      }
      const progressFillEl = document.getElementById('pattern-replay-progress-fill');
      if (progressFillEl) {
        const total = Math.max(1, Number(data.total) || 1);
        const current = Math.max(0, Number(data.index) + 1 || 0);
        progressFillEl.style.width = `${Math.min(100, (current / total) * 100)}%`;
      }
    });

    eventSource.addEventListener('pattern_result', (e) => {
      const data = JSON.parse(e.data);
      if (data.userId !== state.user?.email) return;
      handlePatternResult(data);
    });

    eventSource.addEventListener('pattern_start', (e) => {
      const data = JSON.parse(e.data);
      // 如果是当前用户的事件，更新状态
      if (data.userId === state.user?.email) {
        patternState.pattern = data.pattern;
        patternState.patternName = data.patternName;
        patternState.patternDescription = data.patternDescription;
        patternState.previewPatternDrawings = Array.isArray(data.previewPatternDrawings) ? data.previewPatternDrawings : patternState.previewPatternDrawings;
        patternState.teachingPatternDrawings = Array.isArray(data.teachingPatternDrawings) ? data.teachingPatternDrawings : patternState.teachingPatternDrawings;
        patternState.fullPatternDrawings = Array.isArray(data.fullPatternDrawings) ? data.fullPatternDrawings : patternState.fullPatternDrawings;
      }
    });

    eventSource.addEventListener('pattern_phase2', (e) => {
      const data = JSON.parse(e.data);
      if (data.userId === state.user?.email) {
        patternState.userDecision = data.userDecision;
        patternState.teachingPatternDrawings = Array.isArray(data.teachingPatternDrawings) ? data.teachingPatternDrawings : patternState.teachingPatternDrawings;
      }
    });

    eventSource.addEventListener('pattern_phase3', (e) => {
      const data = JSON.parse(e.data);
      if (data.userId === state.user?.email) {
        if (data.aiDecision) patternState.aiDecision = data.aiDecision;
        if (data.aiConfidence !== undefined) patternState.aiConfidence = Number(data.aiConfidence || patternState.aiConfidence || 0);
        if (data.aiAnalysis) patternState.aiAnalysis = data.aiAnalysis;
        if (Array.isArray(data.fullPatternDrawings)) {
          patternState.fullPatternDrawings = data.fullPatternDrawings;
        }
        renderPatternAiAnalysis();
      }
    });

    eventSource.onopen = () => {
      if (eventSource !== source) return;
      if (!isConnectionReady) {
        updateConnectionStatus('loading', '同步中');
        updateTickInfo('连接已建立，正在等待首批图表数据...');
        showChartLoading('连接已建立，正在等待首批图表数据...');
      }
    };

    eventSource.onerror = () => {
      if (eventSource !== source) return;
      if (source.readyState === EventSource.CONNECTING) {
        updateConnectionStatus('loading', '重连中');
        updateTickInfo('实时连接波动，正在自动恢复...');
        showChartLoading('实时连接波动，正在自动恢复...');
        return;
      }
      scheduleSSEReconnect('SSE connection error, reconnecting...');
    };
  } catch (err) {
    console.error('SSE connection error:', err);
    if (!isConnectionReady) {
      updateConnectionStatus(false);
    }
  }
}

// =============================================================================
// SSE 事件处理
// =============================================================================

function handleInit(data) {
  state.isInitialized = true;
  syncPositionsFromPayload(data.positions);
  state.aiLog = limitRecentOperationRecords(data.aiLog);
  showChartLoading('正在渲染图表并恢复界面状态...');
  state.chartSummary = data.chart || state.chartSummary;

  // 从 simState 恢复 isStarted 和 isPaused
  if (data.state) {
    state.isStarted = data.state.isStarted !== undefined ? data.state.isStarted : true;
    state.isPaused = data.state.isPaused !== undefined ? data.state.isPaused : false;
    state.speed = data.state.speed || 1;
    state.marketSource = data.state.marketSource || null;
    state.replaySymbol = data.state.replaySymbol || null;
    state.trendCandleCount = Number(data.state.trendCandleCount || 0);
  }

  // 全局盈亏
  if (data.globalAiPnl !== undefined) {
    state.globalAiPnl = data.globalAiPnl;
  }
  if (data.globalUserPnl !== undefined) {
    state.globalUserPnl = data.globalUserPnl;
  }
  if (data.aiVirtualBalance !== undefined) {
    state.aiVirtualBalance = data.aiVirtualBalance;
  }
  if (data.symbolPrices && typeof data.symbolPrices === 'object') {
    state.symbolPrices = { ...state.symbolPrices, ...data.symbolPrices };
  }

  const shouldRefreshUserPosition = Boolean(state.isLoggedIn && state.token && (!data.positions?.user && !data.positions?.userPositions && data.authorized === false));
  if (!shouldRefreshUserPosition && !data.positions) {
    setUserPositionsState([]);
  }
  state.userHistory = limitUserHistoryRecords(state.userHistory);

  // 初始化图表并加载历史数据
  const tradingChartManager = getTradingChartManager();
  if (tradingChartManager) {
    const initCandles = Array.isArray(data.candles) ? data.candles : [];
    const initCandlesAuthoritative = data.candlesAuthoritative !== false;
    if (initCandles.length > 0) {
      if (initCandlesAuthoritative) {
        applyTradingChartHistory(initCandles, {
          trendCount: state.trendCandleCount,
          hardReset: true,
        });
      } else {
        loadTradingChartFromRawCandles(initCandles, {
          trendCount: state.trendCandleCount,
          hardReset: true,
        });
        void refreshTradingChartHistory({
          trendCount: state.trendCandleCount,
          fallbackCandles: getEffectiveHistoryFallbackCandles(initCandles),
          hardReset: true,
        });
      }
    } else {
      void refreshTradingChartHistory({
        trendCount: state.trendCandleCount,
        fallbackCandles: getEffectiveHistoryFallbackCandles(initCandles),
        hardReset: true,
      });
    }
  }

  if (tradingChartManager) {
    syncTradingChartDecorations(tradingChartManager);
  }

  updateChartSummary(data.chart || data.state);

  updateUI();
  updateUserPositionCard();
  updateAIPositionCard();
  updateUserHistory();
  updateAILog();
  flushTickDeferredUi(true);
  if (!isTradingChartHistoryReloading) {
    setRealtimeReadyStatus();
  }
  if (shouldRefreshUserPosition) {
    void refreshUserPositionFromApi();
  }
  showSuccessToast('连接成功');
}

function updateChartSummary(engineState) {
  const effectiveChartState = engineState || state.chartSummary;
  if (!effectiveChartState) return;

  state.chartSummary = effectiveChartState;

  const price = Number(effectiveChartState.currentPrice || 0);
  const normalizedChange = effectiveChartState.priceChange24h === undefined || effectiveChartState.priceChange24h === null
    ? null
    : Number(effectiveChartState.priceChange24h);
  const volatility = Number(effectiveChartState.volatility || 0);
  const marketSource = String(effectiveChartState.marketSource || '').trim();
  const replaySymbol = String(effectiveChartState.replaySymbol || '').trim().toUpperCase();
  const displaySymbol = String(effectiveChartState.displaySymbol || effectiveChartState.chartSymbol || '').trim().toUpperCase();
  const symbolLabel = displaySymbol || (marketSource === 'btc_replay'
    ? (replaySymbol || 'REPLAY')
    : (marketSource === 'synthetic_fallback' ? 'SIM' : (marketSource === 'synthetic_legacy' ? 'LEGACY' : '--')));
  const signature = [
    Number.isFinite(price) ? price.toFixed(6) : '',
    Number.isFinite(normalizedChange) ? normalizedChange.toFixed(4) : '',
    Number.isFinite(volatility) ? volatility.toFixed(6) : '',
    marketSource,
    replaySymbol,
    displaySymbol,
  ].join('|');

  if (signature === chartSummarySignature) return;
  chartSummarySignature = signature;

  if (elements.chartSymbolBadge) {
    elements.chartSymbolBadge.textContent = symbolLabel;
  }

  if (elements.chartCurrentPrice) {
    elements.chartCurrentPrice.textContent = price
      ? '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '--';
  }
  if (elements.chartPriceChange) {
    elements.chartPriceChange.textContent = Number.isFinite(normalizedChange)
      ? (normalizedChange >= 0 ? '+' : '') + normalizedChange.toFixed(2) + '%'
      : '--';
    elements.chartPriceChange.className = Number.isFinite(normalizedChange)
      ? 'price-info-value ' + (normalizedChange >= 0 ? 'up' : 'down')
      : 'price-info-value';
  }
  if (elements.chartVolatility) {
    elements.chartVolatility.textContent = volatility
      ? (volatility * 100).toFixed(1) + '%'
      : '--';
  }
}

function flushTickRender() {
  tickRenderFrame = 0;

  const candles = dedupeRealtimeCandles(pendingTickCandles);
  const engineState = pendingTickEngineState;
  const chartState = pendingTickChartState || state.chartSummary || engineState;

  pendingTickCandles = [];
  pendingTickEngineState = null;
  pendingTickChartState = null;

  const tradingChartManager = getTradingChartManager();

  if (candles.length) {
    if (isTradingChartHistoryReloading) {
      bufferedTradingChartCandles = dedupeRealtimeCandles([...bufferedTradingChartCandles, ...candles]);
    } else if (tradingChartManager) {
      for (const candle of candles) {
        applyRealtimeTradingChartCandle(candle, tradingChartManager);
      }
    } else {
      console.warn('[K绾挎洿鏂癩 chartManager 鏈垵濮嬪寲锛孠绾挎暟鎹涪澶?', candles[candles.length - 1]);
    }
  }

  updateChartSummary(chartState);

  if (tradingChartManager) {
    syncTradingChartDecorations(tradingChartManager);
  }

  updateUI();
  updateUserPositionCard();
  updateAIPositionCard();
}

function scheduleTickRender() {
  if (tickRenderFrame) return;
  tickRenderFrame = requestAnimationFrame(flushTickRender);
}

function flushTickDeferredUi(force = false) {
  updateGlobalPnlDisplay();
  updateUserPnLStats();
  updateAIPnLStats();
  updateTradeButtons();
  updateChartOverlay();

  const now = Date.now();
  if (force || now - lastSimTimeUiAt >= SIM_TIME_UI_INTERVAL) {
    lastSimTimeUiAt = now;
    updateSimTime();
  }
}

function scheduleTickDeferredUi() {
  if (tickDeferredUiTimer) return;
  tickDeferredUiTimer = setTimeout(() => {
    tickDeferredUiTimer = null;
    flushTickDeferredUi();
  }, TICK_DEFERRED_UI_DELAY);
}

function handleTick(data) {
  const { state: engineState, positions, globalAiPnl, globalUserPnl, candle, chart } = data;

  if (engineState) {
    state.isPaused = engineState.isPaused !== undefined ? engineState.isPaused : false;
    state.isStarted = engineState.isStarted !== undefined ? engineState.isStarted : true;
    state.currentPrice = engineState.currentPrice;
    state.speed = engineState.speed || state.speed;
    state.marketSource = engineState.marketSource || null;
    state.replaySymbol = engineState.replaySymbol || null;
    state.trendCandleCount = Number(engineState.trendCandleCount || state.trendCandleCount || 0);
  }

  if (chart) {
    state.chartSummary = chart;
    pendingTickChartState = chart;
  }

  if (globalAiPnl !== undefined) {
    state.globalAiPnl = globalAiPnl;
  }
  if (globalUserPnl !== undefined) {
    state.globalUserPnl = globalUserPnl;
  }
  if (data.aiVirtualBalance !== undefined) {
    state.aiVirtualBalance = data.aiVirtualBalance;
  }

  // 更新全局盈亏显示
  pendingTickEngineState = engineState || pendingTickEngineState;

  // 更新品种价格
  if (data.symbolPrices && typeof data.symbolPrices === 'object') {
    state.symbolPrices = { ...state.symbolPrices, ...data.symbolPrices };
  }

  if (positions) {
    // 仅同步 AI 仓位（tick 中不再包含用户仓位，用户仓位已在本地）
    syncAIPositionsFromPayload(positions);
  }

  // 使用最新价格本地重算所有仓位 PnL
  recalcAllPositionsPnL();
  updateUserPositionCard();
  updateAIPositionCard();
  updateTradeButtons();

  // 更新 K 线
  if (candle) {
    pendingTickCandles.push(candle);
  }

  // 更新价格信息浮层
  if (engineState) pendingTickEngineState = engineState;
  if (chart) pendingTickChartState = chart;

  // 更新持仓线
  scheduleTickRender();

  scheduleTickDeferredUi();

  setRealtimeReadyStatus(Date.now());

}

function handleTrade(data) {
  const tradingChartManager = getTradingChartManager();
  const previousPosition = state.userPosition;
  if (data.type === 'user_open') {
    if (data.position) {
      upsertUserPosition(data.position);
    }
  } else if (data.type === 'user_increase') {
    if (data.position) {
      upsertUserPosition(data.position);
    } else if (state.userPosition) {
      upsertUserPosition({
        ...state.userPosition,
        quantity: data.newTotalQuantity || state.userPosition.quantity,
      });
    }
  } else if (data.type === 'user_decrease') {
    if (data.remainingPosition) {
      upsertUserPosition(data.remainingPosition);
    } else if (state.userPosition && data.reduceQuantity) {
      upsertUserPosition({
        ...state.userPosition,
        quantity: Math.max(0, state.userPosition.quantity - data.reduceQuantity),
      });
    }
  } else if (data.type === 'user_close') {
    removeUserPosition(data.position || data.symbol || previousPosition || state.chartSymbol);
  }

  syncTradeMarkerFromEvent(data, previousPosition);

  if (tradingChartManager) {
    syncTradingChartDecorations(tradingChartManager);
  }
  updateUserPositionCard();
  updateTradeButtons();
}

function handleAIAction(data) {
  const { operation, aiLog, globalAiPnl, globalUserPnl, positions } = data;
  const tradingChartManager = getTradingChartManager();
  const operations = Array.isArray(data.operations) && data.operations.length > 0
    ? data.operations.filter(Boolean)
    : (operation ? [operation] : []);

  if (positions) {
    syncPositionsFromPayload(positions);
  }

  if (tradingChartManager) {
    syncTradingChartDecorations(tradingChartManager);
  }

  // 只有在实际有操作时才更新日志和持仓卡片
  if (operations.length > 0) {
    state.aiLog = limitRecentOperationRecords(mergeRecentOperationRecords(operations, state.aiLog));

    // 只在有操作时更新 AI 日志和持仓卡片
    updateAILog();
    updateAIPositionCard();
  }

  // 如果传入了完整的 aiLog 数组（初始化时），也更新日志
  if (aiLog !== undefined && operations.length === 0) {
    state.aiLog = limitRecentOperationRecords(aiLog);
    updateAILog();
  }

  // 更新全局盈亏
  if (globalAiPnl !== undefined) state.globalAiPnl = globalAiPnl;
  if (globalUserPnl !== undefined) state.globalUserPnl = globalUserPnl;
  if (data.aiVirtualBalance !== undefined) state.aiVirtualBalance = data.aiVirtualBalance;

  updateGlobalPnlDisplay();
  updateUserPnLStats();
  updateAIPnLStats();
}

function handleLiquidation(data) {
  const { pnl, margin, finalAmount, price, marginRate, time } = data;
  const previousPosition = state.userPosition;
  const tradingChartManager = getTradingChartManager();

  // 更新状态
  removeUserPosition(previousPosition || data.symbol || state.chartSymbol);
  if (tradingChartManager) {
    syncTradingChartDecorations(tradingChartManager);
  }

  // 添加到历史记录
  if (previousPosition) {
    addToUserHistory({
      time: time,
      side: previousPosition.side,
      quantity: previousPosition.quantity,
      price: price,
      pnl: pnl,
      id: previousPosition.id,
      eventId: data.eventId ?? data.version ?? null,
      openPrice: previousPosition.openPrice,
      leverage: previousPosition.leverage,
      reason: translateOr('trade.forcedClose', '强制平仓'),
      action: 'close',
    });
  }

  // 显示警告
  showError(`${t('error.marginCall')}${t('error.marginRate')} ${marginRate}%`);

  // 刷新余额
  fetchCredits().catch(() => {});
  fetchUserSummary().catch(() => {});

  // 更新 UI
  updateUI();
  updateUserPositionCard();
  updateTradeButtons();
}

/**
 * 处理走势完成事件
 */

/**
 * 显示走势完成提示条
 */

/**
 * 隐藏走势完成提示条
 */

/**
 * 重置模拟
 */
async function resetSimulation() {
  try {
    const response = await fetch('/api/reset', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) {
      showError(data.error || window.i18n?.t?.('error.resetFailed') || '重置失败');
    }
  } catch (err) {
    console.error('Reset error:', err);
    showError(window.i18n?.t?.('error.resetFailed') || '重置失败');
  }
}

function handleReset(data) {
  const { candles, state: engineState, positions, globalAiPnl, globalUserPnl } = data;
  const tradingChartManager = getTradingChartManager();
  state.chartSummary = data.chart || state.chartSummary;

  // 重置状态
  state.isStarted = (engineState && engineState.isStarted !== undefined) ? engineState.isStarted : true;
  state.isPaused = (engineState && engineState.isPaused !== undefined) ? engineState.isPaused : false;
  state.speed = engineState?.speed || 1;
  state.currentPrice = engineState?.currentPrice || 0;
  state.marketSource = engineState?.marketSource || null;
  state.replaySymbol = engineState?.replaySymbol || null;
  state.trendCandleCount = Number(engineState?.trendCandleCount || 0);

  // 重置全局盈亏
  if (globalAiPnl !== undefined) state.globalAiPnl = globalAiPnl;
  if (globalUserPnl !== undefined) state.globalUserPnl = globalUserPnl;
  if (data.aiVirtualBalance !== undefined) state.aiVirtualBalance = data.aiVirtualBalance;

  syncPositionsFromPayload(positions);
  state.userHistory = [];
  state.userMarkers = [];
  state.aiLog = [];
  saveUserHistory({ replace: true });
  saveUserMarkers();

  // 重置图表绘图
  if (tradingChartManager) {
    applyTradingChartHistory([], {
      trendCount: state.trendCandleCount,
      hardReset: true,
    });
    void refreshTradingChartHistory({
      trendCount: state.trendCandleCount,
      fallbackCandles: getEffectiveHistoryFallbackCandles(candles || []),
      hardReset: true,
    });
  }

  updateGlobalPnlDisplay();
  updateUserPositionCard();
  updateAIPositionCard();
  updateUserHistory();
  updateUserPnLStats();
  updateAIPnLStats();
  updateAILog();
  updateTradeButtons();
  updateChartOverlay();
  updateChartSummary(state.chartSummary || engineState);

  showSuccessToast('重置成功');
}

// =============================================================================
// UI 更新
// =============================================================================

function updateUI() {
  if (state.currentPrice > 0) {
    if (elements.currentPrice) {
      elements.currentPrice.textContent = formatPrice(state.currentPrice);
    }
  }
}

function updateUserPositionCard() {
  const card = elements.userPositionCard;
  if (!card) return;

  const signature = getUserPositionCardSignature(state.userPosition);

  if (!state.userPosition) {
    if (signature === userPositionCardSignature && card.querySelector('.no-position')) return;
    userPositionCardSignature = signature;
    card.className = 'position-card';
    card.innerHTML = `
      <div class="no-position">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span data-i18n="panel.noPosition">暂无持仓</span>
      </div>
    `;
    if (window.i18n?.updateAllI18nElements) window.i18n.updateAllI18nElements(card);
    return;
  }

  if (signature === userPositionCardSignature && card.querySelector('.position-detail')) {
    syncUserPositionCardValues(card, state.userPosition);
    return;
  }

  userPositionCardSignature = signature;

  const pos = state.userPosition;
  const pnlClass = pos.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
  const pnlSign = pos.pnl >= 0 ? '+' : '';
  const i18n = window.i18n || {};
  const t = i18n.t || ((k) => k);
  const sideLabel = pos.side === 'long' ? t('trade.long') : t('trade.short');
  const unit = t('trade.pnlUnit');

  card.className = `position-card has-position ${pos.side}`;
  card.innerHTML = `
    <div class="position-detail">
      <div class="position-header">
        <div class="position-side ${pos.side}">
          ${pos.side === 'long' ? `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
          ` : `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          `}
          ${sideLabel}
          ${pos.leverage && pos.leverage > 1 ? `<span class="leverage-tag">${pos.leverage}x</span>` : ''}
        </div>
        <div class="position-price">
          <div class="price-meta">
            <span class="open-price" data-i18n="trade.openPrice">开仓价</span>
            <span class="open-price-value">${formatPrice(pos.openPrice)}</span>
          </div>
        </div>
      </div>
      <div class="position-stats">
        <div class="position-stat" data-stat="margin">
          <span class="label" data-i18n="trade.margin">保证金</span>
          <span class="value">${(pos.margin || pos.quantity || 0).toFixed(2)}</span>
        </div>
        <div class="position-stat" data-stat="positionValue">
          <span class="label" data-i18n="trade.positionValue">仓位价值</span>
          <span class="value">${((pos.margin || pos.quantity || 0) * (pos.leverage || 1)).toFixed(2)}</span>
        </div>
        <div class="position-stat" data-stat="pnlAmount">
          <span class="label" data-i18n="trade.pnlAmount">盈亏金额</span>
          <span class="value pnl ${pnlClass}">${pnlSign}${Math.abs(pos.pnl).toFixed(2)}${unit}</span>
        </div>
        <div class="position-stat" data-stat="pnlRate">
          <span class="label" data-i18n="trade.pnlRate">盈亏率</span>
          <span class="value pnl ${pnlClass}">${pnlSign}${pos.pnlPercent.toFixed(2)}%</span>
        </div>
      </div>

    </div>
  `;
  if (window.i18n?.updateAllI18nElements) window.i18n.updateAllI18nElements(card);
}

function getAIAggregatePositionSummary() {
  const symbol = normalizeChartSymbol(state.chartSymbol);
  const positions = getCurrentChartAIPositions();
  if (positions.length === 0) return null;

  const strategySet = new Set();
  const summary = positions.reduce((acc, pos) => {
    const margin = Number(pos.margin ?? pos.quantity ?? 0);
    const pnl = Number(pos.pnl ?? 0);
    const openPrice = Number(pos.openPrice);
    const openTime = Number(pos.openTime) || Date.now();
    const strategyLabel = pos.strategyName || pos.strategyId || null;

    acc.positionCount += 1;
    acc.totalMargin += margin;
    acc.totalPnl += pnl;
    acc.earliestOpenTime = Math.min(acc.earliestOpenTime, openTime);

    if (pos.side === 'long') {
      acc.longCount += 1;
      acc.longMargin += margin;
    } else if (pos.side === 'short') {
      acc.shortCount += 1;
      acc.shortMargin += margin;
    }

    if (Number.isFinite(openPrice) && margin > 0) {
      acc.weightedOpenPrice += openPrice * margin;
      acc.weightedOpenWeight += margin;
    }

    if (strategyLabel) {
      strategySet.add(strategyLabel);
    }

    return acc;
  }, {
    positionCount: 0,
    totalMargin: 0,
    totalPnl: 0,
    weightedOpenPrice: 0,
    weightedOpenWeight: 0,
    earliestOpenTime: Infinity,
    longCount: 0,
    shortCount: 0,
    longMargin: 0,
    shortMargin: 0,
  });

  const hasLong = summary.longCount > 0;
  const hasShort = summary.shortCount > 0;
  const isMixed = hasLong && hasShort;
  const netExposure = summary.longMargin - summary.shortMargin;
  const longLabel = translateOr('trade.long', '做多');
  const shortLabel = translateOr('trade.short', '做空');
  const netLongLabel = translateOr('trade.netLong', '净多');
  const netShortLabel = translateOr('trade.netShort', '净空');
  const hedgedLabel = translateOr('trade.hedged', '多空对冲');

  return {
    ...summary,
    symbol,
    isMixed,
    averageOpenPrice: !isMixed && summary.weightedOpenWeight > 0
      ? summary.weightedOpenPrice / summary.weightedOpenWeight
      : null,
    pnlPercent: summary.totalMargin > 0 ? (summary.totalPnl / summary.totalMargin) * 100 : 0,
    earliestOpenTime: Number.isFinite(summary.earliestOpenTime) ? summary.earliestOpenTime : Date.now(),
    exposureLabel: isMixed
      ? (netExposure > 0 ? netLongLabel : netExposure < 0 ? netShortLabel : hedgedLabel)
      : (hasLong ? longLabel : shortLabel),
    sideClass: isMixed ? '' : (hasLong ? 'long' : 'short'),
    strategies: Array.from(strategySet),
  };
}

function getCurrentChartDisplayPrice(symbol = state.chartSymbol) {
  const targetSymbol = normalizeChartSymbol(symbol);
  const chartSymbol = normalizeChartSymbol(state.chartSummary?.chartSymbol || state.chartSymbol);
  const chartPrice = Number(state.chartSummary?.currentPrice || 0);
  if (chartSymbol === targetSymbol && Number.isFinite(chartPrice) && chartPrice > 0) {
    return chartPrice;
  }
  return Number(state.currentPrice || 0);
}

function updateAIPositionCard() {
  const card = elements.aiPositionCard;
  if (!card) return;

  const summary = getAIAggregatePositionSummary();
  const symbol = normalizeChartSymbol(state.chartSymbol);

  if (!summary) {
    card.className = 'position-card ai-position';
    card.dataset.symbol = symbol;
    card.innerHTML = `
      <div class="no-position">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span data-i18n="panel.noPosition">暂无持仓</span>
      </div>
    `;
    if (window.i18n?.updateAllI18nElements) window.i18n.updateAllI18nElements(card);
    return;
  }

  const i18n = window.i18n || {};
  const t = i18n.t || ((k) => k);
  const unit = t('trade.pnlUnit');
  const pnlClass = summary.totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative';
  const pnlSign = summary.totalPnl >= 0 ? '+' : '';
  const mixedBookLabel = t('trade.mixedBook');
  const chartPrice = getCurrentChartDisplayPrice(summary.symbol);
  const positionTitle = `AI ${summary.symbol}仓位`;
  const headerIcon = summary.isMixed ? `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 3v18"/>
      <path d="M7 8l5-5 5 5"/>
      <path d="M7 16l5 5 5-5"/>
    </svg>
  ` : summary.sideClass === 'long' ? `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  ` : `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 5v14M5 12l7 7 7-7"/>
    </svg>
  `;

  card.className = `position-card ai-position has-position${summary.sideClass ? ` ${summary.sideClass}` : ''}`;
  card.dataset.symbol = summary.symbol;
  card.innerHTML = `
    <div class="position-detail">
      <div class="position-header">
        <div class="position-side${summary.sideClass ? ` ${summary.sideClass}` : ''}">
          ${headerIcon}
          ${positionTitle}
        </div>
        <div class="position-price">
          <div class="price-meta">
            <span class="open-price" data-i18n="trade.currentPrice">当前价</span>
            <span class="open-price-value">${formatPrice(chartPrice)}</span>
          </div>
          <span class="current-price ${pnlClass}">${summary.exposureLabel}</span>
        </div>
      </div>
      <div class="position-stats">
        <div class="position-stat">
          <span class="label" data-i18n="trade.averageOpenPrice">开仓均价</span>
          <span class="value">${summary.averageOpenPrice !== null ? formatPrice(summary.averageOpenPrice) : mixedBookLabel}</span>
        </div>
        <div class="position-stat">
          <span class="label" data-i18n="trade.margin">保证金</span>
          <span class="value">${summary.totalMargin.toFixed(2)}${unit}</span>
        </div>
        <div class="position-stat">
          <span class="label" data-i18n="trade.pnlAmount">盈亏金额</span>
          <span class="value pnl ${pnlClass}">${pnlSign}${Math.abs(summary.totalPnl).toFixed(2)}${unit}</span>
        </div>
        <div class="position-stat">
          <span class="label" data-i18n="trade.pnlRate">盈亏率</span>
          <span class="value pnl ${pnlClass}">${pnlSign}${summary.pnlPercent.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  `;
  if (window.i18n?.updateAllI18nElements) window.i18n.updateAllI18nElements(card);
 }

function updateTradeButtons() {
  if (!elements.btnLong && !elements.btnShort && !elements.btnClose) return;

  const hasPosition = state.userPosition !== null;
  const loggedIn = state.isLoggedIn;
  const started = state.isStarted;
  const hasBalance = (state.credits.remaining || state.credits.total || 0) >= MIN_USER_TRADE_MARGIN;
  const tradingChartActive = isTradingChartSymbolActive();
  const signature = getTradeButtonsSignature();

  if (signature === tradeButtonsSignature) return;
  tradeButtonsSignature = signature;

  // 基础条件：已登录 + 走势已开始（后端会做精确保证金验证，前端只做基础检查）
  const canTrade = loggedIn && started;
  const canOpenOnCurrentChart = canTrade && tradingChartActive;

  // 有持仓时显示加仓/减仓按钮
  if (hasPosition) {
    // 按钮1：加仓
    if (elements.btnLong) {
      const btnLongText = elements.btnLong.querySelector('#btn-long-text') || elements.btnLong.querySelector('span');
      if (btnLongText) {
        const key = 'trade.add';
        btnLongText.setAttribute('data-i18n', key);
        if (window.i18n) window.i18n.updateAllI18nElements(elements.btnLong);
      }
      elements.btnLong.disabled = !canOpenOnCurrentChart || !hasBalance;
    }
    // 鎸夐挳2锛氬噺浠?
    if (elements.btnShort) {
      const btnShortText = elements.btnShort.querySelector('#btn-short-text') || elements.btnShort.querySelector('span');
      if (btnShortText) {
        const key = 'trade.reduce';
        btnShortText.setAttribute('data-i18n', key);
        if (window.i18n) window.i18n.updateAllI18nElements(elements.btnShort);
      }
      elements.btnShort.disabled = !canTrade;
    }
    // 鎸夐挳3锛氬钩浠?
    if (elements.btnClose) {
      const btnCloseText = elements.btnClose.querySelector('#btn-close-text') || elements.btnClose.querySelector('span');
      if (btnCloseText) {
        const key = 'trade.close';
        btnCloseText.setAttribute('data-i18n', key);
        if (window.i18n) window.i18n.updateAllI18nElements(elements.btnClose);
      }
      elements.btnClose.disabled = !canTrade;
    }
  } else {
    // 无持仓时显示做多/做空
    if (elements.btnLong) {
      const btnLongText = elements.btnLong.querySelector('#btn-long-text') || elements.btnLong.querySelector('span');
      if (btnLongText) {
        const key = 'trade.long';
        btnLongText.setAttribute('data-i18n', key);
        if (window.i18n) window.i18n.updateAllI18nElements(elements.btnLong);
      }
      elements.btnLong.disabled = !canOpenOnCurrentChart || !hasBalance;
    }
    if (elements.btnShort) {
      const btnShortText = elements.btnShort.querySelector('#btn-short-text') || elements.btnShort.querySelector('span');
      if (btnShortText) {
        const key = 'trade.short';
        btnShortText.setAttribute('data-i18n', key);
        if (window.i18n) window.i18n.updateAllI18nElements(elements.btnShort);
      }
      elements.btnShort.disabled = !canOpenOnCurrentChart || !hasBalance;
    }
    if (elements.btnClose) {
      const btnCloseText = elements.btnClose.querySelector('#btn-close-text') || elements.btnClose.querySelector('span');
      if (btnCloseText) {
        const key = 'trade.close';
        btnCloseText.setAttribute('data-i18n', key);
        if (window.i18n) window.i18n.updateAllI18nElements(elements.btnClose);
      }
      elements.btnClose.disabled = true;
    }
  }
}

function getTradeQuantityQuickFillValue(percent = 0.1) {
  const remainingCredits = Number(state.credits?.remaining);
  const fallbackCredits = Number(state.credits?.total);
  const availableCredits = Number.isFinite(remainingCredits)
    ? remainingCredits
    : (Number.isFinite(fallbackCredits) ? fallbackCredits : 0);
  const quickAmount = Number((Math.max(0, availableCredits) * percent).toFixed(2));
  return Number((availableCredits >= MIN_USER_TRADE_MARGIN ? Math.max(MIN_USER_TRADE_MARGIN, quickAmount) : quickAmount).toFixed(2));
}

function updateChartOverlay() {
  // 旧图表覆盖层逻辑已移除，保留空函数避免破坏调用方
}

/**
 * 切换模式
 * @param {string} mode - 'trading' | 'prediction'
 */
function switchMode(mode) {
  if (mode === state.currentMode) return;

  // 更新选项状态
  document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.mode-option[data-mode="${mode}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  state.currentMode = mode;

  // 在 body 上标记当前模式，供 CSS 控制面板显示隐藏
  document.body.setAttribute('data-mode', mode);
  ensureModeChartManagerReady(mode);

  // 根据模式调整 UI
  const t = window.i18n?.t ?? ((k) => k);
  if (mode === 'trading') {
    showToast(t('toast.modeTrading'), 'info');
    hideBattleModal();
    hideBattleStartButton();
    resetBattleIfNeeded();
  } else if (mode === 'prediction') {
    showToast(t('toast.modePrediction'), 'info');
    showBattleStartButton();
  } else if (mode === 'pattern') {
    showToast(t('toast.modePattern') || '技术形态模拟模式', 'info');
    hideBattleModal();
    hideBattleStartButton();
    showPatternPhase(patternState.phase || 'idle');
  }

  checkScreenOrientation();
  scheduleModeChartLayoutRefresh(mode, { forceViewport: true });
  notifyModeChange(mode);
}

/**
 * 通知后端模式切换
 */
async function notifyModeChange(mode) {
  try {
    await fetch('/api/mode', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mode }),
    });
  } catch (e) {
    console.error('切换模式失败:', e);
  }
}

/**
 * 重置对战（如果正在进行）
 */
async function resetBattleIfNeeded() {
  try {
    await fetch('/api/battle/reset', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (e) {
    console.error('重置对战失败:', e);
  }
}

async function restorePrimaryChart() {
  await refreshTradingChartHistory({
    trendCount: state.trendCandleCount,
    hardReset: true,
    suppressReadyStatus: true,
  });
}

/**
 * 显示“开始多空预测”大按钮（浮层居中显示在 K 线图表上方）
 */
function showBattleStartButton() {
  const chartSection = getModeChartSection('prediction');
  if (!chartSection) return;

  let overlay = document.getElementById('prediction-start-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'prediction-start-overlay';
    overlay.className = 'prediction-start-overlay';
    overlay.innerHTML = `
      <div class="prediction-start-card">
        <div class="prediction-start-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 3v18h18"/>
            <polyline points="7 14 12 9 16 13 21 8"/>
          </svg>
        </div>
        <h3 data-i18n="battle.title">多空预测</h3>
        <p data-i18n="battle.startDesc">预测 K 线走势方向，与 AI 对战</p>
        <button class="prediction-launch-btn" id="prediction-launch-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span data-i18n="battle.startBtn">开始对战</span>
        </button>
      </div>
    `;
    chartSection.appendChild(overlay);
    document.getElementById('prediction-launch-btn')?.addEventListener('click', () => {
      overlay.classList.add('hidden');
      showBattleModal();
      startBattle();
    });
    if (window.i18n) window.i18n.updateDOM(overlay);
  }
  overlay.classList.remove('hidden');
}

/**
 * 隐藏“开始多空预测”浮层
 */
function hideBattleStartButton() {
  document.getElementById('prediction-start-overlay')?.classList.add('hidden');
}

function getAILogActionI18nKey(action = '') {
  if (action === 'open_long') return 'ai.openLong';
  if (action === 'open_short') return 'ai.openShort';
  if (action === 'add_position') return 'ai.addPosition';
  if (action === 'reduce_position') return 'ai.reducePosition';
  return 'ai.closed';
}

function getAILogReasonText(log = {}, t = (key) => key) {
  if (log.source === 'admin_manual') return '';
  if (log.action === 'open_long') return t('ai.reasonOpenLong');
  if (log.action === 'open_short') return t('ai.reasonOpenShort');
  if (log.action === 'add_position') return t('ai.reasonAddPosition');
  if (log.action === 'reduce_position') return t('ai.reasonReducePosition');
  if (log.action === 'close') return t('ai.reasonClose');
  return log.reason || '';
}

function updateAILog() {
  const container = elements.aiLog;
  if (!container) return;
  const visibleLogs = limitRecentOperationRecords(state.aiLog);
  const currentLanguage = window.i18n?.getCurrentLanguage?.() || document.documentElement.lang || '';

  const newContent = visibleLogs.map((log) => {
    const actionClass = log.action === 'open_long' ? 'long' : log.action === 'open_short' ? 'short' : 'close';
    const symbol = String(log.symbol || log.tradingSymbol || log.marketSymbol || '').trim().toUpperCase();
    return `${currentLanguage}-${actionClass}-${symbol}-${log.action}-${log.time}-${log.price}-${log.pnl || ''}-${log.tradeAmount || log.margin || ''}`;
  }).join('|');

  if (container.dataset.lastContent === newContent) {
    if (elements.aiLogCount) {
      elements.aiLogCount.textContent = String(visibleLogs.length);
    }
    return;
  }
  container.dataset.lastContent = newContent;

  if (visibleLogs.length === 0) {
    container.innerHTML = `
      <div class="empty-log">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M12 8v4M12 16h.01"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span data-i18n="panel.aiObserving">AI 正在观察...</span>
      </div>
    `;
    if (window.i18n?.updateAllI18nElements) window.i18n.updateAllI18nElements(container);
    if (elements.aiLogCount) {
      elements.aiLogCount.textContent = '0';
    }
    return;
  }

  const t = (window.i18n && window.i18n.t) || ((k) => k);
  container.innerHTML = visibleLogs
    .map((log) => {
      const actionClass = log.action === 'open_long' ? 'long' : log.action === 'open_short' ? 'short' : 'close';
      const actionText = t(getAILogActionI18nKey(log.action));
      const symbol = String(log.symbol || log.tradingSymbol || log.marketSymbol || '').trim().toUpperCase();
      const symbolClass = symbol === 'XAU' ? 'xau' : (symbol === 'BTC' ? 'btc' : '');
      const symbolBadge = symbol
        ? `<span class="log-symbol-badge ${symbolClass}">${escapeHtml(symbol)}</span>`
        : '';
      const unit = t('trade.pnlUnit');
      const pnlText = (log.pnl !== undefined && log.pnl !== null)
        ? `<span class="log-pnl ${log.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${t('ai.pnl')} ${log.pnl >= 0 ? '+' : ''}${Number(log.pnl).toFixed(2)}${unit}</span>`
        : '';
      const amountText = Number(log.tradeAmount || log.margin || 0) > 0
        ? `<span class="log-amount">${Number(log.tradeAmount || log.margin || 0).toFixed(2)}${unit}</span>`
        : '';
      const reasonText = getAILogReasonText(log, t);
      const reasonHtml = reasonText ? `<div class="log-reason">${escapeHtml(reasonText)}</div>` : '';

      return `
        <div class="log-item ${actionClass}">
          <div class="log-header">
            <div class="log-action ${actionClass}">
              ${log.action === 'open_long' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' :
                log.action === 'open_short' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>' :
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'}
              ${symbolBadge}
              ${actionText}
            </div>
            <span class="log-time">${formatTime(log.time)}</span>
          </div>
          ${reasonHtml}
          <div class="log-values">
            <span class="log-price">${amountText || formatPrice(log.price)}</span>
            ${pnlText}
          </div>
        </div>
      `;
    })
    .join('');

  if (elements.aiLogCount) {
    elements.aiLogCount.textContent = String(visibleLogs.length);
  }
}

function updateUserHistory() {
  const container = elements.userHistory;
  if (!container) return;
  const visibleHistory = limitUserHistoryRecords(state.userHistory);

  if (visibleHistory.length === 0) {
    container.innerHTML = '<div class="empty-history"><span data-i18n="panel.noHistory">暂无历史记录</span></div>';
    if (window.i18n?.updateAllI18nElements) window.i18n.updateAllI18nElements(container);
    return;
  }

  const t = (window.i18n && window.i18n.t) || ((k) => k);
  container.innerHTML = visibleHistory
    .map((item) => {
      const isClose = item.action === 'close' || item.action === 'decrease';
      const iconClass = isClose ? 'close' : item.side === 'long' ? 'long' : 'short';
      const icon = isClose
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
        : item.side === 'long'
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';

      let actionLabel;
      if (item.action === 'close') actionLabel = t('history.close');
      else if (item.action === 'decrease') actionLabel = t('history.reduce');
      else if (item.action === 'increase') actionLabel = t('trade.add');
      else actionLabel = item.side === 'long' ? t('history.long') : t('history.short');
      const unit = t('trade.pnlUnit');

      return `
        <div class="history-item">
          <div class="history-icon ${iconClass}">${icon}</div>
          <div class="history-info">
            <span class="history-action">${actionLabel}</span>
            <span class="history-qty">${item.quantity || 1}</span>
            <span class="history-leverage">${item.leverage || 1}x</span>
            <span class="history-price">${formatPrice(item.price)}</span>
          </div>
          <div>
            <span class="history-pnl ${item.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}${unit}</span>
            <span class="history-time">${formatTime(item.time)}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function updateUserPnLStats() {
  const signature = Number(state.userTotalPnl || 0).toFixed(2);
  if (signature === userPnLStatsSignature) return;
  userPnLStatsSignature = signature;
  if (elements.userTotalPnl) {
    const unit = translateOr('trade.pnlUnit', '积分');
    elements.userTotalPnl.textContent = `${state.userTotalPnl >= 0 ? '+' : ''}${state.userTotalPnl.toFixed(2)}${unit}`;
    elements.userTotalPnl.className = `stat-value ${state.userTotalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`;
  }
}

function updateGlobalPnlDisplay() {
  const signature = Number(state.globalUserPnl || 0).toFixed(2);
  if (signature === globalPnlDisplaySignature) return;
  globalPnlDisplaySignature = signature;
  if (elements.userGlobalPnl) {
    const unit = translateOr('trade.pnlUnit', '积分');
    elements.userGlobalPnl.textContent = `${state.globalUserPnl >= 0 ? '+' : ''}${state.globalUserPnl.toFixed(2)}${unit}`;
    elements.userGlobalPnl.className = `stat-value ${state.globalUserPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`;
  }
}

function updateAIPnLStats() {
  const signature = [
    Number(state.globalAiPnl || 0).toFixed(2),
    Number(state.aiVirtualBalance || 0).toFixed(2),
  ].join('|');
  if (signature === aiPnLStatsSignature) return;
  aiPnLStatsSignature = signature;
  if (elements.aiTotalPnl) {
    const unit = translateOr('trade.pnlUnit', '积分');
    elements.aiTotalPnl.textContent = `${state.globalAiPnl >= 0 ? '+' : ''}${state.globalAiPnl.toFixed(2)}${unit}`;
    elements.aiTotalPnl.className = `stat-value ${state.globalAiPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`;
  }
  const vbEl = document.getElementById('ai-virtual-balance');
  if (vbEl) {
    vbEl.textContent = `${Number(state.aiVirtualBalance || 0).toFixed(2)}${translateOr('trade.pnlUnit', '积分')}`;
  }
}

// =============================================================================
// 绉垎绠＄悊
// =============================================================================

function updateCreditsDisplay() {
  const { purchased, profit, freeCredits, freeClaimed, total } = state.credits;

  if (elements.creditsRemaining) {
    elements.creditsRemaining.textContent = `${translateOr('trade.pnlUnit', '积分')}: ${Number(total || 0).toFixed(2)}`;
  }

  if (elements.claimFreeBtn) {
    if (freeClaimed) {
      elements.claimFreeBtn.classList.add('claimed');
      elements.claimFreeBtn.disabled = true;
      elements.claimFreeBtn.title = window.i18n?.t?.('nav.claimed') || '今日已领取';
    } else {
      elements.claimFreeBtn.classList.remove('claimed');
      elements.claimFreeBtn.disabled = false;
      elements.claimFreeBtn.title = getClaimFreeTitle();
    }
  }

  if (elements.creditsDisplay) {
    if (total <= 0) {
      elements.creditsDisplay.classList.add('warning');
    } else {
      elements.creditsDisplay.classList.remove('warning');
    }
  }

  syncPatternRewardBadges();
}

function syncPatternRewardBadges() {
  const earned = Number(state.credits.patternEarnedToday || 0);
  const cap = Number(state.credits.patternDailyEarnCap || 2000);
  const showDot = state.isLoggedIn && earned < cap;
  ['pattern-mode-button-badge', 'pattern-mode-badge', 'pattern-start-btn-badge'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !showDot);
  });
}

function showPurchaseModal() {
  const modal = document.getElementById('purchase-modal');
  if (modal) {
    const currentCreditsEl = document.getElementById('purchase-current-credits');
    if (currentCreditsEl) {
      currentCreditsEl.textContent = Number(state.credits.remaining || 0).toFixed(2);
    }
    resetPurchaseFlow();
    modal.classList.remove('hidden');
  }
}

function setPurchaseRedeemStatus(message, type = '') {
  const status = document.getElementById('purchase-redeem-status');
  if (!status) return;
  status.textContent = message;
  status.className = 'purchase-redeem-status';
  if (type) {
    status.classList.add(type);
  }
}

function setPurchaseConvertStatus(message, type = '') {
  const status = document.getElementById('purchase-convert-status');
  if (!status) return;
  status.textContent = message;
  status.className = 'purchase-redeem-status';
  if (type) {
    status.classList.add(type);
  }
}

function setGeneratedRedeemCode(code = '', credits = 0) {
  const element = document.getElementById('purchase-generated-code');
  if (!element) return;
  element.textContent = formatGeneratedCodeText(code, credits);
}

function resetPurchaseFlow() {
  const redeemInput = document.getElementById('purchase-redeem-code');
  const convertInput = document.getElementById('purchase-convert-credits');
  if (redeemInput) {
    redeemInput.value = '';
  }
  if (convertInput) {
    convertInput.value = '';
  }
  setPurchaseRedeemStatus('');
  setPurchaseConvertStatus('');
  setGeneratedRedeemCode();
  setTaobaoMerchantListOpen(false);
}

function setTaobaoMerchantListOpen(isOpen = false) {
  const dropdown = document.getElementById('purchase-taobao-market');
  const button = document.getElementById('purchase-taobao-market-btn');
  const list = document.getElementById('purchase-taobao-merchant-list');
  dropdown?.classList.toggle('open', Boolean(isOpen));
  button?.classList.toggle('active', Boolean(isOpen));
  list?.classList.toggle('hidden', !isOpen);
}

function hidePurchaseModal() {
  const modal = document.getElementById('purchase-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  resetPurchaseFlow();
}

async function redeemCredits(code) {
  const t = window.i18n?.t ?? ((k) => k);
  const redeemCode = String(code || '').trim().toUpperCase();
  if (!redeemCode) {
    setPurchaseRedeemStatus(getRedeemRequiredMessage(), 'error');
    showError(getRedeemRequiredMessage());
    return;
  }

  try {
    const response = await fetch('/api/redeem-code', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code: redeemCode }),
    });

    const data = await response.json();

    if (data.unauthorized || response.status === 401) {
      logout();
      showError(t('error.sessionExpired'));
      return;
    }

    if (data.success) {
      if (data.credits) {
        state.credits = {
          purchased: data.credits.purchased,
          profit: data.credits.profit,
          freeCredits: data.credits.freeCredits,
          freeClaimed: data.credits.freeClaimed,
          total: data.credits.total,
          remaining: data.credits.remaining,
        };
        updateCreditsDisplay();
      } else {
        await fetchCredits();
      }
      hidePurchaseModal();
      showSuccessToast(`${t('purchase.success')} +${Number(data.creditsAdded || 0)}${t('purchase.unit')}`);
    } else {
      setPurchaseRedeemStatus(data.error || getRedeemFailedMessage(), 'error');
      showError(data.error || t('error.operationFailed'));
    }
  } catch (err) {
    console.error('Redeem credits error:', err);
    showError(window.i18n.t('error.operationFailed'));
  }
}

async function convertCreditsToRedeemCode(creditsInput) {
  const t = window.i18n?.t ?? ((k) => k);
  const credits = Math.floor(Number(creditsInput || 0));

  if (!Number.isFinite(credits) || credits <= 0) {
    setPurchaseConvertStatus(getConvertRequiredMessage(), 'error');
    showError(getConvertRequiredMessage());
    return;
  }

  if (credits < MIN_TRANSFER_REDEEM_CREDITS) {
    setPurchaseConvertStatus(getConvertMinMessage(), 'error');
    showError(getConvertMinMessage());
    return;
  }

  if (credits > MAX_REDEEM_CODE_CREDITS) {
    setPurchaseConvertStatus(getConvertMaxMessage(), 'error');
    showError(getConvertMaxMessage());
    return;
  }

  try {
    const response = await fetch('/api/redeem-code/convert', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ credits }),
    });

    const data = await response.json();

    if (data.unauthorized || response.status === 401) {
      logout();
      showError(t('error.sessionExpired'));
      return;
    }

    if (data.success) {
      if (data.credits) {
        state.credits = {
          purchased: data.credits.purchased,
          profit: data.credits.profit,
          freeCredits: data.credits.freeCredits,
          freeClaimed: data.credits.freeClaimed,
          total: data.credits.total,
          remaining: data.credits.remaining,
        };
        updateCreditsDisplay();
      } else {
        await fetchCredits();
      }

      setGeneratedRedeemCode(data.redeemCode?.code || '', data.redeemCode?.credits || credits);
      setPurchaseConvertStatus(`${t('purchase.convertSuccess')} -${Number(data.creditsDeducted || credits)}${t('purchase.unit')}`, 'success');
      showSuccessToast(`${t('purchase.convertSuccess')} ${data.redeemCode?.code || ''}`.trim());
    } else {
      setPurchaseConvertStatus(data.error || getConvertFailedMessage(), 'error');
      showError(data.error || t('error.operationFailed'));
    }
  } catch (err) {
    console.error('Convert credits to redeem code error:', err);
    showError(window.i18n.t('error.operationFailed'));
  }
}

async function fetchCredits() {
  const t = window.i18n?.t ?? ((k) => k);
  try {
    const response = await fetch('/api/credits', {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (response.status === 401 || data.authorized === false) {
      logout();
      showError(t('error.sessionExpired'));
      return;
    }

    if (!response.ok) {
      showError(t('error.operationFailed'));
      return;
    }

    if (data.authorized && data.credits) {
      state.credits = {
        purchased: data.credits.purchased || 0,
        profit: data.credits.profit || 0,
        freeCredits: data.credits.freeCredits || 0,
        freeClaimed: data.credits.freeClaimed || false,
        total: data.credits.total || 0,
        remaining: data.credits.remaining || 0,
        patternEarnedToday: data.credits.patternEarnedToday || 0,
        patternDailyEarnCap: data.credits.patternDailyEarnCap || 2000,
      };
      updateCreditsDisplay();
    }
  } catch (err) {
    console.error('Fetch credits error:', err);
    showError(t('error.operationFailed'));
  }
}

async function fetchUserSummary() {
  const t = window.i18n?.t ?? ((k) => k);
  try {
    const response = await fetch('/api/user-summary', {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (response.status === 401 || data.authorized === false) {
      logout();
      showError(t('error.sessionExpired'));
      return;
    }

    if (data.authorized) {
      state.userTotalPnl = Number(data.personalTotalPnl ?? data.totalPnl ?? 0);
      updateUserPnLStats();
    }
  } catch (err) {
    console.error('Fetch user summary error:', err);
  }
}

// 浜ゆ槗鎿嶄綔
// =============================================================================

async function sendTrade(action, event) {
  if (event && (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)) return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') return;
  if (event && (event.repeat || event.isComposing)) return;

  const t = window.i18n?.t ?? ((k) => k);
  try {
    const rawQuantity = Number.parseFloat(elements.tradeQuantity?.value);
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
    if (['open_long', 'open_short', 'increase_position', 'add_position'].includes(action) && quantity < MIN_USER_TRADE_MARGIN) {
      const error = translateOr('error.minTradeAmount', `开仓/加仓最低金额为 {0} 积分`).replace('{0}', MIN_USER_TRADE_MARGIN);
      showError(error);
      if (elements.tradeQuantity) elements.tradeQuantity.value = String(MIN_USER_TRADE_MARGIN);
      return { success: false, error };
    }
    const leverage = state.leverage || 1;
    const response = await fetch('/api/trade', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, quantity, leverage, symbol: state.chartSymbol }),
    });

    const data = await response.json();

    if (data.unauthorized || response.status === 401) {
      logout();
      showError(t('error.sessionExpired'));
      return data;
    }

    if (data.creditsExpired) {
      showError(data.error || t('error.creditInsufficient'));
      updateTradeButtons();
    }

    if (!data.success && data.error && !data.creditsExpired && !data.unauthorized) {
      showError(data.error);
    }

    if (data.action === 'force_close' || data.liquidated) {
      showError(`${t('error.marginCall')}${data.pnl >= 0 ? t('error.marginCallProfit') : t('error.marginCallLoss')} ${data.pnl?.toFixed(2)} ${t('trade.pnlUnit')}`);
    }

    if (data.action === 'decrease_position' && data.success) {
      showToast(`${t('success.reduce')} ${data.finalAmount?.toFixed(2)} ${t('trade.pnlUnit')}`);
    }
    if (data.action === 'increase_position' && data.success) {
      showToast(`${t('success.add')} ${data.additionalMargin?.toFixed(2)} ${t('trade.pnlUnit')}`);
    }

    if (data.success) {
      const prevPosition = state.userPosition;

      if (data.action === 'open_long' || data.action === 'open_short') {
        if (data.position) {
          upsertUserPosition(data.position);
        }
        if (data.position) {
          addToUserHistory({
            time: data.time || Date.now(),
            side: data.position.side,
            quantity: data.position.quantity || quantity,
            price: data.position.openPrice || data.price,
            pnl: 0,
            id: data.position.id,
            eventId: data.eventId ?? data.version ?? null,
            openPrice: data.position.openPrice,
            leverage: data.position.leverage || leverage,
          });
        }
      } else if (data.action === 'increase_position') {
        if (prevPosition) {
          upsertUserPosition({
            ...prevPosition,
            ...(data.position && typeof data.position === 'object' ? data.position : {}),
            quantity: data.newTotalQuantity || data.position?.quantity || prevPosition.quantity,
          });
          addToUserHistory({
            time: data.time || Date.now(),
            side: state.userPosition.side,
            quantity: data.quantity || quantity,
            price: data.price || state.userPosition.openPrice || prevPosition.openPrice || state.currentPrice,
            pnl: 0,
            id: state.userPosition.id || prevPosition.id,
            eventId: data.eventId ?? data.version ?? null,
            openPrice: state.userPosition.openPrice || prevPosition.openPrice,
            leverage: state.userPosition.leverage || prevPosition.leverage || leverage,
            action: 'increase',
          });
        }
      } else if (data.action === 'decrease_position') {
        if (data.remainingPosition || data.position) {
          upsertUserPosition(data.remainingPosition || data.position);
        } else {
          removeUserPosition(prevPosition || data.symbol || state.chartSymbol);
        }
        if (prevPosition) {
          addToUserHistory({
            time: data.time || Date.now(),
            side: prevPosition.side || 'long',
            quantity: data.reduceQuantity || quantity,
            price: data.price,
            pnl: data.pnl || 0,
            id: prevPosition.id,
            eventId: data.eventId ?? data.version ?? null,
            leverage: prevPosition.leverage,
            action: 'decrease',
          });
        }
      } else if (action === 'close' || data.action === 'close' || data.action === 'force_close') {
        removeUserPosition(prevPosition || data.position || data.symbol || state.chartSymbol);
        if (prevPosition) {
          addToUserHistory({
            time: data.time || Date.now(),
            side: prevPosition.side,
            quantity: prevPosition.quantity,
            price: data.price,
            pnl: data.pnl || 0,
            id: prevPosition.id,
            eventId: data.eventId ?? data.version ?? null,
            openPrice: prevPosition.openPrice,
            leverage: prevPosition.leverage,
            action: 'close',
          });
        }
      }
      // 先用交易响应立即刷新仓位卡片，点击后能马上看到结果；
      // 总盈亏属于次要展示，改为后台刷新——原先串行 await 会多等一个完整网络往返
      // （JWT 校验 + ensureWallet/getCreditInfo/getUserTradeStats 等多次 D1 查询），明显拖慢反馈。
      updateUserPositionCard();
      updateTradeButtons();
      const tradingChartManager = getTradingChartManager();
      if (tradingChartManager) {
        syncTradingChartDecorations(tradingChartManager);
      }
      void fetchUserSummary();
    }

    return data;
  } catch (err) {
    console.error('Trade error:', err);
    return { success: false, error: err.message };
  }
}

function addToUserHistory(position, action) {
  const entryPrice = position?.price ?? position?.executionPrice ?? position?.openPrice;
  const entry = {
    time: position.time || Date.now(),
    closeTime: position.closeTime || 0,
    side: position.side,
    quantity: position.quantity || 1,
    leverage: position.leverage || 1,
    price: entryPrice,
    pnl: position.pnl || 0,
    action: position.action || action || 'open',
    eventId: position.eventId ?? position.version ?? null,
    _posId: position.id,
  };
  state.userHistory = mergeRecentOperationRecords([entry], state.userHistory);
  saveUserHistory();
  updateUserHistory();
  updateUserPnLStats();
  addHistoricalMarker(entry);
}

function saveUserHistory(options = {}) {
  const storageKey = getUserScopedStorageKey('TdbUserHistory');
  if (!storageKey) return;
  try {
    const replace = options?.replace === true;
    const persistedHistory = !replace
      ? JSON.parse(localStorage.getItem(storageKey) || '[]')
      : [];
    state.userHistory = replace
      ? limitUserHistoryRecords(state.userHistory)
      : mergeRecentOperationRecords(state.userHistory, persistedHistory);
    localStorage.setItem(storageKey, JSON.stringify(state.userHistory));
  } catch (e) {
    console.error('Failed to save user history:', e);
  }
}

function loadUserHistory() {
  state.userHistory = [];
  const storageKey = getUserScopedStorageKey('TdbUserHistory');
  if (!storageKey) return;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      state.userHistory = mergeRecentOperationRecords(JSON.parse(saved));
    }
  } catch (e) {
    console.error('Failed to load user history:', e);
  }
}

function normalizeUserMarkerKeyValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(8);
  return String(value);
}

function normalizeUserMarkerEventTimeMs(value) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return Math.round(numericValue > 1e11 ? numericValue : numericValue * 1000);
}

function getUserMarkerStorageKey(marker) {
  const markerEventId = marker?.eventId ?? marker?.version ?? null;
  const markerTimeMs = normalizeUserMarkerEventTimeMs(marker?.eventTimeMs ?? marker?.time);
  if (markerEventId !== null && markerEventId !== undefined && markerEventId !== '') {
    return [
      'user',
      'event',
      normalizeUserMarkerKeyValue(markerEventId),
      normalizeUserMarkerKeyValue(markerTimeMs),
    ].join('|');
  }
  return [
    'user',
    'time',
    normalizeUserMarkerKeyValue(markerTimeMs),
    normalizeUserMarkerKeyValue(marker?.action || 'open'),
    normalizeUserMarkerKeyValue(marker?.side),
    normalizeUserMarkerKeyValue(marker?.price),
    normalizeUserMarkerKeyValue(marker?.quantity),
    normalizeUserMarkerKeyValue(marker?.positionId || marker?._posId || marker?.id),
  ].join('|');
}

function buildUserMarkerFromTradeEvent(data, fallbackPosition = null) {
  if (!data || !data.type) return null;
  const eventType = String(data.type || '').trim();
  const position = data.position || data.remainingPosition || fallbackPosition || null;
  const eventTime = Number(data.time || Date.now());

  if (eventType === 'user_open') {
    return {
      time: eventTime,
      side: data.side || position?.side || 'long',
      price: position?.openPrice || data.price,
      action: 'open',
      quantity: position?.quantity || data.quantity || 1,
      eventId: data.eventId ?? data.version ?? null,
      positionId: position?.id || data.positionId || null,
    };
  }

  if (eventType === 'user_increase') {
    return {
      time: eventTime,
      side: data.side || position?.side || fallbackPosition?.side || 'long',
      price: data.price || position?.openPrice || fallbackPosition?.openPrice || 0,
      action: 'increase',
      quantity: data.quantity || 1,
      eventId: data.eventId ?? data.version ?? null,
      positionId: position?.id || fallbackPosition?.id || data.positionId || null,
    };
  }

  if (eventType === 'user_decrease') {
    return {
      time: eventTime,
      side: data.side || fallbackPosition?.side || position?.side || 'long',
      price: data.price,
      action: 'decrease',
      quantity: data.reduceQuantity || data.quantity || 1,
      eventId: data.eventId ?? data.version ?? null,
      positionId: fallbackPosition?.id || position?.id || data.positionId || null,
    };
  }

  if (eventType === 'user_close') {
    return {
      time: eventTime,
      side: data.side || fallbackPosition?.side || 'long',
      price: data.price,
      action: 'close',
      quantity: data.quantity || fallbackPosition?.quantity || 1,
      eventId: data.eventId ?? data.version ?? null,
      positionId: data.positionId || fallbackPosition?.id || null,
    };
  }

  return null;
}

function syncTradeMarkerFromEvent(data, fallbackPosition = null) {
  const marker = buildUserMarkerFromTradeEvent(data, fallbackPosition);
  if (!marker || !marker.price) return;
  addHistoricalMarker(marker);
}

function addHistoricalMarker(entry) {
  if (!entry || !entry.price) return;
  const eventTimeMs = normalizeUserMarkerEventTimeMs(entry.eventTimeMs ?? entry.time) ?? Date.now();
  const marker = {
    time: Math.floor(eventTimeMs / 1000),
    eventTimeMs,
    eventId: entry.eventId ?? entry.version ?? null,
    side: entry.side || 'long',
    price: entry.price,
    action: entry.action || 'open',
    quantity: entry.quantity || 1,
    positionId: entry.positionId || entry._posId || entry.id || null,
  };
  const existingKey = getUserMarkerStorageKey(marker);
  // 幂等去重只按 storageKey（eventId 优先）：同一根K线内多次同向交易（开多→平仓→再开多）
  // 不应被 candle+action+side 的粗粒度规则吞掉
  if (!state.userMarkers.some((savedMarker) => getUserMarkerStorageKey(savedMarker) === existingKey)) {
    state.userMarkers.push(marker);
    const didTrim = state.userMarkers.length > MAX_USER_MARKERS;
    if (didTrim) {
      state.userMarkers = state.userMarkers.slice(-MAX_USER_MARKERS);
    }
    saveUserMarkers();
    const tradingChartManager = getTradingChartManager();
    if (tradingChartManager && isTradingChartSymbolActive()) {
      if (didTrim) {
        restoreUserMarkers();
      } else {
        tradingChartManager.addUserMarker(marker);
      }
    }
  }
}

function saveUserMarkers() {
  const storageKey = getUserScopedStorageKey('TdbUserMarkers');
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(state.userMarkers));
  } catch (e) { /* ignore */ }
}

function loadUserMarkers() {
  state.userMarkers = [];
  const storageKey = getUserScopedStorageKey('TdbUserMarkers');
  if (!storageKey) return;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      state.userMarkers = Array.isArray(parsed) ? parsed.slice(-MAX_USER_MARKERS) : [];
    }
  } catch (e) { /* ignore */ }
}

function restoreUserMarkers() {
  const tradingChartManager = getTradingChartManager();
  if (!tradingChartManager) return;
  tradingChartManager.clearUserMarkers();
  if (!isTradingChartSymbolActive()) return;
  if (!state.userMarkers.length) return;
  for (const marker of state.userMarkers) {
    tradingChartManager.addUserMarker(marker);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setStrategyUploadStatus(message, type = '') {
  if (!elements.strategyUploadStatus) return;
  elements.strategyUploadStatus.textContent = message || '';
  elements.strategyUploadStatus.className = 'strategy-upload-status';
  if (type) {
    elements.strategyUploadStatus.classList.add(type);
  }
}

function renderStrategyUploadPreview(result = null) {
  if (!elements.strategyUploadPreview) return;
  const strategy = result?.normalizedStrategy || result?.strategy || null;
  if (!strategy) {
    elements.strategyUploadPreview.innerHTML = `<div class="strategy-empty-state">${translateOr('strategy.previewEmpty', 'AI 标准化后的策略会显示在这里')}</div>`;
    return;
  }

  const providerLabel = result?.normalization?.usedFallback
    ? translateOr('strategy.normProvider', '标准化提供商')
    : escapeHtml(result?.normalization?.provider || 'AI');
  const providerClass = result?.normalization?.usedFallback ? 'fallback' : 'ai';
  const indicators = Array.isArray(strategy.indicators) ? strategy.indicators.join(' / ') : '--';
  const stopLoss = Number(strategy.risk?.stopLoss || 0).toFixed(2);
  const takeProfit = Number(strategy.risk?.takeProfit || 0).toFixed(2);
  const strategyId = result?.strategy?.id ? ` ID ${escapeHtml(result.strategy.id)}` : '';

  elements.strategyUploadPreview.innerHTML = `
    <div class="strategy-preview-header">
      <div>
        <div class="strategy-preview-title">${escapeHtml(strategy.name || '--')}</div>
        <div class="strategy-preview-meta">${escapeHtml(strategy.category || translateOr('strategy.defaultCategory', '综合'))} / ${escapeHtml(indicators)}</div>
      </div>
      <span class="strategy-preview-provider ${providerClass}">${providerLabel}</span>
    </div>
    <div class="strategy-preview-description">${escapeHtml(strategy.description || '--')}</div>
    <div class="strategy-preview-rule">
      <span>${translateOr('strategy.longLabel', '做多')}</span>
      <strong>${escapeHtml(strategy.conditions?.long || '--')}</strong>
    </div>
    <div class="strategy-preview-rule">
      <span>${translateOr('strategy.shortLabel', '做空')}</span>
      <strong>${escapeHtml(strategy.conditions?.short || '--')}</strong>
    </div>
    <div class="strategy-preview-risk">${translateOr('strategy.stopLoss', '止损')} ${stopLoss}% / ${translateOr('strategy.takeProfit', '止盈')} ${takeProfit}%${strategyId}</div>
  `;
}

function resetStrategyUploadForm() {
  if (elements.strategyUploadName) {
    elements.strategyUploadName.value = '';
  }
  if (elements.strategyUploadContent) {
    elements.strategyUploadContent.value = '';
  }
  setStrategyUploadStatus('');
  renderStrategyUploadPreview();
}

function showStrategyLibModal(tab = 'overview') {
  elements.strategyLibModal?.classList.remove('hidden');
  switchStrategyLibTab(tab);
  if (tab === 'overview') {
    fetchUserStrategyOverview(true).catch((error) => {
      console.error('Show strategy lib modal error:', error);
    });
  }
}

function hideStrategyLibModal() {
  elements.strategyLibModal?.classList.add('hidden');
  resetStrategyUploadForm();
}

function switchStrategyLibTab(tab) {
  const modal = elements.strategyLibModal;
  if (!modal) return;
  modal.querySelectorAll('.strategy-lib-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  modal.querySelectorAll('.strategy-lib-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === tab);
  });
  if (tab === 'overview') {
    fetchUserStrategyOverview(false).catch(() => {});
  } else if (tab === 'upload') {
    resetStrategyUploadForm();
  }
}

function renderUserStrategySummary() {
  if (!elements.strategyStatsSummary) return;
  const summary = state.userStrategySummary || {};
  const cards = [
    { label: translateOr('strategy.totalCount', '策略总数'), value: Number(summary.total || 0), subvalue: `${translateOr('strategy.enabledCount', '启用')} ${Number(summary.enabled || 0)}` },
    { label: translateOr('strategy.totalTrades', '累计交易'), value: Number(summary.totalTrades || 0), subvalue: translateOr('strategy.totalTradesDesc', 'AI 已记录的策略成交') },
    { label: translateOr('strategy.profitableLabel', '盈利策略'), value: Number(summary.profitable || 0), subvalue: `${translateOr('strategy.losingLabel', '亏损')} ${Number(summary.losing || 0)}` },
  ];

  elements.strategyStatsSummary.innerHTML = cards.map(card => `
    <div class="strategy-summary-card">
      <div class="strategy-summary-label">${card.label}</div>
      <div class="strategy-summary-value">${card.value}</div>
      <div class="strategy-summary-subvalue">${card.subvalue}</div>
    </div>
  `).join('');
}

function renderUserStrategyList() {
  if (!elements.strategyStatsList) return;
  if (!state.userStrategies.length) {
    elements.strategyStatsList.innerHTML = `<div class="strategy-empty-state">${translateOr('strategy.listEmpty', '暂无已上传策略')}</div>`;
    return;
  }

  elements.strategyStatsList.innerHTML = state.userStrategies.map((strategy) => {
    const toneClass = getSignedToneClass(strategy.totalPnlPercent);
    const isActive = state.selectedUserStrategyId === strategy.id;
    return `
      <button class="strategy-list-item ${isActive ? 'active' : ''}" data-strategy-id="${escapeHtml(strategy.id || '')}" type="button">
        <div class="strategy-list-item-head">
          <div class="strategy-list-item-name">${escapeHtml(strategy.name || strategy.id || '--')}</div>
          <div class="strategy-list-item-pnl ${toneClass}">${formatSignedValue(strategy.totalPnlPercent, 2, '%')}</div>
        </div>
        <div class="strategy-list-item-meta">${escapeHtml(strategy.category || translateOr('strategy.defaultCategory', '综合'))} · ${Number(strategy.tradeCount || 0)} ${translateOr('strategy.trades', '笔')} · ${translateOr('strategy.winRate', '胜率')} ${Number(strategy.winRate || 0).toFixed(1)}%</div>
        <div class="strategy-list-item-submeta">${escapeHtml((Array.isArray(strategy.indicators) ? strategy.indicators : []).join(' / ') || '--')}</div>
      </button>
    `;
  }).join('');

  elements.strategyStatsList.querySelectorAll('.strategy-list-item').forEach((button) => {
    button.addEventListener('click', () => {
      const nextId = button.dataset.strategyId;
      if (nextId) {
        fetchUserStrategyDetail(nextId).catch((error) => {
          console.error('Fetch user strategy detail error:', error);
        });
      }
    });
  });
}

function renderUserStrategyDetail() {
  if (!elements.strategyStatsDetail) return;
  const detail = state.selectedUserStrategyDetail;
  const strategy = detail?.strategy;
  if (!strategy) {
    elements.strategyStatsDetail.innerHTML = `<div class="strategy-empty-state">${translateOr('strategy.detailEmpty', '选择一条策略查看详情')}</div>`;
    return;
  }

  const trades = Array.isArray(detail?.trades) ? detail.trades : [];
  const tradeRows = trades.length > 0
    ? trades.map((trade) => {
      const toneClass = getSignedToneClass(trade.pnlPercent);
      return `
        <div class="strategy-trade-row">
          <div>
            <div class="strategy-trade-time">${escapeHtml(formatDateTime(trade.createdAt))}</div>
            <div class="strategy-trade-meta">${translateOr('strategy.marginLabel', '保证金')} ${Number(trade.margin || 0).toFixed(2)} · ${translateOr('strategy.pnlLabel', '盈亏')} ${formatSignedValue(trade.pnlAmount, 2)}</div>
          </div>
          <div class="strategy-trade-pnl ${toneClass}">${formatSignedValue(trade.pnlPercent, 2, '%')}</div>
        </div>
      `;
    }).join('')
    : `<div class="strategy-empty-state">${translateOr('strategy.noTrades', '暂无交易明细')}</div>`;

  const defaultCategory = translateOr('strategy.defaultCategory', '综合');
  elements.strategyStatsDetail.innerHTML = `
    <div class="strategy-detail-header">
      <div>
        <div class="strategy-detail-title">${escapeHtml(strategy.name || strategy.id || '--')}</div>
        <div class="strategy-detail-meta">${escapeHtml(strategy.id || '--')} · ${escapeHtml(strategy.category || defaultCategory)}</div>
      </div>
      <div class="strategy-detail-score ${getSignedToneClass(strategy.totalPnlPercent)}">${formatSignedValue(strategy.totalPnlPercent, 2, '%')}</div>
    </div>
    <div class="strategy-detail-metrics">
      <div class="strategy-detail-metric"><span>${translateOr('strategy.tradeCount', '累计交易')}</span><strong>${Number(strategy.tradeCount || 0)}</strong></div>
      <div class="strategy-detail-metric"><span>${translateOr('strategy.winRate', '胜率')}</span><strong>${Number(strategy.winRate || 0).toFixed(1)}%</strong></div>
      <div class="strategy-detail-metric"><span>${translateOr('strategy.avgPnl', '平均单笔')}</span><strong>${formatSignedValue(strategy.avgPnlPercent, 2, '%')}</strong></div>
      <div class="strategy-detail-metric"><span>${translateOr('strategy.lastTrade', '最近成交')}</span><strong>${escapeHtml(strategy.lastTradeAt ? formatDateTime(strategy.lastTradeAt) : '--')}</strong></div>
    </div>
    <div class="strategy-detail-block">
      <div class="strategy-detail-label">${translateOr('strategy.descriptionLabel', '策略描述')}</div>
      <div class="strategy-detail-text">${escapeHtml(strategy.description || '--')}</div>
    </div>
    <div class="strategy-detail-block">
      <div class="strategy-detail-label">${translateOr('strategy.longCondition', '做多条件')}</div>
      <div class="strategy-detail-text">${escapeHtml(strategy.conditions?.long || '--')}</div>
    </div>
    <div class="strategy-detail-block">
      <div class="strategy-detail-label">${translateOr('strategy.shortCondition', '做空条件')}</div>
      <div class="strategy-detail-text">${escapeHtml(strategy.conditions?.short || '--')}</div>
    </div>
    <div class="strategy-detail-block">
      <div class="strategy-detail-label">${translateOr('strategy.riskLabel', '风控参数')}</div>
      <div class="strategy-detail-text">${translateOr('strategy.stopLoss', '止损')} ${Number(strategy.risk?.stopLoss || 0).toFixed(2)}% · ${translateOr('strategy.takeProfit', '止盈')} ${Number(strategy.risk?.takeProfit || 0).toFixed(2)}%</div>
    </div>
    <div class="strategy-detail-block">
      <div class="strategy-detail-label">${translateOr('strategy.recentTrades', '最近交易')}</div>
      <div class="strategy-trades-list">${tradeRows}</div>
    </div>
  `;
}

async function fetchUserStrategyDetail(strategyId) {
  if (!strategyId) return;
  state.selectedUserStrategyId = strategyId;
  renderUserStrategyList();
  if (elements.strategyStatsDetail) {
    elements.strategyStatsDetail.innerHTML = `<div class="strategy-empty-state">${translateOr('strategy.loadingDetail', '正在加载策略详情...')}</div>`;
  }

  try {
    const response = await fetch(`/api/user-strategies?id=${encodeURIComponent(strategyId)}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (data.unauthorized || response.status === 401) {
      logout();
      showError(window.i18n?.t?.('error.sessionExpired') || '登录状态已失效');
      return;
    }

    if (!data.success) {
      showError(data.error || 'Strategy load failed');
      state.selectedUserStrategyDetail = null;
      renderUserStrategyDetail();
      return;
    }

    if (state.selectedUserStrategyId === strategyId) {
      state.selectedUserStrategyDetail = data;
      renderUserStrategyList();
      renderUserStrategyDetail();
    }
  } catch (error) {
    console.error('Fetch user strategy detail error:', error);
    showError('Strategy load failed');
    state.selectedUserStrategyDetail = null;
    renderUserStrategyDetail();
  }
}

async function fetchUserStrategyOverview(preserveSelection = true) {
  renderUserStrategySummary();
  if (elements.strategyStatsList) {
    elements.strategyStatsList.innerHTML = `<div class="strategy-empty-state">${translateOr('strategy.loadingList', '正在加载策略列表...')}</div>`;
  }
  if (elements.strategyStatsDetail) {
    elements.strategyStatsDetail.innerHTML = `<div class="strategy-empty-state">${translateOr('strategy.loadingDetail', '正在加载策略详情...')}</div>`;
  }

  try {
    const response = await fetch('/api/user-strategies', {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (data.unauthorized || response.status === 401) {
      logout();
      showError(window.i18n?.t?.('error.sessionExpired') || '登录状态已失效');
      return;
    }

    if (!data.success) {
      showError(data.error || '加载策略列表失败');
      state.userStrategies = [];
      state.userStrategySummary = { total: 0, enabled: 0, profitable: 0, losing: 0, totalTrades: 0 };
      state.selectedUserStrategyId = null;
      state.selectedUserStrategyDetail = null;
      renderUserStrategySummary();
      renderUserStrategyList();
      renderUserStrategyDetail();
      return;
    }

    state.userStrategies = Array.isArray(data.strategies) ? data.strategies : [];
    state.userStrategySummary = data.summary || { total: 0, enabled: 0, profitable: 0, losing: 0, totalTrades: 0 };
    const previousSelection = preserveSelection ? state.selectedUserStrategyId : null;
    const nextSelection = previousSelection && state.userStrategies.some(strategy => strategy.id === previousSelection)
      ? previousSelection
      : (state.userStrategies[0]?.id || null);
    state.selectedUserStrategyId = nextSelection;
    state.selectedUserStrategyDetail = null;
    renderUserStrategySummary();
    renderUserStrategyList();

    if (nextSelection) {
      await fetchUserStrategyDetail(nextSelection);
    } else {
      renderUserStrategyDetail();
    }
  } catch (error) {
    console.error('Fetch user strategy overview error:', error);
    showError('加载策略列表失败');
    state.userStrategies = [];
    state.userStrategySummary = { total: 0, enabled: 0, profitable: 0, losing: 0, totalTrades: 0 };
    state.selectedUserStrategyId = null;
    state.selectedUserStrategyDetail = null;
    renderUserStrategySummary();
    renderUserStrategyList();
    renderUserStrategyDetail();
  }
}

function showStrategyStatsModal() {
  showStrategyLibModal('overview');
}

function hideStrategyStatsModal() {
  hideStrategyLibModal();
}

async function submitUserStrategyUpload() {
  const name = String(elements.strategyUploadName?.value || '').trim();
  const rawText = String(elements.strategyUploadContent?.value || '').trim();
  if (!rawText) {
    setStrategyUploadStatus(translateOr('strategy.contentRequired', '请输入策略内容'), 'error');
    showError(translateOr('strategy.contentRequired', '请输入策略内容'));
    return;
  }

  if (elements.strategyUploadSubmit) {
    elements.strategyUploadSubmit.disabled = true;
  }
  setStrategyUploadStatus(translateOr('strategy.normalizing', '正在进行 AI 标准化重构...'), 'loading');

  try {
    const response = await fetch('/api/user-strategies', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, rawText }),
    });
    const data = await response.json();

    if (data.unauthorized || response.status === 401) {
      logout();
      showError(window.i18n?.t?.('error.sessionExpired') || '登录状态已失效');
      return;
    }

    if (!data.success) {
      setStrategyUploadStatus(data.error || translateOr('strategy.saveFailed', '策略保存失败'), 'error');
      showError(data.error || translateOr('strategy.saveFailed', '策略保存失败'));
      return;
    }

    renderStrategyUploadPreview(data);
    setStrategyUploadStatus(`${translateOr('strategy.savedToLib', '已完成标准化并保存到策略库')} · ${data.normalization?.usedFallback ? translateOr('strategy.fallbackProvider', '规则兜底') : (data.normalization?.provider || 'AI')}`, 'success');
    state.selectedUserStrategyId = data.strategy?.id || null;
    showSuccessToast(translateOr('strategy.saveSuccess', '策略已标准化并保存'));

    fetchUserStrategyOverview(true).catch((error) => {
      console.error('Refresh user strategy overview after upload error:', error);
    });
    setTimeout(() => switchStrategyLibTab('overview'), 1200);
  } catch (error) {
    console.error('Submit user strategy upload error:', error);
    setStrategyUploadStatus(translateOr('strategy.uploadFailed', '策略上传失败，请稍后再试'), 'error');
    showError(translateOr('strategy.uploadFailed', '策略上传失败，请稍后再试'));
  } finally {
    if (elements.strategyUploadSubmit) {
      elements.strategyUploadSubmit.disabled = false;
    }
  }
}

function updateSimTime() {
  // 更新持仓时长（仅更新文本，不重建 DOM）
  if (state.userPosition) {
    const durationEl = document.getElementById('user-position-duration');
    if (durationEl) {
      durationEl.textContent = formatDuration(Date.now() - state.userPosition.openTime);
    }
  }
  const aiSummary = getAIAggregatePositionSummary();
  if (aiSummary) {
    const durationEl = document.getElementById('ai-position-duration-total');
    if (durationEl) {
      durationEl.textContent = formatDuration(Date.now() - aiSummary.earliestOpenTime);
    }
  }
}

// =============================================================================
// 事件监听
// =============================================================================

function initEventListeners() {
  try {
  // 显示调试信息区域
  const debugInfo = document.getElementById('debug-info');
  const debugEmail = document.getElementById('debug-email');
  if (debugInfo) {
    debugInfo.style.display = 'block';
  }

  // 邮箱输入时更新调试显示
  const emailInput = document.getElementById('email-input');
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      if (debugEmail) {
        debugEmail.textContent = emailInput.value || '(空)';
      }
    });
  }

  // 登录相关
  if (elements.btnSendCode) {
    elements.btnSendCode.addEventListener('click', sendVerifyCode);
  } else {
    console.error('btnSendCode is null!');
  }
  elements.btnLogin?.addEventListener('click', verifyLogin);
  elements.btnResendCode?.addEventListener('click', () => resendCode(false));
  elements.logoutBtn?.addEventListener('click', logout);
  elements.errorClose?.addEventListener('click', hideError);
  elements.btnBack?.addEventListener('click', () => {
    // 返回第一步
    state.pendingEmail = null;
    // 清除保存的邮箱
    if (elements.stepCode) {
      elements.stepCode.classList.remove('active');
    }
    if (elements.stepEmail) {
      elements.stepEmail.classList.add('active');
    }
    if (elements.codeInput) {
      elements.codeInput.value = '';
    }
    updateCodeDots('');
  });

  // 注册步骤返回
  elements.btnRegisterBack?.addEventListener('click', () => {
    state.pendingEmail = null;
    elements.stepRegister?.classList.remove('active');
    elements.stepEmail?.classList.add('active');
    if (elements.regCodeInput) {
      elements.regCodeInput.value = '';
    }
  });

  // 注册重发验证码
  elements.btnRegResend?.addEventListener('click', () => resendCode(true));

  // 登录方式选项卡
  document.querySelectorAll('#login-tabs .login-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchLoginMode(tab.dataset.loginMode));
  });

  // 密码可见性切换
  document.querySelectorAll('[data-password-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.passwordToggle);
      if (!input) return;
      const t = window.i18n?.t ?? ((k) => k);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('visible', show);
      btn.querySelector('.eye-open').style.display = show ? 'none' : '';
      btn.querySelector('.eye-closed').style.display = show ? '' : 'none';
      btn.title = t(show ? 'login.hidePassword' : 'login.showPassword');
      btn.setAttribute('aria-label', btn.title);
    });
  });

  // 注册密码强度实时检测
  elements.regPasswordInput?.addEventListener('input', (e) => {
    const t = window.i18n?.t ?? ((k) => k);
    const box = document.getElementById('password-strength');
    const label = document.getElementById('strength-label');
    if (!box || !label) return;
    const pwd = e.target.value;
    if (!pwd) {
      box.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-zA-Z]/.test(pwd) && /\d/.test(pwd)) score++;
    if (pwd.length >= 12 || /[^a-zA-Z0-9]/.test(pwd)) score++;
    const level = score <= 1 ? 'weak' : score === 2 ? 'medium' : 'strong';
    box.dataset.strength = level;
    label.textContent = t(`login.strength${level[0].toUpperCase() + level.slice(1)}`);
  });

  // 邮箱输入跨选项卡同步
  const syncEmailInputs = (source, target) => {
    source?.addEventListener('input', () => {
      if (target) target.value = source.value;
    });
  };
  syncEmailInputs(elements.passwordEmailInput, elements.emailInput);
  syncEmailInputs(elements.emailInput, elements.passwordEmailInput);

  // 表单提交
  const formEmail = document.getElementById('form-email');
  const formCode = document.getElementById('form-code');
  const formPassword = document.getElementById('form-password');
  const formRegister = document.getElementById('form-register');
  formEmail?.addEventListener('submit', (e) => {
    e.preventDefault();
    sendVerifyCode();
  });
  formCode?.addEventListener('submit', (e) => {
    e.preventDefault();
    verifyLogin();
  });
  formPassword?.addEventListener('submit', (e) => {
    e.preventDefault();
    passwordLogin();
  });
  formRegister?.addEventListener('submit', (e) => {
    e.preventDefault();
    registerAndLogin();
  });

  // 回车键提交
  elements.emailInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendVerifyCode();
    }
  });

  elements.codeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      verifyLogin();
    }
  });

  // 注册验证码只能输入数字
  elements.regCodeInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });

  // 验证码只能输入数字
  elements.codeInput?.addEventListener('input', handleCodeInput);

  // 交易按钮 - 根据是否有持仓决定动作
  elements.btnLong?.addEventListener('click', () => {
    const hasPosition = state.userPosition !== null;
    if (hasPosition) {
      sendTrade('increase_position');
    } else {
      sendTrade('open_long');
    }
  });

  elements.btnShort?.addEventListener('click', () => {
    const hasPosition = state.userPosition !== null;
    if (hasPosition) {
      sendTrade('decrease_position');
    } else {
      sendTrade('open_short');
    }
  });

  elements.btnClose?.addEventListener('click', () => sendTrade('close'));

  // 数量输入框变化时更新按钮状态
  elements.tradeQuantity?.addEventListener('input', updateTradeButtons);
  elements.tradeQuantity?.addEventListener('change', updateTradeButtons);
  elements.tradeQuantityPlus10?.addEventListener('click', () => {
    const nextValue = getTradeQuantityQuickFillValue(0.1);
    if (!elements.tradeQuantity) return;
    elements.tradeQuantity.value = String(nextValue);
    elements.tradeQuantity.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // 杠杆输入
  const leverageInput = document.getElementById('leverage-input');
  leverageInput?.addEventListener('input', () => {
    let value = parseInt(leverageInput.value) || 1;
    if (value < 1) value = 1;
    if (value > 200) {
      value = 200;
      leverageInput.value = 200;
    }
    state.leverage = value;
  });
  leverageInput?.addEventListener('change', () => {
    let value = parseInt(leverageInput.value) || 1;
    if (value < 1) value = 1;
    if (value > 200) value = 200;
    leverageInput.value = value;
    state.leverage = value;
  });

  // 模式选择下拉菜单
  const modeDropdownBtn = document.getElementById('mode-dropdown-btn');
  const modeDropdown = document.getElementById('mode-dropdown');

  modeDropdownBtn?.addEventListener('click', () => {
    const isActive = modeDropdownBtn.classList.toggle('active');
    if (isActive) {
      const rect = modeDropdownBtn.getBoundingClientRect();
      modeDropdown.style.top = `${rect.bottom + 4}px`;
      modeDropdown.style.right = `${window.innerWidth - rect.right}px`;
      modeDropdown.classList.remove('hidden');
    } else {
      modeDropdown.classList.add('hidden');
    }
  });

  // 点击其他地方关闭下拉菜单
  document.addEventListener('click', (e) => {
    if (!modeDropdownBtn?.contains(e.target) && !modeDropdown?.contains(e.target)) {
      modeDropdownBtn?.classList.remove('active');
      modeDropdown?.classList.add('hidden');
    }
  });

  // 模式选项点击
  document.querySelectorAll('.mode-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === state.currentMode) return;

      // 更新选项状态
      document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 关闭下拉菜单
      modeDropdownBtn?.classList.remove('active');
      modeDropdown?.classList.add('hidden');

      // 切换模式
      switchMode(mode);
    });
  });

  // 对战按钮
  document.getElementById('battle-btn')?.addEventListener('click', () => {
    showBattleModal();
  });

  // 对战模态框关闭
  document.getElementById('battle-close')?.addEventListener('click', () => {
    hideBattleModal();
  });

  document.getElementById('battle-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'battle-modal') {
      hideBattleModal();
    }
  });

  // 开始对战按钮
  document.getElementById('battle-start-btn')?.addEventListener('click', async () => {
    await startBattle();
  });

  // 决策按钮（仅预选阶段内的 long/short 按钮）
  document.querySelectorAll('#battle-phase-preview .decision-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const direction = btn.dataset.direction;
      await submitBattleDecision(direction);
    });
  });

  // 启动走势按钮（AI 揭晓阶段）
  document.getElementById('battle-launch-replay-btn')?.addEventListener('click', async () => {
    await launchBattleReplay();
  });

  // 再来一局按钮
  document.getElementById('battle-replay-btn')?.addEventListener('click', async () => {
    await startBattle();
  });

  document.getElementById('pattern-start-btn')?.addEventListener('click', async () => {
    await startPatternAnalysis();
  });

  document.getElementById('pattern-restart-btn')?.addEventListener('click', async () => {
    await resetPatternMode();
    await startPatternAnalysis();
  });

  document.querySelectorAll('#pattern-phase-phase1 .decision-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const direction = btn.dataset.direction;
      await submitPatternDecision(direction);
    });
  });

  document.getElementById('pattern-ai-reveal-btn')?.addEventListener('click', async () => {
    await startPatternReplay();
  });

  // 充值按钮
  elements.creditsBtn?.addEventListener('click', () => {
    showPurchaseModal();
  });

  // 领取免费积分按钮
  elements.claimFreeBtn?.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/claim-free-credits', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : { success: false, error: await response.text() };
      if (response.status === 401 || data.unauthorized) {
        logout();
        showError(window.i18n.t('error.sessionExpired'));
        return;
      }
      if (!response.ok) {
        showError(data.error || window.i18n.t('error.claimFailed2'));
        return;
      }
      if (data.success) {
        await fetchCredits();
        showToast(window.i18n.t('success.claimFree'), 'success');
      } else {
        showError(data.error || window.i18n.t('error.claimFailed2'));
      }
    } catch (err) {
      console.error('Claim free credits error:', err);
      showError(window.i18n.t('error.claimNetwork'));
    }
  });

  // 充值弹窗关闭按钮
  document.getElementById('purchase-modal-close')?.addEventListener('click', () => {
    hidePurchaseModal();
  });

  // 点击弹窗背景关闭
  document.getElementById('purchase-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'purchase-modal') {
      hidePurchaseModal();
    }
  });

  document.getElementById('purchase-redeem-code')?.addEventListener('input', (e) => {
    e.target.value = String(e.target.value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setPurchaseRedeemStatus('');
  });

  document.getElementById('purchase-convert-credits')?.addEventListener('input', (e) => {
    e.target.value = String(e.target.value || '').replace(/[^0-9]/g, '');
    setPurchaseConvertStatus('');
  });

  document.getElementById('purchase-redeem-code')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      redeemCredits(e.target.value);
    }
  });

  document.getElementById('purchase-convert-credits')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      convertCreditsToRedeemCode(e.target.value);
    }
  });

  document.getElementById('purchase-confirm-btn')?.addEventListener('click', () => {
    const input = document.getElementById('purchase-redeem-code');
    redeemCredits(input?.value || '');
  });

  document.getElementById('purchase-convert-btn')?.addEventListener('click', () => {
    const input = document.getElementById('purchase-convert-credits');
    convertCreditsToRedeemCode(input?.value || '');
  });

  elements.strategyLibBtn?.addEventListener('click', () => showStrategyLibModal('overview'));
  document.getElementById('strategy-lib-close')?.addEventListener('click', hideStrategyLibModal);
  elements.strategyLibModal?.addEventListener('click', (e) => {
    if (e.target.id === 'strategy-lib-modal') {
      hideStrategyLibModal();
    }
  });
  elements.strategyLibModal?.querySelectorAll('.strategy-lib-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName) switchStrategyLibTab(tabName);
    });
  });
  elements.strategyUploadReset?.addEventListener('click', resetStrategyUploadForm);
  elements.strategyUploadSubmit?.addEventListener('click', () => {
    submitUserStrategyUpload();
  });
  elements.strategyUploadName?.addEventListener('input', () => setStrategyUploadStatus(''));
  elements.strategyUploadContent?.addEventListener('input', () => setStrategyUploadStatus(''));
  elements.chartRegionSelector?.addEventListener('click', (event) => {
    const button = event.target.closest('.chart-region-btn');
    if (!button) return;
    const region = normalizeChartRegion(button.dataset.region);
    if (region !== state.chartRegion) {
      applyChartRegion(region);
    }
  });
  elements.chartSymbolSelector?.addEventListener('pointerup', (event) => {
    const button = event.target.closest('.chart-symbol-btn');
    if (!button || !isPrimaryTouchLikePointerEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    lastChartSymbolPointerHandledAt = Date.now();
    applyChartSymbolSelection(button);
  });
  elements.chartSymbolSelector?.addEventListener('click', (event) => {
    if (shouldIgnoreSyntheticChartTimeframeClick(lastChartSymbolPointerHandledAt)) return;
    const button = event.target.closest('.chart-symbol-btn');
    applyChartSymbolSelection(button);
  });
  elements.chartTimeframeTrigger?.addEventListener('pointerup', (event) => {
    if (!isPrimaryTouchLikePointerEvent(event)) return;
    event.preventDefault();
    lastChartTimeframeTriggerPointerHandledAt = Date.now();
    toggleChartTimeframeMenu(event);
  });
  elements.chartTimeframeTrigger?.addEventListener('click', (event) => {
    if (shouldIgnoreSyntheticChartTimeframeClick(lastChartTimeframeTriggerPointerHandledAt)) return;
    toggleChartTimeframeMenu(event);
  });
  elements.chartTimeframeMenu?.addEventListener('pointerup', (event) => {
    const button = event.target.closest('.chart-timeframe-btn');
    if (!button || button.disabled || !isPrimaryTouchLikePointerEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    lastChartTimeframeMenuPointerHandledAt = Date.now();
    applyChartTimeframeSelection(button);
  });
  elements.chartTimeframeMenu?.addEventListener('click', (event) => {
    if (shouldIgnoreSyntheticChartTimeframeClick(lastChartTimeframeMenuPointerHandledAt)) return;
    event.stopPropagation();
    const button = event.target.closest('.chart-timeframe-btn');
    applyChartTimeframeSelection(button);
  });
  document.addEventListener('click', (event) => {
    if (!elements.chartTimeframeSelector?.contains(event.target)) {
      setChartTimeframeMenuOpen(false);
    }
  });
  elements.strategyStatsRefresh?.addEventListener('click', () => {
    fetchUserStrategyOverview(true).catch((error) => {
      console.error('Refresh user strategy overview error:', error);
    });
  });

  // 淘宝积分市场按钮 - 切换商家下拉列表
  let taobaoMerchantsLoaded = false;
  const taobaoMarketBtn = document.getElementById('purchase-taobao-market-btn');
  const taobaoMerchantList = document.getElementById('purchase-taobao-merchant-list');

  async function loadTaobaoMerchants() {
    if (!taobaoMerchantList) return;
    try {
      const response = await fetch('/api/taobao-merchants', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (data.success && Array.isArray(data.merchants) && data.merchants.length > 0) {
        taobaoMerchantList.innerHTML = data.merchants.map((m) => `
          <div class="purchase-merchant-item">
            <span class="purchase-merchant-name">${escapeHtml(m.name)}</span>
            <div class="purchase-merchant-actions">
              <div class="purchase-merchant-buttons">
                <a class="purchase-merchant-enter" href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" data-taobao-merchant-url="${escapeHtml(m.url)}" data-i18n="purchase.taobaoMerchantEnter">进入</a>
                <button class="purchase-merchant-copy" type="button" data-taobao-copy-url="${escapeHtml(m.url)}" data-i18n="purchase.taobaoMerchantCopy">复制链接</button>
              </div>
              <div class="purchase-merchant-hint" data-i18n="purchase.taobaoMerchantHint">打开淘宝查看商品</div>
            </div>
          </div>
        `).join('');
        taobaoMerchantsLoaded = true;
        if (window.i18n) window.i18n.updateDOM(taobaoMerchantList);
      } else {
        taobaoMerchantList.innerHTML = '<div class="purchase-merchant-empty" data-i18n="purchase.taobaoMerchantEmpty">暂无商家</div>';
        if (window.i18n) window.i18n.updateDOM(taobaoMerchantList);
      }
    } catch (error) {
      console.error('Load taobao merchants error:', error);
      taobaoMerchantList.innerHTML = '<div class="purchase-merchant-empty" data-i18n="purchase.taobaoMerchantLoading">正在加载淘宝商家...</div>';
    }
  }

  taobaoMarketBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!taobaoMerchantList) return;
    const isHidden = taobaoMerchantList.classList.contains('hidden');
    setTaobaoMerchantListOpen(isHidden);
    if (isHidden && !taobaoMerchantsLoaded) {
      loadTaobaoMerchants();
    }
  });

  // 商家列表点击 - 进入链接
  taobaoMerchantList?.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.purchase-merchant-copy');
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const t = window.i18n?.t ?? ((k) => k);
      const webUrl = copyBtn.dataset.taobaoCopyUrl || '';
      copyTextToClipboard(webUrl).then((ok) => {
        showToast(ok ? t('purchase.taobaoMerchantCopySuccess') : t('purchase.taobaoMerchantCopyFailed'), ok ? 'success' : 'error');
      });
      return;
    }

    const enterLink = e.target.closest('.purchase-merchant-enter');
    if (!enterLink) return;
    const webUrl = enterLink.dataset.taobaoMerchantUrl || enterLink.href || '';
    if (isMobileDevice() && webUrl) {
      e.preventDefault();
      tryOpenTaobaoApp(webUrl);
    }
    setTaobaoMerchantListOpen(false);
  });

  // 点击外部关闭商家下拉列表
  document.addEventListener('click', (e) => {
    if (!taobaoMarketBtn?.contains(e.target) && !taobaoMerchantList?.contains(e.target)) {
      setTaobaoMerchantListOpen(false);
    }
  });

  // 横屏提示关闭按钮
  elements.landscapeCloseBtn?.addEventListener('click', () => {
    elements.landscapeOverlay?.classList.add('hidden');
    clearLandscapeOverlayStyles();
    // 标记用户已手动关闭，避免再次自动显示
    hasAttemptedLandscapeAutoFullscreen = true;
    userDismissedFullscreenPrompt = true;
  });

  // 「我知道了」关闭按钮（全屏不可用时显示）
  const landscapeDismissBtn = document.getElementById('landscape-dismiss-btn');
  if (landscapeDismissBtn) {
    landscapeDismissBtn.addEventListener('click', () => {
      elements.landscapeOverlay?.classList.add('hidden');
      clearLandscapeOverlayStyles();
      userDismissedFullscreenPrompt = true;
      landscapeDismissBtn.classList.add('hidden');
    });
  }

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    const target = e.target;
    const tagName = typeof target?.tagName === 'string' ? target.tagName : '';
    const isEditableTarget = Boolean(
      target
      && (
        target.isContentEditable
        || tagName === 'INPUT'
        || tagName === 'TEXTAREA'
        || tagName === 'SELECT'
      )
    );
    if (isEditableTarget || e.defaultPrevented || e.isComposing || e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (state.currentMode !== 'trading') return;
    if (!state.isLoggedIn) return;

    switch (e.key.toLowerCase()) {
      case 'l':
        if (!elements.btnLong.disabled) {
          sendTrade(state.userPosition ? 'increase_position' : 'open_long');
        }
        break;
      case 's':
        if (!elements.btnShort.disabled) {
          sendTrade(state.userPosition ? 'decrease_position' : 'open_short');
        }
        break;
      case 'c':
        if (!elements.btnClose.disabled) sendTrade('close');
        break;
    }
  });
  } catch (err) {
    console.error('[ERROR] initEventListeners failed:', err);
  }
}

// =============================================================================
// 初始化// =============================================================================

// 防重复初始化标志
let isInitialized = false;

document.addEventListener('DOMContentLoaded', async () => {
  // 防止重复初始化
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  // 首先缓存所有 DOM 元素引用
  cacheElements();
  state.chartSymbol = loadStoredChartSymbol();
  state.chartTimeframe = loadStoredChartTimeframe();
  state.chartRegion = loadStoredChartRegion();
  // 区内不可用的存量品种（如中国站存的 BTC）回落到区内首选，并同步按钮显隐
  if (!isChartSymbolAllowed(state.chartSymbol, state.chartRegion)) {
    state.chartSymbol = getChartRegionSymbols(state.chartRegion)[0];
    saveStoredChartSymbol(state.chartSymbol);
  }
  syncChartSymbolButtons();
  syncChartTimeframeButtons();
  syncChartRegionButtons();

  // 默认模式标记，供 CSS 控制面板显示隐藏
  document.body.setAttribute('data-mode', state.currentMode || 'trading');

  // 初始化语言设置（同步）
  if (window.i18n?.initLanguage) {
    window.i18n.initLanguage();
  }

  // 启动 MutationObserver，自动翻译所有 [data-i18n] 元素
  if (window.i18n?.initI18n) {
    window.i18n.initI18n();
  }

  window.addEventListener('languageChanged', () => {
    updateUserPositionCard();
    updateAIPositionCard();
    updateTradeButtons();
    updateAILog();
    updateCreditsDisplay();
    updateFullscreenButton();
    checkScreenOrientation();
    refreshPatternLocalization();
  });

  // 初始化语言选择器（点击语言按钮展开下拉列表）
  initLanguageSelectors();

  // 初始化 PWA 安装按钮
  initPWAInstall();

  // 初始化事件监听器（放在 initChart 之前，确保按钮事件能绑定）
  initEventListeners();
  initOrientationListener(); // 初始化屏幕方向检测
  updateChartOverlay();

  // 检查登录状态
  if (loadAuthState() && state.isLoggedIn) {
    // 已登录，显示应用界面
    showApp();
    await refreshCurrentUserProfile();
    if (!state.isLoggedIn) {
      return;
    }
    hydrateCurrentUserTradingState();
    updateUserHistory();
    updateUserPnLStats();
    initSSE();
    void restorePrimaryChart().catch((error) => {
      console.error('启动时主图历史恢复失败', error);
    });
    fetchCredits().catch(() => {});
    fetchUserSummary().catch(() => {});
  } else {
    // 未登录，显示登录界面
    showLogin();
  }
});

// 常用语言列表（置顶显示）
const POPULAR_LANGUAGES = ['zh-CN', 'en', 'ja', 'ko', 'zh-TW'];

// 获取最近使用的语言
function getRecentLanguages() {
  try {
    const stored = localStorage.getItem('TdbRecentLangs');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return [];
}

// 保存最近使用的语言
function saveRecentLanguage(langCode) {
  try {
    let recent = getRecentLanguages();
    recent = recent.filter(l => l !== langCode);
    recent.unshift(langCode);
    recent = recent.slice(0, 3);
    localStorage.setItem('TdbRecentLangs', JSON.stringify(recent));
  } catch (e) {}
}

// 初始化语言选择器
function initLanguageSelectors() {
  const i18n = window.i18n || {};
  if (!i18n.getSupportedLanguages) return;

  const languages = i18n.getSupportedLanguages();
  const currentLang = i18n.getCurrentLanguage ? i18n.getCurrentLanguage() : 'zh-CN';
  const currentLangConfig = i18n.getLanguageConfig ? i18n.getLanguageConfig(currentLang) : null;

  const selectors = document.querySelectorAll('.lang-selector');
  if (selectors.length === 0) return;

  // 更新所有语言选择器的显示
  selectors.forEach(selector => {
    const flag = selector.querySelector('.lang-flag');
    const text = selector.querySelector('.lang-text');
    if (flag && currentLangConfig) flag.textContent = currentLangConfig.flag;
    if (text && currentLangConfig) text.textContent = currentLangConfig.nativeName;
  });

  // 为每个选择器绑定事件
  selectors.forEach(selector => {
    const btn = selector.querySelector('.lang-btn');
    const dropdown = selector.querySelector('.lang-dropdown');
    const list = selector.querySelector('.lang-list');
    const search = selector.querySelector('.lang-search-input');
    if (!btn || !dropdown) return;

    function toggleDropdown(show) {
      const isVisible = dropdown.style.display === 'block';
      if (show === undefined) show = !isVisible;
      dropdown.style.display = show ? 'block' : 'none';
      btn.parentElement.classList.toggle('open', show);
      if (show && search) {
        search.focus();
        search.value = '';
        renderLangList('');
      }
    }

    function selectLanguage(langCode, item) {
      if (i18n.setLanguage) i18n.setLanguage(langCode);
      saveRecentLanguage(langCode);
      const langConfig = languages.find(l => l.code === langCode);
      document.querySelectorAll('.lang-selector').forEach(sel => {
        const selFlag = sel.querySelector('.lang-flag');
        const selText = sel.querySelector('.lang-text');
        if (selFlag && langConfig) selFlag.textContent = langConfig.flag;
        if (selText && langConfig) selText.textContent = langConfig.nativeName;
      });
      document.querySelectorAll('.lang-item').forEach(i => i.classList.remove('active'));
      if (item) item.classList.add('active');
      toggleDropdown(false);
    }

    function renderLangList(filter = '') {
      const filterLower = filter.toLowerCase();
      const recentLangs = getRecentLanguages();

      // 过滤语言
      let filteredLangs = languages.filter(lang =>
        lang.name.toLowerCase().includes(filterLower) ||
        lang.nativeName.toLowerCase().includes(filterLower) ||
        lang.code.toLowerCase().includes(filterLower)
      );

      // 构建 HTML
      let html = '';

      // 如果没有搜索，显示分组
      if (!filter && recentLangs.length > 0) {
        // 最近使用
        html += `<div class="lang-group-title">最近使用</div>`;
        html += recentLangs
          .map(code => {
            const lang = languages.find(l => l.code === code);
            if (!lang) return '';
            return `
              <div class="lang-item ${lang.code === currentLang ? 'active' : ''}" data-lang="${lang.code}">
                <span class="lang-flag">${lang.flag}</span>
                <span class="lang-name">${lang.name}</span>
                <span class="lang-native">${lang.nativeName}</span>
              </div>
            `;
          })
          .join('');

        // 常用语言
        const popularFiltered = POPULAR_LANGUAGES
          .filter(code => !recentLangs.includes(code))
          .map(code => languages.find(l => l.code === code))
          .filter(lang => lang && (
            lang.name.toLowerCase().includes(filterLower) ||
            lang.nativeName.toLowerCase().includes(filterLower)
          ));

        if (popularFiltered.length > 0) {
          html += `<div class="lang-group-title">常用语言</div>`;
          html += popularFiltered
            .map(lang => `
              <div class="lang-item ${lang.code === currentLang ? 'active' : ''}" data-lang="${lang.code}">
                <span class="lang-flag">${lang.flag}</span>
                <span class="lang-name">${lang.name}</span>
                <span class="lang-native">${lang.nativeName}</span>
              </div>
            `)
            .join('');
        }

        // 所有语言
        html += `<div class="lang-group-title">所有语言</div>`;
        html += filteredLangs
          .filter(lang => !recentLangs.includes(lang.code) && !POPULAR_LANGUAGES.includes(lang.code))
          .map(lang => `
            <div class="lang-item ${lang.code === currentLang ? 'active' : ''}" data-lang="${lang.code}">
              <span class="lang-flag">${lang.flag}</span>
              <span class="lang-name">${lang.name}</span>
              <span class="lang-native">${lang.nativeName}</span>
            </div>
          `)
          .join('');
      } else {
        // 搜索模式：直接显示所有匹配结果
        html = filteredLangs
          .map(lang => `
            <div class="lang-item ${lang.code === currentLang ? 'active' : ''}" data-lang="${lang.code}">
              <span class="lang-flag">${lang.flag}</span>
              <span class="lang-name">${lang.name}</span>
              <span class="lang-native">${lang.nativeName}</span>
            </div>
          `)
          .join('');
      }

      list.innerHTML = html;

      // 缁戝畾鐐瑰嚮浜嬩欢
      list.querySelectorAll('.lang-item').forEach(item => {
        item.addEventListener('click', () => {
          const langCode = item.dataset.lang;
          selectLanguage(langCode, item);
        });
      });
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    });

    if (search) {
      search.addEventListener('input', (e) => {
        e.stopPropagation();
        renderLangList(e.target.value);
      });
      search.addEventListener('click', (e) => e.stopPropagation());
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const firstItem = list.querySelector('.lang-item');
          if (firstItem) {
            const langCode = firstItem.dataset.lang;
            selectLanguage(langCode, firstItem);
          }
        }
      });
    }

    dropdown.addEventListener('click', (e) => e.stopPropagation());
    renderLangList();
  });

  // 全局点击关闭
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.lang-dropdown').forEach(dropdown => {
      const selector = dropdown.parentElement;
      const btn = selector.querySelector('.lang-btn');
      if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
        selector.classList.remove('open');
      }
    });
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.lang-dropdown').forEach(dropdown => {
        dropdown.style.display = 'none';
        dropdown.parentElement.classList.remove('open');
      });
    }
  });

  // Ctrl/Cmd + L 快捷键打开语言选择器
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      const firstSelector = document.querySelector('.lang-selector');
      if (firstSelector) {
        const btn = firstSelector.querySelector('.lang-btn');
        const dropdown = firstSelector.querySelector('.lang-dropdown');
        if (btn && dropdown) {
          dropdown.style.display = 'block';
          firstSelector.classList.add('open');
          const search = firstSelector.querySelector('.lang-search-input');
          if (search) search.focus();
        }
      }
    }
  });
}

// =============================================================================
// 对战模式
// =============================================================================

/** 对战状态*/
const battleState = {
  phase: 'start', // start, preview, replay, result
  pattern: null,
  patternName: null,
  candles: [],
  signals: [],
  userDecision: null,
  aiDecision: null,
  aiConfidence: 0,
};

// =============================================================================
// Pattern Mode - 技术形态模拟
// =============================================================================

/** Pattern Mode 状态 */
const patternState = {
  phase: 'idle', // idle, phase1, phase2, phase3, result
  pattern: null,
  patternName: null,
  patternDescription: null,
  candles: [],
  signals: [],
  userDecision: null,
  aiDecision: null,
  aiConfidence: 0,
  aiAnalysis: null,
  replayIndex: 0,
  totalCandles: 0,
  previewPatternDrawings: [],
  teachingPatternDrawings: [],
  fullPatternDrawings: [],
  previewTimer: null,
  drawingTimer: null,
  aiTypingTimer: null,
  aiTypingToken: 0,
  _guessedToday: false,
};

const PATTERN_NAME_EN = Object.freeze({
  HEAD_SHOULDERS: 'Head and Shoulders',
  HEAD_SHOULDERS_BOTTOM: 'Inverse Head and Shoulders',
  DOUBLE_TOP: 'Double Top',
  DOUBLE_BOTTOM: 'Double Bottom',
  ASCENDING_TRIANGLE: 'Ascending Triangle',
  DESCENDING_TRIANGLE: 'Descending Triangle',
  BULL_FLAG: 'Bull Flag',
  BEAR_FLAG: 'Bear Flag',
  RECTANGLE_BOX_BULLISH: 'Rectangle Breakout',
  RECTANGLE_BOX_BEARISH: 'Rectangle Breakdown',
  FALLING_WEDGE: 'Falling Wedge',
  RISING_WEDGE: 'Rising Wedge',
  SMC_BULLISH_ACCUMULATION: 'SMC Bullish Accumulation',
  RANDOM: 'Random Walk',
});

const PATTERN_DESCRIPTION_EN = Object.freeze({
  HEAD_SHOULDERS: 'A classic bearish reversal pattern that often appears near the end of an uptrend.',
  HEAD_SHOULDERS_BOTTOM: 'A classic bullish reversal pattern that often appears near the end of a downtrend.',
  DOUBLE_TOP: 'Price fails twice near resistance and then turns lower, creating a bearish setup.',
  DOUBLE_BOTTOM: 'Price tests support twice and then rebounds, creating a bullish setup.',
  ASCENDING_TRIANGLE: 'Horizontal resistance and rising lows form a bullish breakout structure.',
  DESCENDING_TRIANGLE: 'Horizontal support and lower highs form a bearish breakdown structure.',
  BULL_FLAG: 'A sharp rally followed by a controlled pullback, often continuing upward after breakout.',
  BEAR_FLAG: 'A sharp selloff followed by a controlled rebound, often continuing downward after breakdown.',
  RECTANGLE_BOX_BULLISH: 'Price consolidates inside a range and then breaks upward.',
  RECTANGLE_BOX_BEARISH: 'Price consolidates inside a range and then breaks downward.',
  FALLING_WEDGE: 'Highs and lows both move lower while volatility contracts, often leading to an upside breakout.',
  RISING_WEDGE: 'Highs and lows both move higher while volatility contracts, often leading to a downside breakdown.',
  SMC_BULLISH_ACCUMULATION: 'A smart-money accumulation setup with manipulation, structure shift, and bullish continuation.',
  RANDOM: 'Random price action without a clear technical structure.',
});

const PATTERN_DRAWING_TEXT_EN = Object.freeze({
  '颈线 Neckline': 'Neckline',
  '颈线': 'Neckline',
  '左肩': 'Left Shoulder',
  '头部': 'Head',
  '右肩': 'Right Shoulder',
  '量度跌幅': 'Measured Move Down',
  '量度涨幅': 'Measured Move Up',
  '跌破目标': 'Breakdown Target',
  '突破目标': 'Breakout Target',
  '跌破颈线': 'Neckline Breakdown',
  '突破颈线': 'Neckline Breakout',
  '顶1': 'Top 1',
  '顶2': 'Top 2',
  '底1': 'Bottom 1',
  '底2': 'Bottom 2',
  '水平阻力': 'Horizontal Resistance',
  '水平支撑': 'Horizontal Support',
  '上升支撑': 'Rising Support',
  '下降压力': 'Descending Resistance',
  '高点受压': 'Resistance Holds',
  '低点抬高': 'Higher Lows',
  '高点降低': 'Lower Highs',
  '低点支撑': 'Support Holds',
  '旗杆': 'Flagpole',
  '旗面回调': 'Flag Pullback',
  '旗面反弹': 'Flag Rebound',
  '旗形突破': 'Flag Breakout',
  '旗形跌破': 'Flag Breakdown',
  '箱体上沿': 'Range Top',
  '箱体下沿': 'Range Bottom',
  '区间蓄势': 'Range Buildup',
  '箱体突破': 'Range Breakout',
  '箱体跌破': 'Range Breakdown',
  '收敛支撑': 'Converging Support',
  '收敛压力': 'Converging Resistance',
  '高低点下移': 'Lower Highs & Lows',
  '高低点抬升': 'Higher Highs & Lows',
  '波幅收敛': 'Volatility Contraction',
  '楔形突破': 'Wedge Breakout',
  '楔形跌破': 'Wedge Breakdown',
  '压力线': 'Resistance Line',
  '支撑线': 'Support Line',
  '收敛上破': 'Converging Breakout',
  '收敛下破': 'Converging Breakdown',
  '旗杆后收敛': 'Post-Flagpole Contraction',
  '三次冲高失败': 'Three Failed Highs',
  '三次探底企稳': 'Three Support Tests',
  '圆弧派发': 'Rounding Distribution',
  '圆弧吸筹': 'Rounding Accumulation',
  '杯口突破': 'Cup Rim Breakout',
  '杯口跌破': 'Cup Rim Breakdown',
  '通道延续': 'Channel Continuation',
  '通道跌破': 'Channel Breakdown',
  '通道突破': 'Channel Breakout',
  '波幅扩散': 'Range Expansion',
  '扩散反转': 'Broadening Reversal',
  '扩散楔形': 'Broadening Wedge',
  '菱形转弱': 'Diamond Reversal Down',
  '菱形转强': 'Diamond Reversal Up',
  '急涨急跌': 'Spike Reversal',
  '急跌急涨': 'V Reversal',
  '高位孤岛': 'Island Top',
  '低位孤岛': 'Island Bottom',
  '过陡冲顶': 'Exhaustion Blow-Off',
  '过陡杀跌': 'Exhaustion Selloff',
  '三推衰竭': 'Three-Drive Exhaustion',
  'D点反转': 'Point D Reversal',
  '谐波D点': 'Harmonic Point D',
  '深度D点': 'Deep Point D',
  '蝙蝠D点': 'Bat Point D',
  '极端D点': 'Extreme Point D',
  '鲨鱼C点': 'Shark Point C',
  '赛弗D点': 'Cypher Point D',
  '5-0回撤': '5-0 Retracement',
  '第5浪完成': 'Wave 5 Completion',
  '五浪推动': 'Five-Wave Impulse',
  'C浪结束': 'Wave C Completion',
  'ChoCh向下': 'ChoCh Down',
  'QM结构反转': 'QM Structure Reversal',
  '突破点2': 'Break of Point 2',
  '跌破点2': 'Breakdown of Point 2',
  '等幅上涨': 'Measured Move Up',
  '等幅下跌': 'Measured Move Down',
  '通道回踩': 'Channel Retest',
  '通道反抽': 'Channel Pullback',
  '缺口不补': 'Gap Holds',
  '终结楔形': 'Ending Diagonal',
  '弧形回调': 'Rounded Pullback',
  '弧形反弹': 'Rounded Rebound',
  '连续长上影': 'Long Upper Wicks',
  '连续长下影': 'Long Lower Wicks',
  '多次试探后突破': 'Repeated Tests Then Breakout',
  '多次试探后跌破': 'Repeated Tests Then Breakdown',
  '极浅回调': 'Shallow Pullback',
  '极浅反弹': 'Shallow Rebound',
  '吞没反转': 'Engulfing Reversal',
  '三K反转': 'Three-Candle Reversal',
  '三连阳': 'Three Bullish Candles',
  '三连阴': 'Three Bearish Candles',
  '双K同高': 'Equal-High Tweezer',
  '双K同低': 'Equal-Low Tweezer',
  entry: 'Entry',
  target: 'Target',
});

const PATTERN_SIGNAL_EN = Object.freeze({
  golden_cross: { name: 'Golden Cross', description: 'MA5 crosses above MA20, suggesting short-term bullish momentum.' },
  death_cross: { name: 'Death Cross', description: 'MA5 crosses below MA20, suggesting short-term bearish momentum.' },
  ma_bull_arrangement: { name: 'Bullish MA Alignment', description: 'MA5 > MA20 > MA50.' },
  ma_bear_arrangement: { name: 'Bearish MA Alignment', description: 'MA5 < MA20 < MA50.' },
  rsi_overbought: { name: 'RSI Overbought', description: 'RSI is elevated; watch for a pullback.' },
  rsi_oversold: { name: 'RSI Oversold', description: 'RSI is depressed; watch for a rebound.' },
  macd_bullish: { name: 'MACD Bullish Cross', description: 'MACD crosses above the signal line.' },
  macd_bearish: { name: 'MACD Bearish Cross', description: 'MACD crosses below the signal line.' },
  resistance_test: { name: 'Resistance Test', description: 'Price is approaching a resistance area.' },
  support_test: { name: 'Support Test', description: 'Price is approaching a support area.' },
  hammer: { name: 'Hammer', description: 'A long lower wick may indicate downside exhaustion.' },
  shooting_star: { name: 'Shooting Star', description: 'A long upper wick may indicate weakening upside momentum.' },
  bullish_engulfing: { name: 'Bullish Engulfing', description: 'A bullish candle engulfs the previous bearish candle.' },
  bearish_engulfing: { name: 'Bearish Engulfing', description: 'A bearish candle engulfs the previous bullish candle.' },
});

function isEnglishI18nLanguage() {
  return String(window.i18n?.getCurrentLanguage?.() || '').toLowerCase().startsWith('en');
}

function toTitleCaseFromKey(key) {
  return String(key || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(part => part === 'smc' ? 'SMC' : part === 'qm' ? 'QM' : part === 'abc' ? 'ABC' : part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function localizePatternName(patternKey, fallback = '') {
  if (!isEnglishI18nLanguage()) return fallback || '';
  return PATTERN_NAME_EN[patternKey] || toTitleCaseFromKey(patternKey) || fallback || '';
}

function localizePatternDescription(patternKey, fallback = '') {
  if (!isEnglishI18nLanguage()) return fallback || '';
  if (PATTERN_DESCRIPTION_EN[patternKey]) return PATTERN_DESCRIPTION_EN[patternKey];
  const name = localizePatternName(patternKey, fallback);
  return name ? `${name} is a technical pattern setup. Focus on whether price confirms the key support or resistance boundary.` : fallback || '';
}

function localizePatternDrawingText(text) {
  if (!isEnglishI18nLanguage()) return text;
  const raw = String(text || '');
  const exact = PATTERN_DRAWING_TEXT_EN[raw];
  if (exact) return exact;
  let next = raw
    .replace(/看涨/g, 'Bullish')
    .replace(/看跌/g, 'Bearish')
    .replace(/上涨/g, 'Up')
    .replace(/下跌/g, 'Down')
    .replace(/上升/g, 'Rising')
    .replace(/下降/g, 'Falling')
    .replace(/突破/g, 'Breakout')
    .replace(/跌破/g, 'Breakdown')
    .replace(/支撑/g, 'Support')
    .replace(/压力/g, 'Resistance')
    .replace(/阻力/g, 'Resistance')
    .replace(/收敛/g, 'Contraction')
    .replace(/反转/g, 'Reversal')
    .replace(/形态/g, 'Pattern')
    .replace(/走势/g, 'Setup');
  if (/[\u3400-\u9fff]/.test(next)) next = raw.length <= 8 ? 'Key Structure' : 'Technical Pattern';
  return next;
}

function localizePatternSignal(signal) {
  if (!isEnglishI18nLanguage() || !signal) return signal;
  const localized = PATTERN_SIGNAL_EN[signal.type] || {};
  return {
    ...signal,
    name: localized.name || localizePatternDrawingText(signal.name || ''),
    description: localized.description || localizePatternDrawingText(signal.description || ''),
  };
}

function localizePatternDrawings(drawings) {
  if (!Array.isArray(drawings)) return [];
  if (!isEnglishI18nLanguage()) return drawings;
  return drawings.map(drawing => (
    drawing && drawing.text
      ? { ...drawing, text: localizePatternDrawingText(drawing.text) }
      : drawing
  ));
}

function getLocalizedPatternAiAnalysis() {
  const raw = patternState.aiAnalysis || '';
  if (!isEnglishI18nLanguage()) return raw;
  const name = localizePatternName(patternState.pattern, patternState.patternName) || 'Technical Pattern';
  const dirMap = getPatternDirectionTextMap();
  const direction = dirMap[patternState.aiDecision] || dirMap.neutral;
  return `${name} Analysis

📐 Pattern Structure:
• The current setup is identified as ${name}.
• Price is near a confirmation area where the next breakout or breakdown matters most.
• The structure should be evaluated through support, resistance, trend-line behavior, and momentum.

📊 Key Points:
• AI bias: ${direction}.
• Confidence: ${Math.round(Number(patternState.aiConfidence || 0) * 100)}%.
• A clean break of the key boundary improves the signal quality.
• A fast return back inside the structure should be treated as a possible false breakout.

⚠️ Trading Plan:
• Entry: wait for confirmation around the key boundary.
• Stop: place risk outside the opposite side of the pattern.
• Target: estimate the move from the pattern height or the nearest swing range.`;
}

function refreshPatternLocalization() {
  if (patternState.pattern || patternState.patternName) {
    updatePatternPreviewUI(patternState);
  }
  if (patternState.phase === 'phase2') {
    const revealBtn = document.getElementById('pattern-ai-reveal-btn');
    const drawingDone = revealBtn && !revealBtn.classList.contains('hidden');
    updatePatternPhase2Stage(drawingDone ? 'drawing-ready' : 'drawing');
    setPatternStageWatermark((window.i18n?.t?.('pattern.stage2') || '阶段2'));
    updatePatternBattleChoices(false);
  } else if (patternState.phase === 'phase3') {
    setPatternStageWatermark((window.i18n?.t?.('pattern.stage3') || '阶段3'));
    updatePatternBattleChoices(true);
    renderPatternAiAnalysis();
  } else if (patternState.phase === 'result') {
    renderPatternAiAnalysis();
  }
  const patternChartManager = getPatternChartManager();
  if (!patternChartManager) return;
  const drawings = patternState.phase === 'phase2'
    ? (patternState.teachingPatternDrawings.length ? patternState.teachingPatternDrawings : patternState.previewPatternDrawings)
    : patternState.fullPatternDrawings;
  if (Array.isArray(drawings) && drawings.length) {
    patternChartManager.setDrawings(localizePatternDrawings(drawings));
  }
}

/**
 * 开始 Pattern Mode 分析
 */
async function startPatternAnalysis() {
  const t = window.i18n?.t ?? ((k) => k);

  try {
    const response = await fetch('/api/pattern/start', {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Start pattern error:', response.status, errorText);
      showError(t('error.patternStartFailed') || '启动形态模式失败');
      return;
    }

    const data = await response.json();

    if (!data.success) {
      showError(data.error || t('error.patternStartFailed') || '启动形态模式失败');
      return;
    }

    // 保存状态
    patternState.phase = 'phase1';
    patternState.pattern = data.pattern;
    patternState.patternName = data.patternName;
    patternState.patternDescription = data.patternDescription;
    patternState.candles = data.candles;
    patternState.signals = data.signals;
    patternState.aiDecision = data.aiDecision;
    patternState.aiConfidence = data.aiConfidence;
    patternState.aiAnalysis = data.aiAnalysis;
    patternState.replayIndex = 0;
    patternState.totalCandles = Number(data.replayCount) || 0;
    patternState.previewPatternDrawings = Array.isArray(data.previewPatternDrawings) ? data.previewPatternDrawings : [];
    patternState.teachingPatternDrawings = Array.isArray(data.teachingPatternDrawings) ? data.teachingPatternDrawings : patternState.previewPatternDrawings;
    patternState.fullPatternDrawings = Array.isArray(data.fullPatternDrawings) ? data.fullPatternDrawings : [];
    patternState._guessedToday = Boolean(data.guessedToday);
    patternState._earnedToday = Number(data.earnedToday || 0);
    patternState._dailyEarnCap = Number(data.dailyEarnCap || 2000);
    state.credits.patternEarnedToday = patternState._earnedToday;
    syncPatternRewardBadges();

    // 更新 UI
    updatePatternPreviewUI(data);

    // 切换到阶段1
    showPatternPhase('phase1');

    // 加载 K 线数据到图表
    const patternChartManager = getPatternChartManager();
    if (patternChartManager) {
      patternChartManager.reset();
      patternChartManager.clearDrawings();
      patternChartManager.followDrawingsToLatest(false);
      patternChartManager.setDrawingPlaybackTime(null);
    }
    playPatternPreviewCandles(data.candles);

    const progressEl = document.getElementById('pattern-replay-progress');
    if (progressEl) {
      progressEl.textContent = `0 / ${patternState.totalCandles || 0}`;
    }
    const progressFillEl = document.getElementById('pattern-replay-progress-fill');
    if (progressFillEl) {
      progressFillEl.style.width = '0%';
    }

  } catch (err) {
    console.error('Start pattern error:', err);
    showError(window.i18n?.t?.('error.patternStartFailed') || '启动形态模式失败');
  }
}

/**
 * 获取 Pattern Chart Manager
 */
function getPatternChartManager() {
  if (window.getChartManager) {
    return window.getChartManager('pattern');
  }
  return window.patternChartManager || null;
}

function getPatternDirectionTextMap() {
  const t = window.i18n?.t ?? ((k) => k);
  const getText = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };
  return {
    long: getText('pattern.long', '做多'),
    short: getText('pattern.short', '做空'),
    neutral: getText('pattern.neutral', '中性'),
  };
}

function setPatternDecisionEnabled(enabled) {
  document.querySelectorAll('#pattern-phase-phase1 .decision-btn').forEach(btn => {
    btn.disabled = !enabled;
  });
}

function setPatternStageWatermark(text) {
  const watermark = document.getElementById('pattern-stage-watermark');
  if (!watermark) return;
  watermark.classList.add('hidden');
}

function revealFullPatternDrawings(initialPlaybackTime = null) {
  const patternChartManager = getPatternChartManager();
  if (!patternChartManager) return;
  const drawings = Array.isArray(patternState.fullPatternDrawings) ? patternState.fullPatternDrawings : [];
  patternChartManager.followDrawingsToLatest(false);
  patternChartManager.setDrawingPlaybackTime(initialPlaybackTime);
  patternChartManager.setDrawings(localizePatternDrawings(drawings));
}

function clearPatternTimers() {
  if (patternState.previewTimer) {
    clearTimeout(patternState.previewTimer);
    patternState.previewTimer = null;
  }
  if (patternState.drawingTimer) {
    // 兼容 setInterval ID 与 requestAnimationFrame ID（浏览器中两者共用 ID 空间）
    clearInterval(patternState.drawingTimer);
    cancelAnimationFrame(patternState.drawingTimer);
    patternState.drawingTimer = null;
  }
  if (patternState.aiTypingTimer) {
    clearTimeout(patternState.aiTypingTimer);
    patternState.aiTypingTimer = null;
  }
  patternState.aiTypingToken += 1;
}

function playPatternPreviewCandles(candles) {
  const patternChartManager = getPatternChartManager();
  const previewCandles = Array.isArray(candles) ? candles : [];
  clearPatternTimers();
  setPatternDecisionEnabled(false);
  if (!patternChartManager || !previewCandles.length) {
    setPatternDecisionEnabled(true);
    return;
  }

  let index = 0;
  const playNext = () => {
    const candle = previewCandles[index];
    if (!candle) {
      patternState.previewTimer = null;
      return;
    }
    patternChartManager.addCandle(candle);
    index += 1;
    if (index < previewCandles.length) {
      patternState.previewTimer = setTimeout(playNext, 35);
    } else {
      patternState.previewTimer = null;
      setPatternDecisionEnabled(true);
    }
  };
  playNext();
}

function updatePatternPhase2Stage(stage) {
  const eyebrow = document.getElementById('pattern-phase2-eyebrow');
  const title = document.getElementById('pattern-phase2-title');
  const badge = document.getElementById('pattern-phase2-badge');
  const desc = document.getElementById('pattern-phase2-desc');
  if (eyebrow) { eyebrow.textContent = ''; eyebrow.style.display = 'none'; }
  if (title) { title.textContent = ''; title.style.display = 'none'; }
  if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
  if (desc) { desc.textContent = ''; desc.style.display = 'none'; }
}

function updatePatternBattleChoices(revealAi = false) {
  const userChoiceEl = document.getElementById('pattern-user-choice');
  const aiChoiceEl = document.getElementById('pattern-ai-choice');
  const dirMap = getPatternDirectionTextMap();

  if (userChoiceEl) {
    const v = userChoiceEl.querySelector('.choice-value');
    if (v) {
      v.textContent = dirMap[patternState.userDecision] || '--';
      v.className = `choice-value ${patternState.userDecision || ''}`;
    }
  }
  if (aiChoiceEl) {
    const v = aiChoiceEl.querySelector('.choice-value');
    if (v) {
      v.textContent = revealAi ? (dirMap[patternState.aiDecision] || '--') : '--';
      v.className = `choice-value ${revealAi ? (patternState.aiDecision || '') : ''}`;
    }
  }
}

function showPatternAiRevealButton(show) {
  const revealBtn = document.getElementById('pattern-ai-reveal-btn');
  if (revealBtn) {
    revealBtn.classList.toggle('hidden', !show);
    revealBtn.disabled = !show;
  }
}

function renderPatternAiAnalysis(animate = false) {
  const panels = Array.from(document.querySelectorAll('[data-pattern-ai-analysis-panel], #pattern-ai-analysis-panel'));
  const dirMap = getPatternDirectionTextMap();
  if (!panels.length) return;
  const dirText = dirMap[patternState.aiDecision] || '--';
  const confText = Math.round(Number(patternState.aiConfidence || 0) * 100);
  const patName = localizePatternName(patternState.pattern, patternState.patternName) || '';
  const raw = getLocalizedPatternAiAnalysis();
  const confidenceLabel = window.i18n?.t?.('pattern.confidence') || '置信度';
  if (patternState.aiTypingTimer) {
    clearTimeout(patternState.aiTypingTimer);
    patternState.aiTypingTimer = null;
  }
  patternState.aiTypingToken += 1;
  const typingToken = patternState.aiTypingToken;
  const copies = [];
  panels.forEach((panel) => {
    const title = panel.querySelector('[data-pattern-ai-analysis-title], #pattern-ai-analysis-title');
    const copy = panel.querySelector('[data-pattern-ai-analysis-copy], #pattern-ai-analysis-copy');
    panel.classList.remove('hidden', 'bullish', 'bearish', 'neutral');
    panel.classList.add(patternState.aiDecision === 'short' ? 'bearish' : patternState.aiDecision === 'long' ? 'bullish' : 'neutral');
    if (title) title.textContent = `${patName} · ${dirText} · ${confidenceLabel} ${confText}%`;
    if (!copy) return;
    copy.style.whiteSpace = 'pre-wrap';
    copies.push(copy);
  });
  if (!animate || !raw) {
    copies.forEach((copy) => { copy.textContent = raw; });
    return;
  }

  copies.forEach((copy) => { copy.textContent = ''; });
  let charIndex = 0;
  const charStep = raw.length > 600 ? 3 : raw.length > 300 ? 2 : 1;
  const typeNext = () => {
    if (typingToken !== patternState.aiTypingToken) return;
    const currentChar = raw[charIndex] || '';
    charIndex = Math.min(raw.length, charIndex + (currentChar === '\n' ? 1 : charStep));
    const done = charIndex >= raw.length;
    const visibleText = raw.slice(0, charIndex) + (done ? '' : '▌');
    copies.forEach((copy) => { copy.textContent = visibleText; });
    if (done) {
      patternState.aiTypingTimer = null;
      return;
    }
    const prevChar = raw[charIndex - 1] || '';
    const delay = prevChar === '\n' ? 120 : /[。！？.!?]/.test(prevChar) ? 95 : /[，,；;]/.test(prevChar) ? 55 : 24;
    patternState.aiTypingTimer = setTimeout(typeNext, delay);
  };
  typeNext();
}

function playPatternTeachingDrawings() {
  const patternChartManager = getPatternChartManager();
  if (!patternChartManager) return;
  clearPatternTimers();
  updatePatternPhase2Stage('drawing');
  updatePatternBattleChoices(false);
  showPatternAiRevealButton(false);

  const drawings = Array.isArray(patternState.teachingPatternDrawings) && patternState.teachingPatternDrawings.length
    ? patternState.teachingPatternDrawings
    : patternState.previewPatternDrawings;
  const drawingTimes = [];
  const collectTime = (time) => {
    const value = Number(time);
    if (Number.isFinite(value)) drawingTimes.push(value);
  };
  drawings.forEach((drawing) => {
    if (!drawing) return;
    collectTime(drawing.time);
    collectTime(drawing.time1);
    collectTime(drawing.time2);
    if (Array.isArray(drawing.points)) {
      drawing.points.forEach((point) => collectTime(point?.time));
    }
  });
  const previewCandles = patternState.candles || [];
  const firstTime = previewCandles[0]?.time ?? null;
  const lastTime = previewCandles[previewCandles.length - 1]?.time ?? null;
  if (!Number.isFinite(Number(firstTime)) || !Number.isFinite(Number(lastTime)) || firstTime === lastTime) {
    patternChartManager.setDrawings(localizePatternDrawings(drawings));
    patternChartManager.followDrawingsToLatest(false);
    patternChartManager.setDrawingPlaybackTime(null);
    patternChartManager.ensureLatestVisible({ force: true });
    updatePatternPhase2Stage('drawing-ready');
    showPatternAiRevealButton(true);
    return;
  }

  // ── 逐步绘制: 每个绘图元素一步一步添加 ──
  const localDrawings = localizePatternDrawings(drawings);
  patternChartManager.setDrawingPlaybackTime(null);
  patternChartManager.setDrawings(localDrawings);
  patternChartManager.followDrawingsToLatest(false);
  patternChartManager.ensureLatestVisible({ force: true });

  // 计算每个元素需要多少子步来绘制
  const subStepsPerDrawing = localDrawings.map(d => {
    if (!d) return 1;
    if (d.type === 'polyline') return 24; // 折线: 24 子步, 匀速手绘延伸
    if (d.type === 'trendline' || d.type === 'arrow') return 5; // 线/箭头: 快速画入
    if (d.type === 'polygon') return 4;
    if (d.type === 'hline') return 3;
    return 2; // circle, pointLabel, label, box 等: 快速出现
  });
  const totalSubSteps = subStepsPerDrawing.reduce((a, b) => a + b, 0);

  patternChartManager.setDrawingRevealCount(0, 0);

  // ── 60fps 手绘动画: requestAnimationFrame + 时间驱动进度 ──
  // 保持原有节奏 (每个子步 50ms), 但以 60fps 平滑插值, 线条延伸流畅无卡顿
  const subStepMs = 50;
  const startTs = performance.now();
  const tick = () => {
    if (patternState.drawingTimer === null) return; // 已被取消
    const elapsed = performance.now() - startTs;
    const globalSubStepFloat = elapsed / subStepMs;
    // 计算当前处于哪个绘图元素的第几子步
    let acc = 0;
    let drawingIdx = 0;
    let localSub = 0;
    for (let i = 0; i < subStepsPerDrawing.length; i++) {
      if (globalSubStepFloat <= acc + subStepsPerDrawing[i]) {
        drawingIdx = i;
        localSub = globalSubStepFloat - acc;
        break;
      }
      acc += subStepsPerDrawing[i];
      if (i === subStepsPerDrawing.length - 1) {
        drawingIdx = i;
        localSub = subStepsPerDrawing[i];
      }
    }
    const progress = Math.min(1, localSub / subStepsPerDrawing[drawingIdx]);
    patternChartManager.setDrawingRevealCount(drawingIdx + 1, progress);

    if (globalSubStepFloat >= totalSubSteps) {
      patternState.drawingTimer = null;
      patternChartManager.setDrawingRevealCount(null); // 完成: 显示全部
      updatePatternPhase2Stage('drawing-ready');
      showPatternAiRevealButton(true);
      return;
    }
    patternState.drawingTimer = requestAnimationFrame(tick);
  };
  patternState.drawingTimer = requestAnimationFrame(tick);
}

/**
 * 更新 Pattern 预览 UI
 */
function updatePatternPreviewUI(data) {
  const t = window.i18n?.t ?? ((k) => k);

  // 更新形态名称
  const patternNameEl = document.getElementById('pattern-name');
  if (patternNameEl) {
    patternNameEl.textContent = localizePatternName(data.pattern || patternState.pattern, data.patternName || patternState.patternName) || '--';
  }

  // 更新形态描述
  const patternDescEl = document.getElementById('pattern-description');
  if (patternDescEl) {
    patternDescEl.textContent = localizePatternDescription(data.pattern || patternState.pattern, data.patternDescription || patternState.patternDescription) || '';
  }

  // 重置决策按钮状态
  document.querySelectorAll('#pattern-phase-phase1 .decision-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.classList.remove('active');
    btn.disabled = false;
  });
}


/**
 * 显示 Pattern 阶段
 */
function showPatternPhase(phase, options = {}) {
  const phases = ['idle', 'phase1', 'phase2', 'phase3', 'result'];
  phases.forEach(p => {
    const el = document.getElementById(`pattern-phase-${p}`);
    if (el) {
      el.classList.toggle('hidden', p !== phase);
    }
  });
  const patternChartSection = document.getElementById('pattern-chart-section');
  if (patternChartSection) {
    patternChartSection.classList.toggle('pattern-result-stage', phase === 'result');
  }
  patternState.phase = phase;
  if (phase === 'idle') setPatternStageWatermark(null);
  if (phase === 'phase1') {
    setPatternStageWatermark(null);
  }
  if (phase === 'phase2') setPatternStageWatermark((window.i18n?.t?.('pattern.stage2') || '阶段2'));
  if (phase === 'phase3') {
    setPatternStageWatermark(null);
    if (!options.skipAiAnalysisRender) renderPatternAiAnalysis();
    // Hide phase3 descriptive text elements
    const phase3Container = document.getElementById('pattern-phase-phase3');
    if (phase3Container) {
      phase3Container.querySelectorAll('.pattern-topbar-eyebrow, .pattern-topbar-heading h4, .pattern-status-badge, .pattern-topbar-copy > p').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
      });
      const replayInfo = phase3Container.querySelector('.replay-info');
      if (replayInfo) replayInfo.style.display = 'none';
      const progressBar = phase3Container.querySelector('.pattern-replay-progress');
      if (progressBar) progressBar.style.display = 'none';
    }
  }
}

/**
 * 提交 Pattern 决策
 */
async function submitPatternDecision(direction) {
  const t = window.i18n?.t ?? ((k) => k);

  if (!['long', 'short'].includes(direction)) return;

  // 高亮选中的按钮并禁用所有决策按钮
  document.querySelectorAll('#pattern-phase-phase1 .decision-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.direction === direction);
    btn.classList.toggle('active', btn.dataset.direction === direction);
    btn.disabled = true;
  });

  patternState.userDecision = direction;

  try {
    const response = await fetch('/api/pattern/decision', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ direction }),
    });
    const data = await response.json();

    if (!data.success) {
      // 回滚按钮状态
      document.querySelectorAll('#pattern-phase-phase1 .decision-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.classList.remove('active');
        btn.disabled = false;
      });
      showError(data.error || t('error.patternSubmitFailed') || '提交决策失败');
      return;
    }

    // 提交成功后标记今天已猜过
    patternState._guessedToday = true;

    // 更新积分
    if (data.creditInfo) {
      state.credits = {
        purchased: data.creditInfo.purchased || 0,
        profit: data.creditInfo.profit || 0,
        freeCredits: data.creditInfo.freeCredits || 0,
        rewardCredits: data.creditInfo.rewardCredits || 0,
        total: data.creditInfo.total || 0,
        remaining: data.creditInfo.remainingCredits || data.creditInfo.total || 0,
      };
      updateCreditsDisplay();
    }

    // 更新状态
    patternState.userDecision = data.userDecision || patternState.userDecision;
    patternState.teachingPatternDrawings = Array.isArray(data.teachingPatternDrawings) ? data.teachingPatternDrawings : patternState.teachingPatternDrawings;

    // 切换到阶段2教学绘图
    showPatternPhase('phase2');
    playPatternTeachingDrawings();

  } catch (err) {
    console.error('Submit pattern decision error:', err);
    document.querySelectorAll('#pattern-phase-phase1 .decision-btn').forEach(btn => {
      btn.classList.remove('selected');
      btn.classList.remove('active');
      btn.disabled = false;
    });
    showError(t('error.patternSubmitFailed') || '提交决策失败，请稍后重试');
  }
}

/**
 * 查看AI形态解读 → 进入阶段3
 */
async function startPatternReplay() {
  const t = window.i18n?.t ?? ((k) => k);

  try {
    showPatternAiRevealButton(false);
    const lastPreviewCandle = patternState.candles[patternState.candles.length - 1];

    const revealResponse = await fetch('/api/pattern/reveal', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const revealData = await revealResponse.json();
    if (!revealData.success) {
      showError(revealData.error || t('error.patternStartFailed') || '启动走势揭示失败');
      showPatternAiRevealButton(true);
      return;
    }

    // 更新AI解读数据
    patternState.aiDecision = revealData.aiDecision || patternState.aiDecision;
    patternState.aiConfidence = Number(revealData.aiConfidence ?? patternState.aiConfidence ?? 0);
    patternState.aiAnalysis = revealData.aiAnalysis || patternState.aiAnalysis;

    // 切换到阶段3
    showPatternPhase('phase3', { skipAiAnalysisRender: true });
    renderPatternAiAnalysis(true);
    updatePatternBattleChoices(true);

    // 前端本地执行K线回放（服务器一次性返回所有回放K线）
    const replayCandles = Array.isArray(revealData.replayCandles) ? revealData.replayCandles : [];
    const total = replayCandles.length;
    if (total > 0) {
      let idx = 0;
      const replayInterval = 180; // 180ms 一根K线
      const patternChartManager = getPatternChartManager();

      const playNext = () => {
        if (idx >= total) {
          // 回放完成 → 显示结果
          if (revealData.result) {
            handlePatternResult(revealData.result, revealData);
          }
          return;
        }
        const candle = replayCandles[idx];
        if (patternChartManager && candle) {
          patternChartManager.addCandle(candle);
          if (candle.time !== undefined) {
            patternChartManager.setDrawingPlaybackTime(candle.time);
          }
        }
        idx++;
        patternState.replayIndex = idx;
        patternState.totalCandles = total;

        // 更新进度显示
        const progressEl = document.getElementById('pattern-replay-progress');
        if (progressEl) progressEl.textContent = `${idx} / ${total}`;
        const progressFillEl = document.getElementById('pattern-replay-progress-fill');
        if (progressFillEl) progressFillEl.style.width = `${Math.min(100, (idx / total) * 100)}%`;

        patternState.replayTimer = setTimeout(playNext, replayInterval);
      };
      playNext();
    } else if (revealData.result) {
      // 没有回放K线，直接显示结果
      handlePatternResult(revealData.result, revealData);
    }

  } catch (err) {
    console.error('Start pattern replay error:', err);
    showError(t('error.patternStartFailed') || '启动回放失败');
  }
}

/**
 * 处理 Pattern 结果
 */
function handlePatternResult(data, revealData = {}) {
  showPatternPhase('result');

  // 更新积分
  if (revealData.creditInfo) {
    state.credits = {
      purchased: revealData.creditInfo.purchased || 0,
      profit: revealData.creditInfo.profit || 0,
      freeCredits: revealData.creditInfo.freeCredits || 0,
      rewardCredits: revealData.creditInfo.rewardCredits || 0,
      total: revealData.creditInfo.total || 0,
      remaining: revealData.creditInfo.remainingCredits || revealData.creditInfo.total || 0,
      patternEarnedToday: Number(revealData.earnedToday ?? state.credits.patternEarnedToday ?? 0),
      patternDailyEarnCap: state.credits.patternDailyEarnCap || 2000,
    };
    updateCreditsDisplay();
  }

  const {
    userCorrect, aiCorrect, finalDirection, priceChange, signals,
    userDecision, aiDecision, patternName, explanation,
  } = data;
  patternState.aiDecision = aiDecision || patternState.aiDecision;
  patternState.patternName = patternName || patternState.patternName;
  renderPatternAiAnalysis();

  const t = window.i18n?.t ?? ((k) => k);
  const userWin = Boolean(userCorrect);
  const rewardCredited = Number(revealData.rewardCredited || 0);

  const resultTitle = document.getElementById('pattern-result-title');
  const resultDesc = document.getElementById('pattern-result-desc');

  if (resultTitle) {
    const titleKey = userWin ? 'pattern.predictCorrect' : 'pattern.predictWrong';
    resultTitle.textContent = t(titleKey) || (userWin ? '预测正确！' : '预测错误');
    resultTitle.className = `result-title ${userWin ? 'win' : 'lose'}`;
  }

  if (resultDesc) {
    if (userWin && rewardCredited > 0) {
      resultDesc.innerHTML = `<span class="pattern-result-credit win">+${rewardCredited} ${t('purchase.unit') || '积分'}</span>`;
    } else if (userWin) {
      resultDesc.innerHTML = `<span class="pattern-result-credit cap">${t('pattern.rewardCap') || '今日积分已达上限'}</span>`;
    } else {
      resultDesc.innerHTML = `<span class="pattern-result-credit lose">-10 ${t('purchase.unit') || '积分'}</span>`;
    }
  }

  // 用户结果
  const userResultEl = document.getElementById('pattern-user-result');
  if (userResultEl) {
    const valueEl = userResultEl.querySelector('.result-value');
    const dirMap = getPatternDirectionTextMap();
    if (valueEl) valueEl.textContent = dirMap[userDecision] || '--';
  }

  // 统计
  const finalDirEl = document.getElementById('pattern-final-direction');

  if (finalDirEl) {
    const dirTextMap = getPatternDirectionTextMap();
    const dirMap = { long: `${dirTextMap.long} ↗`, short: `${dirTextMap.short} ↘`, neutral: dirTextMap.neutral };
    finalDirEl.textContent = dirMap[finalDirection] || '--';
    finalDirEl.className = `stat-value ${finalDirection === 'long' ? 'up' : finalDirection === 'short' ? 'down' : ''}`;
  }

  if (Array.isArray(data.fullPatternDrawings)) {
    patternState.fullPatternDrawings = data.fullPatternDrawings;
    revealFullPatternDrawings(null);
  }

  // 信号总结
  const signalsSummaryList = document.getElementById('pattern-signals-summary');
  if (signalsSummaryList && signals) {
    signalsSummaryList.innerHTML = signals.slice(0, 1).map(signal => localizePatternSignal(signal)).map(signal => `
      <div class="signals-summary-item">
        <span class="signal-icon ${signal.direction}">${signal.direction === 'bullish' ? '↗' : signal.direction === 'bearish' ? '↘' : '→'}</span>
        <span class="signal-name">${signal.name}</span>
        <span class="signal-desc">${signal.description || ''}</span>
      </div>
    `).join('');
  }
}

/**
 * 重置 Pattern Mode
 */
async function resetPatternMode() {
  try {
    await fetch('/api/pattern/reset', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (err) {
    console.error('Reset pattern error:', err);
  }

  // 重置本地状态
  patternState.phase = 'idle';
  patternState.pattern = null;
  patternState.patternName = null;
  patternState.patternDescription = null;
  patternState.candles = [];
  patternState.signals = [];
  patternState.userDecision = null;
  patternState.aiDecision = null;
  patternState.aiConfidence = 0;
  patternState.aiAnalysis = null;
  patternState.replayIndex = 0;
  patternState.totalCandles = 0;
  patternState.previewPatternDrawings = [];
  patternState.teachingPatternDrawings = [];
  patternState.fullPatternDrawings = [];
  clearPatternTimers();
  const patternChartManager = getPatternChartManager();
  if (patternChartManager) {
    patternChartManager.clearDrawings();
  }

  // 显示开始按钮
  showPatternPhase('idle');
}

/**
 * 显示对战模态框
 */
function showBattleModal() {
  const modal = document.getElementById('battle-modal');
  if (!modal) return;

  battleState.phase = 'start';
  battleState.pattern = null;
  battleState.candles = [];
  battleState.signals = [];
  battleState.userDecision = null;
  battleState.aiDecision = null;

  // 显示开始阶段
  showBattlePhase('start');

  modal.classList.remove('hidden');
}

/**
 * 隐藏对战模态框
 */
function hideBattleModal() {
  const modal = document.getElementById('battle-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  // 在预测模式下关闭对话框时重新显示“开始预测”浮层
  if (state.currentMode === 'prediction') {
    showBattleStartButton();
  }
}

/**
 * 显示对战模式的特定阶段 */
function showBattlePhase(phase) {
  const phases = ['start', 'preview', 'reveal', 'replay', 'result'];
  phases.forEach(p => {
    const el = document.getElementById(`battle-phase-${p}`);
    if (el) {
      el.classList.toggle('hidden', p !== phase);
    }
  });
  battleState.phase = phase;
}

/**
 * 开始对战 */
async function startBattle() {
  try {
    const response = await fetch('/api/battle/start', {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Start battle error:', response.status, errorText);
      showError(`${window.i18n.t('error.battleFailed')}: ${response.status}`);
      return;
    }

    const data = await response.json();

    if (!data.success) {
      showError(data.error || window.i18n.t('error.battleFailed'));
      return;
    }

    // 保存状态
    battleState.pattern = data.pattern;
    battleState.patternName = data.patternName;
    battleState.candles = data.candles;
    battleState.signals = data.signals;
    battleState.aiDecision = data.aiDecision;
    battleState.aiConfidence = data.aiConfidence;

    // 更新UI
    updateBattleUI(data);

    // 切换到预览阶段
    showBattlePhase('preview');

    // 加载K线数据到图表
    const predictionChartManager = getPredictionChartManager();
    if (predictionChartManager) {
      predictionChartManager.reset();
      predictionChartManager.loadHistory(data.candles);
    }

  } catch (err) {
    console.error('Start battle error:', err);
    showError(window.i18n.t('error.battleFailed'));
  }
}

/**
 * 更新对战预选阶段 UI（仅技术信号，不含 AI 决策） */
function updateBattleUI(data) {
  const t = (window.i18n && window.i18n.t) || ((k) => k);
  // 更新信号列表
  const signalsList = document.getElementById('signals-list');
  if (signalsList && data.signals) {
    if (data.signals.length === 0) {
      signalsList.innerHTML = `<div class="signal-item" data-i18n="battle.noSignals">${t('battle.noSignals')}</div>`;
    } else {
      signalsList.innerHTML = data.signals.map(signal => {
        const strengthKey = signal.strength === 'very_strong' ? 'battle.signalVeryStrong'
          : signal.strength === 'strong' ? 'battle.signalStrong' : 'battle.signalMedium';
        return `
          <div class="signal-item">
            <span class="signal-icon ${signal.direction}">${signal.direction === 'bullish' ? '↗' : signal.direction === 'bearish' ? '↘' : '→'}</span>
            <span class="signal-name">${signal.name}</span>
            <span class="signal-desc">${signal.description || ''}</span>
            <span class="signal-strength ${signal.strength}" data-i18n="${strengthKey}">${t(strengthKey)}</span>
          </div>
        `;
      }).join('');
    }
  }

  // 重置决策按钮选中状态
  document.querySelectorAll('#battle-phase-preview .decision-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.disabled = false;
  });

  // 重置下注金额为默认值
  const betInput = document.getElementById('battle-bet-amount');
  if (betInput) betInput.value = 10;
}

/**
 * 更新 AI 揭晓阶段 UI（显示双方选择 + AI 分析 + 下注金额） */
function updateBattleRevealUI(data) {
  const t = (window.i18n && window.i18n.t) || ((k) => k);
  const dirMap = { long: t('battle.long'), short: t('battle.short'), neutral: t('battle.neutral') };

  // 用户选择
  const userBox = document.getElementById('reveal-user-choice');
  if (userBox) {
    const valueEl = userBox.querySelector('.choice-value');
    const betEl = document.getElementById('reveal-user-bet');
    if (valueEl) {
      valueEl.textContent = dirMap[data.userDecision] || '--';
      valueEl.className = `choice-value ${data.userDecision}`;
    }
    if (betEl) {
      betEl.textContent = `${t('battle.betAmount')}: ${data.userBet} ${t('nav.credits')}`;
    }
  }

  // AI 选择
  const aiBox = document.getElementById('reveal-ai-choice');
  if (aiBox) {
    const valueEl = aiBox.querySelector('.choice-value');
    const confEl = document.getElementById('reveal-ai-confidence');
    if (valueEl) {
      valueEl.textContent = dirMap[data.aiDecision] || '--';
      valueEl.className = `choice-value ${data.aiDecision}`;
    }
    if (confEl) {
      confEl.textContent = `${t('battle.confidence') || '置信度'}: ${((data.aiConfidence || 0) * 100).toFixed(0)}%`;
    }
  }

  // AI 分析详情
  const analysisTextEl = document.getElementById('reveal-ai-analysis-text');
  if (analysisTextEl) {
    analysisTextEl.textContent = data.aiAnalysis || '--';
  }

  // 重置启动走势按钮状态
  const launchBtn = document.getElementById('battle-launch-replay-btn');
  if (launchBtn) launchBtn.disabled = false;
}

/**
 * 提交对战决策（带下注金额），成功后切到 AI 揭晓阶段，由 battle_ai_reveal SSE 事件更新 UI
 */
async function submitBattleDecision(direction) {
  const t = window.i18n?.t ?? ((k) => k);

  // 只允许 long / short
  if (!['long', 'short'].includes(direction)) return;

  // 读取下注金额
  const betInput = document.getElementById('battle-bet-amount');
  const amount = Math.floor(Number(betInput?.value || 0));
  if (!amount || amount < 1) {
    showError(t('battle.betInvalid') || '请输入有效的下注金额');
    return;
  }

  // 高亮选中的按钮并禁用所有决策按钮，防止重复提交
  document.querySelectorAll('#battle-phase-preview .decision-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.direction === direction);
    btn.disabled = true;
  });

  battleState.userDecision = direction;
  battleState.userBet = amount;

  try {
    const response = await fetch('/api/battle/decision', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ direction, amount }),
    });
    const data = await response.json();

    if (!data.success) {
      // 回滚按钮状态
      document.querySelectorAll('#battle-phase-preview .decision-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.disabled = false;
      });
      showError(data.error || t('error.battleSubmitFailed'));
      return;
    }

    // 刷新积分余额
    fetchCredits().catch(() => {});

    // 乐观切换到揭晓阶段，SSE battle_ai_reveal 事件会兜底再更新一次
    updateBattleRevealUI(data);
    showBattlePhase('reveal');
  } catch (err) {
    console.error('Submit decision error:', err);
    document.querySelectorAll('#battle-phase-preview .decision-btn').forEach(btn => {
      btn.classList.remove('selected');
      btn.disabled = false;
    });
    showError(t('error.battleSubmitFailed') || '提交决策失败，请稍后重试');
  }
}

/**
 * 用户点击“启动走势”按钮 - 调用后端开始快速回放 */
async function launchBattleReplay() {
  const t = window.i18n?.t ?? ((k) => k);
  const btn = document.getElementById('battle-launch-replay-btn');
  if (btn) btn.disabled = true;

  try {
    const response = await fetch('/api/battle/replay', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) {
      showError(data.error || t('error.battleFailed'));
      if (btn) btn.disabled = false;
      return;
    }
    // SSE 的 battle_replay_start / battle_tick 事件会驱动后续 UI
    showBattlePhase('replay');

    // 更新回放页顶部的双方选择
    const userChoiceEl = document.getElementById('user-choice-badge');
    const aiChoiceEl = document.getElementById('ai-choice-badge');
    const dirMap = { long: t('battle.long'), short: t('battle.short'), neutral: t('battle.neutral') };
    if (userChoiceEl) {
      const v = userChoiceEl.querySelector('.choice-value');
      if (v) {
        v.textContent = dirMap[battleState.userDecision] || '--';
        v.className = `choice-value ${battleState.userDecision}`;
      }
    }
    if (aiChoiceEl) {
      const v = aiChoiceEl.querySelector('.choice-value');
      if (v) {
        v.textContent = dirMap[battleState.aiDecision] || '--';
        v.className = `choice-value ${battleState.aiDecision}`;
      }
    }
  } catch (err) {
    console.error('Launch replay error:', err);
    if (btn) btn.disabled = false;
    showError(t('error.battleFailed') || '启动走势失败');
  }
}

/**
 * 处理对战结果（显示胜负 + 金额结算） */
function handleBattleResult(data) {
  showBattlePhase('result');

  const {
    userCorrect, aiCorrect, finalDirection, priceChange, signals,
    userDecision, aiDecision, patternName,
    userBet = 0, userPnl = 0, userPayout = 0,
  } = data;

  const t = (window.i18n && window.i18n.t) || ((k) => k);
  const userWin = Boolean(userCorrect);

  // 结果图标 + 标题
  const resultIcon = document.getElementById('result-icon');
  const resultTitle = document.getElementById('result-title');
  const resultDesc = document.getElementById('result-desc');

  if (resultIcon) {
    resultIcon.className = `result-icon ${userWin ? 'win' : 'lose'}`;
    resultIcon.innerHTML = userWin
      ? '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  }

  if (resultTitle) {
    const titleKey = userWin ? 'battle.win' : 'battle.lose';
    resultTitle.textContent = t(titleKey);
    resultTitle.className = `result-title ${userWin ? 'win' : 'lose'}`;
  }

  if (resultDesc) {
    const dirMap = { bullish: t('battle.long'), bearish: t('battle.short') };
    const finalText = dirMap[finalDirection] || '--';
    const credits = t('nav.credits') || '积分';
    resultDesc.textContent = userWin
      ? `${t('battle.winDesc') || '预测正确，获得'} ${userBet * 2} ${credits}（本金 ${userBet} ${credits} + 奖励 ${userBet} ${credits}）`
      : `${t('battle.loseDesc') || '预测错误，损失本金'} ${userBet} ${credits}`;
  }

  // 用户结果
  const userResultEl = document.getElementById('user-result');
  if (userResultEl) {
    const valueEl = userResultEl.querySelector('.result-value');
    const statusEl = userResultEl.querySelector('.result-status');
    const dirMap = { long: t('battle.long'), short: t('battle.short') };
    if (valueEl) valueEl.textContent = dirMap[userDecision] || '--';
    if (statusEl) {
      statusEl.textContent = userWin ? '✓' : '✗';
      statusEl.className = `result-status ${userWin ? 'correct' : 'wrong'}`;
    }
  }

  // AI 缁撴灉
  const aiResultEl = document.getElementById('ai-result');
  if (aiResultEl) {
    const valueEl = aiResultEl.querySelector('.result-value');
    const statusEl = aiResultEl.querySelector('.result-status');
    const dirMap = { long: t('battle.long'), short: t('battle.short') };
    if (valueEl) valueEl.textContent = dirMap[aiDecision] || '--';
    if (statusEl) {
      statusEl.textContent = aiCorrect ? '✓' : '✗';
      statusEl.className = `result-status ${aiCorrect ? 'correct' : 'wrong'}`;
    }
  }

  // 统计
  const finalDirEl = document.getElementById('final-direction');
  const priceChangeEl = document.getElementById('price-change');
  const betEl = document.getElementById('result-bet');
  const pnlEl = document.getElementById('result-pnl');

  if (finalDirEl) {
    const dirMap = { bullish: `${t('battle.long')} ↗`, bearish: `${t('battle.short')} ↘` };
    finalDirEl.textContent = dirMap[finalDirection] || '--';
    finalDirEl.className = `stat-value ${finalDirection === 'bullish' ? 'up' : 'down'}`;
  }

  if (priceChangeEl) {
    const changePercent = (priceChange * 100).toFixed(2);
    priceChangeEl.textContent = `${priceChange >= 0 ? '+' : ''}${changePercent}%`;
    priceChangeEl.className = `stat-value ${priceChange >= 0 ? 'up' : 'down'}`;
  }

  if (betEl) {
    betEl.textContent = `${userBet} ${t('nav.credits') || '积分'}`;
  }

  if (pnlEl) {
    const credits = t('nav.credits') || '积分';
    pnlEl.textContent = userPnl >= 0 ? `+${userPnl} ${credits}` : `${userPnl} ${credits}`;
    pnlEl.className = `stat-value ${userPnl >= 0 ? 'up' : 'down'}`;
  }

  // 信号总结
  const signalsSummaryList = document.getElementById('signals-summary-list');
  if (signalsSummaryList && signals) {
    signalsSummaryList.innerHTML = signals.slice(0, 10).map(signal => `
      <div class="signals-summary-item">
        <span class="signal-icon ${signal.direction}">${signal.direction === 'bullish' ? '↗' : signal.direction === 'bearish' ? '↘' : '→'}</span>
        <span class="signal-name">${signal.name}</span>
        <span class="signal-desc">${signal.description || ''}</span>
      </div>
    `).join('');
  }

  if (data.globalAiPnl !== undefined) state.globalAiPnl = data.globalAiPnl;
  if (data.globalUserPnl !== undefined) state.globalUserPnl = data.globalUserPnl;
  updateGlobalPnlDisplay();
  updateAIPnLStats();

  // 刷新余额
  fetchCredits().catch(() => {});
  fetchUserSummary().catch(() => {});
}

// =============================================================================
// PWA 安装功能
// =============================================================================

let deferredPrompt = null;

/**
 * 初始化 PWA 安装按钮
 */
function initPWAInstall() {
  const installBtn = document.getElementById('install-btn');
  if (!installBtn) return;

  // 监听 beforeinstallprompt 事件（Chrome/Edge）
  window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止默认的安装提示
    e.preventDefault();
    // 保存事件以便后续使用
    deferredPrompt = e;
    // 显示安装按钮
    installBtn.style.display = 'flex';
  });

  // 监听 appinstalled 事件
  window.addEventListener('appinstalled', () => {
    // 隐藏安装按钮
    installBtn.style.display = 'none';
    deferredPrompt = null;
    console.log('[PWA] App installed successfully');
  });

  // 检查是否已安装（在 standalone 模式下运行）
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    // 已安装，隐藏按钮
    installBtn.style.display = 'none';
  }

  // 绑定点击事件
  installBtn.addEventListener('click', handleInstallClick);
}

/**
 * 处理安装按钮点击
 */
async function handleInstallClick() {
  const t = window.i18n?.t ?? ((k) => k);
  const installBtn = document.getElementById('install-btn');

  // 如果有 deferredPrompt（Chrome/Edge）
  if (deferredPrompt) {
    try {
      // 显示安装提示
      deferredPrompt.prompt();
      // 等待用户响应
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User choice: ${outcome}`);
      if (outcome === 'accepted') {
        showSuccess(t('toast.installSuccess') || '正在安装应用...');
      }
      // 清除 deferredPrompt
      deferredPrompt = null;
      // 隐藏按钮
      if (installBtn) installBtn.style.display = 'none';
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      showManualInstallGuide();
    }
    return;
  }

  // 没有 deferredPrompt，显示手动安装指南
  showManualInstallGuide();
}

/**
 * 显示手动安装指南
 */
function showManualInstallGuide() {
  const t = window.i18n?.t ?? ((k) => k);
  const platform = getPlatform();

  let title = '';
  let steps = '';

  switch (platform) {
    case 'ios':
      title = t('install.iosTitle') || '添加到主屏幕';
      steps = `
        <div class="install-steps">
          <p>${t('install.iosStep1') || '1. 点击浏览器底部的分享按钮'}</p>
          <div class="install-icon"> 
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </div>
          <p>${t('install.iosStep2') || '2. 向下滑动找到"添加到主屏幕"'}</p>
          <p>${t('install.iosStep3') || '3. 点击"添加"完成安装'}</p>
        </div>
      `;
      break;
    case 'android':
      title = t('install.androidTitle') || '安装应用';
      steps = `
        <div class="install-steps">
          <p>${t('install.androidStep1') || '1. 点击浏览器右上角的菜单按钮'}</p>
          <div class="install-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="12" cy="5" r="1"/>
              <circle cx="12" cy="19" r="1"/>
            </svg>
          </div>
          <p>${t('install.androidStep2') || '2. 选择"添加到主屏幕"或"安装应用"'}</p>
          <p>${t('install.androidStep3') || '3. 点击"安装"完成'}</p>
        </div>
      `;
      break;
    default:
      title = t('install.defaultTitle') || '添加到桌面';
      steps = `
        <div class="install-steps">
          <p>${t('install.defaultStep1') || '1. 点击浏览器地址栏右侧的安装图标'}</p>
          <p>${t('install.defaultStep2') || '2. 或使用浏览器菜单中的"安装"选项'}</p>
          <p>${t('install.defaultStep3') || '3. 按照提示完成安装'}</p>
        </div>
      `;
  }

  // 创建模态框
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay install-guide-modal';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        ${steps}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('.modal-close').addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * 获取当前平台
 */
function getPlatform() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios';
  }

  if (/android/i.test(userAgent)) {
    return 'android';
  }

  return 'desktop';
}





