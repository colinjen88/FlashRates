import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

const CodeBlock = ({ code, lang = "bash" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
      <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 s-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
            </div>
            <span className="text-xs text-slate-500 font-mono ml-2 uppercase">
              {lang}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="text-slate-500 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="font-mono text-sm text-slate-300">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CodeBlock;
