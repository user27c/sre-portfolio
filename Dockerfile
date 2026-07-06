# ==========================================
# SRE 实践：高可用静态博客 Nginx 容器化 Dockerfile
# ==========================================

# 生产运行阶段：使用超轻量的 nginx-alpine 镜像
FROM nginx:1.25-alpine

# 安装 curl 以便在 K8s 中进行健康检查探针 (Liveness/Readiness Probe)
RUN apk add --no-cache curl

# 复制 nginx 配置文件，实现更安全的运行机制
# 包括禁止展示 nginx 版本号 (server_tokens off)、配置更长缓存等
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 将 Hugo 构建好的静态产物 (public/) 复制到 Nginx 托管目录
# 提示：在此之前需在本地执行 `hugo` 生成 public 文件夹
COPY public/ /usr/share/nginx/html/

# 非 Root 安全运行规范 (体现 SRE 安全实践)
# 默认使用 nginx 用户运行，避免容器逃逸漏洞
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx

USER nginx

EXPOSE 8080

# 启动探针健康测试 (容器自身启动检查)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
