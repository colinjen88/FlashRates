import React, { memo } from "react";
import { ArrowUp, ArrowDown, Activity, Globe, Database, Wifi } from "lucide-react";
import Sparkline from "./Sparkline";

// 將 SpreadIndicator 作為本地組件或獨立文件皆可，這裡整合在 AssetCard 依賴中
// 但為了純淨，我們之後也提取 SpreadIndicator

const SpreadIndicator = ({ spread }) => {
  if (spread === null || spread === undefined) return null;
  const isPositive = spread > 0;
  const colorClass = isPositive ? "text-rose-400" : "text-emerald-400";
  // 注意：通常價差 spread = (Ask - Bid) 永遠為正，
  // 但此處 spread 是指 "Spot - Future" 的基差 (Basis) 或溢價。
  // 若 Spot > Future (Backwardation) -> 正值 -> 顯示 Rose? 還是 Emerald?
  // 按照原來 App.jsx 邏輯: 1.05% -> text-emerald-400 ?
  // 檢查原代碼:
  // const isPositive = spread >= 0;
  // <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
  // 原代碼的正值是 Emerald (綠色/上漲/好)，負值是 Rose (紅色/下跌/壞)
  
  return (
    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      <span>{Math.abs(spread).toFixed(2)}%</span>
      <span className="text-slate-500 ml-1">溢價</span>
    </div>
  );
};

const AssetCard = memo(({ title, price, change, prevPrice, timestamp, sources, details, fastest, isMarketOpen, spread, category, onLogClick, onUploadClick, isAdminLoggedIn, history }) => {
    // 簡單的動畫效果 key
    const priceChanged = price !== prevPrice;
    
    // 計算漲跌 (若有 prevPrice)
    // 這裡傳入的 change 可能是外部計算好的，或者我們自己算
    const calculatedChange = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0;
    const displayChange = change !== undefined ? change : calculatedChange;
    const isUp = displayChange >= 0;

    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl blur-xl transition-opacity opacity-0 group-hover:opacity-100 duration-500"></div>
        <div className="relative bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 backdrop-blur-sm">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-slate-600 transition-colors">
                {/* 根據 Category 顯示 Icon，這裡簡化處理，或傳入 icon */}
                {category === 'gold' ? (
                     <div className="text-xl">🟡</div>
                ) : category === 'silver' ? (
                     <div className="text-xl">⚪️</div>
                ) : category === 'fx' ? (
                     <div className="text-xl">💱</div>
                ) : (
                    <Activity className="text-slate-400 w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-emerald-400 font-bold text-lg leading-tight">{title}</h3>
                <div className="flex items-center gap-2 mt-1">
                   {isMarketOpen ? (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Wifi className="w-3 h-3" /> Market Open
                        </span>
                   ) : (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                             Market Closed
                        </span>
                   )}
                </div>
              </div>
            </div>
          </div>
  
          {/* Price */}
          <div className="mb-6">
            <div className={`text-4xl font-bold font-mono tracking-tighter transition-colors duration-300 ${priceChanged ? "text-white" : "text-slate-200"}`}>
                {price ? price.toLocaleString() : "--"}
                <span className="text-lg text-slate-500 font-sans ml-2 font-normal">
                    {title.includes("TWD") ? "TWD" : "USD"}
                </span>
            </div>
             <div className="flex items-center gap-3 mt-2">
                <div className={`flex items-center gap-1 text-sm font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                    {isUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {Math.abs(displayChange).toFixed(2)}%
                </div>
                {spread !== undefined && <SpreadIndicator spread={spread} />}
             </div>
             
             {/* Sparkline */}
             {history && history.length > 2 && (
                 <div className="absolute right-6 bottom-16 opacity-50 group-hover:opacity-100 transition-opacity">
                      {/* Determine color based on trend of the history snippet */}
                      <Sparkline 
                        data={history} 
                        color={history[history.length-1] >= history[0] ? "#34d399" : "#fb7185"} 
                        width={100} 
                        height={40} 
                      />
                 </div>
             )}
          </div>
  
          {/* Footer Infos */}
          <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5" title="Aggregated Sources">
                  <Database className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-mono text-slate-400">{sources} src</span>
               </div>
               <div className="flex items-center gap-1.5" title={`Fastest: ${fastest}`}>
                  <Globe className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-mono text-slate-400 truncate max-w-[80px]">{fastest}</span>
               </div>
            </div>
            <div className="font-mono text-slate-600">
                {timestamp ? new Date(timestamp * 1000).toLocaleTimeString() : "--:--:--"}
            </div>
          </div>

          {/* Admin Controls Overlay (Optional) */}
           {isAdminLoggedIn && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onUploadClick && (
                      <button onClick={onUploadClick} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs" title="Upload Image">
                          Img
                      </button>
                  )}
                   {onLogClick && (
                      <button onClick={onLogClick} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-xs" title="View Logs">
                          Log
                      </button>
                  )}
              </div>
           )}
        </div>
      </div>
    );
});

export default AssetCard;
