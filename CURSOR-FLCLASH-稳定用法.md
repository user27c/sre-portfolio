# Cursor + FlClash 稳定用法（Linux）

## 根因（本次复发）

Cursor 日志出现：

```text
connect ETIMEDOUT 198.18.0.8:443
```

`198.18.x.x` 是 Clash **Fake-IP**。说明 Cursor 在连假 IP，不是真实 `api2.cursor.sh`。  
附加规则再全也没用——**DNS 没把 Cursor 域名排除出 Fake-IP**。

Linux 桌面版 **没有「访问控制」**，不能按应用绕过 TUN。

---

## 推荐稳定方案（长期照做）

### FlClash 三个开关

| 位置 | 设置 | 说明 |
|------|------|------|
| **网络** → 虚拟网卡 | **开** | 其它软件走梯子靠 TUN |
| **网络** → 系统代理 | **开** | 可与 TUN 同时开 |
| **DNS** → 覆写 DNS | **开** | 避免 Cursor 连到 198.18.x.x |

> **不要关 TUN**：关 TUN 后只有浏览器等认系统代理的软件走梯子，其它软件会直连。

### DNS → Fakeip 过滤（5 条）

```text
+.cursor.sh
+.cursor.com
+.cursor-cdn.com
+.cursorapi.com
+.todesktop.com
```

### 附加规则（10 条）

保持现有即可（`DOMAIN-SUFFIX` ×5 + `DOMAIN` api2–api5 + `PROCESS-NAME,cursor`）。

### 遵守规则

**不要开**（会报 `proxy-server-nameserver` 不能为空）。

---

## 每次操作后

1. 完全退出 FlClash → 再开  
2. 完全退出 Cursor → 再开  

---

## 订阅更新后自检（30 秒）

- [ ] 虚拟网卡仍是 **关**  
- [ ] 覆写 DNS 仍是 **开**，Fakeip 过滤 5 条还在  
- [ ] 附加规则 10 条还在  

---

## 为何必须开 TUN + 覆写 DNS？

- **TUN 开着**：其它软件才能全局走梯子。  
- **覆写 DNS + Fakeip 过滤**：Cursor 域名不用假 IP `198.18.x.x`，避免 `ETIMEDOUT`。  
- **附加规则 DIRECT**：Cursor 流量直连出口（不经代理节点）。

---

## 覆写模板（可选）

`~/.local/share/com.follow.clash/cursor-override.yaml`

配置 → BoostNet → ⋮ → 覆写 → 导入。
