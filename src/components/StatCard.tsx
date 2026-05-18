import React from "react";
import "./StatCard.css";

interface StatCardProps {
  title: string;
  value: string;
  trend?: number;
  icon: string;
}

export default function StatCard({ title, value, trend, icon }: StatCardProps) {
  const isPositive = (trend ?? 0) >= 0;

  return (
    <div className="stat-card">
      <div className="stat-header">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-icon">{icon}</div>
      </div>

      <div className="stat-content">
        <div className="stat-value">{value}</div>
        {trend !== undefined && (
          <div className={`stat-trend ${isPositive ? "positive" : "negative"}`}>
            <span className="trend-icon">{isPositive ? "↑" : "↓"}</span>
            <span className="trend-value">{Math.abs(trend)}%</span>
            <span className="trend-label">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
