/**
 * HTAT - K线图表模块
 *
 * 功能：
 * - 初始化 Lightweight Charts（兼容 v4 / v5）
 * - 实时更新 K 线，最多 1000 根后走势结束
 * - 走势结束后图表冻结，供用户回顾完整走势
 * - 用户 / AI 交易标记（合并渲染，修复 v4 互相覆盖问题）
 * - 持仓线、自定义绘图线管理
 * - 暂停 / 继续 / 重置控制
 */

'use strict';

// =============================================================================
// 常量
// =============================================================================

const COLORS = {
  BULL:     '#00D26A',
  BEAR:     '#FF3B5C',
  BULL_DIM: 'rgba(0, 210, 106, 0.3)',
  BEAR_DIM: 'rgba(255, 59, 92, 0.3)',
  USER:     '#38BDF8',
  AI:       '#A78BFA',
  BG:       '#000000',
  GRID:     'rgba(255, 255, 255, 0.03)',
  TEXT:     'rgba(255, 255, 255, 0.6)',
};

const MAX_RENDER_CANDLES = 1500;
const TRADING_MAX_RENDER_CANDLES = 130000;  // trading 模式渲染上限：容纳 3 年 15m 历史（~10.5万）+ 会话内实时增长
const RENDER_TRIM_BATCH = 120;
const HISTORY_PREFETCH_EDGE_BARS = 150;     // 可视区左缘距数据左端 < 150 根时预取历史（TradingView 式提前加载）
const REALTIME_RIGHT_OFFSET = 4;
const REALTIME_DEFAULT_RIGHT_OFFSET = 0;
const REALTIME_DEFAULT_BAR_SPACING = 4;
const REALTIME_DEFAULT_MIN_BAR_SPACING = 0.5;
const PATTERN_RIGHT_OFFSET = 28;
const PATTERN_BAR_SPACING = 1.7;
const PATTERN_MIN_BAR_SPACING = 0.35;
const PATTERN_PRICE_SCALE_MARGINS = { top: 0.2, bottom: 0.27 };
const REALTIME_INTERACTION_FOLLOW_MS = 180;
const MOBILE_CHART_VIEWPORT_MAX_EDGE = 896;
const MOBILE_CHART_RESIZE_RESET_RATIO = 0.18;
const MOBILE_TRADING_MIN_BAR_SPACING = 3;  // 移动端最小K线间距（更密集）
const MOBILE_TRADING_MAX_BAR_SPACING = 8;  // 移动端最大K线间距
const MOBILE_LANDSCAPE_MIN_BAR_SPACING = 2;  // 横屏模式最小K线间距（更密集）
const MOBILE_LANDSCAPE_MAX_BAR_SPACING = 6;  // 横屏模式最大K线间距
const LATEST_VISIBLE_LOGICAL_THRESHOLD = 0.5;

// =============================================================================
// ChartManager
// =============================================================================

class ChartManager {
  constructor(options = {}) {
    this.mode = options.mode || 'trading';
    this.containerId = options.containerId || 'chart-container';
    this.loadingId = options.loadingId || 'chart-loading';
    this.historyLoadingId = options.historyLoadingId || 'chart-history-loading';
    this.lastUpdateId = options.lastUpdateId || null;

    // 核心对象
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.container = null;
    this.initialized = false;
    this._resizeObserver = null;
    this._visibleRangeChangeHandler = null;

    // 数据缓存
    this._candleData = [];
    this._volumeData = [];

    // K 线计数
    this.candleCount = 0;        // 总数（含历史预热）
    this.trendCandleCount = 0;   // 本次走势实时 K 线数

    // 渲染上限：trading 模式需容纳 3 年历史懒加载，其他模式（pattern/battle）保持原值
    this._maxRender = this.mode === 'trading' ? TRADING_MAX_RENDER_CANDLES : MAX_RENDER_CANDLES;

    // 回调
    this.onCandleCountChange = null;
    this.onHistoryPrefetchNeeded = null;  // 可视区接近数据左缘时触发（由 app.js 挂接历史懒加载）
    this._historyPrefetchQueued = false;

    // 持仓线
    this.userPositionLine = null;
    this.userPosition = null;
    this.aiPositionLines = [];
    this.aiPositions = [];
    this.aiPosition = null;

    // 标记（统一存储，渲染时合并）
    this._userMarkers = [];

    // 自定义绘图
    this._drawings = [];
    this._drawingOverlay = null;
    this._drawingRenderQueued = false;
    this._drawingPlaybackTime = null;
    this._drawingFollowLatest = false;
    // 逐步绘制控制
    this._drawingRevealCount = null; // null=全部显示, N=只显示前N个
    this._activeDrawingProgress = 1; // 0-1, 当前绘制元素的内部动画进度

    // API 版本
    this._isV5 = false;
    this._markerSeries = null;  // v5 标记插件
    this._userPositionSignature = '';
    this._aiPositionsSignature = '';
    this._timeframeIntervalMs = 1000;

    this._realtimeFollowFrame = 0;
    this._realtimeFollowUntil = 0;
    this._dragFollowActive = false;
    this._realtimeFollowLockBound = false;
    this._realtimeFollowActivateHandler = null;
    this._realtimeFollowMoveHandler = null;
    this._realtimeFollowReleaseHandler = null;
    this._drawingRenderFrame = 0;
    this._viewportRestoreFrame = 0;
    this._lastContainerWidth = 0;
    this._lastContainerHeight = 0;
    this._drawingLabelBounds = [];
    this._drawingMeasureCanvas = null;
    this._drawingMeasureCtx = null;

    // 缓存 hi/lo 值，避免 _fallbackCoordinate 每次遍历
    this._cachedHigh = -Infinity;
    this._cachedLow = Infinity;

    // 防抖帧 ID
    this._interactionModeFrame = 0;

    this._lastAppliedViewport = null;  // 记录上次应用的视口范围，避免重复设置
    this._viewportRestoreTimer = 0;
    this._lastInteractionModeSignature = '';

    // 轴时间格式化器缓存（本地时区渲染）
    this._axisFormatters = null;
  }

  // ===========================================================================
  // 初始化
  // ===========================================================================

  init() {
    const nextContainer = document.getElementById(this.containerId);
    if (!nextContainer) { console.error(`[Chart] #${this.containerId} 不存在`); return this; }
    if (typeof LightweightCharts === 'undefined') { console.error('[Chart] LightweightCharts 未加载'); return this; }
    if (this.initialized && this.chart && this.container === nextContainer) {
      this.refreshLayout({ forceViewport: true });
      return this;
    }
    if (this.initialized || this.chart || this.container) {
      this.destroy();
    }
    this.container = nextContainer;

    this.chart = LightweightCharts.createChart(this.container, {
      layout: {
        background: { type: 'solid', color: COLORS.BG },
        textColor: COLORS.TEXT,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: COLORS.GRID },
        horzLines: { color: COLORS.GRID },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine:  { color: 'rgba(167,139,250,0.5)', width: 1, style: LightweightCharts.LineStyle.Dashed, labelBackgroundColor: COLORS.AI },
        horzLine:  { color: 'rgba(167,139,250,0.5)', width: 1, style: LightweightCharts.LineStyle.Dashed, labelBackgroundColor: COLORS.AI },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        scaleMargins: this.mode === 'pattern' ? PATTERN_PRICE_SCALE_MARGINS : { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        tickMarkFormatter: (time, tickMarkType) => this._formatAxisTick(time, tickMarkType),
        ...(this.mode === 'pattern' ? { barSpacing: PATTERN_BAR_SPACING, minBarSpacing: PATTERN_MIN_BAR_SPACING } : {}),
      },
      localization: {
        timeFormatter: (time) => this._formatCrosshairTime(time),
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    // 检测 API 版本
    this._isV5 = typeof LightweightCharts.CandlestickSeries !== 'undefined'
              && typeof this.chart.addSeries === 'function';

    this._isV5 ? this._initV5() : this._initV4();

    this.volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    this._applyResponsiveInteractionMode({ immediate: true });

    // 自适应尺寸
    this._resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length || !this.chart || !this.initialized) return;
      const { width, height } = entries[0].contentRect;
      this._applyContainerSize(width, height);
    });
    this._resizeObserver.observe(this.container);

    this.initialized = true;

    this._ensureDrawingOverlay();
    this._bindRealtimeFollowLock();

    const handleVisibleRangeChange = () => {
      this._requestDrawingRender();
      if (!this._isLatestVisible({ fallback: true, ignoreInteraction: true })) {
        this._cancelRealtimeFollowLock();
      }
      this._maybeNotifyHistoryPrefetch();
    };
    this._visibleRangeChangeHandler = handleVisibleRangeChange;

    try {
      const timeScale = this.chart.timeScale();
      if (timeScale && typeof timeScale.subscribeVisibleTimeRangeChange === 'function') {
        timeScale.subscribeVisibleTimeRangeChange(this._visibleRangeChangeHandler);
      }
      if (timeScale && typeof timeScale.subscribeVisibleLogicalRangeChange === 'function') {
        timeScale.subscribeVisibleLogicalRangeChange(this._visibleRangeChangeHandler);
      }
    } catch (_) { /* ignore */ }

    const el = this.loadingId ? document.getElementById(this.loadingId) : null;
    if (el) el.classList.add('hidden');

    return this;
  }

  destroy() {
    if (this._realtimeFollowFrame) {
      cancelAnimationFrame(this._realtimeFollowFrame);
      this._realtimeFollowFrame = 0;
    }
    if (this._viewportRestoreFrame) {
      cancelAnimationFrame(this._viewportRestoreFrame);
      this._viewportRestoreFrame = 0;
    }
    if (this._viewportRestoreTimer) {
      clearTimeout(this._viewportRestoreTimer);
      this._viewportRestoreTimer = 0;
    }
    if (this._drawingRenderFrame) {
      cancelAnimationFrame(this._drawingRenderFrame);
      this._drawingRenderFrame = 0;
    }
    if (this._interactionModeFrame) {
      cancelAnimationFrame(this._interactionModeFrame);
      this._interactionModeFrame = 0;
    }
    this._drawingRenderQueued = false;
    this._realtimeFollowUntil = 0;
    this._dragFollowActive = false;
    this._lastInteractionModeSignature = '';

    if (this._resizeObserver) {
      try { this._resizeObserver.disconnect(); } catch (_) {}
      this._resizeObserver = null;
    }

    this._unbindRealtimeFollowLock();
    this._unbindVisibleRangeChange();

    this._removeLine('userPositionLine');
    this._removeAILines();
    this.userPosition = null;
    this.aiPositions = [];
    this.aiPosition = null;
    this._userPositionSignature = '';
    this._aiPositionsSignature = '';

    if (this.chart && typeof this.chart.remove === 'function') {
      try { this.chart.remove(); } catch (_) {}
    }

    if (this._drawingOverlay && this._drawingOverlay.parentNode) {
      try { this._drawingOverlay.parentNode.removeChild(this._drawingOverlay); } catch (_) {}
    }

    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this._markerSeries = null;
    this._drawingOverlay = null;
    this._candleData = [];
    this._volumeData = [];
    this._userMarkers = [];
    this._drawings = [];
    this.candleCount = 0;
    this.trendCandleCount = 0;
    this.container = null;
    this.initialized = false;
    this._lastContainerWidth = 0;
    this._lastContainerHeight = 0;
    this._drawingLabelBounds = [];
    this._drawingMeasureCanvas = null;
    this._drawingMeasureCtx = null;
    this._cachedHigh = -Infinity;
    this._cachedLow = Infinity;
  }

  _initV5() {
    this.candleSeries = this.chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: COLORS.BULL, downColor: COLORS.BEAR,
      borderUpColor: COLORS.BULL, borderDownColor: COLORS.BEAR,
      wickUpColor: COLORS.BULL, wickDownColor: COLORS.BEAR,
    });
    this.volumeSeries = this.chart.addSeries(LightweightCharts.HistogramSeries, {
      color: 'rgba(167,139,250,0.3)', priceFormat: { type: 'volume' }, priceScaleId: '',
    });
    if (typeof LightweightCharts.createSeriesMarkers === 'function') {
      this._markerSeries = LightweightCharts.createSeriesMarkers(this.candleSeries);
    }
  }

  _initV4() {
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: COLORS.BULL, downColor: COLORS.BEAR,
      borderUpColor: COLORS.BULL, borderDownColor: COLORS.BEAR,
      wickUpColor: COLORS.BULL, wickDownColor: COLORS.BEAR,
    });
    this.volumeSeries = this.chart.addHistogramSeries({
      color: 'rgba(167,139,250,0.3)', priceFormat: { type: 'volume' }, priceScaleId: '',
    });
  }

  setTimeframe(timeframeConfig = null) {
    const intervalMs = Number(timeframeConfig?.ms || timeframeConfig?.intervalMs || 0);
    this._timeframeIntervalMs = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 1000;
    if (!this.chart) return;
    const showSeconds = Number.isFinite(intervalMs) && intervalMs > 0 && intervalMs < 60 * 1000;
    try {
      const timeScale = this.chart.timeScale();
      if (timeScale && typeof timeScale.applyOptions === 'function') {
        timeScale.applyOptions({
          timeVisible: true,
          secondsVisible: showSeconds,
        });
      }
    } catch (_) {}
    this._applyResponsiveInteractionMode();
    if (this._candleData.length) {
      this._queueResponsiveViewportRestore();
    }
  }

  // 注意：此方法与 app.js 中的 normalizeChartCandle 逻辑保持同步
  // 时间戳 > 1e11 视为毫秒，否则视为秒
  _normalizeCandleTime(time) {
    const numericTime = Number(time || 0);
    if (!Number.isFinite(numericTime) || numericTime <= 0) {
      return null;
    }
    return Math.floor(numericTime > 1e11 ? numericTime / 1000 : numericTime);
  }

  _normalizeCandle(candle) {
    if (!candle) return null;
    const time = this._normalizeCandleTime(candle.time);
    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume = Number(candle.volume || 0);
    if (!Number.isFinite(time) || !Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
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

  // ===========================================================================
  // K 线数据
  // ===========================================================================

  loadHistory(candles, trendCount) {
    if (!this.candleSeries || !this.volumeSeries || !candles || !candles.length) return;

    const history = candles.length > this._maxRender ? candles.slice(-this._maxRender) : candles;
    const normalizedHistory = history
      .map(c => this._normalizeCandle(c))
      .filter(Boolean)
      .sort((left, right) => left.time - right.time);
    if (!normalizedHistory.length) return;
    const cd = normalizedHistory.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));
    const vd = normalizedHistory.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? COLORS.BULL_DIM : COLORS.BEAR_DIM }));

    this.candleSeries.setData(cd);
    this.volumeSeries.setData(vd);

    this._candleData = cd;
    this._volumeData = vd;
    this.candleCount = normalizedHistory.length;
    // 如果后端提供了本次走势的实时 K 线数，优先使用（用于刷新页面时恢复进度）
    this.trendCandleCount = (typeof trendCount === 'number' && trendCount >= 0) ? trendCount : 0;

    // 缓存 hi/lo
    this._cachedHigh = -Infinity;
    this._cachedLow = Infinity;
    for (const c of cd) {
      if (c.high > this._cachedHigh) this._cachedHigh = c.high;
      if (c.low < this._cachedLow) this._cachedLow = c.low;
    }

    this._applyMarkers();
    this._updateCandleCount();
    this._applyResponsiveViewport();
  }

  getFirstCandleTime() {
    const firstCandle = this._candleData[0];
    return firstCandle ? Number(firstCandle.time || 0) : 0;
  }

  // 历史懒加载预取触发：可视区左缘距数据左端不足阈值时通知 app.js（rAF 节流）
  _maybeNotifyHistoryPrefetch() {
    if (this.mode !== 'trading' || typeof this.onHistoryPrefetchNeeded !== 'function' || !this.chart) return;
    if (this._historyPrefetchQueued) return;
    this._historyPrefetchQueued = true;
    requestAnimationFrame(() => {
      this._historyPrefetchQueued = false;
      if (!this.chart || typeof this.onHistoryPrefetchNeeded !== 'function') return;
      if (!this._candleData.length) return;
      try {
        const range = this.chart.timeScale().getVisibleLogicalRange();
        if (range && range.from < HISTORY_PREFETCH_EDGE_BARS) {
          this.onHistoryPrefetchNeeded();
        }
      } catch (_) { /* ignore */ }
    });
  }

  // 历史块加载指示（图表左上角小 spinner，不遮挡图表）
  setHistoryLoading(loading) {
    const el = this.historyLoadingId ? document.getElementById(this.historyLoadingId) : null;
    if (!el) return;
    el.classList.toggle('hidden', !loading);
  }

  // 向左回溯：把更早的历史块拼到现有数据左侧，视口与缩放保持不变（TradingView 式懒加载）
  prependHistory(olderCandles) {
    if (!this.candleSeries || !this.volumeSeries || !Array.isArray(olderCandles) || !olderCandles.length) return 0;
    const firstTime = this.getFirstCandleTime();
    if (!firstTime) return 0;

    const normalized = olderCandles
      .map(c => this._normalizeCandle(c))
      .filter(c => c && Number(c.time) < firstTime)
      .sort((left, right) => left.time - right.time);
    if (!normalized.length) return 0;

    const cd = normalized.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));
    const vd = normalized.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? COLORS.BULL_DIM : COLORS.BEAR_DIM }));
    const added = cd.length;

    let visibleRange = null;
    try {
      visibleRange = this.chart ? this.chart.timeScale().getVisibleLogicalRange() : null;
    } catch (_) { visibleRange = null; }

    this._candleData = [...cd, ...this._candleData];
    this._volumeData = [...vd, ...this._volumeData];
    this.candleSeries.setData(this._candleData);
    this.volumeSeries.setData(this._volumeData);

    // setData 后逻辑索引整体左移 added 根，按相同偏移恢复视口，用户无感知
    if (visibleRange && this.chart) {
      requestAnimationFrame(() => {
        if (!this.chart) return;
        try {
          this.chart.timeScale().setVisibleLogicalRange({
            from: visibleRange.from + added,
            to: visibleRange.to + added,
          });
        } catch (_) { /* ignore */ }
      });
    }

    // 增量维护 hi/lo 缓存（只扫新增块）
    for (const c of cd) {
      if (c.high > this._cachedHigh) this._cachedHigh = c.high;
      if (c.low < this._cachedLow) this._cachedLow = c.low;
    }

    this.candleCount += added;
    this._applyMarkers();
    this._updateCandleCount();
    return added;
  }

  addCandle(candle) {
    if (!this.candleSeries || !this.volumeSeries || !candle) return;

    const normalizedCandle = this._normalizeCandle(candle);
    if (!normalizedCandle) return;
    const shouldFollowLatest = this._isLatestVisible({ fallback: true });
    const cd = {
      time: normalizedCandle.time,
      open: normalizedCandle.open,
      high: normalizedCandle.high,
      low: normalizedCandle.low,
      close: normalizedCandle.close,
    };
    const vd = {
      time: normalizedCandle.time,
      value: normalizedCandle.volume,
      color: normalizedCandle.close >= normalizedCandle.open ? COLORS.BULL_DIM : COLORS.BEAR_DIM,
    };

    const lastCandle = this._candleData[this._candleData.length - 1];
    const lastTime = lastCandle ? Number(lastCandle.time || 0) : 0;
    const nextTime = Number(cd.time || 0);

    let isSameCandle = lastCandle && nextTime === lastTime;
    let mergedExisting = false;
    let insertedOutOfOrder = false;
    if (lastCandle && nextTime < lastTime) {
      const existingIdx = this._findCandleIndex(nextTime);
      if (existingIdx >= 0) {
        const existing = this._candleData[existingIdx];
        cd.open = existing.open;
        cd.high = Math.max(existing.high, cd.high);
        cd.low = Math.min(existing.low, cd.low);
        this._candleData[existingIdx] = cd;
        this._volumeData[existingIdx] = vd;
        mergedExisting = true;
      } else {
        // 乱序且未命中：插入到正确位置（断线补K线场景），不再静默丢弃造成图表缺口
        const insertIdx = this._findCandleInsertIndex(nextTime);
        this._candleData.splice(insertIdx, 0, cd);
        this._volumeData.splice(insertIdx, 0, vd);
        insertedOutOfOrder = true;
        console.warn('[Chart] 插入乱序 K 线:', new Date(nextTime * 1000).toISOString(), '当前最新:', new Date(lastTime * 1000).toISOString());
      }
    } else if (isSameCandle) {
      this._candleData[this._candleData.length - 1] = cd;
      this._volumeData[this._volumeData.length - 1] = vd;
    } else {
      this._candleData.push(cd);
      this._volumeData.push(vd);
    }

    let didTrim = false;
    if (this._candleData.length > this._maxRender + RENDER_TRIM_BATCH) {
      this._candleData = this._candleData.slice(-this._maxRender);
      this._volumeData = this._volumeData.slice(-this._maxRender);
      didTrim = true;
      this.candleSeries.setData(this._candleData);
      this.volumeSeries.setData(this._volumeData);
    } else if (mergedExisting || insertedOutOfOrder) {
      this.candleSeries.setData(this._candleData);
      this.volumeSeries.setData(this._volumeData);
    } else {
      this.candleSeries.update(cd);
      this.volumeSeries.update(vd);
    }

    if (!isSameCandle && !mergedExisting) {
      this.candleCount++;
      this.trendCandleCount++;
    }
    if (insertedOutOfOrder) {
      // 插入扩大了数据范围，被范围过滤的标记需要重算
      this._applyMarkers();
    }
    if (didTrim) {
      this._applyMarkers();
      // 重建 hi/lo 缓存
      this._cachedHigh = -Infinity;
      this._cachedLow = Infinity;
      for (const c of this._candleData) {
        if (c.high > this._cachedHigh) this._cachedHigh = c.high;
        if (c.low < this._cachedLow) this._cachedLow = c.low;
      }
    } else {
      // 增量更新 hi/lo 缓存
      if (cd.high > this._cachedHigh) this._cachedHigh = cd.high;
      if (cd.low < this._cachedLow) this._cachedLow = cd.low;
    }
    this._updateCandleCount();
    if (shouldFollowLatest) {
      this._scrollToLatest({ force: true });
      this._scheduleRealtimeFollowLock(REALTIME_INTERACTION_FOLLOW_MS, { force: true });
    } else {
      this._requestDrawingRender();
    }
  }

  _findCandleIndex(time) {
    const data = this._candleData;
    if (!data.length) return -1;
    let lo = 0;
    let hi = data.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const midTime = Number(data[mid].time || 0);
      if (midTime === time) return mid;
      if (midTime < time) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  _findCandleInsertIndex(time) {
    const data = this._candleData;
    let lo = 0;
    let hi = data.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (Number(data[mid].time || 0) < time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  getLastCandle() {
    const lastCandle = this._candleData[this._candleData.length - 1];
    if (!lastCandle) return null;
    const lastVolume = this._volumeData[this._volumeData.length - 1];
    return {
      time: lastCandle.time,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
      volume: Number(lastVolume?.value || 0),
    };
  }

  _getLastCandleTimestampMs() {
    const lastCandle = this.getLastCandle();
    const numericTime = Number(lastCandle?.time || 0);
    if (!Number.isFinite(numericTime) || numericTime <= 0) {
      return 0;
    }
    return Math.floor(numericTime > 1e11 ? numericTime : numericTime * 1000);
  }

  _formatLastUpdateText(timestampMs) {
    if (!timestampMs) {
      return '--:--:--';
    }
    return new Date(timestampMs).toLocaleTimeString('zh-CN', { hour12: false });
  }

  // ===========================================================================
  // 轴时间本地化（LightweightCharts 默认按 UTC 渲染，必须接管格式化）
  // ===========================================================================

  _getAxisFormatters() {
    if (!this._axisFormatters) {
      let cache = null;
      try {
        cache = {
          year: new Intl.DateTimeFormat(undefined, { year: 'numeric' }),
          month: new Intl.DateTimeFormat(undefined, { year: '2-digit', month: '2-digit' }),
          day: new Intl.DateTimeFormat(undefined, { month: '2-digit', day: '2-digit' }),
          time: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
          timeWithSeconds: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }),
        };
      } catch (_) {
        cache = null;
      }
      this._axisFormatters = cache;
    }
    return this._axisFormatters;
  }

  // tickMarkType: 0=Year 1=Month 2=DayOfMonth 3=Time 4=TimeWithSeconds
  _formatAxisTick(time, tickMarkType) {
    const date = new Date(Number(time) * 1000);
    if (!Number.isFinite(date.getTime())) return '';
    const formatters = this._getAxisFormatters();
    if (!formatters) {
      return new Date(Number(time) * 1000).toLocaleString(undefined, { hour12: false });
    }
    switch (Number(tickMarkType)) {
      case 0: return formatters.year.format(date);
      case 1: return formatters.month.format(date);
      case 2: return formatters.day.format(date);
      case 4: return formatters.timeWithSeconds.format(date);
      case 3:
      default: return formatters.time.format(date);
    }
  }

  _formatCrosshairTime(time) {
    const date = new Date(Number(time) * 1000);
    if (!Number.isFinite(date.getTime())) return '';
    const formatters = this._getAxisFormatters();
    if (!formatters) {
      return date.toLocaleString(undefined, { hour12: false });
    }
    return `${formatters.day.format(date)} ${formatters.timeWithSeconds.format(date)}`;
  }

  // ===========================================================================
  // 交易标记（合并渲染，修复 v4 互相覆盖 bug）
  // ===========================================================================

  _getRenderedTimeRange() {
    if (!this._candleData.length) return null;
    const firstTime = this._getTimeValue(this._candleData[0]?.time);
    const lastTime = this._getTimeValue(this._candleData[this._candleData.length - 1]?.time);
    if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime)) return null;
    return { from: firstTime, to: lastTime };
  }

  _resolveMarkerTime(time) {
    if (!this._candleData.length) return null;

    const targetTime = this._getTimeValue(time);
    if (!Number.isFinite(targetTime)) return null;

    const intervalMs = Number(this._timeframeIntervalMs || 0);
    const bucketTime = Number.isFinite(intervalMs) && intervalMs > 0
      ? Math.floor((targetTime * 1000) / intervalMs) * intervalMs / 1000
      : targetTime;

    let left = 0;
    let right = this._candleData.length - 1;
    const firstTime = this._getTimeValue(this._candleData[left]?.time);
    const lastTime = this._getTimeValue(this._candleData[right]?.time);

    if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime) || bucketTime < firstTime || bucketTime > lastTime) {
      return null;
    }

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = this._getTimeValue(this._candleData[mid]?.time);
      if (midTime === bucketTime) {
        return this._candleData[mid].time;
      }
      if (midTime < bucketTime) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    const prevCandle = this._candleData[Math.max(0, right)] || null;
    const prevTime = this._getTimeValue(prevCandle?.time);
    if (!Number.isFinite(prevTime)) return null;
    return prevCandle.time;
  }

  _normalizeMarkersForRender(markers) {
    if (!Array.isArray(markers) || markers.length === 0) return [];

    const range = this._getRenderedTimeRange();
    if (!range) return markers.slice();

    return markers.reduce((result, marker) => {
      if (!marker) return result;
      const sourceTime = marker._sourceTime !== undefined ? marker._sourceTime : marker.time;
      const resolvedTime = this._resolveMarkerTime(sourceTime);
      if (resolvedTime === null || resolvedTime === undefined) {
        return result;
      }
      const normalizedTime = this._getTimeValue(resolvedTime);
      if (normalizedTime < range.from || normalizedTime > range.to) {
        return result;
      }
      result.push({ ...marker, time: resolvedTime });
      return result;
    }, []);
  }

  _applyMarkers() {
    if (!this.candleSeries) return;
    const renderedUserMarkers = this._normalizeMarkersForRender(this._userMarkers);
    const all = renderedUserMarkers.sort((a, b) => {
      const ta = this._getTimeValue(a.time);
      const tb = this._getTimeValue(b.time);
      return ta - tb;
    });
    if (this._isV5 && this._markerSeries) {
      try { this._markerSeries.setMarkers(all); } catch (_) {}
    } else {
      try { this.candleSeries.setMarkers(all); } catch (_) {}
    }
  }

  _normalizeMarkerKeyValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(8);
    return String(value);
  }

  _normalizeMarkerEventTimeMs(value) {
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    return Math.round(numericValue > 1e11 ? numericValue : numericValue * 1000);
  }

  _hasMarker(markers, key) {
    return markers.some(marker => marker && marker._key === key);
  }

  _getUserMarkerKey(data) {
    const markerEventId = data?.eventId ?? data?.version ?? null;
    const markerTimeMs = this._normalizeMarkerEventTimeMs(data?.eventTimeMs ?? data?.time);
    if (markerEventId !== null && markerEventId !== undefined && markerEventId !== '') {
      return [
        'user',
        'event',
        this._normalizeMarkerKeyValue(markerEventId),
        this._normalizeMarkerKeyValue(markerTimeMs),
      ].join('|');
    }
    return [
      'user',
      'time',
      this._normalizeMarkerKeyValue(markerTimeMs),
      this._normalizeMarkerKeyValue(data.action || 'open'),
      this._normalizeMarkerKeyValue(data.side),
      this._normalizeMarkerKeyValue(data.price),
      this._normalizeMarkerKeyValue(data.quantity),
      this._normalizeMarkerKeyValue(data.positionId || data._posId),
    ].join('|');
  }

  addUserMarker(data) {
    const key = this._getUserMarkerKey(data);
    if (this._hasMarker(this._userMarkers, key)) return;
    const normalizedTime = this._normalizeCandleTime(data?.time);
    const markerTime = normalizedTime !== null ? normalizedTime : this._normalizeCandleTime(data?.eventTimeMs) || Number(data?.time || 0);
    const action = data.action || 'open';
    let text, shape, position;
    if (action === 'close' || action === 'decrease') {
      text = action === 'close' ? '✖' : '▼';
      shape = 'circle';
      position = 'aboveBar';
    } else if (action === 'increase') {
      text = '+';
      shape = 'circle';
      position = data.side === 'long' ? 'belowBar' : 'aboveBar';
    } else {
      text = data.side === 'long' ? 'L' : 'S';
      shape = data.side === 'long' ? 'arrowUp' : 'arrowDown';
      position = data.side === 'long' ? 'belowBar' : 'aboveBar';
    }
    this._userMarkers.push({
      time: markerTime,
      _sourceTime: markerTime,
      position,
      color: COLORS.USER,
      shape,
      text,
      size: 1,
      _key: key,
    });
    this._applyMarkers();
  }
  clearUserMarkers()   { this._userMarkers = []; this._applyMarkers(); }

  // ==========================================================================
  // 持仓线
  // ==========================================================================

  _removeLine(key) {
    if (this[key] && this.candleSeries) {
      try { this.candleSeries.removePriceLine(this[key]); } catch (_) {}
      this[key] = null;
    }
  }

  _removeAILines() {
    if (!this.candleSeries) {
      this.aiPositionLines = [];
      return;
    }
    for (const line of this.aiPositionLines || []) {
      try { this.candleSeries.removePriceLine(line); } catch (_) {}
    }
    this.aiPositionLines = [];
  }

  _positionNumberSignature(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(8) : '';
  }

  _getUserPositionSignature(pos) {
    if (!pos) return '';
    return [
      String(pos.id || ''),
      String(pos.side || ''),
      this._positionNumberSignature(pos.openPrice),
      this._positionNumberSignature(pos.leverage || 1),
      this._positionNumberSignature(pos.margin ?? pos.quantity ?? 0),
    ].join('|');
  }

  _getAIPositionsSignature(positions) {
    if (!positions || positions.length === 0) return '';
    return positions.map((pos) => [
      String(pos?.id || ''),
      String(pos?.strategyId || pos?.strategyName || ''),
      String(pos?.side || ''),
      this._positionNumberSignature(pos?.openPrice),
      this._positionNumberSignature(pos?.margin ?? pos?.quantity ?? 0),
      this._positionNumberSignature(pos?.leverage || 1),
    ].join('|')).join('||');
  }

  _getAIAggregateWeight(pos) {
    const numeric = Number(pos?.margin ?? pos?.quantity ?? pos?.totalCost ?? 0);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  }

  _getAIAggregatedPositions(positions) {
    if (!Array.isArray(positions) || positions.length === 0) return [];
    const grouped = new Map();
    for (const pos of positions) {
      const side = pos?.side === 'long' || pos?.side === 'short' ? pos.side : null;
      const openPrice = Number(pos?.openPrice);
      if (!side || !Number.isFinite(openPrice)) continue;
      const current = grouped.get(side) || { side, weightedOpenPrice: 0, totalWeight: 0 };
      const weight = this._getAIAggregateWeight(pos);
      current.weightedOpenPrice += openPrice * weight;
      current.totalWeight += weight;
      grouped.set(side, current);
    }
    return ['long', 'short'].map((side) => {
      const entry = grouped.get(side);
      if (!entry || !(entry.totalWeight > 0)) return null;
      const openPrice = entry.weightedOpenPrice / entry.totalWeight;
      if (!Number.isFinite(openPrice)) return null;
      return { side, openPrice };
    }).filter(Boolean);
  }

  _getAIAggregatedSignature(positions) {
    if (!positions || positions.length === 0) return '';
    return positions.map((pos) => [
      String(pos?.side || ''),
      this._positionNumberSignature(pos?.openPrice),
    ].join('|')).join('||');
  }

  setUserPosition(pos) {
    this.userPosition = pos || null;
    const signature = this._getUserPositionSignature(this.userPosition);
    const shouldHaveLine = Boolean(this.candleSeries && this.userPosition);
    const hasLine = Boolean(this.userPositionLine);
    const isVisualStateSynced = shouldHaveLine ? hasLine : !hasLine;
    if (signature === this._userPositionSignature && isVisualStateSynced) return;
    this._userPositionSignature = signature;
    this._removeLine('userPositionLine');
    if (!this.candleSeries || !this.userPosition) return;
    this.userPositionLine = this.candleSeries.createPriceLine({
      price: this.userPosition.openPrice,
      color: this.userPosition.side === 'long' ? COLORS.USER : COLORS.BEAR,
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: this.userPosition.side === 'long' ? '▲' : '▼',
    });
  }

  setAIPosition(pos) {
    this.setAIPositions(pos ? [pos] : []);
  }

  setAIPositions(positions) {
    this.aiPositions = Array.isArray(positions) ? positions.filter(Boolean) : [];
    this.aiPosition = this.aiPositions[0] || null;
    const aggregatedPositions = this._getAIAggregatedPositions(this.aiPositions);
    const signature = this._getAIAggregatedSignature(aggregatedPositions);
    const shouldHaveLines = Boolean(this.candleSeries && aggregatedPositions.length > 0);
    const currentLineCount = Array.isArray(this.aiPositionLines) ? this.aiPositionLines.length : 0;
    const isVisualStateSynced = shouldHaveLines ? currentLineCount === aggregatedPositions.length : currentLineCount === 0;
    if (signature === this._aiPositionsSignature && isVisualStateSynced) return;
    this._aiPositionsSignature = signature;
    this._removeAILines();
    if (!this.candleSeries || aggregatedPositions.length === 0) return;

    this.aiPositionLines = aggregatedPositions.map((pos) => this.candleSeries.createPriceLine({
      price: pos.openPrice,
      color: COLORS.AI,
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: pos.side === 'long' ? '▲' : '▼',
    }));
  }

  // ===========================================================================
  // 暂停 / 重置
  // ===========================================================================

  reset() {
    if (this.candleSeries) {
      this.candleSeries.setData([]);
    }
    if (this.volumeSeries) this.volumeSeries.setData([]);
    if (this._isV5 && this._markerSeries) {
      try { this._markerSeries.setMarkers([]); } catch (_) {}
    } else if (this.candleSeries) {
      try { this.candleSeries.setMarkers([]); } catch (_) {}
    }

    this._candleData = [];
    this._volumeData = [];
    this.candleCount = 0;
    this.trendCandleCount = 0;
    this._cachedHigh = -Infinity;
    this._cachedLow = Infinity;

    this._removeLine('userPositionLine');
    this._removeAILines();
    this.userPosition = null;
    this.aiPositions = [];
    this.aiPosition = null;
    this._userPositionSignature = '';
    this._aiPositionsSignature = '';

    this._userMarkers = [];
    this._cancelRealtimeFollowLock();
    this._dragFollowActive = false;

    this.clearDrawings();
    this._updateCandleCount();
  }

  // ===========================================================================
  // 视图
  // ===========================================================================

  _applyContainerSize(width, height, options = {}) {
    if (!this.chart) return this;
    const nextWidth = Math.max(0, Number(width) || 0);
    const nextHeight = Math.max(0, Number(height) || 0);
    if (!(nextWidth > 0) || !(nextHeight > 0)) {
      return this;
    }
    const previousWidth = this._lastContainerWidth;
    const previousHeight = this._lastContainerHeight;
    // 尺寸未变化时跳过重复应用
    if (!options.forceViewport && previousWidth === nextWidth && previousHeight === nextHeight) {
      return this;
    }
    
    this._lastContainerWidth = nextWidth;
    this._lastContainerHeight = nextHeight;
    this.chart.applyOptions({ width: nextWidth, height: nextHeight });
    this._applyResponsiveInteractionMode({ immediate: options.forceViewport === true });
    this._requestDrawingRender();

    const patternResizeNeedsViewport = this.mode === 'pattern'
      && this._candleData.length > 0
      && (previousWidth !== nextWidth || previousHeight !== nextHeight);
    if (options.forceViewport || patternResizeNeedsViewport || this._shouldRestoreViewportOnResize(previousWidth, previousHeight, nextWidth, nextHeight)) {
      this._queueResponsiveViewportRestore();
    }
    
    return this;
  }

  refreshLayout(options = {}) {
    if (!this.chart || !this.container) return this;
    const rect = typeof this.container.getBoundingClientRect === 'function'
      ? this.container.getBoundingClientRect()
      : null;
    const width = Number(this.container.clientWidth || rect?.width || 0);
    const height = Number(this.container.clientHeight || rect?.height || 0);
    return this._applyContainerSize(width, height, options);
  }

  _getTouchViewportBarSpacing() {
    const width = Math.max(0, Number(this.container?.clientWidth || 0));
    const preferredVisibleBars = Math.max(12, this._getPreferredVisibleBarCount());
    if (!(width > 0)) return MOBILE_LANDSCAPE_MIN_BAR_SPACING;
    const rawSpacing = width / preferredVisibleBars;
    // 检查是否为横屏模式
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    if (isLandscape) {
      return Math.max(MOBILE_LANDSCAPE_MIN_BAR_SPACING, Math.min(MOBILE_LANDSCAPE_MAX_BAR_SPACING, rawSpacing));
    }
    return Math.max(MOBILE_TRADING_MIN_BAR_SPACING, Math.min(MOBILE_TRADING_MAX_BAR_SPACING, rawSpacing));
  }

  _applyResponsiveInteractionMode(options = {}) {
    if (!this.chart) return;
    if (this._interactionModeFrame) {
      cancelAnimationFrame(this._interactionModeFrame);
      this._interactionModeFrame = 0;
    }
    if (options.immediate === true) {
      this._doApplyResponsiveInteractionMode();
      return;
    }
    this._interactionModeFrame = requestAnimationFrame(() => {
      this._interactionModeFrame = 0;
      this._doApplyResponsiveInteractionMode();
    });
  }

  _doApplyResponsiveInteractionMode() {
    if (!this.chart) return;
    const isTouchTradingViewport = this.mode === 'trading' && this._isTouchViewport();
    try {
      this.chart.applyOptions({
        handleScroll: {
          mouseWheel: !isTouchTradingViewport,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: !isTouchTradingViewport,
          mouseWheel: !isTouchTradingViewport,
          pinch: !isTouchTradingViewport,
        },
      });
    } catch (_) {}

    try {
      const timeScale = this.chart.timeScale();
      if (timeScale && typeof timeScale.applyOptions === 'function') {
        const showSeconds = Number.isFinite(this._timeframeIntervalMs)
          && this._timeframeIntervalMs > 0
          && this._timeframeIntervalMs < 60 * 1000;
        const options = {
          timeVisible: true,
          secondsVisible: showSeconds,
        };
        if (this.mode === 'pattern') {
          const { rightPadding } = this._getPatternViewportPadding(this._candleData.length);
          options.rightOffset = rightPadding;
          options.barSpacing = PATTERN_BAR_SPACING;
          options.minBarSpacing = PATTERN_MIN_BAR_SPACING;
          options.fixLeftEdge = true;
          options.fixRightEdge = false;
          options.rightBarStaysOnScroll = true;
          options.lockVisibleTimeRangeOnResize = true;
        } else if (isTouchTradingViewport) {
          const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
          options.rightOffset = REALTIME_RIGHT_OFFSET;
          options.barSpacing = this._getTouchViewportBarSpacing();
          options.minBarSpacing = isLandscape ? MOBILE_LANDSCAPE_MIN_BAR_SPACING : MOBILE_TRADING_MIN_BAR_SPACING;
          options.fixRightEdge = true;
          options.rightBarStaysOnScroll = true;
          options.lockVisibleTimeRangeOnResize = true;
        } else {
          options.rightOffset = REALTIME_DEFAULT_RIGHT_OFFSET;
          options.barSpacing = REALTIME_DEFAULT_BAR_SPACING;
          options.minBarSpacing = REALTIME_DEFAULT_MIN_BAR_SPACING;
          options.fixLeftEdge = false;
          options.fixRightEdge = false;
          options.rightBarStaysOnScroll = false;
          options.lockVisibleTimeRangeOnResize = false;
        }
        const signature = JSON.stringify({
          touch: isTouchTradingViewport,
          timeScale: options,
        });
        if (signature !== this._lastInteractionModeSignature) {
          timeScale.applyOptions(options);
          this._lastInteractionModeSignature = signature;
        }
      }
    } catch (_) {}
  }

  _isTouchViewport() {
    if (typeof window === 'undefined') return false;
    const hasCoarsePointer = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
    const touchPoints = typeof navigator !== 'undefined'
      ? Number(navigator.maxTouchPoints || 0)
      : 0;
    const isTouchCapable = hasCoarsePointer || touchPoints > 0 || 'ontouchstart' in window;
    // 优先使用 visualViewport（iOS 键盘弹出时更准确）
    const vv = window.visualViewport;
    const viewportWidth = vv ? Math.max(0, Number(vv.width || 0)) : Math.max(0, Number(window.innerWidth || this.container?.clientWidth || 0));
    const viewportHeight = vv ? Math.max(0, Number(vv.height || 0)) : Math.max(0, Number(window.innerHeight || this.container?.clientHeight || 0));
    return isTouchCapable && Math.min(viewportWidth, viewportHeight) <= MOBILE_CHART_VIEWPORT_MAX_EDGE;
  }

  _getPreferredVisibleBarCount() {
    const width = Math.max(0, Number(this.container?.clientWidth || 0));
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    
    // 横屏模式下显示更多K线
    let preferredBars = 76;
    if (isLandscape) {
      // 横屏模式：更密集的K线
      if (width <= 400) preferredBars = 70;
      else if (width <= 600) preferredBars = 95;
      else if (width <= 800) preferredBars = 120;
      else if (width <= 1000) preferredBars = 140;
      else preferredBars = 170;
    } else {
      // 竖屏模式：在保持可读的前提下显示更多K线
      if (width <= 320) preferredBars = 36;
      else if (width <= 400) preferredBars = 42;
      else if (width <= 480) preferredBars = 50;
      else if (width <= 560) preferredBars = 56;
      else if (width <= 720) preferredBars = 70;
    }

    let timeframeFactor = 1;
    if (this._timeframeIntervalMs >= 4 * 60 * 60 * 1000) timeframeFactor = 1.75;
    else if (this._timeframeIntervalMs >= 60 * 60 * 1000) timeframeFactor = 1.5;
    else if (this._timeframeIntervalMs >= 15 * 60 * 1000) timeframeFactor = 1.35;
    else if (this._timeframeIntervalMs >= 5 * 60 * 1000) timeframeFactor = 1.2;

    return Math.max(12, Math.min(isLandscape ? 220 : 128, Math.round(preferredBars * timeframeFactor)));
  }

  _getPatternViewportPadding(totalBars = this._candleData.length) {
    const safeTotalBars = Math.max(0, Number(totalBars) || 0);
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    const containerWidth = this._lastContainerWidth || Math.max(0, Number(this.container?.clientWidth || 0));
    // In landscape with narrow chart (due to rail offset), reduce padding to avoid over-compression
    if (isLandscape && containerWidth > 0 && containerWidth < 600) {
      const leftPadding = Math.max(2, Math.min(8, Math.round(Math.max(12, safeTotalBars) * 0.06)));
      const rightPadding = Math.max(4, Math.min(14, Math.round(Math.max(16, safeTotalBars) * 0.10)));
      return { leftPadding, rightPadding };
    }
    if (isLandscape) {
      const leftPadding = Math.max(3, Math.min(10, Math.round(Math.max(14, safeTotalBars) * 0.08)));
      const rightPadding = Math.max(6, Math.min(18, Math.round(Math.max(20, safeTotalBars) * 0.12)));
      return { leftPadding, rightPadding };
    }
    const leftPadding = Math.max(4, Math.min(14, Math.round(Math.max(18, safeTotalBars) * 0.1)));
    const rightPadding = Math.max(10, Math.min(PATTERN_RIGHT_OFFSET, Math.round(Math.max(24, safeTotalBars) * 0.18)));
    return { leftPadding, rightPadding };
  }

  _applyPatternViewport() {
    if (!this.chart || !this._candleData.length || this.mode !== 'pattern') {
      this._requestDrawingRender();
      return false;
    }
    try {
      const timeScale = this.chart.timeScale();
      if (!timeScale) return false;
      const totalBars = this._candleData.length;
      const { leftPadding, rightPadding } = this._getPatternViewportPadding(totalBars);
      const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
      if (typeof timeScale.applyOptions === 'function') {
        timeScale.applyOptions({
          rightOffset: rightPadding,
          minBarSpacing: PATTERN_MIN_BAR_SPACING,
          fixLeftEdge: true,
          rightBarStaysOnScroll: true,
          lockVisibleTimeRangeOnResize: true,
        });
      }
      if (typeof timeScale.setVisibleLogicalRange === 'function') {
        timeScale.setVisibleLogicalRange({
          from: -leftPadding,
          to: (totalBars - 1) + rightPadding,
        });
      } else if (typeof timeScale.fitContent === 'function') {
        timeScale.fitContent();
      }
      // In landscape, reduce price scale margins for better vertical space usage
      const priceScale = this.candleSeries && typeof this.candleSeries.priceScale === 'function'
        ? this.candleSeries.priceScale()
        : null;
      if (priceScale && typeof priceScale.applyOptions === 'function') {
        const margins = isLandscape
          ? { top: 0.12, bottom: 0.18 }
          : PATTERN_PRICE_SCALE_MARGINS;
        priceScale.applyOptions({ autoScale: true, scaleMargins: margins });
      }
      this._requestDrawingRender();
      // In landscape, schedule an extra drawing render after the chart settles
      // to ensure coordinates are fully updated after setVisibleLogicalRange
      if (isLandscape) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (this.chart && this._drawings.length) {
              this._renderDrawings();
            }
          });
        });
      }
      return true;
    } catch (_) {
      this._requestDrawingRender();
      return false;
    }
  }

  _queueResponsiveViewportRestore() {
    if (this._viewportRestoreFrame) {
      cancelAnimationFrame(this._viewportRestoreFrame);
    }
    if (this._viewportRestoreTimer) {
      clearTimeout(this._viewportRestoreTimer);
      this._viewportRestoreTimer = 0;
    }
    // 横屏模式下使用更长的延迟
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    const delay = isLandscape ? 150 : 0;
    
    if (delay > 0) {
      this._viewportRestoreTimer = setTimeout(() => {
        this._viewportRestoreTimer = 0;
        this._viewportRestoreFrame = requestAnimationFrame(() => {
          this._viewportRestoreFrame = 0;
          this._applyResponsiveViewport();
        });
      }, delay);
    } else {
      this._viewportRestoreFrame = requestAnimationFrame(() => {
        this._viewportRestoreFrame = 0;
        this._applyResponsiveViewport();
      });
    }
  }

  _shouldRestoreViewportOnResize(previousWidth, previousHeight, nextWidth, nextHeight) {
    if (!this._candleData.length || !this._isTouchViewport()) return false;
    if (!(nextWidth > 0) || !(nextHeight > 0)) return false;
    const hadVisibleSize = previousWidth > 0 && previousHeight > 0;
    if (!hadVisibleSize) return true;
    const widthDeltaRatio = Math.abs(nextWidth - previousWidth) / Math.max(previousWidth, 1);
    const heightDeltaRatio = Math.abs(nextHeight - previousHeight) / Math.max(previousHeight, 1);
    // 横屏模式下使用更大的阈值，减少抖动
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    const threshold = isLandscape ? 0.25 : MOBILE_CHART_RESIZE_RESET_RATIO;
    return widthDeltaRatio >= threshold || heightDeltaRatio >= threshold;
  }

  _applyResponsiveViewport() {
    if (!this.chart || !this._candleData.length) {
      this._requestDrawingRender();
      return;
    }
    this._applyResponsiveInteractionMode();
    if (this.mode === 'pattern') {
      this._applyPatternViewport();
      return;
    }
    const shouldFollowLatest = this._isLatestVisible({ fallback: true });
    try {
      const timeScale = this.chart.timeScale();
      const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
      
      if (this.mode === 'trading' && shouldFollowLatest && this._isTouchViewport() && typeof timeScale?.setVisibleLogicalRange === 'function') {
        const totalBars = this._candleData.length;
        const rightOffset = this._getRealtimeRightOffset();
        const visibleBars = Math.max(12, Math.min(totalBars, this._getPreferredVisibleBarCount()));
        const to = (totalBars - 1) + rightOffset;
        const from = Math.max(0, to - visibleBars + 1);
        
        // 横屏模式下，只在尺寸变化较大时才重置视口范围
        if (!isLandscape || !this._lastAppliedViewport || 
            Math.abs(this._lastAppliedViewport.from - from) > 5 || 
            Math.abs(this._lastAppliedViewport.to - to) > 5) {
          timeScale.setVisibleLogicalRange({ from, to });
          this._lastAppliedViewport = { from, to };
        }
      }
    } catch (_) {}
    if (shouldFollowLatest) {
      this._scrollToLatest({ force: true });
      this._scheduleRealtimeFollowLock(REALTIME_INTERACTION_FOLLOW_MS, { force: true });
    } else {
      this._requestDrawingRender();
    }
  }

  getDiagnostics() {
    const rect = this.container && typeof this.container.getBoundingClientRect === 'function'
      ? this.container.getBoundingClientRect()
      : null;
    let visibleRange = null;
    let visibleLogicalRange = null;
    try {
      const timeScale = this.chart?.timeScale?.();
      if (timeScale && typeof timeScale.getVisibleRange === 'function') {
        visibleRange = timeScale.getVisibleRange() || null;
      }
      if (timeScale && typeof timeScale.getVisibleLogicalRange === 'function') {
        visibleLogicalRange = timeScale.getVisibleLogicalRange() || null;
      }
    } catch (_) {}
    return {
      mode: this.mode,
      initialized: this.initialized,
      touchViewport: this._isTouchViewport(),
      timeframeIntervalMs: this._timeframeIntervalMs,
      candleCount: this._candleData.length,
      trendCandleCount: this.trendCandleCount,
      lastContainerWidth: this._lastContainerWidth,
      lastContainerHeight: this._lastContainerHeight,
      containerWidth: Number(this.container?.clientWidth || rect?.width || 0),
      containerHeight: Number(this.container?.clientHeight || rect?.height || 0),
      firstTime: this._candleData[0]?.time || null,
      lastTime: this._candleData[this._candleData.length - 1]?.time || null,
      latestVisible: this._isLatestVisible({ fallback: true, ignoreInteraction: true }),
      visibleRange,
      visibleLogicalRange,
      drawingCount: this._drawings.length,
      drawingOverlayAttached: Boolean(this._drawingOverlay && this._drawingOverlay.parentNode === this.container),
    };
  }

  _cancelRealtimeFollowLock() {
    if (this._realtimeFollowFrame) {
      cancelAnimationFrame(this._realtimeFollowFrame);
      this._realtimeFollowFrame = 0;
    }
    this._realtimeFollowUntil = 0;
  }

  _isLatestVisible(options = {}) {
    if (this.mode === 'pattern') return true;
    if (!this.chart || !this._candleData.length) {
      return Boolean(options.fallback ?? true);
    }
    if (this._dragFollowActive && options.ignoreInteraction !== true) {
      return false;
    }
    try {
      const timeScale = this.chart.timeScale();
      const latestLogicalIndex = this._candleData.length - 1;
      if (timeScale && typeof timeScale.getVisibleLogicalRange === 'function') {
        const logicalRange = timeScale.getVisibleLogicalRange();
        const logicalTo = Number(logicalRange?.to);
        if (Number.isFinite(logicalTo)) {
          return logicalTo >= latestLogicalIndex - LATEST_VISIBLE_LOGICAL_THRESHOLD;
        }
      }
      if (timeScale && typeof timeScale.getVisibleRange === 'function') {
        const visibleRange = timeScale.getVisibleRange();
        const visibleToRaw = visibleRange?.to && typeof visibleRange.to === 'object'
          ? visibleRange.to.timestamp
          : visibleRange?.to;
        const visibleTo = Number(visibleToRaw);
        const latestTime = Number(this._candleData[latestLogicalIndex]?.time || 0);
        if (Number.isFinite(visibleTo) && Number.isFinite(latestTime) && latestTime > 0) {
          return visibleTo >= latestTime - 1;
        }
      }
    } catch (_) {}
    return Boolean(options.fallback ?? true);
  }

  _bindRealtimeFollowLock() {
    if (!this.container || this._realtimeFollowLockBound) return;
    this._realtimeFollowActivateHandler = () => {
      this._dragFollowActive = true;
      this._cancelRealtimeFollowLock();
    };
    this._realtimeFollowReleaseHandler = () => {
      if (!this._dragFollowActive) return;
      this._dragFollowActive = false;
      this._scheduleRealtimeFollowLock();
    };
    this._realtimeFollowMoveHandler = (event) => {
      if (event && typeof event.buttons === 'number' && event.buttons > 0) {
        this._realtimeFollowActivateHandler();
      }
    };
    this.container.addEventListener('pointerdown', this._realtimeFollowActivateHandler);
    this.container.addEventListener('pointermove', this._realtimeFollowMoveHandler);
    window.addEventListener('pointerup', this._realtimeFollowReleaseHandler);
    window.addEventListener('pointercancel', this._realtimeFollowReleaseHandler);
    this._realtimeFollowLockBound = true;
  }

  _unbindRealtimeFollowLock() {
    if (!this.container || !this._realtimeFollowLockBound) {
      this._realtimeFollowActivateHandler = null;
      this._realtimeFollowMoveHandler = null;
      this._realtimeFollowReleaseHandler = null;
      this._realtimeFollowLockBound = false;
      return;
    }
    if (this._realtimeFollowActivateHandler) {
      this.container.removeEventListener('pointerdown', this._realtimeFollowActivateHandler);
    }
    if (this._realtimeFollowMoveHandler) {
      this.container.removeEventListener('pointermove', this._realtimeFollowMoveHandler);
    }
    if (this._realtimeFollowReleaseHandler) {
      window.removeEventListener('pointerup', this._realtimeFollowReleaseHandler);
      window.removeEventListener('pointercancel', this._realtimeFollowReleaseHandler);
    }
    this._realtimeFollowActivateHandler = null;
    this._realtimeFollowMoveHandler = null;
    this._realtimeFollowReleaseHandler = null;
    this._realtimeFollowLockBound = false;
  }

  _unbindVisibleRangeChange() {
    if (!this.chart || !this._visibleRangeChangeHandler) {
      this._visibleRangeChangeHandler = null;
      return;
    }
    try {
      const timeScale = this.chart.timeScale();
      if (timeScale && typeof timeScale.unsubscribeVisibleTimeRangeChange === 'function') {
        timeScale.unsubscribeVisibleTimeRangeChange(this._visibleRangeChangeHandler);
      }
      if (timeScale && typeof timeScale.unsubscribeVisibleLogicalRangeChange === 'function') {
        timeScale.unsubscribeVisibleLogicalRangeChange(this._visibleRangeChangeHandler);
      }
    } catch (_) {}
    this._visibleRangeChangeHandler = null;
  }

  _scheduleRealtimeFollowLock(durationMs = REALTIME_INTERACTION_FOLLOW_MS, { force = false } = {}) {
    if (!this.chart) return;
    if (!force && !this._isLatestVisible({ fallback: false })) {
      this._cancelRealtimeFollowLock();
      return;
    }
    const nextUntil = Date.now() + Math.max(0, Number(durationMs) || 0);
    if (nextUntil > this._realtimeFollowUntil) {
      this._realtimeFollowUntil = nextUntil;
    }
    if (this._realtimeFollowFrame) return;
    const enforce = () => {
      this._realtimeFollowFrame = 0;
      if (!force && !this._isLatestVisible({ fallback: false })) {
        this._cancelRealtimeFollowLock();
        return;
      }
      this.ensureLatestVisible({ force: true });
      if (Date.now() < this._realtimeFollowUntil) {
        this._realtimeFollowFrame = requestAnimationFrame(enforce);
      }
    };
    this._realtimeFollowFrame = requestAnimationFrame(enforce);
  }

  _getRealtimeRightOffset() {
    return this.mode === 'pattern' ? PATTERN_RIGHT_OFFSET : REALTIME_RIGHT_OFFSET;
  }

  _scrollToLatest(options = {}) {
    if (!this.chart) return;
    if (this.mode === 'pattern') {
      this._applyPatternViewport();
      return;
    }
    if (options.force !== true && !this._isLatestVisible({ fallback: true })) {
      this._requestDrawingRender();
      return;
    }
    try {
      const timeScale = this.chart.timeScale();
      const rightOffset = this._getRealtimeRightOffset();
      if (timeScale && typeof timeScale.scrollToPosition === 'function') {
        timeScale.scrollToPosition(rightOffset, false);
      } else if (timeScale && typeof timeScale.scrollToRealTime === 'function') {
        if (timeScale && typeof timeScale.applyOptions === 'function') {
          timeScale.applyOptions({ rightOffset });
        }
        timeScale.scrollToRealTime();
      }
    } catch (_) {}
    this._requestDrawingRender();
  }

  ensureLatestVisible(options = {}) {
    if (!this.chart) return;
    if (this.mode === 'pattern') {
      this._applyPatternViewport();
      return;
    }
    if (options.force !== true && !this._isLatestVisible({ fallback: true })) {
      this._requestDrawingRender();
      return;
    }
    try {
      const timeScale = this.chart.timeScale();
      const rightOffset = this._getRealtimeRightOffset();
      if (timeScale && typeof timeScale.scrollToPosition === 'function') {
        timeScale.scrollToPosition(rightOffset, false);
      } else if (timeScale && typeof timeScale.scrollToRealTime === 'function') {
        if (timeScale && typeof timeScale.applyOptions === 'function') {
          timeScale.applyOptions({ rightOffset });
        }
        timeScale.scrollToRealTime();
      }
    } catch (_) {}
    this._requestDrawingRender();
  }

  // ===========================================================================
  // 自定义绘图线（形态分析模式）
  // ===========================================================================

  clearDrawings() {
    this._drawings = [];
    this._drawingPlaybackTime = null;
    this._drawingFollowLatest = false;
    this._drawingRevealCount = null;
    this._activeDrawingProgress = 1;
    if (this._drawingOverlay) {
      this._drawingOverlay.replaceChildren();
    }
    this._requestDrawingRender();
  }

  addHorizontalLine(price, color, text) {
    this._drawings.push({
      type: 'hline',
      price,
      color: color || 'rgba(255,255,255,0.5)',
      text: text || '',
      width: 1,
      dash: '8 6',
    });
    this._requestDrawingRender();
  }

  addTrendLine(price1, time1, price2, time2, color) {
    this._drawings.push({
      type: 'trendline',
      price1,
      time1,
      price2,
      time2,
      color: color || 'rgba(255,255,255,0.6)',
      width: 2,
    });
    this._requestDrawingRender();
  }

  setDrawings(drawings) {
    this._drawings = Array.isArray(drawings) ? drawings.filter(Boolean) : [];
    this._requestDrawingRender();
  }

  refreshDrawings() {
    this._requestDrawingRender();
    if (this._drawingRenderQueued) return;
    this._renderDrawings();
  }

  setDrawingPlaybackTime(time) {
    const isCleared = time === null || time === undefined || time === '';
    const numericTime = Number(time);
    const nextTime = isCleared ? null : Number.isFinite(numericTime) ? numericTime : null;
    if (this._drawingPlaybackTime === nextTime) return;
    this._drawingPlaybackTime = nextTime;
    this._requestDrawingRender();
  }

  followDrawingsToLatest(enabled = true) {
    const nextEnabled = Boolean(enabled);
    if (this._drawingFollowLatest === nextEnabled) return;
    this._drawingFollowLatest = nextEnabled;
    this._requestDrawingRender();
  }

  setDrawingRevealCount(count, activeProgress = 1) {
    const nextCount = (count === null || count === undefined) ? null : Math.max(0, Math.floor(count));
    const nextProgress = Math.max(0, Math.min(1, activeProgress));
    if (this._drawingRevealCount === nextCount && this._activeDrawingProgress === nextProgress) return;
    this._drawingRevealCount = nextCount;
    this._activeDrawingProgress = nextProgress;
    this._requestDrawingRender();
  }

  _getDrawingPlaybackWindow() {
    if (this._drawingFollowLatest) {
      const lastTime = this._getTimeValue(this.getLastCandleTime());
      return { enabled: true, time: Number.isFinite(lastTime) ? lastTime : null };
    }
    if (Number.isFinite(this._drawingPlaybackTime)) {
      return { enabled: true, time: this._drawingPlaybackTime };
    }
    return { enabled: false, time: null };
  }

  _shouldHideTimedDrawing(time, drawingWindow) {
    if (!drawingWindow?.enabled) return false;
    if (!Number.isFinite(drawingWindow.time)) return true;
    const targetTime = this._getTimeValue(time);
    return Number.isFinite(targetTime) && targetTime > drawingWindow.time;
  }

  _interpolatePointByTime(from, to, targetTime) {
    const fromTime = this._getTimeValue(from?.time);
    const toTime = this._getTimeValue(to?.time);
    const safeTargetTime = Number(targetTime);
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || !Number.isFinite(safeTargetTime)) return null;
    if (toTime <= fromTime) {
      return { time: safeTargetTime, price: Number(to?.price ?? from?.price ?? 0) };
    }
    const ratio = Math.max(0, Math.min(1, (safeTargetTime - fromTime) / (toTime - fromTime)));
    const fromPrice = Number(from?.price ?? 0);
    const toPrice = Number(to?.price ?? fromPrice);
    return {
      time: safeTargetTime,
      price: fromPrice + (toPrice - fromPrice) * ratio,
    };
  }

  _clipSegmentByTime(from, to, drawingWindow) {
    if (!drawingWindow?.enabled) return { from, to, complete: true };
    if (!Number.isFinite(drawingWindow.time)) return null;
    const fromTime = this._getTimeValue(from?.time);
    const toTime = this._getTimeValue(to?.time);
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return null;
    if (drawingWindow.time < Math.min(fromTime, toTime)) return null;
    if (drawingWindow.time >= Math.max(fromTime, toTime)) {
      return { from, to, complete: true };
    }
    const clippedTo = this._interpolatePointByTime(from, to, drawingWindow.time);
    if (!clippedTo) return null;
    return { from, to: clippedTo, complete: false };
  }

  _clipPointsByTime(points, drawingWindow) {
    if (!Array.isArray(points) || points.length === 0) return { points: [], complete: false };
    if (!drawingWindow?.enabled) return { points: points.slice(), complete: true };
    if (!Number.isFinite(drawingWindow.time)) return { points: [], complete: false };
    const firstTime = this._getTimeValue(points[0]?.time);
    if (!Number.isFinite(firstTime) || drawingWindow.time < firstTime) {
      return { points: [], complete: false };
    }

    const visiblePoints = [points[0]];
    let complete = true;

    for (let index = 1; index < points.length; index += 1) {
      const previousPoint = points[index - 1];
      const currentPoint = points[index];
      const currentTime = this._getTimeValue(currentPoint?.time);
      const previousTime = this._getTimeValue(previousPoint?.time);
      if (!Number.isFinite(currentTime) || !Number.isFinite(previousTime)) continue;
      if (currentTime <= drawingWindow.time) {
        visiblePoints.push(currentPoint);
        continue;
      }
      complete = false;
      if (drawingWindow.time > previousTime) {
        const interpolatedPoint = this._interpolatePointByTime(previousPoint, currentPoint, drawingWindow.time);
        if (interpolatedPoint) {
          visiblePoints.push(interpolatedPoint);
        }
      }
      break;
    }

    if (visiblePoints.length === points.length) {
      complete = true;
    }

    return { points: visiblePoints, complete };
  }

  _ensureDrawingOverlay() {
    if (!this.container) return;
    if (this._drawingOverlay && this._drawingOverlay.parentNode === this.container) return;
    if (this._drawingOverlay && this._drawingOverlay.parentNode) {
      try { this._drawingOverlay.parentNode.removeChild(this._drawingOverlay); } catch (_) {}
    }
    this._drawingOverlay = null;
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.setAttribute('class', 'chart-drawing-overlay');
    overlay.setAttribute('preserveAspectRatio', 'none');
    this.container.appendChild(overlay);
    this._drawingOverlay = overlay;
  }

  _requestDrawingRender() {
    const overlayHasContent = Boolean(this._drawingOverlay && this._drawingOverlay.childNodes.length > 0);
    if (!this._drawings.length && !overlayHasContent) return;
    if (this._drawingRenderQueued) return;
    this._drawingRenderQueued = true;
    this._drawingRenderFrame = requestAnimationFrame(() => {
      this._drawingRenderFrame = 0;
      this._drawingRenderQueued = false;
      if (!this.chart || !this.container) return;
      // If a viewport restore is pending (landscape resize), defer rendering
      // to avoid drawing with stale coordinates before viewport settles
      if (this._viewportRestoreTimer && this.mode === 'pattern') {
        return;
      }
      this._renderDrawings();
    });
  }

  _getTimeValue(time) {
    if (time && typeof time === 'object') {
      return Number(time.timestamp || time.time || 0);
    }
    return Number(time || 0);
  }

  _timeToCoordinate(time) {
    if (!this.chart) return null;
    try {
      const coordinate = this.chart.timeScale().timeToCoordinate(time);
      if (coordinate !== null && coordinate !== undefined) return coordinate;
    } catch (_) {}
    try {
      const range = this.chart.timeScale().getVisibleRange();
      if (!range || !this.container) return null;
      const from = this._getTimeValue(range.from);
      const to = this._getTimeValue(range.to);
      const current = this._getTimeValue(time);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
      // Subtract estimated right price scale width (~50px) from content width
      const containerWidth = this._lastContainerWidth || this.container.clientWidth;
      const contentWidth = Math.max(1, containerWidth - 50);
      return ((current - from) / (to - from)) * contentWidth;
    } catch (_) { return null; }
  }

  _priceToCoordinate(price) {
    if (!this.candleSeries || !this.chart) return null;
    try {
      const coordinate = this.candleSeries.priceToCoordinate(price);
      return Number.isFinite(coordinate) ? coordinate : this._fallbackCoordinate(price);
    } catch (_) { return this._fallbackCoordinate(price); }
  }

  _fallbackCoordinate(price) {
    if (!this._candleData.length || !this.container) return null;
    const hi = this._cachedHigh;
    const lo = this._cachedLow;
    if (!Number.isFinite(hi) || !Number.isFinite(lo) || hi === lo) return null;
    // Subtract estimated time scale height (~26px) and apply price scale margins
    const containerHeight = this._lastContainerHeight || this.container.clientHeight;
    const margins = this.mode === 'pattern' ? PATTERN_PRICE_SCALE_MARGINS : { top: 0.1, bottom: 0.25 };
    const contentHeight = Math.max(1, containerHeight - 26);
    const topMargin = contentHeight * margins.top;
    const bottomMargin = contentHeight * margins.bottom;
    const drawableHeight = contentHeight - topMargin - bottomMargin;
    return topMargin + ((hi - Number(price || 0)) / (hi - lo)) * drawableHeight;
  }

  _pointToScreen(point) {
    if (!point) return null;
    const x = this._timeToCoordinate(point.time);
    const y = this._priceToCoordinate(point.price);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  _makeSvgEl(name, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        el.setAttribute(key, String(value));
      }
    });
    return el;
  }

  _measureDrawingTextWidth(text, fontSize = 12, fontWeight = 600) {
    const normalizedText = String(text || '');
    if (!normalizedText) return 0;
    if (typeof document === 'undefined') {
      return normalizedText.length * fontSize * 0.9;
    }
    if (!this._drawingMeasureCanvas) {
      this._drawingMeasureCanvas = document.createElement('canvas');
      this._drawingMeasureCtx = this._drawingMeasureCanvas.getContext('2d');
    }
    const ctx = this._drawingMeasureCtx;
    if (!ctx) {
      return normalizedText.length * fontSize * 0.9;
    }
    ctx.font = `${fontWeight} ${fontSize}px 'JetBrains Mono', 'Noto Sans SC', 'Microsoft YaHei', sans-serif`;
    const metrics = ctx.measureText(normalizedText);
    return Number(metrics.width || 0);
  }

  _isDrawingLabelRectOverlapping(a, b, spacing = 6) {
    if (!a || !b) return false;
    return !(
      (a.x + a.width + spacing) <= b.x
      || (b.x + b.width + spacing) <= a.x
      || (a.y + a.height + spacing) <= b.y
      || (b.y + b.height + spacing) <= a.y
    );
  }

  _getDrawingLabelOverlapScore(a, b, spacing = 6) {
    if (!a || !b) return 0;
    const left = Math.max(a.x - spacing, b.x);
    const right = Math.min(a.x + a.width + spacing, b.x + b.width);
    const top = Math.max(a.y - spacing, b.y);
    const bottom = Math.min(a.y + a.height + spacing, b.y + b.height);
    return Math.max(0, right - left) * Math.max(0, bottom - top);
  }

  _resolveDrawingLabelRect(baseRect, align = 'top') {
    if (!baseRect) return null;
    const chartWidth = Math.max(0, this._lastContainerWidth || Number(this.container?.clientWidth || 0));
    const chartHeight = Math.max(0, this._lastContainerHeight || Number(this.container?.clientHeight || 0));
    if (!(chartWidth > 0) || !(chartHeight > 0)) return null;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const minX = 8;
    const minY = 8;
    const maxX = Math.max(minX, chartWidth - baseRect.width - 8);
    const maxY = Math.max(minY, chartHeight - baseRect.height - 8);

    const verticalOffsets = align === 'bottom'
      ? [0, 24, -24, 48, -48, 72, -72, 96, -96, 120, -120]
      : [0, -24, 24, -48, 48, -72, 72, -96, 96, -120, 120];
    const horizontalOffsets = [0, 44, -44, 88, -88, 132, -132];
    let bestCandidate = null;
    let bestScore = Infinity;

    for (const verticalOffset of verticalOffsets) {
      for (const horizontalOffset of horizontalOffsets) {
        const candidate = {
          x: clamp(baseRect.x + horizontalOffset, minX, maxX),
          y: clamp(baseRect.y + verticalOffset, minY, maxY),
          width: baseRect.width,
          height: baseRect.height,
        };
        const score = this._drawingLabelBounds.reduce((total, placedRect) => total + this._getDrawingLabelOverlapScore(candidate, placedRect), 0);
        if (score < bestScore) {
          bestCandidate = candidate;
          bestScore = score;
        }
        const hasOverlap = score > 0;
        if (!hasOverlap) {
          return candidate;
        }
      }
    }

    return bestCandidate;
  }

  _appendLabel(svg, x, y, text, drawing = {}) {
    const normalizedText = String(text || '').trim();
    if (!normalizedText) return;
    const chartWidth = Math.max(0, this._lastContainerWidth || Number(this.container?.clientWidth || 0));
    const chartHeight = Math.max(0, this._lastContainerHeight || Number(this.container?.clientHeight || 0));
    if (!(chartWidth > 0) || !(chartHeight > 0)) return;

    const group = this._makeSvgEl('g', { class: 'chart-drawing-label' });
    const paddingX = Number(drawing.paddingX || 10);
    const paddingY = Number(drawing.paddingY || 6);
    const fontSize = Number(drawing.fontSize || 12);
    const fontWeight = Number(drawing.fontWeight || 600);
    const measuredTextWidth = this._measureDrawingTextWidth(normalizedText, fontSize, fontWeight);
    const textWidth = Math.max(30, Math.ceil(measuredTextWidth));
    const textHeight = Math.ceil(fontSize * 1.5);
    const align = drawing.align || 'top';
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = textHeight + paddingY * 2;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const minX = 8;
    const maxX = Math.max(minX, chartWidth - boxWidth - 8);
    const minY = 8;
    const maxY = Math.max(minY, chartHeight - boxHeight - 8);
    const baseX = clamp(x - boxWidth / 2, minX, maxX);
    const preferredY = align === 'bottom' ? (y + 12) : (y - boxHeight - 12);
    const baseY = clamp(preferredY, minY, maxY);

    const resolvedRect = this._resolveDrawingLabelRect({ x: baseX, y: baseY, width: boxWidth, height: boxHeight }, align);
    if (!resolvedRect) return;

    const boxX = resolvedRect.x;
    const boxY = resolvedRect.y;
    this._drawingLabelBounds.push(resolvedRect);

    const anchorX = Math.max(boxX + 12, Math.min(boxX + boxWidth - 12, x));
    const connectorToTop = boxY >= y;
    const anchorY = connectorToTop ? boxY : boxY + boxHeight;

    const connector = this._makeSvgEl('line', {
      x1: x,
      y1: y,
      x2: anchorX,
      y2: anchorY,
      stroke: drawing.color || 'rgba(255,255,255,0.4)',
      'stroke-width': 1.25,
      'stroke-dasharray': '4 4',
      opacity: 0.8,
    });
    const shadow = this._makeSvgEl('rect', {
      x: boxX,
      y: boxY + 3,
      width: boxWidth,
      height: boxHeight,
      rx: 8,
      ry: 8,
      fill: 'rgba(15,23,42,0.28)',
    });
    const rect = this._makeSvgEl('rect', {
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      rx: 8,
      ry: 8,
      fill: drawing.background || 'rgba(15,23,42,0.82)',
      stroke: drawing.color || 'rgba(255,255,255,0.2)',
      'stroke-width': 1,
    });
    const textEl = this._makeSvgEl('text', {
      x: boxX + paddingX,
      y: boxY + paddingY + fontSize,
      fill: drawing.textColor || '#ffffff',
      'font-size': fontSize,
      'font-weight': fontWeight,
      'font-family': "'JetBrains Mono', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
    });
    textEl.textContent = normalizedText;
    group.appendChild(connector);
    group.appendChild(shadow);
    group.appendChild(rect);
    group.appendChild(textEl);
    svg.appendChild(group);
  }

  _appendTrendlineLabel(svg, from, to, labelX, labelY, drawing = {}) {
    const normalizedText = String(drawing.text || '').trim();
    if (!normalizedText) return;
    const chartWidth = Math.max(0, this._lastContainerWidth || Number(this.container?.clientWidth || 0));
    const chartHeight = Math.max(0, this._lastContainerHeight || Number(this.container?.clientHeight || 0));
    if (!(chartWidth > 0) || !(chartHeight > 0)) return;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    if (lineLength < 20) {
      this._appendLabel(svg, labelX, labelY, normalizedText, drawing);
      return;
    }

    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angleDeg > 90) angleDeg -= 180;
    if (angleDeg < -90) angleDeg += 180;

    const fontSize = Number(drawing.fontSize || 11);
    const fontWeight = Number(drawing.fontWeight || 700);
    const textWidth = Math.max(16, Math.ceil(this._measureDrawingTextWidth(normalizedText, fontSize, fontWeight)));
    const textHeight = Math.ceil(fontSize * 1.3);
    const paddingX = 6;
    const paddingY = 3;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = textHeight + paddingY * 2;

    const offsetPerpendicular = -boxHeight - 4;
    const perpX = -Math.sin(angleDeg * Math.PI / 180) * offsetPerpendicular;
    const perpY = Math.cos(angleDeg * Math.PI / 180) * offsetPerpendicular;
    const cx = labelX + perpX;
    const cy = labelY + perpY;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const clampedX = clamp(cx, 8, Math.max(8, chartWidth - boxWidth - 8));
    const clampedY = clamp(cy, 8, Math.max(8, chartHeight - boxHeight - 8));

    const baseRect = { x: clampedX - boxWidth / 2, y: clampedY - boxHeight / 2, width: boxWidth, height: boxHeight };
    const resolvedRect = this._resolveDrawingLabelRect(baseRect, 'top');
    if (!resolvedRect) return;
    this._drawingLabelBounds.push(resolvedRect);

    const group = this._makeSvgEl('g', { class: 'chart-trendline-label' });
    const rectCx = resolvedRect.x + boxWidth / 2;
    const rectCy = resolvedRect.y + boxHeight / 2;

    group.setAttribute('transform', `rotate(${angleDeg.toFixed(2)}, ${rectCx.toFixed(2)}, ${rectCy.toFixed(2)})`);

    group.appendChild(this._makeSvgEl('rect', {
      x: resolvedRect.x,
      y: resolvedRect.y,
      width: boxWidth,
      height: boxHeight,
      rx: 4,
      ry: 4,
      fill: drawing.background || 'rgba(15,23,42,0.60)',
      stroke: drawing.color || 'rgba(255,255,255,0.25)',
      'stroke-width': 0.8,
    }));
    const textEl = this._makeSvgEl('text', {
      x: resolvedRect.x + paddingX,
      y: resolvedRect.y + paddingY + fontSize,
      fill: drawing.textColor || drawing.color || '#ffffff',
      'font-size': fontSize,
      'font-weight': fontWeight,
      'font-family': "'JetBrains Mono', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
      'letter-spacing': '0.5px',
    });
    textEl.textContent = normalizedText;
    group.appendChild(textEl);
    svg.appendChild(group);
  }

  _appendPointLabel(svg, x, y, drawing = {}) {
    const normalizedText = String(drawing.text || '').trim();
    if (!normalizedText) return;
    const chartWidth = Math.max(0, this._lastContainerWidth || Number(this.container?.clientWidth || 0));
    const chartHeight = Math.max(0, this._lastContainerHeight || Number(this.container?.clientHeight || 0));
    if (!(chartWidth > 0) || !(chartHeight > 0)) return;

    const fontSize = Number(drawing.fontSize || 16);
    const fontWeight = Number(drawing.fontWeight || 800);
    const textWidth = Math.max(12, Math.ceil(this._measureDrawingTextWidth(normalizedText, fontSize, fontWeight)));
    const textHeight = Math.ceil(fontSize * 1.25);
    const paddingX = 5;
    const paddingY = 3;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = textHeight + paddingY * 2;
    const textAnchor = drawing.textAnchor || 'middle';
    const dx = Number(drawing.dx || 0);
    const dy = Number(drawing.dy || -12);
    const align = dy >= 0 ? 'bottom' : 'top';
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const anchorOffset = textAnchor === 'start' ? 0 : textAnchor === 'end' ? -boxWidth : -boxWidth / 2;
    const preferredX = x + dx + anchorOffset;
    const preferredY = y + dy - boxHeight / 2;
    const baseRect = {
      x: clamp(preferredX, 8, Math.max(8, chartWidth - boxWidth - 8)),
      y: clamp(preferredY, 8, Math.max(8, chartHeight - boxHeight - 8)),
      width: boxWidth,
      height: boxHeight,
    };
    const resolvedRect = this._resolveDrawingLabelRect(baseRect, align);
    if (!resolvedRect) return;

    this._drawingLabelBounds.push(resolvedRect);
    const group = this._makeSvgEl('g', { class: 'chart-drawing-point-label' });
    const labelCenterX = resolvedRect.x + boxWidth / 2;
    const labelCenterY = resolvedRect.y + boxHeight / 2;
    const moved = Math.abs(resolvedRect.x - baseRect.x) > 3 || Math.abs(resolvedRect.y - baseRect.y) > 3;
    if (moved) {
      group.appendChild(this._makeSvgEl('line', {
        x1: x,
        y1: y,
        x2: labelCenterX,
        y2: labelCenterY,
        stroke: drawing.color || '#60a5fa',
        'stroke-width': 1,
        'stroke-dasharray': '3 4',
        opacity: 0.62,
      }));
    }
    group.appendChild(this._makeSvgEl('rect', {
      x: resolvedRect.x,
      y: resolvedRect.y,
      width: boxWidth,
      height: boxHeight,
      rx: 5,
      ry: 5,
      fill: drawing.background || 'rgba(15,23,42,0.48)',
      stroke: drawing.color || 'rgba(255,255,255,0.24)',
      'stroke-width': 0.7,
      opacity: 0.92,
    }));
    const labelX = textAnchor === 'start'
      ? resolvedRect.x + paddingX
      : textAnchor === 'end'
        ? resolvedRect.x + boxWidth - paddingX
        : resolvedRect.x + boxWidth / 2;
    const text = this._makeSvgEl('text', {
      x: labelX,
      y: resolvedRect.y + paddingY + fontSize,
      fill: drawing.color || '#60a5fa',
      stroke: drawing.stroke || 'rgba(0,0,0,0.78)',
      'stroke-width': drawing.strokeWidth || 3,
      'paint-order': 'stroke fill',
      'font-size': fontSize,
      'font-weight': fontWeight,
      'font-family': "'JetBrains Mono', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
      'text-anchor': textAnchor,
    });
    text.textContent = normalizedText;
    group.appendChild(text);
    svg.appendChild(group);
  }

  _renderDrawings() {
    this._ensureDrawingOverlay();
    if (!this._drawingOverlay || !this.container) return;
    // Use the dimensions that were passed to chart.applyOptions to stay in sync
    // with the chart library's internal coordinate system
    const width = Math.max(1, this._lastContainerWidth || this.container.clientWidth || 1);
    const height = Math.max(1, this._lastContainerHeight || this.container.clientHeight || 1);
    this._drawingOverlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this._drawingOverlay.setAttribute('width', width);
    this._drawingOverlay.setAttribute('height', height);
    this._drawingOverlay.replaceChildren();
    this._drawingLabelBounds = [];

    if (!this._drawings.length) return;

    const defs = this._makeSvgEl('defs');
    const markerIds = new Set();
    const drawingWindow = this._getDrawingPlaybackWindow();
    const ensureArrowMarker = (color) => {
      const safeColor = String(color || '#f97316').replace(/[^a-zA-Z0-9_-]/g, '');
      const markerId = `chart-drawing-arrow-head-${safeColor || 'default'}`;
      if (!markerIds.has(markerId)) {
        const marker = this._makeSvgEl('marker', {
          id: markerId,
          markerWidth: 10,
          markerHeight: 10,
          refX: 8,
          refY: 3,
          orient: 'auto',
          markerUnits: 'strokeWidth',
        });
        marker.appendChild(this._makeSvgEl('path', { d: 'M0,0 L0,6 L9,3 z', fill: color || '#f97316' }));
        defs.appendChild(marker);
        markerIds.add(markerId);
      }
      return markerId;
    };
    this._drawingOverlay.appendChild(defs);

    const revealActive = this._drawingRevealCount !== null && this._drawingRevealCount !== undefined;

    for (let _di = 0; _di < this._drawings.length; _di++) {
      const drawing = this._drawings[_di];
      if (!drawing) continue;

      // ── 逐步绘制: 决定当前元素使用哪种窗口 ──
      let effectiveWindow;
      if (revealActive) {
        if (_di >= this._drawingRevealCount) continue; // 尚未揭示
        if (_di < this._drawingRevealCount - 1) {
          effectiveWindow = { enabled: false, time: null }; // 已完成的: 全部显示
        } else {
          // 正在绘制的: 用 _activeDrawingProgress 构造子窗口
          const prog = this._activeDrawingProgress;
          if (prog >= 1) {
            effectiveWindow = { enabled: false, time: null };
          } else {
            // 计算该绘图元素的时间范围, 用 progress 插值
            const times = [];
            if (drawing.time1 !== undefined) times.push(Number(drawing.time1));
            if (drawing.time2 !== undefined) times.push(Number(drawing.time2));
            if (drawing.time !== undefined) times.push(Number(drawing.time));
            if (Array.isArray(drawing.points)) drawing.points.forEach(p => { if (p?.time !== undefined) times.push(Number(p.time)); });
            const validTimes = times.filter(Number.isFinite);
            if (validTimes.length >= 2) {
              const minT = Math.min(...validTimes);
              const maxT = Math.max(...validTimes);
              effectiveWindow = { enabled: true, time: minT + (maxT - minT) * prog };
            } else {
              effectiveWindow = prog > 0.5 ? { enabled: false, time: null } : { enabled: true, time: -Infinity };
            }
          }
        }
      } else {
        effectiveWindow = drawingWindow;
      }

      if (drawing.type === 'hline') {
        if (effectiveWindow.enabled && !Number.isFinite(effectiveWindow.time)) continue;
        const y = this._priceToCoordinate(drawing.price);
        if (!Number.isFinite(y)) continue;
        const limitX = effectiveWindow.enabled ? this._timeToCoordinate(effectiveWindow.time) : width;
        const x2 = Math.max(0, Math.min(width, Number.isFinite(limitX) ? limitX : width));
        if (x2 <= 0) continue;
        const glow = this._makeSvgEl('line', {
          x1: 0,
          y1: y,
          x2: x2,
          y2: y,
          stroke: drawing.color || 'rgba(255,255,255,0.6)',
          'stroke-width': (drawing.width || 2) + 6,
          'stroke-dasharray': drawing.dash || '8 6',
          'stroke-linecap': 'round',
          opacity: 0.12,
        });
        const line = this._makeSvgEl('line', {
          x1: 0,
          y1: y,
          x2: x2,
          y2: y,
          stroke: drawing.color || 'rgba(255,255,255,0.6)',
          'stroke-width': drawing.width || 2,
          'stroke-dasharray': drawing.dash || '8 6',
          'stroke-linecap': 'round',
        });
        this._drawingOverlay.appendChild(glow);
        this._drawingOverlay.appendChild(line);
        if (drawing.text) this._appendLabel(this._drawingOverlay, Math.max(28, Math.min(width - 28, x2)), y, drawing.text, drawing);
        continue;
      }

      if (drawing.type === 'trendline' || drawing.type === 'arrow') {
        const segment = this._clipSegmentByTime(
          { time: drawing.time1, price: drawing.price1 },
          { time: drawing.time2, price: drawing.price2 },
          effectiveWindow,
        );
        if (!segment) continue;
        const from = this._pointToScreen(segment.from);
        const to = this._pointToScreen(segment.to);
        if (!from || !to) continue;
        const glow = this._makeSvgEl('line', {
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          stroke: drawing.color || '#ff8a00',
          'stroke-width': (drawing.width || 2) + 6,
          'stroke-dasharray': drawing.dash || '',
          'stroke-linecap': 'round',
          opacity: 0.16,
        });
        const line = this._makeSvgEl('line', {
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          stroke: drawing.color || '#ff8a00',
          'stroke-width': drawing.width || 2,
          'stroke-dasharray': drawing.dash || '',
          'stroke-linecap': 'round',
          'marker-end': drawing.type === 'arrow' ? `url(#${ensureArrowMarker(drawing.color)})` : '',
        });
        this._drawingOverlay.appendChild(glow);
        this._drawingOverlay.appendChild(line);
        if (drawing.text) {
          const labelX = drawing.textPosition === 'end' ? to.x : drawing.textPosition === 'middle' ? (from.x + to.x) / 2 : from.x;
          const labelY = drawing.textPosition === 'end' ? to.y : drawing.textPosition === 'middle' ? (from.y + to.y) / 2 : from.y;
          this._appendTrendlineLabel(this._drawingOverlay, from, to, labelX, labelY, drawing);
        }
        continue;
      }

      if (drawing.type === 'polyline' || drawing.type === 'polygon') {
        // ── 判断是否是正在逐步绘制的 polyline (手绘动画) ──
        const isActivePolyline = drawing.type === 'polyline' && revealActive
          && _di === this._drawingRevealCount - 1 && this._activeDrawingProgress < 1;

        let screenPts, polyComplete;

        if (isActivePolyline) {
          // ── 距离等速裁切: 像手工画线一样匀速延伸 ──
          const allScreenPts = (drawing.points || []).map(p => this._pointToScreen(p)).filter(Boolean);
          if (allScreenPts.length < 2) continue;
          // 累积路径距离
          const cumDist = [0];
          for (let si = 1; si < allScreenPts.length; si++) {
            const sdx = allScreenPts[si].x - allScreenPts[si - 1].x;
            const sdy = allScreenPts[si].y - allScreenPts[si - 1].y;
            cumDist.push(cumDist[si - 1] + Math.sqrt(sdx * sdx + sdy * sdy));
          }
          const totalLen = cumDist[cumDist.length - 1] || 1;
          const targetDist = this._activeDrawingProgress * totalLen;
          // 按距离裁切
          screenPts = [allScreenPts[0]];
          polyComplete = false;
          for (let si = 1; si < allScreenPts.length; si++) {
            if (cumDist[si] <= targetDist) {
              screenPts.push(allScreenPts[si]);
            } else {
              const segLen = cumDist[si] - cumDist[si - 1];
              if (segLen > 0) {
                const t = (targetDist - cumDist[si - 1]) / segLen;
                screenPts.push({
                  x: allScreenPts[si - 1].x + t * (allScreenPts[si].x - allScreenPts[si - 1].x),
                  y: allScreenPts[si - 1].y + t * (allScreenPts[si].y - allScreenPts[si - 1].y),
                });
              }
              break;
            }
          }
          if (screenPts.length >= allScreenPts.length) polyComplete = true;
        } else {
          // ── 正常时间裁切 (polygon / 已完成的 polyline / 非逐步模式) ──
          const clippedShape = this._clipPointsByTime(drawing.points || [], effectiveWindow);
          if (!clippedShape.points || clippedShape.points.length < 2) continue;
          screenPts = clippedShape.points.map(point => this._pointToScreen(point)).filter(Boolean);
          polyComplete = clippedShape.complete;
          // polygon 填充判定
          if (drawing.type === 'polygon') {
            const isFilledPolygon = (polyComplete || drawing.fillPartial) && screenPts.length >= 3;
            if (screenPts.length < 2) continue;
            const ptStr = screenPts.map(p => `${p.x},${p.y}`).join(' ');
            const tag = isFilledPolygon ? 'polygon' : 'polyline';
            this._drawingOverlay.appendChild(this._makeSvgEl(tag, {
              points: ptStr,
              fill: isFilledPolygon ? 'rgba(255,255,255,0.03)' : 'none',
              stroke: drawing.color || '#ff8a00',
              'stroke-width': (drawing.width || 2) + 6,
              'stroke-dasharray': drawing.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
              opacity: 0.12,
            }));
            this._drawingOverlay.appendChild(this._makeSvgEl(tag, {
              points: ptStr,
              fill: isFilledPolygon ? (drawing.fill || 'rgba(37,99,235,0.16)') : 'none',
              stroke: drawing.color || '#ff8a00',
              'stroke-width': drawing.width || 2,
              'stroke-dasharray': drawing.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
            }));
            continue;
          }
        }

        if (screenPts.length < 2) continue;
        const points = screenPts.map(p => `${p.x},${p.y}`).join(' ');
        // 阴影
        this._drawingOverlay.appendChild(this._makeSvgEl('polyline', {
          points, fill: 'none',
          stroke: drawing.color || '#ff8a00',
          'stroke-width': (drawing.width || 2) + 6,
          'stroke-dasharray': drawing.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
          opacity: 0.12,
        }));
        // 主线
        this._drawingOverlay.appendChild(this._makeSvgEl('polyline', {
          points, fill: 'none',
          stroke: drawing.color || '#ff8a00',
          'stroke-width': drawing.width || 2,
          'stroke-dasharray': drawing.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        }));

        // ── 手绘笔头: polyline 未完成时在尖端显示窜动箭头 ──
        if (!polyComplete && screenPts.length >= 2) {
          const tip = screenPts[screenPts.length - 1];
          const prev = screenPts[screenPts.length - 2];
          const dx = tip.x - prev.x;
          const dy = tip.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const arrowSize = 10;
          const ax = tip.x + ux * arrowSize;
          const ay = tip.y + uy * arrowSize;
          const bx = tip.x - uy * arrowSize * 0.55;
          const by = tip.y + ux * arrowSize * 0.55;
          const cx = tip.x + uy * arrowSize * 0.55;
          const cy = tip.y - ux * arrowSize * 0.55;
          // 箭头三角形
          this._drawingOverlay.appendChild(this._makeSvgEl('polygon', {
            points: `${ax},${ay} ${bx},${by} ${cx},${cy}`,
            fill: drawing.color || '#ffffff', opacity: 0.92,
          }));
          // 外圈光晕
          this._drawingOverlay.appendChild(this._makeSvgEl('circle', {
            cx: tip.x, cy: tip.y, r: 14,
            fill: 'none', stroke: drawing.color || '#ffffff', 'stroke-width': 2,
            class: 'polyline-dart-halo',
          }));
          // 内圈亮点
          this._drawingOverlay.appendChild(this._makeSvgEl('circle', {
            cx: tip.x, cy: tip.y, r: 5,
            fill: drawing.color || '#ffffff', class: 'polyline-dart-tip',
          }));
          // 尾迹
          const trailLen = Math.min(len, 60);
          this._drawingOverlay.appendChild(this._makeSvgEl('line', {
            x1: tip.x - ux * trailLen, y1: tip.y - uy * trailLen,
            x2: tip.x, y2: tip.y,
            stroke: drawing.color || '#ffffff',
            'stroke-width': (drawing.width || 2) + 2, 'stroke-linecap': 'round',
            'stroke-dasharray': '4 8', opacity: 0.4,
            class: 'polyline-trail-segment',
          }));
        }
        continue;
      }

      if (drawing.type === 'circle') {
        if (this._shouldHideTimedDrawing(drawing.time, effectiveWindow)) continue;
        const point = this._pointToScreen({ time: drawing.time, price: drawing.price });
        if (!point) continue;
        const ring = this._makeSvgEl('circle', {
          cx: point.x,
          cy: point.y,
          r: (drawing.radius || 8) + 5,
          fill: 'none',
          stroke: drawing.color || '#ffffff',
          'stroke-width': 1.5,
          'stroke-dasharray': '4 6',
          opacity: 0.34,
        });
        const circle = this._makeSvgEl('circle', {
          cx: point.x,
          cy: point.y,
          r: drawing.radius || 8,
          fill: drawing.fill || 'rgba(255,255,255,0.14)',
          stroke: drawing.color || '#ffffff',
          'stroke-width': drawing.width || 2,
        });
        this._drawingOverlay.appendChild(ring);
        this._drawingOverlay.appendChild(circle);
        continue;
      }

      if (drawing.type === 'pointLabel') {
        if (this._shouldHideTimedDrawing(drawing.time, effectiveWindow)) continue;
        const point = this._pointToScreen({ time: drawing.time, price: drawing.price });
        if (!point) continue;
        if (drawing.showDot) {
          const dotColor = drawing.dotFill || drawing.color || '#60a5fa';
          const dotR = drawing.dotRadius || 4;
          const outerR = dotR + 6;
          const crossLen = dotR + 3;
          this._drawingOverlay.appendChild(this._makeSvgEl('circle', {
            cx: point.x, cy: point.y, r: outerR,
            fill: 'none', stroke: dotColor, 'stroke-width': 1.5, 'stroke-dasharray': '4 3', opacity: 0.55,
          }));
          this._drawingOverlay.appendChild(this._makeSvgEl('circle', {
            cx: point.x, cy: point.y, r: dotR,
            fill: dotColor, stroke: drawing.dotStroke || 'rgba(255,255,255,0.85)', 'stroke-width': drawing.dotWidth || 1.5,
          }));
          this._drawingOverlay.appendChild(this._makeSvgEl('line', {
            x1: point.x - crossLen, y1: point.y, x2: point.x + crossLen, y2: point.y,
            stroke: dotColor, 'stroke-width': 1.2, opacity: 0.6,
          }));
          this._drawingOverlay.appendChild(this._makeSvgEl('line', {
            x1: point.x, y1: point.y - crossLen, x2: point.x, y2: point.y + crossLen,
            stroke: dotColor, 'stroke-width': 1.2, opacity: 0.6,
          }));
        }
        this._appendPointLabel(this._drawingOverlay, point.x, point.y, drawing);
        continue;
      }

      if (drawing.type === 'label') {
        if (this._shouldHideTimedDrawing(drawing.time, effectiveWindow)) continue;
        const point = this._pointToScreen({ time: drawing.time, price: drawing.price });
        if (!point) continue;
        this._appendLabel(this._drawingOverlay, point.x, point.y, drawing.text, drawing);
      }
    }
  }

  // ===========================================================================
  // 数据查询
  // ===========================================================================

  getCurrentPrice() {
    return this._candleData.length ? this._candleData[this._candleData.length - 1].close : null;
  }

  getLastCandleTime() {
    return this._candleData.length ? this._candleData[this._candleData.length - 1].time : null;
  }

  coordinateToPrice(y) {
    if (!this.candleSeries || !this.chart) return null;
    try { return this.candleSeries.coordinateToPrice(y) ?? null; } catch (_) { return this._fallbackPrice(y); }
  }

  _fallbackPrice(y) {
    if (!this.chart || !this._candleData.length) return null;
    try {
      const vr = this.chart.timeScale().getVisibleRange();
      if (!vr) return null;
      const vis = this._candleData.filter(c => { const t = this._getTimeValue(c.time); return t >= vr.from && t <= vr.to; });
      const d = vis.length ? vis : this._candleData;
      let hi = -Infinity;
      let lo = Infinity;
      for (const c of d) {
        if (c.high > hi) hi = c.high;
        if (c.low < lo) lo = c.low;
      }
      const h = this._lastContainerHeight || (this.container ? this.container.clientHeight : 400);
      return hi - (y / h) * (hi - lo);
    } catch (_) { return null; }
  }

  // ===========================================================================
  // UI 更新
  // ===========================================================================

  _updateCandleCount() {
    const lu = this.lastUpdateId ? document.getElementById(this.lastUpdateId) : null;
    if (lu) {
      lu.textContent = this._formatLastUpdateText(this._getLastCandleTimestampMs());
    }

    if (this.onCandleCountChange) this.onCandleCountChange(this.candleCount, null);
  }
}

// =============================================================================
// 导出
// =============================================================================

const chartManagers = {
  trading: new ChartManager({
    mode: 'trading',
    containerId: 'chart-container',
    loadingId: null,
    lastUpdateId: null,
  }),
  pattern: new ChartManager({
    mode: 'pattern',
    containerId: 'pattern-chart-container',
    loadingId: 'pattern-chart-loading',
    lastUpdateId: 'pattern-last-update',
  }),
};

function initCharts() {
  Object.values(chartManagers).forEach((manager) => manager.init());
  return chartManagers;
}

function initChart() {
  initCharts();
  return chartManagers.trading;
}

window.ChartManager = ChartManager;
window.chartManagers = chartManagers;
window.chartManager = chartManagers.trading;
window.patternChartManager = chartManagers.pattern;
window.getChartManager = (mode) => chartManagers[mode] || chartManagers.trading;
window.getChartDiagnostics = (mode = 'trading') => chartManagers[mode]?.getDiagnostics?.() || null;
window.logChartDiagnostics = (mode = 'trading') => {
  const diagnostics = window.getChartDiagnostics(mode);
  console.log(`[Chart diagnostics:${mode}]`, diagnostics);
  return diagnostics;
};
window.initChartManagers = initCharts;
window.initChart = initChart;
