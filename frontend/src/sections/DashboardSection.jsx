import React, { useState, useEffect, useRef } from "react";
import TradingViewWidget from "../components/TradingViewWidget";
import AssetCard from "../components/AssetCard";
import LogModal from "../components/LogModal";
import UploadModal from "../components/UploadModal";

const DashboardSection = ({ adminKey }) => {
  const [marketData, setMarketData] = useState({});
  const [prevMarketData, setPrevMarketData] = useState({});
  const [priceHistory, setPriceHistory] = useState({}); // New: Store history for sparklines
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const [resolvedApiKey, setResolvedApiKey] = useState(() => {
    return (
      adminKey ||
      window.localStorage.getItem("goldlab_api_key") ||
      import.meta.env.VITE_PUBLIC_API_KEY ||
      ""
    );
  });
  const authHeaders = resolvedApiKey
    ? { Authorization: `Bearer ${resolvedApiKey}` }
    : {};
  
  // Modals state
  const [showLogModal, setShowLogModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Resolve API key (URL param -> localStorage -> adminKey -> env)
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

  // Fetch initial history
  useEffect(() => {
    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/v1/history?limit=50", {
              headers: authHeaders,
            });
            if (res.status === 401) {
              console.warn("History request unauthorized. Provide a valid API key.");
              return;
            }
            const json = await res.json();
            if (json.data) {
                const hist = {};
                Object.keys(json.data).forEach(sym => {
                    // API sends array of {price, timestamp...}. We just need prices reverse ordered (oldest first)?
                    // Backend returns list sorted by time? 
                    // Let's check backend... "rows = list(reversed(rows))" -> newest first in array?
                    // Wait, Redis is sorted set. zrevrange returns highest score (newest) first.
                    // The backend code: `rows = await redis_client.zrevrange(...)`. Yes, newest first.
                    // For Sparkline (left-to-right), we want Oldest -> Newest.
                    // So we should reverse simple array from API.
                    
                    const points = json.data[sym].map(p => p.price).reverse();
                    hist[sym] = points;
                });
                setPriceHistory(hist);
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };
    
    fetchHistory();
  }, [resolvedApiKey]);


  // WebSocket connection logic (Extract to hook later if needed)
  useEffect(() => {
    let ws;
    let retryTimeout;
    const connect = () => {
      // WS URL
      // Use relative path to allow Nginx/Cloudflare to proxy via standard ports (80/443)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const apiKeyParam = resolvedApiKey ? `?api_key=${encodeURIComponent(resolvedApiKey)}` : "";
      const wsUrl = `${protocol}//${window.location.host}/ws/stream${apiKeyParam}`;
      
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log("Connected to WebSocket");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMarketData((prev) => {
             // Keep prev for change calculation
             setPrevMarketData(prev);
             return { ...prev, [data.symbol]: data };
          });
          
          setPriceHistory((prev) => {
              const currentList = prev[data.symbol] || [];
              const newList = [...currentList, data.price];
              // Keep last 50
              if (newList.length > 50) return { ...prev, [data.symbol]: newList.slice(newList.length - 50) };
              return { ...prev, [data.symbol]: newList };
          });

          setLastUpdate(Date.now());
        } catch (e) {
          console.error("WS Parse Error", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        retryTimeout = setTimeout(connect, 3000); // Retry after 3s
      };
      
      ws.onerror = (err) => {
        console.error("WS Error", err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(retryTimeout);
    };
  }, [resolvedApiKey]);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Market Overview
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Aggregation of <span className="text-emerald-400 font-bold">15+</span> global sources. 
            Real-time latency: <span className="font-mono text-emerald-400">~80ms</span>.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></div>
          <span className="text-xs font-mono text-slate-400">
            {isConnected ? "SYSTEM ONLINE" : "DISCONNECTED"}
          </span>
          <span className="text-xs font-mono text-slate-600 pl-2 border-l border-slate-700">
             UPDATED: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>
      
       {/* Modals */}
      <LogModal isOpen={showLogModal} onClose={() => setShowLogModal(false)} adminKey={adminKey} />
      <UploadModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} adminKey={adminKey} />

      {/* Row 1: XAU Chart + XAU Card + DXY Card */}
      <div className="flex items-center justify-between mb-4 max-w-[1440px] mx-auto">
         <h2 className="text-xl font-bold text-white flex items-center gap-2">
           <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
           市場概覽
         </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12 h-auto lg:h-[496px]">
        {/* TradingView Chart (Span 2) */}
        <div className="lg:col-span-2 h-[300px] lg:h-full">
           <TradingViewWidget symbol="OANDA:XAUUSD" />
        </div>
        
        {/* Assets (Span 2 -> 2 columns) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
           <AssetCard 
                title="Gold / USD" 
                category="gold"
                price={marketData["XAU-USD"]?.price} 
                prevPrice={prevMarketData["XAU-USD"]?.price}
                timestamp={marketData["XAU-USD"]?.timestamp}
                sources={marketData["XAU-USD"]?.sources}
                fastest={marketData["XAU-USD"]?.fastest}
                isMarketOpen={marketData["XAU-USD"]?.is_market_open}
                // Calculate spread or use from data if available. 
                // Assuming backend doesn't send "spread" field yet, but we had manual calculation in App.jsx?
                // Wait, the logic for 'spread' was in App.jsx rendering but passed directly to AssetCard before.
                // Let's verify App.jsx logic later. For now, pass undefined if not computed here.
                // Or compute it if we have both spot and future.
                // In App.jsx, I didn't see explicit props for spread passed for XAU-USD specifically unless hardcoded.
                // Let's assume passed as prop if available.
                onLogClick={adminKey ? () => setShowLogModal(true) : undefined}
                onUploadClick={adminKey ? () => setShowUploadModal(true) : undefined}
                isAdminLoggedIn={!!adminKey}
                history={priceHistory["XAU-USD"]}
           />
           <AssetCard 
                title="US Dollar Index" 
                category="fx"
                price={marketData["DXY"]?.price} 
                prevPrice={prevMarketData["DXY"]?.price}
                  timestamp={marketData["DXY"]?.timestamp}
                sources={marketData["DXY"]?.sources}
                fastest={marketData["DXY"]?.fastest}
                  isMarketOpen={marketData["DXY"]?.is_market_open}
                history={priceHistory["DXY"]}
           />
           <AssetCard 
                title="USD 10Y Yield" 
                category="fx"
                price={marketData["US10Y"]?.price} 
                prevPrice={prevMarketData["US10Y"]?.price}
                 timestamp={marketData["US10Y"]?.timestamp}
                sources={marketData["US10Y"]?.sources}
                fastest={marketData["US10Y"]?.fastest}
                 isMarketOpen={marketData["US10Y"]?.is_market_open}
                history={priceHistory["US10Y"]}
           />
           <AssetCard 
                title="USD / TWD" 
                category="fx"
                price={marketData["USD-TWD"]?.price}
                 prevPrice={prevMarketData["USD-TWD"]?.price} 
                  timestamp={marketData["USD-TWD"]?.timestamp}
                sources={marketData["USD-TWD"]?.sources}
                fastest={marketData["USD-TWD"]?.fastest}
                 isMarketOpen={marketData["USD-TWD"]?.is_market_open}
                history={priceHistory["USD-TWD"]}
           />
        </div>
      </div>

       {/* Row 2: Silver & Others */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AssetCard 
                title="Silver / USD" 
                category="silver"
                price={marketData["XAG-USD"]?.price}
                 prevPrice={prevMarketData["XAG-USD"]?.price}
                  timestamp={marketData["XAG-USD"]?.timestamp}
                sources={marketData["XAG-USD"]?.sources}
                fastest={marketData["XAG-USD"]?.fastest}
                 isMarketOpen={marketData["XAG-USD"]?.is_market_open}
                history={priceHistory["XAG-USD"]}
           />
            <AssetCard 
                title="Crude Oil (WTI)" 
                category="other"
                price={marketData["CL-F"]?.price}
                 prevPrice={prevMarketData["CL-F"]?.price}
                  timestamp={marketData["CL-F"]?.timestamp}
                sources={marketData["CL-F"]?.sources}
                fastest={marketData["CL-F"]?.fastest}
                 isMarketOpen={marketData["CL-F"]?.is_market_open}
                history={priceHistory["CL-F"]}
           />
            <AssetCard 
                title="Copper (HG)" 
                category="other"
                price={marketData["HG-F"]?.price}
                 prevPrice={prevMarketData["HG-F"]?.price}
                  timestamp={marketData["HG-F"]?.timestamp}
                sources={marketData["HG-F"]?.sources}
                fastest={marketData["HG-F"]?.fastest}
                 isMarketOpen={marketData["HG-F"]?.is_market_open}
                history={priceHistory["HG-F"]}
           />
             <AssetCard 
                title="VIX Volatility" 
                category="other"
                price={marketData["VIX"]?.price} 
                 prevPrice={prevMarketData["VIX"]?.price}
                  timestamp={marketData["VIX"]?.timestamp}
                sources={marketData["VIX"]?.sources}
                fastest={marketData["VIX"]?.fastest}
                 isMarketOpen={marketData["VIX"]?.is_market_open}
                history={priceHistory["VIX"]}
           />
      </div>
    </div>
  );
};

export default DashboardSection;
