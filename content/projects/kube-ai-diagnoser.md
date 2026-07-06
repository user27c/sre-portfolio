---
title: "Kube-AI-Diagnoser: K8s 智能告警降噪与自动诊断服务"
date: 2026-07-06
draft: false
description: "通过 Kubernetes Go SDK 监听集群事件，结合本地滑动窗口去重降噪和大模型根因定位，实现自动化运维排障闭环。"
---

# Kube-AI-Diagnoser

在 Kubernetes 生产环境下，当节点或 Pod 发生异常时，Kubernetes 会产生大量的 `Warning` 事件。如果不加治理，这些告警会瞬间淹没 SRE 运维通道；同时，手动去采集 Pod 日志、分析状态并定位原因十分耗时。

**Kube-AI-Diagnoser** 是一款专为云原生设计的 **智能告警降噪与自动诊断工具**。它基于 Go 语言开发，能够实时监听 K8s 异常事件、秒级自动抓取异常现场上下文，并调用大语言模型进行系统级根因判定，最后推送精美的飞书互动卡片，真正实现了从“告警触发”到“根因诊断”的半自动化排障闭环。

---

## 🛠️ 系统架构设计

项目采用轻量、高可用的流水线（Pipeline）架构设计，核心链路如下：

```
      Kubernetes Warning Events
                 │
                 ▼
     [ Event Watcher ] (SharedInformer 实时监听)
                 │
                 ▼
     [ Dedup Engine ] (滑动窗口去重 + 冷却机制降噪)
                 │
                 ▼
  [ Context Harvester ] (自动拉取 Pod Logs & YAML 状态)
                 │
                 ▼
  [ AI Orchestrator ] (引导 LLM 进行严格的 JSON Schema 根因分析)
                 │
                 ▼
 [ Feishu Notification ] (格式化推送飞书 Flow 互动卡片)
```

1. **Event Watcher**：利用 Kubernetes `client-go` 的 `SharedInformer` 机制，低开销、实时地监听集群中所有命名空间的 `Warning` 事件。
2. **Dedup Engine**：采用滑动窗口结合冷却周期（Cooldown）算法。对同一指纹（Fingerprint）的事件进行聚合与抑制，**过滤掉 80% 以上的重复告警**，避免告警风暴。
3. **Context Harvester**：一旦告警被允许通过，Harvester 将通过 K8s API 自动抓取涉事 Pod 的最近 100 行日志、容器状态（ContainerStatus）及事件详情，生成诊断现场的 Context。
4. **AI Orchestrator**：将 Context 输入至大模型（如 DeepSeek），采用严格的 JSON Schema 约束，确保 AI 稳定输出结构化的诊断结果（包含根本原因、证据、纠错建议、置信度等）。
5. **Feishu Notification**：解析诊断结果，向飞书自动化 Flow 机器人发送 Webhook 消息，生成精美的飞书卡片。

---

## 🎬 运行成果展示 (Results Showcase)

> [!IMPORTANT]
> 以下展示了 Kube-AI-Diagnoser 在实际运行过程中的关键效果。

### 1. 自动推送飞书互动卡片

当集群中某个 Pod 因内存不足被系统 Kill 掉（OOMKilled）时，诊断服务会自动分析并生成如下飞书互动卡片，包含**根本原因**、**排障证据**和 **SRE 修复建议**：

<!-- 提示：请将飞书卡片截图存放在 blog/quickstart/static/images/feishu_card_sample.png 路径下 -->
![飞书互动卡片展示](/images/feishu_card_sample.png)

### 2. 诊断服务控制台流式日志

在 Kube-AI-Diagnoser 的后台，你可以清晰地观察到事件捕获、去重通过、上下文拉取以及大模型调用的全流程：

<!-- 提示：请将控制台日志截图存放在 blog/quickstart/static/images/harvester_log_sample.png 路径下 -->
![自动上下文采集与诊断日志](/images/harvester_log_sample.png)

### 3. 实机运行演示视频

以下是 Kube-AI-Diagnoser 捕获一次本地 `ImagePullBackOff` 故障并实时推送通知的运行演示：

<!-- 提示：请将演示视频存放在 blog/quickstart/static/videos/diagnoser_demo.mp4 路径下 -->
<video width="100%" controls>
  <source src="/videos/diagnoser_demo.mp4" type="video/mp4">
  你的浏览器不支持 HTML5 视频播放，请直接下载视频观看。
</video>

---

## 💡 技术实现亮点

- **高性能并发模型**：基于 Go 的 `channel` 和 `worker pool` 模型实现异步处理流水线，能轻松应对高 QPS 事件涌入。
- **降级保护 (Fallback)**：当外部 AI 接口超时或解析异常时，系统能够优雅降级为静态规则模板诊断，保证系统自身的高可用。
- **极简部署**：提供了标准 Dockerfile 及 Kubernetes 声明式配置文件，支持在 ACK (阿里云容器服务) 或本地 Kind/Minikube 中一键拉起。
