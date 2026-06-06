/**
 * CloudBase 云函数：getVApiKey
 *
 * 功能：从环境变量中获取 V-API Key
 *
 * 部署方式：
 * 1. 登录腾讯云 CloudBase 控制台
 * 2. 进入 "开发" -> "云函数"
 * 3. 创建新函数，名称为 "getVApiKey"
 * 4. 选择 Node.js 16 或更新版本
 * 5. 将此代码复制到函数体
 * 6. 配置环境变量 V_API_KEY
 * 7. 部署函数
 *
 * 环境变量配置：
 * - 变量名：V_API_KEY
 * - 值：你的实际 V-API Key
 *
 * 调用方式（前端代码自动调用）：
 * const app = cloudbase.init({ env: 'xxxx' });
 * const result = await app.callFunction({
 *   name: 'getVApiKey',
 *   data: {}
 * });
 */

'use strict';

/**
 * 云函数入口函数
 * @param {Object} event - 请求参数
 * @param {Object} context - 函数上下文
 * @returns {Object} 返回结果
 */
exports.main = async (event, context) => {
  // 从环境变量中获取 V-API Key
  const apiKey = process.env.V_API_KEY;

  // 日志记录（用于调试）
  console.log('[getVApiKey] 云函数被调用');
  console.log('[getVApiKey] 用户信息:', {
    uid: context.requestContext?.requestId,
    timestamp: new Date().toISOString(),
  });

  // 如果没有配置 Key，返回错误
  if (!apiKey) {
    console.error('[getVApiKey] 错误：V_API_KEY 未在环境变量中配置');
    return {
      code: -1,
      message: 'V_API_KEY 未在环境变量中配置，请在 CloudBase 云函数环境变量中设置',
      data: null,
    };
  }

  // 验证 API Key 格式（基本检查）
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    console.error('[getVApiKey] 错误：V_API_KEY 格式无效');
    return {
      code: -2,
      message: 'V_API_KEY 格式无效',
      data: null,
    };
  }

  // 返回成功结果
  console.log('[getVApiKey] 成功返回 V-API Key');
  return {
    code: 0,
    message: '成功获取 V-API Key',
    data: {
      apiKey: apiKey,
      timestamp: new Date().toISOString(),
    },
  };
};
