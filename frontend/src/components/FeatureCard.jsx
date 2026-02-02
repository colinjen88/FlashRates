import React, { memo } from "react";

const FeatureCard = memo(({ icon: Icon, title, desc }) => (
  <div className="group p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:bg-slate-800/50 transition-colors">
    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-slate-700">
      <Icon className="w-6 h-6 text-emerald-400" />
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
));

export default FeatureCard;
