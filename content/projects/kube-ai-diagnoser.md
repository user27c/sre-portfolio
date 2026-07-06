---
title: "Kube-AI-Diagnoser: K8s 智能告警降噪与自动诊断服务"
date: 2026-07-06
draft: false
description: "通过 Kubernetes Go SDK 监听集群事件，结合本地 sliding-window 去重降噪和大模型根因定位，实现自动化运维排障闭环。"
---

# Kube-AI-Diagnoser

在 Kubernetes 生产环境下，当节点或 Pod 发生异常时，Kubernetes 会产生大量的 `Warning` 事件。如果不加治理，这些告警会瞬间淹没 SRE 运维通道；同时，手动去采集 Pod 日志、分析状态并定位原因十分耗时。

**Kube-AI-Diagnoser** 是一款专为云原生设计的 **智能告警降噪与自动诊断工具**。它基于 Go 语言开发，能够实时监听 K8s 异常事件、秒级自动抓取异常现场上下文，并调用大语言模型进行系统级根因判定，最后推送精美的飞书互动卡片，真正实现了从“告警触发”到“根因诊断”的半自动化排障闭环。

---

## 🛠️ 系统架构设计

项目采用轻量、高可用的流水线（Pipeline）架构设计，核心包含：
- **Event Watcher**：利用 Kubernetes `client-go` 的 `SharedInformer` 机制，低开销、实时地监听集群中所有命名空间的 `Warning` 事件。
- **Dedup Engine**：采用滑动窗口结合冷却周期（Cooldown）算法。对同一指纹（Fingerprint）的事件进行聚合与抑制，**过滤掉 80% 以上的重复告警**，避免告警风暴。
- **Context Harvester**：一旦告警被允许通过，Harvester 将通过 K8s API 自动抓取涉事 Pod 的最近 100 行日志、容器状态（ContainerStatus）及事件详情，生成诊断现场的 Context。
- **AI Orchestrator**：将 Context 输入至大模型（如 DeepSeek），采用严格的 JSON Schema 约束，确保 AI 稳定输出结构化的诊断结果（包含根本原因、证据、纠错建议、置信度等）。
- **Feishu Notification**：解析诊断结果，向飞书自动化 Flow 机器人发送 Webhook 消息，生成精美的飞书卡片。

### 1. 系统拓扑架构
![系统拓扑架构图](../../images/kube-ai-diagnoser/01-system-architecture.drawio.png)

### 2. 诊断流水线处理流程 (Pipeline Flow)
![流水线处理流程图](../../images/kube-ai-diagnoser/02-pipeline-flow.drawio.png)

---

## ☁️ 云原生生产级托管与部署 (Deployment & Delivery)

对于任何生产级 SRE 工具，其自身的交付规范与安全性至关重要。本项目完成了全链路的容器化构建与 Serverless K8s 托管：

### 1. 云端 ACK/ASK 部署拓扑
![ACK部署拓扑架构](../../images/kube-ai-diagnoser/03-ack-deployment.drawio.png)

### 2. 阿里云 ACK 容器服务控制台集群概览
在阿里云上配置和运行的真实 Kubernetes 托管集群，右侧折线图展示了待治理的真实 Warning 事件趋势波形：
![阿里云 ACK 控制台集群健康状态与事件概览](../../images/kube-ai-diagnoser/image_copy_3.png)

### 3. 阿里云 ACR 镜像构建仓库
在阿里云容器镜像服务（ACR）中自动进行多版本构建与安全托管：
![ACR控制台版本列表](../../images/kube-ai-diagnoser/image_copy_2.png)

### 4. Serverless Kubernetes ASK 实际运行状态 (双重验证)
项目以非 Root 容器组规格部署于阿里云 Serverless K8s 实例中。以下分别展示了阿里云弹性容器实例 (ECI/ASK) 控制台运行画面，以及通过终端 `kubectl` 命令行工具观测到的诊断服务与其所监视的故障测试 Pod 状态列表：
- **云端控制台运行实机**：
  ![ECI运行状态列表](../../images/kube-ai-diagnoser/image_copy_4.png)
- **本地终端 kubectl get pods -A 状态排查**：
  ![终端 kubectl 命令行查看 Pods 运行详情](../../images/kube-ai-diagnoser/image_copy.png)

---

## 🎬 运行成果展示 (Results Showcase)

> [!IMPORTANT]
> 以下展示了 Kube-AI-Diagnoser 在实际运行过程中的关键成果与日志输出。

### 1. 本地 E2E 自动化测试日志
运行项目内置的一键 E2E 测试脚本 `./scripts/e2e-test.sh`，流水线会自动检测 K8s 连通性、服务 `/healthz` 状态、飞书 Webhook 连通性，并自动模拟注入一个故障 Pod 验证完整的 AI 诊断链路：
![E2E测试日志控制台](../../images/kube-ai-diagnoser/image_copy_5.png)

### 2. 自动推送飞书互动卡片展示
当集群中某个 Pod 因崩溃退出或处于 `Pending` 等故障状态时，系统捕获事件并结合 LLM 深度研判后，向飞书群内推送的真实诊断卡片（包含核心根本原因定位、支撑证据及针对性排查步骤）：
![飞书诊断卡片推送实机效果](../../images/kube-ai-diagnoser/image.png)

---

## 💡 技术实现亮点

- **数据模型设计**：
  ![数据模型设计图](../../images/kube-ai-diagnoser/04-data-model.drawio.png)
- **高性能并发模型**：基于 Go 的 `channel` 和 `worker pool` 模型实现异步处理流水线，能轻松应对高 QPS 事件涌入。
- **降级保护 (Fallback)**：当外部 AI 接口超时或解析异常时，系统能够优雅降级为静态规则模板诊断，保证系统自身的高可用。
- **RBAC 最小权限原则**：K8s YAML 清单中配置了最细粒度的 Read-Only ClusterRole，仅授予 Pods 和 Events 的 Get/List/Watch 权限，防止特权提升。
