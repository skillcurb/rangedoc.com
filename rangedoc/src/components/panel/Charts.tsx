"use client";
/**
 * Charts for dashboards (Recharts). Client-only.
 */
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#178343", "#2e57a2", "#f59e0b", "#e24a4a", "#7c3aed", "#0ea5e9", "#64748b"];

const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function TrendChart({ data, series, height = 260, area = true }: { data: Record<string, number | string>[]; series: { key: string; label: string }[]; height?: number; area?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {area && series.length === 1 ? (
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#178343" stopOpacity={0.25} />
              <stop offset="1" stopColor="#178343" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e3e8f1" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#5d6985" }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: "#5d6985" }} allowDecimals={false} />
          <Tooltip labelFormatter={(l) => shortDate(String(l))} />
          <Area type="monotone" dataKey={series[0].key} name={series[0].label} stroke="#178343" strokeWidth={2.5} fill="url(#g1)" />
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#e3e8f1" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#5d6985" }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: "#5d6985" }} allowDecimals={false} />
          <Tooltip labelFormatter={(l) => shortDate(String(l))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 220 }: { data: { label: string; count: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HBarChart({ data, height = 260 }: { data: { label: string; count: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid stroke="#e3e8f1" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#5d6985" }} allowDecimals={false} />
        <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11, fill: "#1f2a44" }} />
        <Tooltip />
        <Bar dataKey="count" fill="#178343" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
