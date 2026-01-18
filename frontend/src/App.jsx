import React, { useState, useEffect, useRef } from "react";
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
  Banknote, // Added icon for Fiat currency
} from "lucide-react";

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
  curl: `curl -X GET "http://localhost:8000/api/v1/latest?symbols=xau-usd,xag-usd,usd-twd" \\
  -H "X-API-Key: YOUR_API_KEY"`,
  python: `import requests

# 同時請求多種資產
url = "http://localhost:8000/api/v1/latest"
params = {
    "symbols": "xau-usd,xag-usd,usd-twd", # 黃金, 白銀, 台幣匯率
}
headers = {"X-API-Key": "YOUR_API_KEY"}
response = requests.get(url, params=params, headers=headers)
print(response.json())`,
  js: `const response = await fetch('http://localhost:8000/api/v1/latest?symbols=xau-usd,xag-usd,usd-twd', {
  headers: { 'X-API-Key': 'YOUR_API_KEY' }
});

// WebSocket 訂閱多頻道
const socket = new WebSocket('ws://localhost:8000/ws/stream?api_key=YOUR_API_KEY');
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(\`\${data.symbol}: \${data.price}\`);
};`,
};

// --- 組件 ---

const Navbar = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "實時監控" },
    { id: "features", label: "核心技術" },
    { id: "docs", label: "API 文件" },
    { id: "admin", label: "管理端" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Zap className="text-slate-900 w-5 h-5 fill-current" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              FlashRates<span className="text-emerald-500">.WANG</span>
            </span>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? "text-emerald-400 bg-slate-800"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
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
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

// 獨立的單一資產卡片組件，更新支援中文名稱
const AssetCard = ({
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
}) => {
  const [now, setNow] = useState(Date.now());
  const hasData = price !== undefined && price !== null;
  const isUp = hasData ? price >= (prevPrice || price) : true;
  const colorClass = isUp ? "text-emerald-400" : "text-rose-400";
  const changePercent =
    hasData && prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
  const baseMs = timestamp ? timestamp * 1000 : null;
  const lastUpdateMs = baseMs ? Math.max(0, Math.floor(now - baseMs)) : null;

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
                className={`text-[10px] ${hasData ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-slate-400 bg-slate-500/10 border-slate-500/20"} px-1.5 py-0.5 rounded border font-mono`}
              >
                {hasData ? "即時" : "等待中"}
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
              <span className="inline-block text-yellow-400 tabular-nums w-[5ch] text-right">
                {lastUpdateMs !== null ? lastUpdateMs : "--"}
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
};

const DashboardSection = () => {
  const [marketData, setMarketData] = useState({});
  const [prevMarketData, setPrevMarketData] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const marketDataRef = useRef({});

  const supportedCounts = {
    "XAU-USD": 8,
    "XAG-USD": 7,
    "USD-TWD": 12, // 增加到 12 個來源
  };

  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      ws = new WebSocket("ws://localhost:8000/ws/stream?api_key=YOUR_API_KEY");

      ws.onopen = () => {
        console.log("Connected to WebSocket");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          // Assuming message is just value str in current backend placeholder or JSON
          // In aggregator.py we send proper JSON str.
          const raw = event.data;
          // Since main.py placeholder sends "Message text..." we ignore that logic
          // and assume we will fix backend to send JSON or we handle Aggregator output.
          // NOTE: My backend aggregator sends: redis_client.publish(..., str(output))
          // The main.py websocket endpoint has a basic echo loop currently.
          // **CORRECTION**: I need to update main.py to actually subscribe to Redis!
          // For now, I will write the frontend assuming the backend sends valid JSON data streams.
          // If it fails, it will just not update.
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
        reconnectTimeout = setTimeout(connect, 3000);
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
  }, []);

  return (
    <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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
          v2.3 更新: {isConnected ? "系統在線 (WebSocket 已連接)" : "連線中..."}
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight leading-tight">
          同步監控 <span className="text-yellow-400">黃金</span>、
          <span className="text-slate-300">白銀</span> 與{" "}
          <span className="text-green-400">匯率</span>
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
          單一連接即可訂閱多種貴金屬報價。我們的並行處理引擎確保不同資產的延遲互不影響，完美支援
          XAU/USD 與 XAG/USD 的套利策略。
        </p>
      </div>

      {/* 三卡片佈局 (Grid cols 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
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
        />
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
        />
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
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={Coins}
          title="多資產並行 (Parallel)"
          desc="系統後端為每種資產 (Gold, Silver, Platinum) 分配獨立的 Worker Pool，確保抓取白銀的延遲不會影響黃金的更新速度。"
        />
        <FeatureCard
          icon={Cpu}
          title="多來源異構聚合"
          desc="同時採集 HTML 爬蟲、WebSocket 流、REST API 與區塊鏈預言機 (Oracle)，確保數據來源多樣化，徹底解決單一來源封鎖問題。"
        />
        <FeatureCard
          icon={AlertTriangle}
          title="異常值熔斷機制"
          desc="當某個來源數據偏離市場中位數超過設定閾值（如 0.3%），系統會自動將其隔離並觸發警報，防止髒數據污染您的交易決策。"
        />
      </div>
    </div>
  );
};

const CoreTechSection = () => (
  <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto min-h-screen">
    <div className="mb-10 text-center">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
        核心技術與方法
      </h1>
      <p className="text-slate-400 text-sm max-w-3xl mx-auto">
        以下為目前實際採用的架構與流程，完整對齊後端實作與資料流。
      </p>
    </div>

    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8">
      <h2 className="text-xl font-bold text-white mb-4">資料流流程圖</h2>
      <pre className="text-xs sm:text-sm text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto">
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

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">資料採集與調度</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>asyncio 併發輪詢，每來源獨立 interval + offset。</li>
          <li>aiohttp 為主要抓取器，Playwright 處理防爬來源。</li>
          <li>共用 HTTP session + retry/backoff 減少斷線與瞬時失敗。</li>
        </ul>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">聚合與品質控制</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>加權平均：高可信來源權重較高。</li>
          <li>中位數偏離 0.3% 的來源自動剔除。</li>
          <li>最快來源與平均延遲統計回傳。</li>
        </ul>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">可靠性機制</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>Circuit Breaker 熔斷失敗來源，定時半開重試。</li>
          <li>FakeRedis 備援，避免 Redis 不可用造成服務失效。</li>
          <li>metrics 記錄成功率與延遲，支援監控與調校。</li>
        </ul>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">安全與存取控制</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>API Key 驗證 + Rate Limit（REST / WS 皆套用）。</li>
          <li>管理端可列出、停用、啟用與新增 Redis key。</li>
          <li>Redis 新增 key 需同步 .env 並重啟以持久化。</li>
        </ul>
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
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                lang === l
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

const DocsSection = () => (
  <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-3 hidden lg:block">
        <div className="sticky top-24 space-y-8">
          <div>
            <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              快速開始
            </h5>
            <ul className="space-y-2 border-l border-slate-800">
              <li className="pl-4 border-l-2 border-emerald-500 text-emerald-400 font-medium">
                簡介
              </li>
              <li className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors">
                認證 (Authentication)
              </li>
              <li className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors">
                頻率限制 (Rate Limits)
              </li>
            </ul>
          </div>
          <div>
            <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              端點 (Endpoints)
            </h5>
            <ul className="space-y-2 border-l border-slate-800">
              <li className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors">
                GET /api/v1/latest
              </li>
              <li className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors">
                GET /api/v1/metrics
              </li>
              <li className="pl-4 border-l-2 border-transparent text-slate-400 hover:text-white cursor-pointer hover:border-slate-600 transition-colors">
                WS /ws/stream
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-9">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-white mb-6">
            API 開發者文檔{" "}
            <span className="text-emerald-500 text-sm align-middle bg-emerald-500/10 px-2 py-1 rounded ml-2">
              v2.3
            </span>
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            FlashRates API
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
                <div className="text-emerald-400 font-bold">XAU-USD</div>
                <div className="text-xs text-slate-500">黃金 / 美元</div>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <div className="text-emerald-400 font-bold">XAG-USD</div>
                <div className="text-xs text-slate-500">白銀 / 美元</div>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <div className="text-slate-500 font-bold">XPT-USD</div>
                <div className="text-xs text-slate-600">白金 / 美元 (Pro)</div>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center">
                <div className="text-green-500 font-bold">USD-TWD</div>
                <div className="text-xs text-slate-600">美元 / 台幣</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400 w-5 h-5" />
              認證與 API Key 管理
            </h2>
            <p className="text-slate-400 mb-4">
              本服務使用 API Key 驗證，REST 與 WebSocket 都需要授權。若未設定
              <code>API_KEYS</code>，開發環境預設不強制驗證。
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
                  {`ws://localhost:8000/ws/stream?api_key=YOUR_API_KEY`}
                </pre>
              </div>
            </div>
            <div className="mt-6 bg-slate-950 p-4 rounded border border-slate-800">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                API Key 產生工具
              </div>
              <pre className="text-sm text-slate-300 font-mono">
                {`python backend/tools/api_key_tool.py --count 3 --length 32 --prefix fr_

API_KEYS=fr_xxx,fr_yyy,fr_zzz`}
              </pre>
            </div>
          </div>

          <div className="mb-12">
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
                      逗號分隔的代碼 (e.g. xau-usd,xag-usd)
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
  "timestamp": 1709823456,
  "data": {
    "XAU-USD": {
      "price": 2650.45,
      "change": 0.15,
      "sources": 8
    },
    "XAG-USD": {
      "price": 31.42,
      "change": -0.05,
      "sources": 6
    },
    "USD-TWD": {
      "price": 31.85,
      "change": 0.02,
      "sources": 4
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12">
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
                  ws://localhost:8000/ws/stream?api_key=&lt;YOUR_API_KEY&gt;
                </span>
              </li>
              <li>Rate Limit：預設每分鐘 120 次 + 30 次突發</li>
              <li>
                管理端：使用{" "}
                <span className="font-mono text-slate-200">ADMIN_API_KEYS</span>{" "}
                驗證
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 mb-12">
            <h2 className="text-xl font-bold text-white mb-4">管理端 API</h2>
            <ul className="text-sm text-slate-400 space-y-2">
              <li>
                <span className="font-mono text-slate-200">
                  GET /api/v1/admin/keys
                </span>{" "}
                列出 key 狀態
              </li>
              <li>
                <span className="font-mono text-slate-200">
                  POST /api/v1/admin/keys/add
                </span>{" "}
                新增 Redis key
              </li>
              <li>
                <span className="font-mono text-slate-200">
                  POST /api/v1/admin/keys/remove
                </span>{" "}
                移除 Redis key
              </li>
              <li>
                <span className="font-mono text-slate-200">
                  POST /api/v1/admin/keys/disable
                </span>{" "}
                停用 key
              </li>
              <li>
                <span className="font-mono text-slate-200">
                  POST /api/v1/admin/keys/enable
                </span>{" "}
                啟用 key
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

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
      const res = await fetch("http://localhost:8000/api/v1/admin/keys", {
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
      const res = await fetch("http://localhost:8000/api/v1/admin/keys/add", {
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
        "http://localhost:8000/api/v1/admin/keys/remove",
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
        ? "http://localhost:8000/api/v1/admin/keys/disable"
        : "http://localhost:8000/api/v1/admin/keys/enable";
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
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto min-h-screen">
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="text-emerald-400 w-5 h-5" />
          API Key 管理端
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          使用管理員 API Key 查看、停用或啟用 API Key。變更會立即套用至 REST 與
          WebSocket。
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-xs text-slate-400 mb-6">
          Redis 新增/移除的 key 只在本次服務期間生效；請同步到 .env
          並重啟以持久化。
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

        {activeTab === "dashboard" && <DashboardSection />}
        {activeTab === "features" && <CoreTechSection />}
        {activeTab === "docs" && <DocsSection />}
        {activeTab === "admin" && <AdminSection />}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-12 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center">
              <Zap className="text-emerald-500 w-4 h-4" />
            </div>
            <span className="text-slate-300 font-bold">FlashRates.WANG</span>
          </div>
          <div className="text-slate-500 text-sm">
            © 2026 High-Freq Data Systems. All rights reserved.
          </div>
          <div className="flex gap-6 text-slate-400">
            <a href="#" className="hover:text-emerald-400 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
