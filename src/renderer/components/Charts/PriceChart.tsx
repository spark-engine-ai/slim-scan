import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartData } from '../../types/models';

interface PriceChartProps {
  symbol: string;
}

export function PriceChart({ symbol }: PriceChartProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    const fetchChartData = async () => {
      setLoading(true);
      try {
        const data = await window.electronAPI.chart.fetch({ symbol, days: 180 });
        setChartData(data);
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="chart-loading">
        <style>{`
          .chart-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--color-text-muted);
          }
        `}</style>
        Loading chart data...
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="chart-error">
        <style>{`
          .chart-error {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--color-text-muted);
          }
        `}</style>
        No chart data available
      </div>
    );
  }

  const chartPoints = chartData.bars.map((bar, index) => ({
    date: bar.date,
    price: bar.close,
    ma50: chartData.ma50[index] || null,
    ma200: chartData.ma200[index] || null,
  }));

  return (
    <div className="price-chart">
      <style>{`
        .price-chart {
          height: 100%;
          width: 100%;
        }
        
        .chart-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
          padding: 0 var(--spacing-sm);
        }
        
        .chart-title {
          font-weight: var(--font-weight-semibold);
          color: var(--color-text);
        }
        
        .high-52w-line {
          font-size: var(--font-size-xs);
          color: var(--color-primary);
        }
      `}</style>
      
      <div className="chart-header">
        <div className="chart-title">{symbol} - 6 Month Chart</div>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartPoints}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip 
            formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name]}
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <ReferenceLine 
            y={chartData.high52w} 
            stroke="var(--color-primary)" 
            strokeDasharray="5 5"
            label={{ value: "52W High", position: "right" }}
          />
          <Line 
            type="monotone" 
            dataKey="ma200" 
            stroke="var(--color-error)" 
            strokeWidth={1}
            dot={false}
            name="MA200"
          />
          <Line 
            type="monotone" 
            dataKey="ma50" 
            stroke="var(--color-warning)" 
            strokeWidth={1}
            dot={false}
            name="MA50"
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="var(--color-primary)" 
            strokeWidth={2}
            dot={false}
            name="Price"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}