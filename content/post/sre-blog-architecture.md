---
title: "我的 SRE 个人博客：Hugo、容器化与 GitHub Pages CI/CD 实践"
date: 2026-07-06
draft: false
description: "记录本站如何使用 Hugo、GitHub Actions、非 Root Nginx 镜像和 Kubernetes 清单完成低成本自动化交付。"
---

<span style="display: inline-block; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; margin-bottom: 20px;">🤖 本文由 AI (Antigravity Agent) 协同撰写</span>

在 SRE 团队中，**“成本优化 (Cost Optimization)”**、**“变更自动化 (CI/CD)”** 和 **“生产安全性 (Security)”** 是评估系统成熟度的核心指标。

这个博客是一个低风险的工程实验场：线上由 GitHub Pages 托管，仓库中另外保留容器与 Kubernetes 清单，用于练习自动化交付、安全基线和可观测的部署过程。它不等同于生产系统，但可以验证同类工程决策。

---

## 🚀 1. 自动化 CI/CD (GitHub Actions + SMTP)

本站通过 **GitHub Actions** 管理静态站点 CI/CD：主分支 (`main`) 的文章或代码变更会触发质量检查、Hugo 构建与 GitHub Pages 部署。由于线上发布由 CI 直接完成，而不是由集群控制器从声明式仓库持续协调，这里准确地称为 CI/CD，而不是 GitOps。

同时，我还设计了 **部署成功/失败后的自动化通知机制**，将部署状态秒级推送到 QQ 邮箱，让运维变更有迹可循。

### 工作流核心配置 `.github/workflows/hugo.yaml`
以下是自动化构建和部署的主干配置（已集成 Dart Sass 与 Extended 依赖编译）：

```yaml
name: 发布 Hugo 网站到 GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: 检出仓库
        uses: actions/checkout@v6
        with:
          fetch-depth: 1

      - name: 安装 Hugo Extended
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "0.164.0"
          extended: true

      - name: 设置 GitHub Pages
        id: pages
        uses: actions/configure-pages@v6

      - name: 使用 Hugo 构建
        run: hugo --gc --minify --panicOnWarning --baseURL "${{ steps.pages.outputs.base_url }}/"

      - name: 检查生成页面和内部链接
        run: python3 scripts/check-site.py public /sre-portfolio/

      - name: 上传构建产物
        uses: actions/upload-pages-artifact@v5
        with:
          path: ./public

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: 部署到 GitHub Pages
        uses: actions/deploy-pages@v5

  # SRE 变更通知：将部署结果通过 SMTP 实时通知 QQ 邮箱
  notify:
    needs: deploy
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Send QQ Email Notification
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: smtp.qq.com
          server_port: 465
          username: ${{ secrets.QQ_EMAIL }}
          password: ${{ secrets.QQ_SMTP_AUTH }}
          subject: "${{ needs.deploy.result == 'success' && '✅ Hugo部署成功' || '❌ Hugo部署失败' }} - ${{ github.repository }}"
          to: ${{ secrets.QQ_EMAIL }}
          from: ${{ secrets.QQ_EMAIL }}
          secure: true
          body: |
            项目: ${{ github.repository }}
            状态: ${{ needs.deploy.result }}
            提交信息: ${{ github.event.head_commit.message }}
```

---

## 🔒 2. 安全与性能双优的 Nginx 容器化配置

在容器化方面，我为项目设计了标准的 `Dockerfile` 和 `nginx.conf`，体现了 SRE 的安全加固思想：

1. **非 Root 运行机制**：容器监听非特权端口 `8080`，并使用受限制的 `nginx` 账号（UID 101）运行。它不能消除容器逃逸风险，但能降低进程被利用后的权限和影响范围。
2. **减少版本信息暴露**：通过 `server_tokens off;` 隐藏 Nginx 版本号，减少不必要的信息泄露；漏洞治理仍依赖基础镜像升级和依赖扫描。
3. **高效缓存与 Gzip**：开启了多文件类型的静态资源 Gzip 压缩，并对图片、CSS/JS 等文件配置了 30 天的浏览器长缓存 (`Cache-Control`)，大大减少了带宽消耗并提升了页面加载速度。

---

## ☸️ 3. 声明式 Kubernetes 部署模板

虽然本站线上运行在免费的 GitHub Pages 静态托管中，但我依然在代码仓库中集成了规范的 Kubernetes IaC (基础设施即代码) 配置，可以在本地 Kind 或 Minikube 中一键部署：

### 容器健康度探针与并发预约 (`k8s/deployment.yaml`)
- **双副本冗余**：配置 `replicas: 2` 可以降低单 Pod 故障造成的中断风险。要应对节点故障，还需要拓扑分散、PDB 和多节点环境，因此不直接把双副本称为完整高可用。
- **资源限制 (Limit & Request)**：通过合理地给 Pod 设定 CPU 和 Memory limits（如上限为 500m / 256Mi），防止容器发生内存泄漏时无限侵占物理节点资源，保障邻近服务的稳定。
- **就绪与存活探针**：利用 `livenessProbe` 和 `readinessProbe` 让 K8s 控制器能够精准获知容器健康状态，确保新容器完全就绪后才接入流量，并在容器异常时自动实现重建自愈。

### 自动化证书续签与流量调度 (`k8s/ingress.yaml`)
- **HTTPS 强制跳转**：在 Ingress 层面配置 `ssl-redirect: "true"`，强制将不安全的 HTTP 流量跳转至安全信道。
- **证书生命周期自动化**：配置 `cert-manager.io/cluster-issuer: "letsencrypt-prod"` 后，可由 cert-manager 完成申请与续签；仍应监控 Challenge、Issuer 和证书到期状态。

---

## 🎯 总结

SRE 的价值不在于堆叠昂贵组件，而在于**用软件工程方法减少重复操作，并明确验证、失败和恢复路径**。本站目前完成了“一次推送，自动检查、构建、交付与通知”的 CI/CD 闭环；容器与 Kubernetes 部分则作为独立实验持续验证。
