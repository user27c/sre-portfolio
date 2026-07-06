---
title: "关于我"
date: 2026-04-08
draft: false
---

## 自我介绍

你好，我是 **22/7.** 👋

- **设定**：大三在读，目前正在“学生”与“社会人”的边界线反复横跳，专注于 **DevOps / SRE (Site Reliability Engineering)** 与云原生技术的探索与落地。
- **理念**：利用自动化消除琐事 (Eliminate Toil)，用可观测性穿透黑盒，用软件工程手段解决系统运维的稳定性痛点。
- **热爱**：Coding & 极简生活 & 自动化一切。

“不执于器，而敏于道。”

---

## 技术栈 (Skills)

### ☸️ 容器与编排 (Containerization & Orchestration)
- 深入掌握 **Kubernetes** 核心机制（SharedInformer 监听机制、RBAC 权限管理、声明式 API 规范）。
- 熟练进行 K8s 南北向流量治理（Ingress Controller、TLS 证书自动配置与管理）。
- 精通 **Docker** 容器化开发，擅长编写多阶段构建（Multi-stage Build）以实现极小化、高安全的生产级镜像（非 Root 运行限制）。

### 🛠️ 自动化流水线 & 基础设施即代码 (CI/CD & IaC)
- 熟练编写 **GitHub Actions** 自动化流水线，完成 Lint 静态代码检查、自动化单元测试、Docker 镜像自动构建与推送。
- 熟悉基于 Git 仓库单源信托（Single Source of Truth）的 **GitOps** 自动化发布机制。
- 能够编写声明式的 **Terraform** 基础设施代码，完成云资源的自动化供应。

### 📊 可观测性 (Observability)
- 熟悉基于 **Prometheus / Grafana** 的系统监控体系，擅长自定义 Metrics 接口与监控指标暴露（QPS, Latency, Error Rate）。
- 熟悉 K8s 下日志采集与分析（EFK / Loki / K8s Log API）。

### 💻 编程语言与系统工具
- **Golang** (主修)：能够编写高效、并发安全的云原生后端与 Kubernetes 工具。
- **Shell / Python**：擅长编写各类 Linux 系统级自动化运维工具和初始化脚本。

---

## 核心项目：Kube-AI-Diagnoser
*K8s 智能告警降噪与自动诊断服务（SRE 自动化实践）*

- **背景**：针对 Kubernetes 生产集群告警泛滥、根因排查耗时长的痛点，主导设计了这一套云原生智能诊断流水线。
- **降噪设计**：设计了基于 **滑动窗口 + 冷却时间机制的 Dedup 模块**，实现对短时间内重复告警的 **80% 以上降噪**。
- **自动上下文采集**：利用 Kubernetes Go SDK 编写 Context Harvester，在告警触发时秒级自动收集 Pod 异常日志与当前运行状态。
- **大模型智能诊断**：对接大语言模型（如 DeepSeek），基于严格 of JSON Schema 模板引导 AI 进行系统级根因定位并提供修复指南，最终格式化推送至飞书互动卡片，完成排障自闭环。

---

### 更多信息
- **博客建立时间**：2026 年
- **使用的主题**：hugo-theme-reimu
