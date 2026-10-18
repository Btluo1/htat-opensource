# HTAT - AI 交易模拟对战平台（功能展示开源版）

HTAT 是一个运行在 Cloudflare Workers 上的模拟合约交易对战平台：用户与平台内置的 AI 交易员使用同一份实时行情，各自开仓、同场竞技，比拼收益率。

本仓库是**功能展示型开源**，包含前端界面与通用业务服务层，用于让你了解平台的交互与功能。AI 交易引擎与决策系统属于闭源部分，不包含在本仓库中。

## 功能特性

### 交易
- 模拟合约交易：做多 / 做空，1–200 倍杠杆
- 完整仓位管理：开仓、加仓、减仓、平仓、强平清算
- 多品种行情：BTC、XAU（黄金）

### K 线图表
- 基于 [Lightweight Charts](https://github.com/tradingview/lightweight-charts) 的实时 K 线
- 六档周期：15m / 30m / 1h / 4h / 1d / 1w
- **3 年历史回溯**：向左滚动时按需懒加载更早的历史 K 线（TradingView 式体验），底层持久化在 D1
- 成交量副图、持仓线标注、自定义标记
- 移动端与横屏适配

### 用户体系与积分
- 邮箱验证码登录
- 三桶积分钱包（充值 / 收益 / 奖励），账本流水，乐观锁防并发冲突
- 每日免费积分领取、兑换码兑换

### 对战玩法
- 与 AI 交易员同场对战：双方持仓与盈亏实时可见
- 多空预测对战模式：基于 K 线形态题目进行方向对决

### 实时性
- SSE（Server-Sent Events）实时推送行情 tick、成交、仓位变化
- 断线自动重连与数据补齐

## 技术栈

- **运行时**：Cloudflare Workers（含 Durable Objects、Cron Triggers）
- **数据库**：Cloudflare D1（SQLite），迁移见 `migrations/`
- **前端**：原生 JavaScript + Lightweight Charts，无构建步骤
- **通信**：SSE 实时推送 + REST API

## 目录结构

```
├── public/                 # 前端（用户界面）
│   ├── index.html          # 主页面
│   ├── app.js              # 前端主逻辑（交易交互、SSE 客户端、仓位卡片）
│   ├── chart.js            # K 线图表模块（渲染、3 年历史懒加载）
│   ├── i18n.js             # 中英双语
│   └── styles.css          # 样式
├── src/
│   ├── auth/               # 邮箱认证
│   ├── data/               # D1 访问层（db helper、K 线持久化）
│   ├── services/           # 业务服务层
│   │   ├── trade-service.js       # 仓位交易（开/加/减/平、盈亏结算）
│   │   ├── wallet-service.js      # 三桶积分钱包与账本
│   │   └── redeem-code-service.js  # 兑换码
│   ├── pattern-engine.js   # K 线形态识别（对战题目生成）
│   └── runtime-state.js    # 运行时状态 D1 存取
├── migrations/             # D1 数据库迁移（用户、钱包、交易、对战、K 线）
└── wrangler.example.jsonc  # 部署配置示例（脱敏）
```

## 开源范围说明

| 部分 | 状态 |
|---|---|
| 前端界面与交互 | ✅ 开源 |
| 交易 / 钱包 / 兑换码 / 认证服务层 | ✅ 开源 |
| K 线图表与历史数据持久化 | ✅ 开源 |
| 数据库迁移（用户 / 钱包 / 交易 / 对战 / K 线） | ✅ 开源 |
| **AI 交易引擎与决策系统** | 🔒 闭源 |
| **AI 策略库与策略因子体系** | 🔒 闭源 |
| **Worker 入口（交易主循环编排）** | 🔒 闭源 |
| **管理后台** | 🔒 闭源 |
| AI 相关表结构与迁移 | 🔒 闭源 |

AI 交易员在平台上与你使用相同的行情数据和相同的交易接口进行对战；其决策如何产生属于平台核心，不在开源范围内。

## 部署说明

本仓库为功能展示，不包含 Worker 入口（`src/index.js`）与 AI 相关模块，**不能直接部署为完整产品**。前端（`public/`）与数据库迁移（`migrations/`）可独立参考使用：

1. 参照 `wrangler.example.jsonc` 创建你自己的 `wrangler.jsonc`（填入你的 D1 `database_id`）
2. `npx wrangler d1 migrations apply DB --local` 应用数据库结构
3. `public/` 可作为静态资源目录直接由 Workers Assets 或任意静态托管服务

## 线上体验

https://htat.longsan6180.workers.dev

## License

本项目基于 [MIT License](LICENSE) 开源，可自由使用、修改与分发。

### 第三方组件

| 组件 | 许可证 | 说明 |
|---|---|---|
| [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) v4.2.0 | Apache-2.0 | K 线图表渲染库，见 `public/lightweight-charts.standalone.production.js`（版权声明保留于文件头） |

字体（Inter、JetBrains Mono）通过 Google Fonts CDN 加载，遵循其各自的使用条款。
