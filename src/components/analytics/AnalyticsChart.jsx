import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function AnalyticsChart({ data = [] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Clinic Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Appointments and completed follow-ups
          </p>
        </div>

        <div className="rounded-xl bg-pink-50 p-2.5 text-pink-600">
          <BarChart3 size={20} />
        </div>
      </div>

      <div className="mt-7 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={8}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
            />

            <Tooltip />
            <Legend iconType="circle" iconSize={9} />

            <Bar
              dataKey="appointments"
              name="Appointments"
              fill="#ec4899"
              radius={[7, 7, 0, 0]}
            />

            <Bar
              dataKey="followUps"
              name="Follow-ups"
              fill="#8b5cf6"
              radius={[7, 7, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
