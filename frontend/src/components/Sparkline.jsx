import React, { useMemo } from 'react';

const Sparkline = ({ data = [], color = "#10b981", width = 120, height = 40 }) => {
  const points = useMemo(() => {
    if (!data || data.length < 2) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; 
    
    // Add some padding
    const padding = 2;
    const availableHeight = height - padding * 2;

    const stepX = width / (data.length - 1);

    return data.map((d, i) => {
      const x = i * stepX;
      // Invert Y because SVG coordinates start from top
      const normalizedY = ((d - min) / range); 
      const y = height - padding - (normalizedY * availableHeight);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [data, width, height]);

  if (!data || data.length < 2) return null;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Gradient Area (Optional, implies filling the path which is harder with polyline, need path d) */}
      {/* For simplicity, just the line for now. To add area, we need to close the path. */}
    </svg>
  );
};

export default Sparkline;
