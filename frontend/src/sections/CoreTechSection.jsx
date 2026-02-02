import React from "react";
import FeatureCard from "../components/FeatureCard";
import { Zap, ShieldCheck, Cpu, Globe } from "lucide-react";

const CoreTechSection = () => {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto min-h-screen">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Core Technology</h1>
        <p className="text-lg text-slate-400">
          Built for speed, reliability, and precision.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard
          icon={Zap}
          title="Ultra-Low Latency"
          desc="Redis-backed in-memory caching ensuring <50ms data retrieval."
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Data Integrity"
          desc="MAD outlier detection & weighted averaging algorithms."
        />
        <FeatureCard
          icon={Cpu}
          title="High Concurrency"
          desc="Async Python FastAPI architecture handling 10k+ req/sec."
        />
        <FeatureCard
          icon={Globe}
          title="Global Aggregation"
          desc="Unified feed from 15+ sources including Banks, Futures & Spot."
        />
      </div>
      
       {/* More details could be added here */}
    </div>
  );
};

export default CoreTechSection;
