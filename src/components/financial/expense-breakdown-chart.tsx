"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ExpenseBreakdownChartProps {
  categories: Record<string, number>;
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
];

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent & Housing",
  utilities: "Utilities",
  food: "Food & Dining",
  transportation: "Transportation",
  entertainment: "Entertainment",
  shopping: "Shopping",
  healthcare: "Healthcare",
  insurance: "Insurance",
  education: "Education",
  investment: "Investment",
  other: "Other",
};

export function ExpenseBreakdownChart({ categories }: ExpenseBreakdownChartProps) {
  const data = Object.entries(categories)
    .map(([name, value]) => ({
      name: CATEGORY_LABELS[name] || name.charAt(0).toUpperCase() + name.slice(1),
      value: value,
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>
          Distribution of expenses across categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {/* Category List */}
            <div className="mt-6 space-y-2">
              {data.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">₹{item.value.toLocaleString('en-IN')}</span>
                    <span className="text-gray-500 text-xs w-12 text-right">
                      {((item.value / total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No expense data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
