import React, { useState, useEffect, useRef } from "react";
import { Terminal, X, RefreshCw, AlertTriangle } from "lucide-react";

const LogModal = ({ isOpen, onClose, adminKey }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const logEndRef = useRef(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      // 假設後端有一個 log API，這裡暫時讀取靜態或範例
      // 實際應對接後端 /api/v1/admin/logs
      // 由於目前尚未實作 logs API，這裡顯示提示
      // 模擬延遲
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // 這裡您可以根據需求連接真實 API
      // const res = await fetch("/api/v1/admin/logs", { headers: { "X-API-Key": adminKey } });
      // const data = await res.json();
      
      setLogs([
        "[INFO] System started at " + new Date().toISOString(),
        "[INFO] Connected to Redis at localhost:6379",
        "[INFO] Scheduler initialized with 15 sources",
        "[WARN] Source 'Yahoo Finance' high latency detected",
        ...Array(10).fill(0).map((_, i) => `[DEBUG] Polling cycle #${i+100} complete`),
      ]);
    } catch (e) {
      setError("無法載入日誌: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 z-10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="text-emerald-400 w-5 h-5" />
            系統日誌 (System Logs)
          </h3>
          <div className="flex items-center gap-3">
             <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-emerald-400 transition-colors rounded-lg hover:bg-slate-800"
              title="重新整理"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-950 p-4 overflow-y-auto font-mono text-xs sm:text-sm text-slate-300 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {error ? (
              <div className="text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4"/> {error}
              </div>
          ) : (
             logs.map((log, index) => (
                <div key={index} className="border-b border-slate-900/50 pb-0.5 hover:bg-slate-900/30">
                  <span className={log.includes("[INFO]") ? "text-emerald-400/80" : log.includes("[WARN]") ? "text-amber-400/80" : "text-slate-500"}>
                      {log.split("]")[0]}]
                  </span>
                  <span className="ml-2 text-slate-300">
                      {log.split("]").slice(1).join("]")}
                  </span>
                </div>
              ))
          )}
          {logs.length === 0 && !loading && !error && (
              <div className="text-slate-600 italic text-center mt-10">暫無日誌數據</div>
          )}
          <div ref={logEndRef} />
        </div>
        
        <div className="p-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
            <span>顯示最近 500 筆日誌</span>
            <span>Server Time: {new Date().toUTCString()}</span>
        </div>
      </div>
    </div>
  );
};

export default LogModal;
