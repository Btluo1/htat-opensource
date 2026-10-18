/**
 * 环境变量标准化
 * 只做类型转换和绑定，不做 fallback 逻辑
 */
export function normalizeEnv(env) {
  return {
    ...env,
    // D1: 主要数据存储（用户、交易、钱包、策略、运行时状态）
    DB: env.DB || null,
  };
}
