---
title: "关于我"
date: 2026-04-08
draft: false
---

## 自我介绍

你好，我是 **22/7.** 👋

- **设定**：大三在读，目前正在“学生”与“社会人”的边界线反复横跳。
- **核心定位**：**AI-Native DevOps / SRE (Site Reliability Engineering)** 与云原生技术的探索者。
- **理念**：利用自动化消除琐事 (Eliminate Toil)，用可观测性穿透黑盒，用软件工程手段解决系统运维的稳定性痛点。
- **热爱**：Coding & 性能调优 & 自动化一切。

“不执于器，而敏于道。”

---

## 🛠️ 我的极客工具箱与技术栈 (Skills)

### 🤖 AI-Native 软件工程 (AI-Native Engineering)
- **Agentic 协同**：将大模型（LLM）和 AI 编程智能体（如 Cursor, Antigravity Agent）深度融合进日常开发与运维工作流中，探索 AI-Native 的自动化研发范式。
- **智能诊断实践**：主导设计并实现了 `Kube-AI-Diagnoser`，将 K8s API Event 监听、日志/状态自动采集与 LLM 根因分析有机结合，探索智能化自愈系统的未来。

### 🐧 极客 Linux & eBPF 内核观测 (Advanced Linux & eBPF)
- **高性能 OS 实操**：以 **CachyOS Linux** (基于 x86-64-v3/v4 指令集编译器优化与定制内核的高性能 Arch Linux 滚动分叉) 作为主力开发和运维演练环境，对系统级性能调优、内核进程调度有深度追求。
- **eBPF 无侵入排障**：熟练编写 **bpftrace** 脚本，能够在不中断业务、零侵入的前提下，捕获 Linux 内核系统调用、TCP/IP 协议栈网络抖动以及文件系统 IO 瓶颈。
- **自适应内核调优**：应用 **bpftune** 实现内核 TCP 接收/发送缓冲区、网卡和系统内存参数的自适应、全自动动态调优。

### ☸️ 云原生与容器编排 (Cloud Native & Kubernetes)
- **K8s 深入**：掌握 `client-go` 的 SharedInformer 监听机制、RBAC 细粒度权限控制、声明式 API 与 CRD 设计。
- **网络与流量治理**：熟练配置 K8s Ingress Controller、基于 Let's Encrypt / Cert-manager 的 SSL/TLS 证书自动申领与续签。
- **容器加固**：遵循 SRE 安全规范，精通 Docker 多阶段构建（Multi-stage Build），设计仅监听非特权端口、在非 Root 限制（如 nginx alpine 的 UID 101）下安全运行的超轻量镜像。

### 🔗 声明式 CI/CD & IaC
- **GitOps 与流水线**：精通 **GitHub Actions** 自动化构建发布，包括自动化 Lint 校验、编译测试、多阶段容器镜像推送及部署成功/失败后的自动化通知（如集成 SMTP 邮件通知等）。
- **基础设施即代码**：熟练使用 **Terraform** 和 **Helm** 声明式编排多云资源与云原生应用。

### 🧰 极简日常武器库 (DevTools)
- **API 调试**：使用 **Bruno** (基于纯文本、Git 友好且轻量级的现代 API 客户端) 取代臃肿的 Postman，完全融入 Git 工作流。
- **终端监控**：利用 **btop** 监测系统硬件资源，使用 **bat** 代替传统 cat 以获得语法高亮，熟练使用 **gh** cli 实现命令行 GitOps 管理。
- **核心语言**：以 **Golang** 作为首选开发语言，熟练使用 **Python / Shell** 编写内核观测与自动化运维脚本。

---

## 核心项目：Kube-AI-Diagnoser
*K8s 智能告警降噪与自动诊断服务（SRE 自动化实践）*

- **背景**：针对 Kubernetes 生产集群告警风暴、人工定位耗时长的痛点，主导设计了这一套云原生智能诊断流水线。
- **降噪设计**：设计了基于 **滑动窗口 + 冷却时间机制的 Dedup 模块**，实现对短时间内重复告警的 **80% 以上降噪**。
- **自动上下文采集**：利用 Kubernetes Go SDK 编写 Context Harvester，在告警触发时秒级自动收集 Pod 异常日志与当前运行状态。
- **大模型智能诊断**：对接大语言模型（如 DeepSeek），基于严格 of JSON Schema 模板引导 AI 进行系统级根因定位并提供修复指南，最终格式化推送至飞书互动卡片，完成排障自闭环。

---

### 更多信息
- **博客建立时间**：2026 年
- **使用的主题**：hugo-theme-reimu
