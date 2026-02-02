import React, { useEffect, useRef, memo } from "react";

const TradingViewWidget = memo(({ symbol, theme = "dark", autosize = true }) => {
  const container = useRef();

  useEffect(() => {
    // 清除舊的 script，防止重複加載
    if (container.current) {
        container.current.innerHTML = "";
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: autosize,
      symbol: symbol,
      interval: "D",
      timezone: "Asia/Taipei",
      theme: theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: true,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      support_host: "https://www.tradingview.com",
    });
    container.current.appendChild(script);

    return () => {
        // Cleanup handled by clearing innerHTML at start of effect
    };
  }, [symbol, theme, autosize]);

  return (
    <div className="tradingview-widget-container h-full w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900" ref={container}>
      <div className="tradingview-widget-container__widget h-full w-full"></div>
    </div>
  );
});

export default TradingViewWidget;
