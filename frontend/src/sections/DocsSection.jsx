import React from "react";
import CodeBlock from "../components/CodeBlock";

const DocsSection = () => {
    // 這裡可以將範例代碼提取為常量，但為了簡單，保留在組件內
  const CODE_EXAMPLES = {
    curl: `curl -X GET "https://goldlab.cloud/api/v1/latest?symbols=XAU-USD,XAG-USD" \\
  -H "X-API-Key: YOUR_API_KEY"`,
    js: `const res = await fetch('https://goldlab.cloud/api/v1/latest', {
  headers: { 'X-API-Key': 'YOUR_API_KEY' }
});
const data = await res.json();
console.log(data.data['XAU-USD'].price);`,
    python: `import requests

res = requests.get(
    "https://goldlab.cloud/api/v1/latest", 
    headers={"X-API-Key": "YOUR_API_KEY"}
)
print(res.json()['data']['XAU-USD']['price'])`
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto min-h-screen">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Navigation / Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="sticky top-24 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-bold mb-4 px-2">Table of Contents</h3>
            <ul className="space-y-1">
              {["Authentication", "Endpoints", "Rate Limits", "WebSocket"].map(
                (item) => (
                  <li key={item}>
                     <a href={`#${item.toLowerCase().replace(" ", "-")}`} className="block px-2 py-1.5 text-sm text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors">
                        {item}
                     </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
            {/* Authentication */}
            <div id="authentication" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-6">Authentication</h2>
                <p className="text-slate-400 mb-6">
                    Authenticate your requests using the <code className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono text-sm">X-API-Key</code> header.
                </p>
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                   {/* Tabs for languages could go here, for now just show 3 blocks */}
                   <div className="p-4 space-y-4">
                       <div>
                           <div className="text-xs text-slate-500 mb-2 font-mono uppercase">cURL</div>
                           <CodeBlock code={CODE_EXAMPLES.curl} lang="bash" />
                       </div>
                       <div>
                           <div className="text-xs text-slate-500 mb-2 font-mono uppercase">JavaScript</div>
                           <CodeBlock code={CODE_EXAMPLES.js} lang="javascript" />
                       </div>
                   </div>
                </div>
            </div>

            {/* Endpoints */}
            <div id="endpoints" className="mb-12 scroll-mt-24">
                 <h2 className="text-2xl font-bold text-white mb-6">Endpoints</h2>
                 
                 <div className="space-y-6">
                     {/* /latest */}
                     <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                         <div className="flex items-center gap-3 mb-4">
                             <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20">GET</span>
                             <code className="text-slate-200 bg-slate-800 px-2 py-1 rounded font-mono">/api/v1/latest</code>
                         </div>
                         <p className="text-slate-400 text-sm mb-4">Get the absolute latest aggregated prices from Redis cache.</p>
                         
                         <h4 className="text-sm font-bold text-slate-300 mb-2">Query Parameters</h4>
                         <ul className="text-sm text-slate-400 space-y-2 mb-4">
                             <li><code className="text-emerald-400">symbols</code> (optional): Comma-separated list (e.g. XAU-USD,XAG-USD). Default: all.</li>
                         </ul>
                     </div>

                     {/* /history */}
                     <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                         <div className="flex items-center gap-3 mb-4">
                             <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20">GET</span>
                             <code className="text-slate-200 bg-slate-800 px-2 py-1 rounded font-mono">/api/v1/history</code>
                         </div>
                         <p className="text-slate-400 text-sm mb-4">Get historical price data points.</p>
                     </div>
                 </div>
            </div>

             {/* Rate Limits */}
             <div id="rate-limits" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-6">Rate Limits</h2>
                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                    <ul className="space-y-3 text-sm text-slate-400">
                        <li className="flex justify-between">
                            <span>Standard Tier</span>
                            <span className="font-mono text-emerald-400">120 req / min</span>
                        </li>
                        <li className="flex justify-between">
                             <span>Burst Allowance</span>
                             <span className="font-mono text-emerald-400">+30 req</span>
                        </li>
                         <li className="pt-2 border-t border-slate-800 text-xs text-slate-500">
                             Note: Exceeding limits will result in <code>429 Too Many Requests</code>.
                        </li>
                    </ul>
                </div>
            </div>
            
             {/* WebSocket */}
             <div id="websocket" className="mb-12 scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-6">WebSocket</h2>
                <p className="text-slate-400 mb-4">
                    Connect to the WebSocket stream for real-time push updates.
                </p>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                     <code className="text-emerald-400 font-mono text-sm block mb-2">ws://goldlab.cloud/ws/stream?api_key=YOUR_KEY</code>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DocsSection;
