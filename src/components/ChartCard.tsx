"use client";

import React, { useState } from "react";
import "./ChartCard.css";

interface DataPoint {
  day: string;
  views: number;
  subscribers: number;
}

interface ChartCardProps {
  title: string;
  data?: DataPoint[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

export default function ChartCard({ title, data }: ChartCardProps) {
  const [metric, setMetric] = useState<"views" | "subscribers">("views");

  const hasData = data && data.length > 0;
  const maxVal = hasData
    ? Math.max(...data!.map((d) => d[metric]), 1)
    : 1;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <select
          className="chart-filter"
          value={metric}
          onChange={(e) => setMetric(e.target.value as "views" | "subscribers")}
        >
          <option value="views">Views</option>
          <option value="subscribers">Subscribers Gained</option>
        </select>
      </div>

      <div className="chart-content">
        {hasData ? (
          <>
            <div className="mock-chart">
              {data!.map((point, i) => {
                const pct = Math.max((point[metric] / maxVal) * 100, 2);
                return (
                  <div
                    key={i}
                    className="mock-bar"
                    style={{ height: `${pct}%` }}
                    title={`${formatDay(point.day)}: ${point[metric].toLocaleString()}`}
                  />
                );
              })}
            </div>
            <div className="mock-x-axis">
              {data!.map((point, i) => (
                <span key={i}>{formatDay(point.day)}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="chart-empty">
            <span>📊</span>
            <p>
              {data === undefined
                ? "Loading analytics..."
                : "No analytics data yet. Re-authenticate to grant analytics access."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
