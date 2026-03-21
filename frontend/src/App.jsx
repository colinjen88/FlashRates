import React, { useState, useEffect, useRef } from "react";
import TradingViewWidget from "./components/TradingViewWidget";
import {
  Activity,
  Zap,
  Server,
  Code,
  Globe,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X,
  Copy,
  Check,
  Terminal,
  Database,
  Cpu,
  Layers,
  AlertTriangle,
  Coins,
  ArrowUp,
  ArrowDown,
  Banknote,
  Lock,
  Eye,
  EyeOff,
  User,
  FileText,
  Clock,
} from "lucide-react";

// --- 管理端登入憑證 ---
const ADMIN_CREDENTIALS = {
  username: "jenjen",
  password: "Goldlab.WANG1",
};

// --- 模擬數據與配置 ---

const MOCK_SOURCES = [
  { name: "BullionVault", delay: "120ms", trusted: true, type: "Direct" },
  { name: "Investing.com", delay: "250ms", trusted: true, type: "Scrape" },
  { name: "Binance (PAXG)", delay: "45ms", trusted: true, type: "Crypto API" },
  { name: "Kitco (Legacy)", delay: "410ms", trusted: false, type: "Scrape" },
  { name: "GoldPrice.org", delay: "180ms", trusted: true, type: "Scrape" },
  { name: "Yahoo Finance", delay: "320ms", trusted: true, type: "API" },
  { name: "Sina Finance", delay: "150ms", trusted: false, type: "Http" },
  { name: "OANDA (Demo)", delay: "90ms", trusted: true, type: "Stream" },
  { name: "exchangerate.host", delay: "200ms", trusted: true, type: "API" },
  { name: "Fawaz API", delay: "450ms", trusted: true, type: "CDN" },
  { name: "FloatRates", delay: "500ms", trusted: true, type: "Feed" },
];

const CODE_EXAMPLES = {
  curl: `curl -X GET "https://goldlab.cloud/api/v1/latest?symbols=xau-usd,xag-usd,usd-twd" \\
  -H "X-API-Key: YOUR_API_KEY"`,
  python: `import requests

# 同時請求多種資產
url = "https://goldlab.cloud/api/v1/latest"
params = {
    "symbols": "xau-usd,xag-usd,usd-twd", # 黃金, 白銀, 台幣匯率
}
headers = {"X-API-Key": "YOUR_API_KEY"}
response = requests.get(url, params=params, headers=headers)
print(response.json())`,
  js: `const response = await fetch('https://goldlab.cloud/api/v1/latest?symbols=xau-usd,xag-usd,usd-twd', {
  headers: { 'X-API-Key': 'YOUR_API_KEY' }
});

// WebSocket 訂閱多頻道
const socket = new WebSocket('wss://goldlab.cloud/ws/stream?api_key=YOUR_API_KEY');
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(\`\${data.symbol}: \${data.price}\`);
};`,
};

// --- 組件 ---

const Navbar = ({ activeTab, setActiveTab, isAdminLoggedIn, onAdminClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "實時監控" },
    { id: "features", label: "核心技術" },
    { id: "docs", label: "API 文件" },
    { id: "admin", label: "管理端", protected: true },
  ];

  const handleNavClick = (item) => {
    if (item.protected && !isAdminLoggedIn) {
      onAdminClick();
    } else {
      setActiveTab(item.id);
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <img src="/logo.png" alt="Goldlab" className="w-10 h-10 rounded-lg shadow-lg border border-slate-700/50" />
            <span className="text-white font-bold text-xl tracking-tight flex items-center gap-2">
              Goldlab<span className="text-emerald-500">.cloud</span>
              <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded font-medium">
                BETA
              </span>
            </span>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === item.id
                    ? "text-emerald-400 bg-slate-800"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                >
                  {item.protected && <Lock className="w-3 h-3" />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-400 hover:text-white p-2"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
              >
                {item.protected && <Lock className="w-4 h-4" />}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

// --- 價差指標組件 ---
const SpreadIndicator = ({ spotPrice, futurePrice }) => {
  if (!spotPrice || !futurePrice) return null;

  const diff = spotPrice - futurePrice;
  const pct = (diff / spotPrice) * 100;

  return (
    <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-slate-700 flex items-center gap-2">
      現貨與幣安合約價差：
      <span className={diff > 0 ? "text-emerald-400" : "text-rose-400"}>
        {pct.toFixed(2)}%
      </span>
      <span className="text-slate-500">
        ({diff.toFixed(2)})
      </span>
    </span>
  );
};

// --- 登入彈窗組件 ---
const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // 驗證帳號密碼
    setTimeout(() => {
      if (
        username === ADMIN_CREDENTIALS.username &&
        password === ADMIN_CREDENTIALS.password
      ) {
        onLogin();
        setUsername("");
        setPassword("");
        onClose();
      } else {
        setError("帳號或密碼錯誤");
      }
      setIsLoading(false);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 彈窗內容 */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 頂部裝飾 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

        <div className="p-8">
          {/* Logo 和標題 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">管理端登入</h2>
            <p className="text-slate-400 text-sm">
              請輸入管理員帳號和密碼
            </p>
          </div>

          {/* 表單 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 帳號輸入 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                帳號
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  placeholder="請輸入帳號"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* 密碼輸入 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  placeholder="請輸入密碼"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  驗證中...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  登入管理端
                </>
              )}
            </button>
          </form>

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Log Modal ---
const LogModal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/v1/spread-logs?limit=100')
        .then(res => res.json())
        .then(data => {
          setLogs(data.logs || []);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            現貨vs幣安合約 價差{'>'}1%
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-0 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs sm:text-sm text-slate-300">
          {loading ? (
            <div className="p-8 text-center text-slate-500">載入中...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">尚無超過 1% 的價差記錄</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-slate-400 sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-medium">記錄時間</th>
                  <th className="px-4 py-2 font-medium">內容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log, i) => {
                  // Parse simple format if possible, otherwise just display
                  // Expected: 2023-XX-XX... - Gold: Spot=...
                  const parts = log.split(' - ');
                  const time = parts[0] || '';
                  const content = parts.slice(1).join(' - ') || log;
                  return (
                    <tr key={i} className="hover:bg-slate-900/50">
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500">{time}</td>
                      <td className="px-4 py-2 text-emerald-300">{content}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Error Log Modal（API key 透過 header 傳送，不暴露於 URL）---
const ErrorLogModal = ({ isOpen, onClose, apiKey }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError("");
    const headers = apiKey ? { "X-API-Key": apiKey } : {};
    fetch("/api/v1/error-logs?limit=200", { headers })
      .then(res => {
        if (res.status === 401) throw new Error("需要有效的 API Key");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => { setLogs(data.logs || []); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [isOpen, apiKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500" />
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            爬蟲錯誤日誌 (Error Logs)
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-0 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-300">
          {loading ? (
            <div className="p-8 text-center text-slate-500">載入中...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-400">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">目前無錯誤記錄</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`px-4 py-1 border-b border-slate-900 ${log.includes("ERROR") ? "text-rose-300" : log.includes("WARNING") ? "text-amber-300" : "text-slate-400"}`}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// 獨立的單一資產卡片組件，更新支援中文名稱
const AssetCard = React.memo(({
  name,
  symbol,
  price,
  prevPrice,
  timestamp,
  source,
  fastest,
  fastestLatency,
  avgLatency,
  sourcesCount,
  supportedCount,
  sources,
  isMarketOpen,
}) => {
  const [now, setNow] = useState(Date.now());
  const hasData = price !== undefined && price !== null;
  const isUp = hasData ? price >= (prevPrice || price) : true;
  const colorClass = isUp ? "text-emerald-400" : "text-rose-400";
  const changePercent =
    hasData && prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
  const baseMs = timestamp ? timestamp * 1000 : null;
  const lastUpdateMs = baseMs ? Math.max(0, Math.floor(now - baseMs)) : null;

  // Latency Color Logic
  let latencyColor = "text-emerald-400"; // Default < 5s (Fresh)
  if (lastUpdateMs !== null) {
    if (lastUpdateMs > 30000) latencyColor = "text-purple-500 animate-pulse font-black";
    else if (lastUpdateMs > 10000) latencyColor = "text-rose-500 animate-pulse font-bold";
    else if (lastUpdateMs > 5000) latencyColor = "text-orange-400 font-bold";
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative bg-slate-900 ring-1 ring-slate-800 rounded-xl p-5 shadow-2xl overflow-hidden flex flex-col h-full hover:ring-slate-700 transition-all">
      {/* 背景光暈 */}
      <div
        className={`absolute -inset-1 bg-gradient-to-r ${isUp ? "from-emerald-600/20 to-teal-600/20" : "from-rose-600/20 to-orange-600/20"} rounded-xl blur-lg opacity-20 transition duration-1000`}
      ></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              {name}
              <span
                className={`text-[10px] ${hasData
                  ? isMarketOpen === false
                    ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                    : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                  } px-1.5 py-0.5 rounded border font-mono`}
              >
                {hasData
                  ? isMarketOpen === false
                    ? "休市"
                    : "即時"
                  : "等待中"}
              </span>
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium mt-0.5">
              {symbol}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono text-right">
            <div>
              {timestamp
                ? new Date(timestamp * 1000).toLocaleTimeString().split(" ")[0]
                : "--:--:--"}
            </div>
            <div className="text-[10px] text-slate-500">
              上次更新：
              <span className={`inline-block ${latencyColor} tabular-nums w-[6ch] text-right`}>
                {isMarketOpen === false ? "-" : (lastUpdateMs !== null ? lastUpdateMs : "--")}
              </span>
              毫秒前
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-3xl font-black text-white tracking-tighter tabular-nums mb-1">
            {hasData ? price.toFixed(2) : "-"}
          </h2>
          <div
            className={`text-xs font-bold flex items-center ${hasData ? colorClass : "text-slate-500"} transition-colors duration-300`}
          >
            {hasData ? (
              isUp ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
              )
            ) : null}
            {hasData ? `${changePercent.toFixed(2)}%` : "等待數據..."}
          </div>
        </div>

        {/* 來源顯示 */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border bg-slate-900/50 border-slate-800 mb-4">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-300 truncate max-w-[100px]">
              {hasData ? fastest || source || "多源聚合" : "等待連線..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* 最快來源延遲 - 突出顯示 */}
            <span
              className={`text-[10px] font-mono font-bold ${hasData ? "text-emerald-400" : "text-slate-500"}`}
              title="最快來源延遲"
            >
              {hasData ? `${fastestLatency || 0}ms` : "-"}
            </span>
            {/* 加權平均延遲 - 次要顯示 */}
            {hasData && avgLatency > 0 && (
              <span
                className="text-[9px] font-mono text-slate-500"
                title="加權平均延遲"
              >
                (avg {avgLatency}ms)
              </span>
            )}
          </div>
        </div>

        {/* 資料來源清單 */}
        <div className="mt-auto">
          <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
            <span>資料來源</span>
            <span>
              {hasData
                ? `${sourcesCount || 0}/${supportedCount || "-"}`
                : `-/${supportedCount || "-"}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hasData && sources && sources.length > 0 ? (
              sources.slice(0, 6).map((src) => (
                <span
                  key={src}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 bg-slate-900/60"
                >
                  {src}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-500">等待資料...</span>
            )}
            {hasData && sources && sources.length > 6 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 bg-slate-900/60">
                +{sources.length - 6}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});


const DashboardSection = ({ adminKey }) => {
  const [marketData, setMarketData] = useState({});
  const [prevMarketData, setPrevMarketData] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showErrorLogModal, setShowErrorLogModal] = useState(false);
  const marketDataRef = useRef({});

  const [resolvedApiKey, setResolvedApiKey] = useState(() => {
    return (
      adminKey ||
      window.localStorage.getItem("goldlab_api_key") ||
      import.meta.env.VITE_PUBLIC_API_KEY ||
      ""
    );
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get("api_key");
    if (urlKey) {
      window.localStorage.setItem("goldlab_api_key", urlKey);
    }
    setResolvedApiKey(
      urlKey ||
      adminKey ||
      window.localStorage.getItem("goldlab_api_key") ||
      import.meta.env.VITE_PUBLIC_API_KEY ||
      ""
    );
  }, [adminKey]);

  const supportedCounts = {
    "XAU-USD": 10,
    "XAG-USD": 9,
    "USD-TWD": 12,
    "GC-F": 3,
    "SI-F": 3,
    "XAG-USDT": 1,
    "XAU-USDT": 1,
    "DXY": 1,
    "US10Y": 1,
    "HG-F": 1,
    "CL-F": 1,
    "VIX": 1,
    "GDX": 1,
    "SIL": 1,
  };

  useEffect(() => {
    let ws;
    let reconnectTimeout;
    let retryCount = 0; // Added for Exponential Backoff

    const connect = () => {
      const authHeaders = resolvedApiKey ? { 'X-API-Key': resolvedApiKey } : {};

      // 1. Initial Fetch
      fetch(`/api/v1/latest?symbols=XAU-USD,XAG-USD,USD-TWD,GC-F,SI-F,XAG-USDT,XAU-USDT,DXY,US10Y,HG-F,CL-F,VIX,GDX,SIL`, {
        headers: authHeaders
      })
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            const initialData = {};
            Object.keys(data.data).forEach(key => {
              initialData[key] = data.data[key];
            });
            setMarketData(prev => ({ ...prev, ...initialData }));
            marketDataRef.current = { ...marketDataRef.current, ...initialData };
          }
        })
        .catch(err => console.error("Initial fetch error:", err));

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const apiKeyParam = resolvedApiKey ? `?api_key=${encodeURIComponent(resolvedApiKey)}` : "";
      const wsUrl = `${protocol}//${window.location.host}/ws/stream${apiKeyParam}`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Connected to WebSocket");
        setIsConnected(true);
        retryCount = 0; // Reset exponential backoff on success
      };

      ws.onmessage = (event) => {
        try {
          const raw = event.data;
          if (raw.startsWith("{")) {
            const data = JSON.parse(raw);
            setPrevMarketData((prev) => ({
              ...prev,
              [data.symbol]: marketDataRef.current[data.symbol]?.price,
            }));
            setMarketData((prev) => {
              const next = { ...prev, [data.symbol]: data };
              marketDataRef.current = next;
              return next;
            });
          }
        } catch (e) {
          console.error("Parse error", e);
        }
      };

      ws.onclose = () => {
        console.log("Disconnected");
        setIsConnected(false);
        // Exponential Backoff implementation (3s -> 6s -> 12s -> 24s -> max 30s)
        const backoffMs = Math.min(3000 * Math.pow(2, retryCount), 30000);
        retryCount++;
        reconnectTimeout = setTimeout(connect, backoffMs);
      };

      ws.onerror = (err) => {
        console.error("WS Error", err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [resolvedApiKey]);

  return (
    <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
      {/* Header 區域縮減高度 */}
      <div className="text-center max-w-4xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold mb-3 animate-fade-in-up">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? "bg-emerald-400" : "bg-rose-400"} opacity-75`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isConnected ? "bg-emerald-500" : "bg-rose-500"}`}
            ></span>
          </span>
          v2.9 更新: {isConnected ? "系統在線 (WebSocket 已連接)" : "連線中..."}
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight leading-tight">
          即時追蹤 <span className="text-yellow-400">黃金</span>、
          <span className="text-slate-300">白銀</span> 與{" "}
          <span className="text-green-400">外匯</span> 行情
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
          多源聚合、時間分片輪詢，縮短更新時間。
        </p>
      </div>

      <LogModal isOpen={showLogModal} onClose={() => setShowLogModal(false)} />
      <ErrorLogModal isOpen={showErrorLogModal} onClose={() => setShowErrorLogModal(false)} apiKey={resolvedApiKey} />

      {/* 第一排：市場概覽 (TradingView + USD/FX) */}
      <div className="flex items-center justify-between mb-4 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-300 text-nowrap">市場概覽 (Overview)</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLogModal(true)}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <FileText className="w-3 h-3" />
              價差記錄
            </button>
            <button
              onClick={() => setShowErrorLogModal(true)}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-rose-400 px-2 py-1 rounded border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <AlertTriangle className="w-3 h-3" />
              錯誤日誌
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 max-w-[1440px] mx-auto mb-8">
        {/* 1. TradingView USD-TWD (Fixed 360px) */}
        <div className="w-full lg:w-[360px] lg:shrink-0 ring-1 ring-emerald-600 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <TradingViewWidget symbol="FX_IDC:USDTWD" />
        </div>

        {/* Remaining items distribute width */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AssetCard
            name="美元匯率"
            symbol="USD-TWD"
            price={marketData["USD-TWD"]?.price}
            prevPrice={prevMarketData["USD-TWD"]}
            timestamp={marketData["USD-TWD"]?.timestamp}
            source={marketData["USD-TWD"]?.details?.[0]}
            fastest={marketData["USD-TWD"]?.fastest}
            fastestLatency={marketData["USD-TWD"]?.fastestLatency}
            avgLatency={marketData["USD-TWD"]?.avgLatency}
            sourcesCount={marketData["USD-TWD"]?.sources}
            supportedCount={supportedCounts["USD-TWD"]}
            sources={marketData["USD-TWD"]?.details}
            isMarketOpen={marketData["USD-TWD"]?.is_market_open}
          />
          <AssetCard
            name="美元指數"
            symbol="DXY"
            price={marketData["DXY"]?.price}
            prevPrice={prevMarketData["DXY"]}
            timestamp={marketData["DXY"]?.timestamp}
            source={marketData["DXY"]?.details?.[0]}
            fastest={marketData["DXY"]?.fastest}
            fastestLatency={marketData["DXY"]?.fastestLatency}
            avgLatency={marketData["DXY"]?.avgLatency}
            sourcesCount={marketData["DXY"]?.sources}
            supportedCount={supportedCounts["DXY"]}
            sources={marketData["DXY"]?.details}
            isMarketOpen={marketData["DXY"]?.is_market_open}
          />
          <AssetCard
            name="美債殖利率 (10Y)"
            symbol="US10Y"
            price={marketData["US10Y"]?.price}
            prevPrice={prevMarketData["US10Y"]}
            timestamp={marketData["US10Y"]?.timestamp}
            source={marketData["US10Y"]?.details?.[0]}
            fastest={marketData["US10Y"]?.fastest}
            fastestLatency={marketData["US10Y"]?.fastestLatency}
            avgLatency={marketData["US10Y"]?.avgLatency}
            sourcesCount={marketData["US10Y"]?.sources}
            supportedCount={supportedCounts["US10Y"]}
            sources={marketData["US10Y"]?.details}
            isMarketOpen={marketData["US10Y"]?.is_market_open}
          />
        </div>
      </div>

      {/* 黃金區 (Gold) */}
      <div className="flex items-center justify-between mb-4 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-300">黃金 (Gold)</h3>
          <button
            onClick={() => setShowLogModal(true)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <FileText className="w-3 h-3" />
            LOG 記錄
          </button>
        </div>
        <SpreadIndicator
          spotPrice={marketData["XAU-USD"]?.price}
          futurePrice={marketData["XAU-USDT"]?.price}
        />
      </div>
      <div className="flex flex-col lg:flex-row gap-6 max-w-[1440px] mx-auto mb-8">
        <div className="w-full lg:w-[360px] lg:shrink-0 ring-1 ring-emerald-600 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <TradingViewWidget symbol="OANDA:XAUUSD" />
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AssetCard
            name="黃金現貨"
            symbol="XAU-USD"
            price={marketData["XAU-USD"]?.price}
            prevPrice={prevMarketData["XAU-USD"]}
            timestamp={marketData["XAU-USD"]?.timestamp}
            source={marketData["XAU-USD"]?.details?.[0]}
            fastest={marketData["XAU-USD"]?.fastest}
            fastestLatency={marketData["XAU-USD"]?.fastestLatency}
            avgLatency={marketData["XAU-USD"]?.avgLatency}
            sourcesCount={marketData["XAU-USD"]?.sources}
            supportedCount={supportedCounts["XAU-USD"]}
            sources={marketData["XAU-USD"]?.details}
            isMarketOpen={marketData["XAU-USD"]?.is_market_open}
          />
          <AssetCard
            name="幣安合約 (黃金)"
            symbol="XAU-USDT"
            price={marketData["XAU-USDT"]?.price}
            prevPrice={prevMarketData["XAU-USDT"]}
            timestamp={marketData["XAU-USDT"]?.timestamp}
            source={marketData["XAU-USDT"]?.details?.[0]}
            fastest={marketData["XAU-USDT"]?.fastest}
            fastestLatency={marketData["XAU-USDT"]?.fastestLatency}
            avgLatency={marketData["XAU-USDT"]?.avgLatency}
            sourcesCount={marketData["XAU-USDT"]?.sources}
            supportedCount={supportedCounts["XAU-USDT"]}
            sources={marketData["XAU-USDT"]?.details}
            isMarketOpen={true}
          />
          <AssetCard
            name="黃金期貨"
            symbol="GC-F"
            price={marketData["GC-F"]?.price}
            prevPrice={prevMarketData["GC-F"]}
            timestamp={marketData["GC-F"]?.timestamp}
            source={marketData["GC-F"]?.details?.[0]}
            fastest={marketData["GC-F"]?.fastest}
            fastestLatency={marketData["GC-F"]?.fastestLatency}
            avgLatency={marketData["GC-F"]?.avgLatency}
            sourcesCount={marketData["GC-F"]?.sources}
            supportedCount={supportedCounts["GC-F"]}
            sources={marketData["GC-F"]?.details}
            isMarketOpen={marketData["GC-F"]?.is_market_open}
          />
        </div>
      </div>

      {/* 白銀區 (Silver) */}
      <div className="flex items-center justify-between mb-4 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-300">白銀 (Silver)</h3>
          <button
            onClick={() => setShowLogModal(true)}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <FileText className="w-3 h-3" />
            LOG 記錄
          </button>
        </div>
        <SpreadIndicator
          spotPrice={marketData["XAG-USD"]?.price}
          futurePrice={marketData["XAG-USDT"]?.price}
        />
      </div>
      <div className="flex flex-col lg:flex-row gap-6 max-w-[1440px] mx-auto mb-16">
        <div className="w-full lg:w-[360px] lg:shrink-0 ring-1 ring-emerald-600 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <TradingViewWidget symbol="OANDA:XAGUSD" />
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AssetCard
            name="白銀現貨"
            symbol="XAG-USD"
            price={marketData["XAG-USD"]?.price}
            prevPrice={prevMarketData["XAG-USD"]}
            timestamp={marketData["XAG-USD"]?.timestamp}
            source={marketData["XAG-USD"]?.details?.[0]}
            fastest={marketData["XAG-USD"]?.fastest}
            fastestLatency={marketData["XAG-USD"]?.fastestLatency}
            avgLatency={marketData["XAG-USD"]?.avgLatency}
            sourcesCount={marketData["XAG-USD"]?.sources}
            supportedCount={supportedCounts["XAG-USD"]}
            sources={marketData["XAG-USD"]?.details}
            isMarketOpen={marketData["XAG-USD"]?.is_market_open}
          />
          <AssetCard
            name="幣安合約 (白銀)"
            symbol="XAG-USDT"
            price={marketData["XAG-USDT"]?.price}
            prevPrice={prevMarketData["XAG-USDT"]}
            timestamp={marketData["XAG-USDT"]?.timestamp}
            source={marketData["XAG-USDT"]?.details?.[0]}
            fastest={marketData["XAG-USDT"]?.fastest}
            fastestLatency={marketData["XAG-USDT"]?.fastestLatency}
            avgLatency={marketData["XAG-USDT"]?.avgLatency}
            sourcesCount={marketData["XAG-USDT"]?.sources}
            supportedCount={supportedCounts["XAG-USDT"]}
            sources={marketData["XAG-USDT"]?.details}
            isMarketOpen={true}
          />
          <AssetCard
            name="白銀期貨"
            symbol="SI-F"
            price={marketData["SI-F"]?.price}
            prevPrice={prevMarketData["SI-F"]}
            timestamp={marketData["SI-F"]?.timestamp}
            source={marketData["SI-F"]?.details?.[0]}
            fastest={marketData["SI-F"]?.fastest}
            fastestLatency={marketData["SI-F"]?.fastestLatency}
            avgLatency={marketData["SI-F"]?.avgLatency}
            sourcesCount={marketData["SI-F"]?.sources}
            supportedCount={supportedCounts["SI-F"]}
            sources={marketData["SI-F"]?.details}
            isMarketOpen={marketData["SI-F"]?.is_market_open}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1440px] mx-auto">
        <FeatureCard
          icon={Coins}
          title="多資產並行 (Parallel)"
          desc="每個資產對 (XAU, XAG, FX) 各自獨立輪詢與聚合，避免單一資產慢源影響全局更新。"
        />
        <FeatureCard
          icon={Cpu}
          title="多來源異構聚合"
          desc="同時採集 REST API、HTML 爬蟲與 Playwright 來源，來源分散降低封鎖風險，聚合後輸出單一可信價格。"
        />
        <FeatureCard
          icon={AlertTriangle}
          title="異常值熔斷機制"
          desc="偏離中位數 > 0.3% 的來源自動剔除，並搭配 Circuit Breaker 熔斷連續失敗來源。"
        />
      </div>
    </div>
  );
};

const CoreTechSection = () => (
  <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto min-h-screen">
    <div className="mb-10 text-center">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
        核心技術與方法
      </h1>
      <p className="text-slate-400 text-sm max-w-3xl mx-auto">
        以下為目前實際採用的架構與流程，完整對齊後端實作與資料流。
      </p>
    </div>

    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8">
      <h2 className="text-xl font-bold text-white mb-6">資料流流程圖</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Professional Visual Diagram */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
          <img
            src="/flow_diagram.png"
            alt="Goldlab.cloud System Architecture"
            className="relative rounded-xl border border-slate-700 w-full shadow-2xl"
          />
        </div>

        {/* Right: Technical Detail (Original ASCII) */}
        <div className="w-full flex flex-col h-full">
          <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Technical Flow</h3>
          <pre className="text-xs sm:text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto font-mono leading-relaxed custom-scrollbar flex-1 flex items-center">
            {`Sources (Binance / GoldPrice / Sina / ...)
   │  async fetch (aiohttp / Playwright)
   ▼
Scheduler (staggered polling + offsets)
   │  Circuit Breaker
   ▼
Aggregator (weighted avg + median outlier filter 0.3%)
   │
   ├─ Redis PubSub: market:stream:{symbol}
   └─ Redis Cache:  market:latest:{symbol}
   ▼
FastAPI
   ├─ REST: /api/v1/latest /api/v1/metrics
   └─ WS:   /ws/stream
   ▼
React Dashboard / Admin`}
          </pre>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Card 1: 資料採集 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col sm:flex-row h-full group">
        <div className="w-full sm:w-1/3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-800/50 flex items-center justify-center p-6 relative">
          <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors duration-500"></div>
          <Zap className="w-12 h-12 text-blue-400/80 group-hover:scale-110 group-hover:text-blue-400 transition-all duration-500" />
        </div>
        <div className="w-full sm:w-2/3 p-6 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-white mb-3">資料採集與調度</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>asyncio 併發輪詢，每來源獨立 interval + offset 錯峰。</li>
            <li>自適應輪詢：失敗自動降頻，成功逐步回到基準。</li>
            <li>aiohttp 為主要抓取器，Playwright 處理防爬來源。</li>
            <li>共用 HTTP session + retry/backoff 降低瞬時失敗。</li>
          </ul>
        </div>
      </div>

      {/* Card 2: 聚合 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col sm:flex-row h-full group">
        <div className="w-full sm:w-1/3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-800/50 flex items-center justify-center p-6 relative">
          <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
          <Layers className="w-12 h-12 text-emerald-400/80 group-hover:scale-110 group-hover:text-emerald-400 transition-all duration-500" />
        </div>
        <div className="w-full sm:w-2/3 p-6 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-white mb-3">聚合與品質控制</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>加權平均：高可信來源權重較高。</li>
            <li>中位數偏離 0.3% 的來源自動剔除。</li>
            <li>新鮮度衰減 + max_age 淘汰過期資料。</li>
            <li>最快來源與加權平均延遲（前 5 快來源）。</li>
          </ul>
        </div>
      </div>

      {/* Card 3: 可靠性 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col sm:flex-row h-full group">
        <div className="w-full sm:w-1/3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-800/50 flex items-center justify-center p-6 relative">
          <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors duration-500"></div>
          <ShieldCheck className="w-12 h-12 text-orange-400/80 group-hover:scale-110 group-hover:text-orange-400 transition-all duration-500" />
        </div>
        <div className="w-full sm:w-2/3 p-6 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-white mb-3">可靠性機制</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>Circuit Breaker 熔斷失敗來源，定時半開重試。</li>
            <li>FakeRedis 備援，避免 Redis 不可用造成服務失效。</li>
            <li>metrics 記錄成功率與延遲，支援監控與調校。</li>
          </ul>
        </div>
      </div>

      {/* Card 4: 安全 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col sm:flex-row h-full group">
        <div className="w-full sm:w-1/3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-800/50 flex items-center justify-center p-6 relative">
          <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors duration-500"></div>
          <Lock className="w-12 h-12 text-rose-400/80 group-hover:scale-110 group-hover:text-rose-400 transition-all duration-500" />
        </div>
        <div className="w-full sm:w-2/3 p-6 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-white mb-3">安全與存取控制</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>API Key 驗證 + Rate Limit（REST / WS 皆套用）。</li>
            <li>管理端可列出、停用、啟用與新增 Redis key。</li>
            <li>Redis 新增 key 需同步 .env 並重啟以持久化。</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">即時性與時效控制</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>聚合頻率固定 1 秒更新一次。</li>
          <li>每來源 max_age 控制資料最大允許時效。</li>
          <li>新鮮度衰減：越舊權重越低，避免慢源拖累。</li>
          <li>「上次更新」使用最新採用來源時間戳。</li>
        </ul>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">延遲與可觀測性</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>fastestLatency：最快來源延遲，代表即時能力。</li>
          <li>avgLatency：前 5 快來源加權延遲，代表穩定性。</li>
          <li>metrics 提供來源成功率、平均延遲與聚合計數。</li>
        </ul>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">防封鎖與成本平衡</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>來源錯峰輪詢，避免同時高頻請求。</li>
          <li>自適應降頻與熔斷，降低被封鎖機率。</li>
          <li>低頻來源作備援，提高可用性與穩定性。</li>
        </ul>
      </div>
    </div>

    <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8">
      <h2 className="text-xl font-bold text-white mb-6">市場時間判斷</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">貴金屬現貨 (XAU/XAG)</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>🟢 開市：週日 18:00 ET 至 週五 17:00 ET</li>
            <li>⚠️ 每日休市 (Daily Break)：17:00 - 18:00 ET</li>
            <li>🔴 週末休市：週五 17:00 - 週日 18:00 ET</li>
            <li>🏝️ 美國假日：MLK Day、總統日、耶穌受難日等</li>
          </ul>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">夏/冬令時間</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>❄️ 冬令 (EST): UTC-5 (11月 - 3月)</li>
            <li>☀️ 夏令 (EDT): UTC-4 (3月 - 11月)</li>
            <li>系統使用 America/New_York 時區自動處理</li>
          </ul>
          <h3 className="text-lg font-bold text-white mt-4">24/7 資產</h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>🟢 PAXG-USD、XAU-USDT、XAG-USDT (加密貨幣)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 hover:bg-slate-800 transition-all duration-300 group">
    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mb-3 border border-slate-700 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all">
      <Icon className="text-emerald-400 w-5 h-5" />
    </div>
    <h3 className="text-base font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
  </div>
);

const CodeBlock = () => {
  const [lang, setLang] = useState("curl");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="flex space-x-2">
          {["curl", "python", "js"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${lang === l
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-white"
                }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "已複製" : "複製代碼"}
        </button>
      </div>
      <div className="p-4 sm:p-6 overflow-x-auto relative">
        {/* Syntax Highlight Decoration */}
        <pre className="font-mono text-sm leading-relaxed">
          <code className="text-emerald-100/90">{CODE_EXAMPLES[lang]}</code>
        </pre>
      </div>
    </div>
  );
};

const DocsSection = () => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Navbar height + padding
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 hidden lg:block">
          <div className="sticky top-24 space-y-8">
            <div>
              <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                快速開始
              </h5>
              <ul className="space-y-2 border-l border-slate-800">
                <li
                  onClick={() => scrollToSection("intro")}
                  className="pl-4 border-l-2 border-emerald-500 text-emerald-400 font-medium cursor-pointer hover:text-emerald-300 transition-colors"
                >
                  簡介
                </li>
                <li
                  onClick={() => scrollToSection("auth")}
                  className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors"
                >
                  認證 (Authentication)
                </li>
                <li
                  onClick={() => scrollToSection("rate-limits")}
                  className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors"
                >
                  頻率限制 (Rate Limits)
                </li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                端點 (Endpoints)
              </h5>
              <ul className="space-y-2 border-l border-slate-800">
                <li
                  onClick={() => scrollToSection("endpoint-latest")}
                  className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors"
                >
                  GET /api/v1/latest
                </li>
                <li
                  onClick={() => scrollToSection("endpoint-history")}
                  className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors"
                >
                  GET /api/v1/history
                </li>
                <li
                  onClick={() => scrollToSection("endpoint-metrics")}
                  className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors"
                >
                  GET /api/v1/metrics
                </li>
                <li
                  onClick={() => scrollToSection("endpoint-spread-logs")}
                  className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors"
                >
                  GET /api/v1/spread-logs
                </li>
                <li
                  onClick={() => scrollToSection("endpoint-error-logs")}
                  className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors"
                >
                  GET /api/v1/error-logs
                </li>
                <li
                  onClick={() => scrollToSection("endpoint-ws")}
                  className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors"
                >
                  WS /ws/stream
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <div className="prose prose-invert max-w-none">
            <h1 id="intro" className="text-3xl font-bold text-white mb-6 scroll-mt-24">
              API 開發者文檔{" "}
              <span className="text-emerald-500 text-sm align-middle bg-emerald-500/10 px-2 py-1 rounded ml-2">
                v3.2.1
              </span>
            </h1>
            <p className="text-slate-400 text-lg mb-8">
              Goldlab.cloud API
              支援同時請求多種貴金屬與法幣匯率數據。透過在參數中指定多個{" "}
              <code>symbol</code>， 您可以在單次請求中獲取整個市場的即時快照。
            </p>



            <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="text-emerald-400 w-5 h-5" />
                支援的資產 (Supported Assets)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-yellow-400 font-bold">XAU-USD</div>
                  <div className="text-xs text-slate-500">黃金現貨</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-slate-300 font-bold">XAG-USD</div>
                  <div className="text-xs text-slate-500">白銀現貨</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-green-500 font-bold">USD-TWD</div>
                  <div className="text-xs text-slate-500">美元 / 台幣</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-yellow-400 font-bold">GC-F</div>
                  <div className="text-xs text-slate-500">黃金期貨</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-slate-300 font-bold">SI-F</div>
                  <div className="text-xs text-slate-500">白銀期貨</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-orange-400 font-bold">PAXG-USD</div>
                  <div className="text-xs text-slate-500">黃金代幣 (24/7)</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-orange-400 font-bold">XAU-USDT</div>
                  <div className="text-xs text-slate-500">幣安黃金 (24/7)</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-orange-400 font-bold">XAG-USDT</div>
                  <div className="text-xs text-slate-500">幣安白銀 (24/7)</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-blue-400 font-bold">DXY</div>
                  <div className="text-xs text-slate-500">美元指數</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-blue-400 font-bold">US10Y</div>
                  <div className="text-xs text-slate-500">美債殖利率</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-red-400 font-bold">HG-F</div>
                  <div className="text-xs text-slate-500">銅期貨</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-red-400 font-bold">CL-F</div>
                  <div className="text-xs text-slate-500">原油期貨</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-purple-400 font-bold">VIX</div>
                  <div className="text-xs text-slate-500">恐慌指數</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-yellow-400 font-bold">GDX</div>
                  <div className="text-xs text-slate-500">金礦ETF</div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                  <div className="text-slate-300 font-bold">SIL</div>
                  <div className="text-xs text-slate-500">銀礦ETF</div>
                </div>
              </div>
            </div>

            <div id="auth" className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="text-emerald-400 w-5 h-5" />
                認證與 API Key 管理
              </h2>
              <p className="text-slate-400 mb-4">
                本服務使用 API Key 驗證，REST 與 WebSocket 都需要授權。若未設定
                <code>API_KEYS</code>，則視為開放模式（不強制驗證）。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    REST Header
                  </div>
                  <pre className="text-sm text-slate-300 font-mono">
                    {`X-API-Key: YOUR_API_KEY
Authorization: Bearer YOUR_API_KEY`}
                  </pre>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    WebSocket Query
                  </div>
                  <pre className="text-sm text-slate-300 font-mono">
                    {`wss://goldlab.cloud/ws/stream?api_key=YOUR_API_KEY`}
                  </pre>
                </div>
              </div>
              <div className="mt-6 bg-slate-950 p-4 rounded border border-slate-800">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  在 .env 設定 API Key
                </div>
                <pre className="text-sm text-slate-300 font-mono">
                  {`# .env (伺服器端設定，請勿公開)
API_KEYS=your_key_1,your_key_2
ADMIN_API_KEYS=your_admin_key`}
                </pre>
              </div>
            </div>

            <div id="endpoint-latest" className="mb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-white mb-6">
                批量獲取匯率 (Batch Request)
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-slate-400">
                    使用逗號分隔符來請求多個貨幣對。
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-sm font-bold border border-emerald-500/20">
                      GET
                    </span>
                    <code className="text-slate-200 bg-slate-800 px-2 py-1 rounded">
                      /api/v1/latest?symbols=xau-usd,xag-usd
                    </code>
                  </div>

                  <h4 className="font-bold text-white mt-6 mb-2">
                    查詢參數 (Query Parameters)
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-4 border-b border-slate-800 pb-2">
                      <span className="font-mono text-emerald-400 w-24">
                        symbols
                      </span>
                      <span className="text-slate-400">
                        逗號分隔的代碼 (e.g. xau-usd,xag-usd,usd-twd)
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <CodeBlock />
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Example Response
                    </h4>
                    <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto">
                      {`{
  "version": "3.2.1",
  "timestamp": 1709823456.789,
  "request_id": "a1b2c3d4-...",
  "data": {
    "XAU-USD": {
      "symbol": "XAU-USD",
      "price": 2650.45,
      "timestamp": 1709823454.123,
      "sources": 8,
      "details": ["Binance", "BullionVault", "Sina Finance"],
      "fastest": "Binance",
      "fastestLatency": 42.3,
      "avgLatency": 88.4,
      "is_market_open": true
    },
    "XAG-USD": {
      "symbol": "XAG-USD",
      "price": 31.42,
      "timestamp": 1709823454.123,
      "sources": 6,
      "details": ["GoldPrice.org", "Sina Finance"],
      "fastest": "Sina Finance",
      "fastestLatency": 58.1,
      "avgLatency": 132.6,
      "is_market_open": true
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div id="endpoint-history" className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-4">
                歷史資料查詢 (History)
              </h2>
              <p className="text-slate-400 mb-4">
                查詢指定時間範圍內的歷史價格資料，保留最近 24 小時、最多 10,000 筆。
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-sm font-bold border border-emerald-500/20">
                  GET
                </span>
                <code className="text-slate-200 bg-slate-800 px-2 py-1 rounded">
                  /api/v1/history?symbols=xau-usd&limit=300
                </code>
              </div>
              <h4 className="font-bold text-white mt-6 mb-2">查詢參數 (Query Parameters)</h4>
              <ul className="space-y-2 text-sm text-slate-400 mb-4">
                <li><span className="text-slate-200 font-mono">symbols</span> (可選): 逗號分隔代碼，預設 xau-usd,xag-usd,usd-twd</li>
                <li><span className="text-slate-200 font-mono">start</span> (可選): Unix 時間戳（秒），範圍起點</li>
                <li><span className="text-slate-200 font-mono">end</span> (可選): Unix 時間戳（秒），範圍終點</li>
                <li><span className="text-slate-200 font-mono">limit</span> (可選): 回傳筆數上限，預設 300，最大 5000</li>
              </ul>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto">
                {`{
  "timestamp": 1709823456.789,
  "request_id": "a1b2c3d4-...",
  "data": {
    "XAU-USD": [
      { "symbol": "XAU-USD", "price": 2649.10, "timestamp": 1709820000.0, "sources": 7, ... },
      { "symbol": "XAU-USD", "price": 2650.45, "timestamp": 1709823454.1, "sources": 8, ... }
    ]
  }
}`}
              </pre>
            </div>

            <div id="rate-limits" className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-4">認證與限制</h2>
              <ul className="text-sm text-slate-400 space-y-2">
                <li>
                  REST Header：
                  <span className="font-mono text-slate-200">
                    X-API-Key: &lt;YOUR_API_KEY&gt;
                  </span>
                </li>
                <li>
                  WebSocket：
                  <span className="font-mono text-slate-200">
                    wss://goldlab.cloud/ws/stream?api_key=&lt;YOUR_API_KEY&gt;
                  </span>
                </li>
                <li>Rate Limit：預設每分鐘 120 次 + 30 次突發</li>
                <li>若未設定 API_KEYS，則視為開放模式（不驗證）。</li>
                <li>錯誤碼：401 無效金鑰 / 403 金鑰停用 / 429 超出頻率</li>
                <li>
                  管理端：使用{" "}
                  <span className="font-mono text-slate-200">ADMIN_API_KEYS</span>{" "}
                  驗證
                </li>
              </ul>
            </div>

            <div id="endpoint-metrics" className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-4">
                系統監控 (Metrics)
              </h2>
              <p className="text-slate-400 mb-4">
                取得來源成功率、平均延遲與聚合統計。
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-sm font-bold border border-emerald-500/20">
                  GET
                </span>
                <code className="text-slate-200 bg-slate-800 px-2 py-1 rounded">
                  /api/v1/metrics
                </code>
              </div>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto">
                {`{
  "startTime": 1709820000.12,
  "uptimeSeconds": 3456.78,
  "totals": {
    "sourceSuccess": 1024,
    "sourceFailure": 12,
    "aggregateSuccess": 980
  },
  "sources": {
    "Binance": {"success": 120, "failure": 1, "avgLatencyMs": 45.2}
  },
  "aggregates": {
    "XAU-USD": {"count": 320, "avgLatencyMs": 88.4, "lastSources": 8}
}
}
`}
              </pre>
            </div>

            <div id="endpoint-spread-logs" className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-4">
                現貨合約價差記錄 (Spread Logs)
              </h2>
              <p className="text-slate-400 mb-4">
                取得現貨（XAU-USD / XAG-USD）與幣安合約（XAU-USDT / XAG-USDT）價差超過 1% 的記錄，每 15 秒檢查一次。
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-sm font-bold border border-emerald-500/20">
                  GET
                </span>
                <code className="text-slate-200 bg-slate-800 px-2 py-1 rounded">
                  /api/v1/spread-logs?limit=100
                </code>
              </div>
              <h4 className="font-bold text-white mt-6 mb-2">查詢參數 (Query Parameters)</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><span className="text-slate-200 font-mono">limit</span> (可選): 回傳行數上限，預設 100。</li>
              </ul>
            </div>

            <div id="endpoint-error-logs" className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-rose-400 w-5 h-5" />
                爬蟲錯誤日誌 (Error Logs)
              </h2>
              <p className="text-slate-400 mb-4">
                取得最近的爬蟲與連線錯誤記錄，方便遠端 Debug 排錯。
              </p>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-sm font-bold border border-emerald-500/20">
                  GET
                </span>
                <code className="text-slate-200 bg-slate-800 px-2 py-1 rounded">
                  /api/v1/error-logs?limit=200
                </code>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>此端點需要有效的 <code className="font-mono">X-API-Key</code>，不支援匿名存取（HTTP 401）。</span>
              </div>
              <h4 className="font-bold text-white mt-6 mb-2">
                查詢參數 (Query Parameters)
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <span className="text-slate-200 font-mono">limit</span> (可選):
                  日誌獲取行數限制 (預設為 200，最大 5000)。
                </li>
              </ul>
            </div>

            <div id="endpoint-ws" className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12 scroll-mt-24">
              <h2 className="text-xl font-bold text-white mb-4">
                WebSocket 即時推送
              </h2>
              <p className="text-slate-400 mb-4">
                連線後會訂閱所有資產頻道，伺服器會推送各資產的最新聚合結果，包含 is_market_open 欄位。
              </p>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-slate-300 overflow-x-auto">
                {`// 建議使用 Header 傳遞 API Key（避免 URL 記錄洩漏）
// 若必須使用 query string，請確保 TLS 加密
wss://goldlab.cloud/ws/stream?api_key=YOUR_API_KEY

// 伺服器推送範例
{
  "symbol": "XAU-USD",
  "price": 2650.45,
  "timestamp": 1709823454.123,
  "sources": 8,
  "details": ["Binance", "BullionVault"],
  "fastest": "Binance",
  "fastestLatency": 42.3,
  "avgLatency": 88.4,
  "is_market_open": true
}

// Keep-alive ping（每 30 秒）
{ "type": "ping" }`}
              </pre>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12">
              <h2 className="text-xl font-bold text-white mb-3">管理端 API</h2>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2 mb-4 text-xs text-slate-400">
                以下端點僅供服務管理員使用，需搭配 <code className="font-mono text-slate-200">ADMIN_API_KEYS</code> 驗證，一般 API Key 無效。
              </div>
              <ul className="text-sm text-slate-400 space-y-2">
                <li><span className="font-mono text-slate-200">GET /api/v1/admin/keys</span> — 列出所有 key 與狀態</li>
                <li><span className="font-mono text-slate-200">POST /api/v1/admin/keys/add</span> — 新增 key（Redis 暫存）</li>
                <li><span className="font-mono text-slate-200">POST /api/v1/admin/keys/remove</span> — 移除 Redis key</li>
                <li><span className="font-mono text-slate-200">POST /api/v1/admin/keys/disable</span> — 停用 key</li>
                <li><span className="font-mono text-slate-200">POST /api/v1/admin/keys/enable</span> — 啟用 key</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminSection = () => {
  const [adminKey, setAdminKey] = useState("");
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadKeys = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/keys", {
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

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-400 mb-6 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            管理端 API 端點
          </div>
          <div className="font-mono text-slate-300">GET /api/v1/admin/keys</div>
          <div className="font-mono text-slate-300">
            POST /api/v1/admin/keys/add
          </div>
          <div className="font-mono text-slate-300">
            POST /api/v1/admin/keys/remove
          </div>
          <div className="font-mono text-slate-300">
            POST /api/v1/admin/keys/disable
          </div>
          <div className="font-mono text-slate-300">
            POST /api/v1/admin/keys/enable
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
          <input
            type="password"
            placeholder="輸入管理員 API Key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <button
            onClick={loadKeys}
            disabled={!adminKey || loading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold"
          >
            {loading ? "載入中" : "載入金鑰"}
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

// --- 主應用 ---

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAdminClick = () => {
    if (!isAdminLoggedIn) {
      setShowLoginModal(true);
    }
  };

  const handleLogin = () => {
    setIsAdminLoggedIn(true);
    setActiveTab("admin");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminClick={handleAdminClick}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />

      <main className="relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

        {activeTab === "dashboard" && <DashboardSection />}
        {activeTab === "features" && <CoreTechSection />}
        {activeTab === "docs" && <DocsSection />}
        {activeTab === "admin" && isAdminLoggedIn && <AdminSection />}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-12 mt-12 relative z-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center">
              <Zap className="text-emerald-500 w-4 h-4" />
            </div>
            <span className="text-slate-300 font-bold flex items-center gap-2">
              Goldlab.cloud
              <span className="text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-0.5 rounded font-medium">
                BETA
              </span>
            </span>
          </div>
          <div className="text-slate-500 text-sm">
            © 2026 High-Freq Systems. All rights reserved.
          </div>
          <div className="flex gap-6 text-slate-400">
            <a href="https://github.com/colinjen88/Goldlab.cloud" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
