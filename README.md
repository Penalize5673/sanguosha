# 天元争锋

原创三国题材多人身份卡牌对战（浏览器 + WebSocket）。**与任何商业「三国杀」产品无关**，武将、技能、卡牌均为原创命名。

## 功能

- 创建 / 加入房间（6 位房间码）+ 昵称
- 2–8 人：主公、忠臣、反贼、内奸（按人数分配）
- 体力、手牌、装备区；回合阶段：摸牌 → 出牌 → 弃牌
- 基本牌：斩 / 避 / 疗；锦囊与装备均为原创名称
- 48 名原创武将；核心战斗与常用主动技可玩
- 服务端权威校验；中文暗色三国风 UI（纯 CSS）

## 本地运行

```bash
cd sanguosha
npm install
npm run build
HOST=0.0.0.0 PORT=3000 npm start
```

浏览器打开：`http://localhost:3000`

开发模式（热更新前端）：

```bash
npm install
npm run dev
# 前端 http://localhost:5173 （已代理 /ws 到 3000）
# 需另开终端：tsx server/src/index.ts 或使用 npm run dev（同时起两端）
```

## 好友联机

1. 将服务部署到公网，或本机用内网穿透 / 同一局域网。
2. 房主打开网站 → 输入昵称 → **创建房间**，把 **6 位房间码** 发给好友。
3. 好友打开同一网址 → 输入昵称与房间码 → **加入房间** → 准备。
4. 全员就绪后，房主点击 **开始对局** → 选将 → 对战。

> 必须监听 `HOST=0.0.0.0`，否则外网 / 局域网无法访问。端口由环境变量 `PORT` 指定（默认 3000）。

## 公网部署

### Railway / Render / Fly.io / 任意 Node VPS

1. 将本仓库部署为 Node 服务。
2. 构建命令：`npm install && npm run build`
3. 启动命令：`npm start`
4. 环境变量：
   - `HOST=0.0.0.0`
   - `PORT`：平台指定端口（如 `process.env.PORT`）
5. HTTP 与 WebSocket 同端口（路径 `/ws`），确保平台支持 WebSocket。

#### 示例（VPS）

```bash
git clone <你的仓库> && cd sanguosha
npm install && npm run build
HOST=0.0.0.0 PORT=3000 npm start
# 可用 systemd / pm2 守护进程，并配置 Nginx 反代（需开启 WebSocket Upgrade）
```

Nginx 反代片段：

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

## 冒烟测试

```bash
npm run build
npm start &   # 或另开终端
npm run smoke
```

## 目录结构

```
sanguosha/
  client/          React + Vite 前端
  server/          Express + ws 权威服务端
  shared/          类型、卡牌、武将、身份分配
  scripts/         冒烟测试
  README.md
```

## 已知限制

- 房间状态存内存，进程重启即清空；无持久化账号。
- 部分武将技能为简化 / 被动实现，未覆盖全部官方级边角交互。
- 「破计」等无懈类牌未做完整响应链（可扩展）。
- 断线视为离开；无重连恢复。
- 无 AI 托管。

## 许可

仅供学习与娱乐。请勿使用任何第三方商业游戏的美术、文案或商标。
