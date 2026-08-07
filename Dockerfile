# ==========================================
# SRE 实践：高可用静态博客 Nginx 容器化 Dockerfile
# ==========================================

# 生产运行阶段：固定到明确的 Nginx stable 版本；发布时可进一步固定镜像 digest
FROM docker.io/library/nginx:1.30.4-alpine

# 复制 nginx 配置文件，实现更安全的运行机制
# 包括禁止展示 nginx 版本号 (server_tokens off)、配置更长缓存等
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# 将 Hugo 构建好的静态产物 (public/) 复制到 Nginx 托管目录
# 提示：在此之前需在本地执行 `hugo` 生成 public 文件夹
COPY --chown=nginx:nginx public/ /usr/share/nginx/html/

# 非 Root 运行降低进程被利用后的权限和影响范围
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
