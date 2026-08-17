---
title: "AegisOps：我如何把 Kubernetes OOM 修复做成可审批的控制面"
date: 2026-08-15T05:22:00+08:00
draft: false
mermaid: false
description: "一次真实阿里云 k3s OOMKilled 演练：从证据采集、策略审批到类型化修复，并如实记录 fake 诊断、源告警未恢复等边界。"
tags:
  [
    "Kubernetes",
    "AIOps",
    "Operator",
    "DeepSeek",
    "Prometheus",
    "Grafana",
    "Loki",
    "Tempo",
  ]
categories: ["Projects", "Cloud Native"]
build:
  publishResources: false
---

让大模型直接生成并执行 `kubectl`，最大的问题不是“回答偶尔不准”，而是它绕过了变更审批、权限边界、幂等控制和失败回滚。

我为此实现了 **AegisOps**：模型只能基于只读证据提出结构化候选方案；是否执行、能改什么、参数是否越界，全部由 Kubernetes Operator 中的确定性代码决定。

[查看源码](https://github.com/user27c/aegisops) · [v0.2.0 Release](https://github.com/user27c/aegisops/releases/tag/v0.2.0) · [云端演练报告](https://github.com/user27c/aegisops/blob/main/docs/cloud-oom-reshoot.md)

| 这次演练回答的问题 | 实测结果 |
| --- | --- |
| 故障是否真实？ | Kubernetes 记录 `OOMKilled`、`exitCode=137`、`restartCount=1` |
| AI 能否直接修改集群？ | 不能；Diagnosis 服务没有 Kubernetes 写权限 |
| 中风险动作如何放行？ | `ApprovalRequired`，审批绑定不可复用的 `planDigest` |
| 实际修改了什么？ | `PatchResourceLimit`：`256Mi → 384Mi` |
| 修复是否被验证？ | 新 Pod Ready，连续两次健康检查成功，Incident 进入 `Resolved` |
| 是否证明 DeepSeek 可自动修复？ | 否；本次云端演练使用 fake provider，真实模型另行评估 |

> **边界声明**：这是受控工程演练，不是生产可用声明。截图时修复状态已为 `Resolved`，但源告警仍是 `firing`；控制台明确显示一致性警告。

---

## 1. 从一次真实 OOM 开始

我在阿里云杭州区单节点 k3s 上部署 AegisOps 和 `fault-lab`。目标容器限制为 `256Mi`，故障注入器每 5 秒分配并触碰 28MiB 物理页，约 50 秒后触发 cgroup OOM。

Alertmanager 告警进入 Gateway 后，系统按指纹去重并创建唯一的 `AIOpsIncident`。状态机不在一个 Reconcile 中等待模型，而是通过多次幂等 Reconcile 推进。

![AegisOps Incident 事故列表](01-aegisops-incident-list.png)
_图 1：Incident 列表展示集群、严重级别、目标、阶段和候选动作。原图保留完整 1440×900 浏览器现场。_

```text
Detected → CollectingEvidence → Diagnosing → PolicyChecking
         → AwaitingApproval → Executing → Verifying → Resolved
```

---

## 2. 先限制 AI，再谈自动修复

AegisOps 的关键不是提示词，而是权限和数据流。DeepSeek/Diagnosis API 不挂载 kubeconfig；`executor` 是唯一拥有受限写权限的组件，HTTP API 也不能直接调用它。

系统只接受 5 个 Typed Action：`RestartWorkload`、`ScaleDeployment`、`PatchResourceLimit`、`RollbackDeployment` 和 `RestoreConfigMap`。模型不能生成 Shell、kubectl 或通用 Patch。

```text
Alertmanager → Incident CR → Evidence Collector → Diagnosis API (read-only)
                                      ↓
Executor ← Approval ← Policy Engine ← Typed Proposal
   ↓
Snapshot → Apply → Verify → Resolved / Rollback
```

无匹配 Policy、证据不足、关键审计不可用、目标锁丢失或验证条件不明确时，系统都会 fail closed，而不是“尽量执行”。

---

## 3. 证据先于结论

Operator 采集 Kubernetes 容器状态、Pod 状态、事件、Prometheus 指标和 Loki 日志，并对规范化后的证据快照计算内容哈希。

本次 OOM 的直接证据来自 Kubernetes：`lastState.terminated.reason=OOMKilled`、`exitCode=137`。诊断结果引用了对应的 `ContainerState` evidence ID，而不是只复述告警标题。

![AwaitingApproval 详情页与 planDigest 门禁](02-aegisops-awaiting-approval.png)
_图 2：真实 OOM 证据、诊断结论、medium 风险、ApprovalRequired 和候选 `PatchResourceLimit(384Mi)` 汇总在同一页面。_

Prometheus 采样到的峰值约为 204 MiB，并没有采到 256 MiB。OOM 发生在两次抓取之间并不矛盾，因此我没有用监控曲线替代 Kubernetes 的终止状态证据。

![Grafana 真实 OOM 处置时间窗口面板](03-grafana-oom-timeline.png)
_图 3：固定 03:28–03:40 窗口。内存阶梯上升后回落，容器重启观察值从 0 跃迁为 1，Incident 停在 AwaitingApproval。_

OpenTelemetry Trace 按 `incident.name` 关联异步阶段，而不是制造一条跨人工审批时长的超长 Trace。

![Tempo 跨服务分布式追踪瀑布图](04-tempo-distributed-traces.png)
_图 4：Operator 到 Diagnosis API 的证据采集与诊断提交 Trace（11 Spans），以及诊断轮询与策略推进 Trace（5 Spans）。_

---

## 4. planDigest 如何防止旧审批继续生效

`PatchResourceLimit` 被 Policy 判为 medium 风险，因此必须进入 `AwaitingApproval`。审批对象还会绑定 Incident UID、proposal revision、过期时间和当前方案摘要。

实际参与 `planDigest` 计算的字段如下，而不是简单地对动作名称做哈希：

```text
IncidentUID
TargetRef + TargetResourceVersion
Action + canonical Parameters
PolicyUID + PolicyGeneration
```

目标资源、动作参数或策略版本变化后，Operator 会重算摘要并拒绝旧审批。TTL 超过 Policy 允许窗口、摘要不一致或审批过期时，同样不会执行。

这能拒绝旧审批重放和审批后的目标漂移，但它不是密码学签名系统；审批身份仍依赖当前 Token 认证实现。

---

## 5. 从批准到类型化写入

我审查证据和参数后批准了 `PatchResourceLimit`。Operator 随后获取目标级 Lease，保存执行前快照，通过固定 Kubernetes API 修改资源，再周期性执行单次健康检查。

```json
{
  "container": "faultlab",
  "memoryLimit": "384Mi"
}
```

Verifier 本身不 sleep 或轮询。Controller 每 15 秒重新入队，要求连续两次健康检查成功后才进入 `Resolved`；超出验证窗口则进入 `RollingBack`。

![执行与审计日志流](05-aegisops-execution-audit.png)
_图 5：PostgreSQL 审计流记录 ApprovalGranted、ExecutionStarted、ExecutionCompleted 和 IncidentResolved。_

这张图也暴露了一个真实缺口：当时 Console DTO 没有提供 Preflight、Snapshot 和 Apply 的结构化引用，因此对应卡片显示 `Unavailable`。审计事件证明阶段发生，但 UI 仍需补齐这些字段。

审计事件通过 `previous_hash` 和 `event_hash` 串联，可以检测链断点。它没有外部签名或可信时间戳，所以准确表述是 tamper-evident，而不是“不可伪造”。

---

## 6. Resolved 不等于所有信号都已恢复

新 Pod 进入 `1/1 Running`，内存限制变为 `384Mi`，连续健康检查通过后，`AIOpsIncident` 进入 `Resolved`。

![最终 Resolved 事故详情页](06-aegisops-resolved-overview.png)
_图 6：修复状态 Resolved，同时页面显示源信号仍为 firing、resolvedAt 未提供的一致性警告。_

截图中的警告不是装饰：Alertmanager 尚未发送 resolved 通知，因此不能把这次演练写成“告警已完全恢复”。它证明的是受控写入与健康验证闭环，而不是源信号闭环。

| 已证明 | 尚未证明 |
| --- | --- |
| 真实 OOM、审批、资源修改与健康验证 | 多节点高可用、长期容量与故障域隔离 |
| 模型没有 Kubernetes 写权限 | 静态 Token 满足企业身份治理 |
| 旧摘要审批会失效 | 审计链具备外部签名或可信时间戳 |
| fake provider 下控制面链路可运行 | DeepSeek 已达到云端自动修复放行线 |

演练结束后，Terraform 管理的 ECS、VPC、vSwitch、安全组、密钥对和公网地址均已销毁。

---

## 7. 工程门禁、模型评估与复现

v0.2.0 的隔离 Kind full E2E 覆盖 9 个顶层场景，耗时 901.6 秒；Go 关键包覆盖率为 controller 80.2%、executor 80.0%、policy 92.7%。

真实 DeepSeek r5 使用 36 个语义有效 case。严格决策合同通过 28/36，危险最终方案为 0/36；r6 有界迭代回退到 26/36，因此项目保留 v4 基线，没有把更复杂流程包装成提升。

本地默认使用 fake provider，可在不产生模型费用的情况下验证控制面：

```bash
git clone https://github.com/user27c/aegisops.git
cd aegisops

scripts/bootstrap-tools.sh
scripts/init-local-config.sh
kind create cluster --name aegisops-dev
make dev-up CONTEXT=kind-aegisops-dev PROFILE=full TAG=dev
make smoke CONTEXT=kind-aegisops-dev
```

完整 E2E 会创建隔离的 `kind-aegisops-e2e` 集群：

```bash
scripts/e2e-up.sh --run-id local --profile full
make test-e2e
```

- [GitHub 仓库](https://github.com/user27c/aegisops)
- [安全模型](https://github.com/user27c/aegisops/blob/main/docs/security-model.md)
- [评估方法与结果](https://github.com/user27c/aegisops/blob/main/docs/evaluation.md)
- [v0.2.0 Release 与 SBOM](https://github.com/user27c/aegisops/releases/tag/v0.2.0)
- [六张截图 SHA-256 与云端事实](https://github.com/user27c/aegisops/blob/main/docs/cloud-oom-reshoot.md)
