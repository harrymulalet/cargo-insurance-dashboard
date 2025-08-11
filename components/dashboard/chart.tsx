"use client";

import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { Data, Layout } from 'plotly.js';

interface ChartProps {
  data: Data[];
  layout: Partial<Layout>;
  className?: string;
}

const Chart: React.FC<ChartProps> = ({ data, layout, className }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current && typeof window !== 'undefined') {
      Plotly.newPlot(chartRef.current, data, layout, { responsive: true });
    }

    const handleResize = () => {
      if (chartRef.current) {
        Plotly.Plots.resize(chartRef.current);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, [data, layout]);

  return <div ref={chartRef} className={className} />;
};

export default Chart;
