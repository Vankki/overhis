# 国服 Overstats Only Design

## 目标

将 Overhis 从国际服 OverFast 数据源切换为只查询中国国服玩家。用户只输入国服 BattleTag 的两个可见部分：玩家昵称和数字编号，页面固定展示 `#` 分隔符，提交时由前端拼成 `昵称#编号`。

## 范围

本次只做国服查询，不提供国际服/国服切换，不再让用户选择平台。保留现有 DeepSeek 中文总结、锐评、Upstash 同 IP 每日 5 次 AI 分析限流，以及现有结果页面的大体结构。

第一版使用独立部署的 Overstats 服务作为国服数据服务。Next.js 只读取 `OVERSTATS_BASE_URL` 并通过服务端 API 调用 Overstats，不在前端仓库保存网易大神 `role_id`、`token` 或 Cookie。

## 用户输入

页面将原来的单个 BattleTag 输入改为：

- `玩家昵称` 文本输入。
- 固定的 `#` 分隔符，只显示，不可编辑。
- `数字编号` 文本输入，只允许数字。

前端提交前拼接为标准 BattleTag：`${name}#${tagNumber}`。后端继续用统一的 BattleTag 校验逻辑，接受 `Name#12345` 这种内部格式，并拒绝空昵称、空编号、非数字编号、带空白的昵称，以及额外的 `#`。

错误文案改为国服语境，例如“请输入国服 BattleTag 的昵称和数字编号”。

## 架构

新增 `src/lib/overstats.ts`，负责：

- 读取并校验 `OVERSTATS_BASE_URL`。
- POST 调用 Overstats JSON 接口。
- 将 Overstats 错误映射为现有 API 错误码。
- 将 Overstats 响应归一化为现有 `PlayerSnapshot`。

保留 `src/lib/overfast.ts` 以降低删除风险，但 `src/app/api/analyze/route.ts` 不再调用 OverFast。`PlayerSnapshot` 类型尽量保持兼容，避免大改 DeepSeek prompt 和结果展示层。

## Overstats 调用

第一版调用两个端点：

- `POST /api/v2/dashen-profile`
  - 请求体：`{ "bnet_id": "Name#12345", "include_previous_season": true }`
  - 用于玩家卡片、头像、头衔、竞技/快速聚合数据、职责段位。

- `POST /api/v2/dashen-match`
  - 请求体：`{ "bnet_id": "Name#12345", "limit": 20, "include_fight": true, "include_previous_season": true, "render": false }`
  - 用于近期对局、常用英雄估算、近战 KDA/胜率补充。

暂不依赖 `dashen-summary/week`，因为 Overstats 文档说明 week 可能需要 90 秒以上，容易拖慢网页查询。暂不依赖 `dashen-competitive-strength`，避免第一版将“强度指数”混入生涯聚合指标。

## 归一化规则

玩家信息：

- `player.id` 使用 Overstats `resolved.bnet_id`，没有则使用提交的 BattleTag。
- `player.name` 优先使用 `resolved.full_id`，其次 `profile_card.data.name`，最后用提交的 BattleTag。
- `player.avatar` 使用 `profile_card.data.icon`。
- `player.title` 使用 `profile_card.data.title`。
- `player.endorsementLevel` 使用 `profile_card.data.level`，无法解析则为 `null`。
- `player.lastUpdatedAt` 第一版设为 `null`，因为 Overstats profile 响应没有稳定更新时间字段。

段位：

- 从 `sport.data.guideCountData` 提取职责。
- `roleType=healer` 映射为 `support`。
- `roleType=damage` 或 `dps` 映射为 `damage`。
- `roleType=tank` 映射为 `tank`。
- 未知职责忽略，不写入 `ranks`。
- `lastRankInfo.rank_name` 写入 `division`，`lastRankInfo.rank_sub_tier` 写入 `tier`。

总体数据：

- 根据用户选择的模式读取 `sport` 或 `leisure`。
- `competitive` 对应 Overstats `sport`。
- `quickplay` 对应 Overstats `leisure`。
- 优先从 `presetsSummaryData`、`openSummaryData`、`recentMatchCount`、`guideCountData` 等稳定字段读取总场次、胜场、胜率、击杀、死亡、伤害、治疗。
- 字段缺失时填 0，保证页面和 AI prompt 不因上游字段漂移崩溃。

常用英雄：

- 优先从所选模式的英雄汇总列表读取。
- 如果 profile 里没有英雄汇总，则从 `/dashen-match` 的 `matches` 按 `heroGuid` 或可读英雄字段聚合最近 20 场，估算 `gamesPlayed`、`gamesWon`、`gamesLost`、`averageEliminations`、`averageDeaths`、`averageDamage`、`averageHealing`。
- 上游只给 `heroGuid` 且没有英雄名时，第一版展示 `heroGuid`，后续可接 Overstats query tool 做英雄名映射。

查询字段：

- `snapshot.query.battleTag` 使用拼接后的 `Name#12345`。
- `snapshot.query.platform` 固定为 `pc`，仅为兼容现有类型和展示。
- `snapshot.query.gameMode` 使用用户选择的 `competitive` 或 `quickplay`。

## API 流程

`POST /api/analyze` 流程调整为：

1. 校验请求体里的 `battleTag` 和 `gameMode`。
2. 标准化 BattleTag。
3. 查询当前 IP 今日额度，不足则直接返回 429。
4. 并发请求 Overstats profile 和 match list。
5. 构建国服 `PlayerSnapshot`。
6. 调用 DeepSeek 生成分析。
7. 仅在 AI 成功生成后消耗一次额度。
8. 如果 DeepSeek 失败，返回战绩快照和 `aiError`，不消耗额度。

这个额度行为保持当前产品语义：每天限制的是成功 AI 分析次数，不是普通查询次数。

## 错误处理

Overstats 客户端新增 `OverstatsError`，复用现有 `ApiErrorCode`：

- 404、`bnet_not_found`、`missing_target` 映射为 `PLAYER_NOT_FOUND` 或 `INVALID_BATTLETAG`。
- `profile_query_failed`、网络错误、超时、非 JSON、`ok: false` 映射为新增的 `OVERSTATS_UNAVAILABLE`。
- 没配置 `OVERSTATS_BASE_URL` 映射为 `OVERSTATS_UNAVAILABLE`，文案提示服务暂不可用。

需要更新 `ApiErrorCode`，将 `OVERFAST_UNAVAILABLE` 替换或补充为 `OVERSTATS_UNAVAILABLE`。如果保留 OverFast 文件和测试，可同时保留 `OVERFAST_UNAVAILABLE`，但 `/api/analyze` 的国服路径只返回 Overstats 文案。

## UI 文案

页面标题和说明改为国服语境：

- 标题：`守望先锋国服战绩 AI 分析`
- 说明：`输入国服 BattleTag，查询网易大神国服战绩并生成中文复盘。`
- 输入标签：`玩家昵称`、`编号`
- placeholder：昵称如 `源氏玩家`，编号如 `12345`
- 底部说明强调“只支持国服公开资料”。

结果页不再展示平台选择含义。为了兼容第一版，可以把平台显示从 `PC · 竞技` 改成 `国服 · 竞技`。

## 测试

新增和更新测试：

- `battletag`：继续覆盖内部 `Name#12345` 校验；后端接受全角 `＃` 并标准化为半角 `#`，用于兼容复制粘贴场景。
- `overstats`：用真实形状的 profile/match fixture 测试快照归一化、段位映射、缺失字段安全默认值、Overstats 错误映射、请求 URL 和 POST body。
- `route`：mock Overstats 客户端，覆盖成功、玩家不存在、Overstats 不可用、DeepSeek 失败不扣额度、AI 成功后扣额度。
- `analysisPrompt`：断言 prompt 明确包含“国服/网易大神数据”语境，并保留 roast 安全约束。
- 前端组件：如现有测试环境足够，补一个提交时拼接 `昵称#编号` 的行为测试；否则依赖 route 和手动验证。

最终验证命令：

```powershell
npm test
npm run build
```

## 安全

Next.js 仓库只保存：

```text
OVERSTATS_BASE_URL=http://127.0.0.1:18080
```

真实网易大神 `DASHEN_ROLE_ID`、`DASHEN_TOKEN` 只配置在 Overstats 服务侧。不要把它们写进 `.env.local`、Git、聊天、日志、截图或测试 fixture。

## 非目标

- 不实现国际服/国服切换。
- 不让网站访客登录网易大神。
- 不读取浏览器 Cookie 或 localStorage。
- 不把 Overstats Python 服务嵌进 Vercel。
- 不做长期缓存；第一版先完成国服数据链路，缓存后续单独设计。

## 自检

- 没有要求用户输入或发送真实 token。
- 第一版范围足够小，可以在一次实施计划内完成。
- Overstats 超时较长的 week summary 没有进入主查询链路。
- 保留现有 `PlayerSnapshot`，降低 UI 和 DeepSeek 改动风险。
