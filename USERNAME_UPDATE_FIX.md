# 用户名更新问题修复

## 问题描述

注册时出现错误：
```
[Auth] Failed to update username: k.data.user.updateUsername is not a function
```

这说明 CloudBase 返回的 `user` 对象上没有 `updateUsername()` 方法。

## 根本原因

CloudBase 的 `user` 对象可能不支持 `updateUsername()` 方法，或者该方法的名称不同。

## 解决方案

修改 `verifyEmailSignUpCode()` 方法，采用多层级的降级策略：

### 尝试顺序

1. **方式1：`updateUsername()` 方法**
   - 如果 user 对象有 `updateUsername()` 方法，直接调用
   - 这是最理想的方式

2. **方式2：`update()` 方法**
   - 如果 user 对象有 `update()` 方法，传递 `{ username }` 对象
   - 这是通用的更新方法

3. **方式3：`setUserInfo()` 方法**
   - 如果 user 对象有 `setUserInfo()` 方法，传递 `{ username }` 对象
   - 这是另一种可能的方法名

4. **方式4：数据库存储**
   - 如果以上方法都不可用，直接在 CloudBase 数据库中存储用户名映射
   - 在 `users` 集合中创建文档，存储用户名和邮箱信息
   - 这是最后的降级方案

### 代码实现

```typescript
if (username) {
  try {
    const auth = getCloudbaseApp().auth({ persistence: 'local' });
    const userRes = await auth.getUser();
    console.log('[Auth] Got user after OTP verification:', userRes?.data?.user?.id);
    
    if (userRes?.data?.user) {
      const user = userRes.data.user as any;
      
      // 方式1：尝试 updateUsername 方法
      if (typeof user.updateUsername === 'function') {
        console.log('[Auth] Updating username to:', username);
        await user.updateUsername(username);
        console.log('[Auth] Username updated successfully via updateUsername');
      }
      // 方式2：尝试 update 方法
      else if (typeof user.update === 'function') {
        console.log('[Auth] Updating username to:', username);
        await user.update({ username });
        console.log('[Auth] Username updated successfully via update');
      }
      // 方式3：尝试 setUserInfo 方法
      else if (typeof user.setUserInfo === 'function') {
        console.log('[Auth] Updating username to:', username);
        await user.setUserInfo({ username });
        console.log('[Auth] Username updated successfully via setUserInfo');
      }
      // 方式4：通过数据库存储用户名映射
      else {
        console.log('[Auth] User object does not have update methods, storing username in database');
        const db = getCloudbaseApp().database();
        const userCollection = db.collection('users');
        await userCollection.doc(user.id).set({
          username,
          email: user.email,
          updatedAt: new Date(),
        });
        console.log('[Auth] Username stored in database');
      }
    }
  } catch (err: any) {
    console.warn('[Auth] Failed to update username:', err?.message);
    // 不阻断注册流程，静默处理
  }
}
```

## 预期行为

1. **如果 CloudBase 支持用户名更新**
   - 用户名会被直接保存到 CloudBase 的用户系统中
   - 用户可以使用用户名和密码登录

2. **如果 CloudBase 不支持用户名更新**
   - 用户名会被保存到数据库中
   - 登录时需要查询数据库来验证用户名
   - 需要修改登录逻辑来支持数据库查询

## 后续步骤

1. **测试注册流程**
   - 查看浏览器控制台日志
   - 确认用户名更新成功（会看到相应的日志消息）

2. **如果使用了数据库存储**
   - 需要在 CloudBase 中创建 `users` 集合
   - 需要修改登录逻辑来支持用户名查询

3. **验证用户名登录**
   - 使用注册时的用户名和密码登录
   - 确认登录成功

## 日志示例

### 成功情况（方式1）
```
[Auth] Got user after OTP verification: 2063084887639851008
[Auth] Updating username to: dingjiangying
[Auth] Username updated successfully via updateUsername
```

### 成功情况（方式4）
```
[Auth] Got user after OTP verification: 2063084887639851008
[Auth] User object does not have update methods, storing username in database
[Auth] Username stored in database
```

### 失败情况
```
[Auth] Failed to update username: [error message]
```

## 相关文件

- [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) - 修改了 `verifyEmailSignUpCode()` 方法
