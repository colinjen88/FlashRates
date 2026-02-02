import React, { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";

const AdminSection = ({ adminKey }) => {
  // adminKey passed from verified login
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadKeys = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/keys", { // Removed hardcoded localhost
        headers: { "X-API-Key": adminKey },
      });
      if (!res.ok) {
        throw new Error("無法取得金鑰清單");
      }
      const data = await res.json();
      setKeys(data.keys || []);
      setNotice(data.note || "");
    } catch (e) {
      setError("請確認管理員 API Key 是否正確");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
        loadKeys();
    }
  }, [adminKey]);

  const addKey = async () => {
    if (!newKey) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/keys/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": adminKey,
        },
        body: JSON.stringify({ key: newKey }),
      });
      if (!res.ok) {
        throw new Error("新增失敗");
      }
      setNewKey("");
      await loadKeys();
    } catch (e) {
      setError("新增失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const removeKey = async (key) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        "/api/v1/admin/keys/remove",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": adminKey,
          },
          body: JSON.stringify({ key }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "移除失敗");
      }
      await loadKeys();
    } catch (e) {
      setError(e.message || "移除失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const toggleKey = async (key, disable) => {
    setLoading(true);
    setError("");
    try {
      const endpoint = disable
        ? "/api/v1/admin/keys/disable"
        : "/api/v1/admin/keys/enable";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": adminKey,
        },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        throw new Error("更新失敗");
      }
      await loadKeys();
    } catch (e) {
      setError("操作失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto min-h-screen">
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="text-emerald-400 w-5 h-5" />
          API Key 管理端
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          使用管理員 API Key 查看、停用或啟用 API Key。變更會立即套用至 REST 與
          WebSocket。
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-400 mb-6 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            使用步驟
          </div>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              在 .env 設定{" "}
              <span className="font-mono text-slate-200">ADMIN_API_KEYS</span>。
            </li>
            <li>輸入管理員 API Key 後按「載入金鑰」。</li>
            <li>可新增、停用、啟用或移除金鑰。</li>
          </ol>
          <div className="text-xs text-slate-500">
            備註：REST/WS 一律使用{" "}
            <span className="font-mono text-slate-200">X-API-Key</span> 或
            Bearer 方式驗證。
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-xs text-slate-400 mb-6">
          Redis 新增/移除的 key 只在本次服務期間生效；請同步到 .env
          並重啟以持久化。
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-500">
                目前使用 Admin Key: <span className="text-emerald-400 font-mono">******{adminKey.slice(-4)}</span>
            </div>
           <button
            onClick={loadKeys}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold"
          >
            {loading ? "重新整理" : "重新整理列表"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
          <input
            type="text"
            placeholder="新增 API Key（Redis）"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            onClick={addKey}
            disabled={!adminKey || loading || !newKey}
            className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/40 text-slate-200 px-4 py-2 rounded-lg text-sm font-bold"
          >
            新增金鑰
          </button>
        </div>

        {notice && !error && (
          <div className="mb-4 text-sm text-slate-400 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
            {notice}
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-12 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800 px-4 py-3">
            <div className="col-span-8">API Key</div>
            <div className="col-span-2">狀態</div>
            <div className="col-span-2 text-right">操作</div>
          </div>
          {keys.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">尚無金鑰資料</div>
          ) : (
            keys.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-12 items-center px-4 py-3 border-t border-slate-800 text-sm"
              >
                <div className="col-span-8 text-slate-200 font-mono break-all">
                  {item.key}
                  <span className="ml-2 text-[10px] uppercase text-slate-500">
                    {item.source}
                  </span>
                </div>
                <div
                  className={`col-span-2 ${item.disabled ? "text-rose-400" : "text-emerald-400"}`}
                >
                  {item.disabled ? "停用" : "啟用"}
                </div>
                <div className="col-span-2 text-right space-x-2">
                  {item.disabled ? (
                    <button
                      onClick={() => toggleKey(item.key, false)}
                      className="text-xs px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    >
                      啟用
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleKey(item.key, true)}
                      className="text-xs px-3 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                    >
                      停用
                    </button>
                  )}
                  {item.source === "redis" && (
                    <button
                      onClick={() => removeKey(item.key)}
                      className="text-xs px-3 py-1 rounded bg-slate-700/70 text-slate-200 hover:bg-slate-700"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSection;
