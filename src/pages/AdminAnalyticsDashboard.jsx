import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Activity, Calendar, AlertTriangle, Brain, TrendingUp,
  Shield, Zap, Clock, CheckCircle, XCircle, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, RefreshCw, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import api from '../api/axiosConfig';

// ── Color palette ──
const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const PRIORITY_COLORS = { critical: '#ef4444', urgent: '#f59e0b', high: '#f97316', medium: '#3b82f6', low: '#10b981' };
const STATUS_COLORS = { scheduled: '#3b82f6', completed: '#10b981', cancelled: '#ef4444', 'no-show': '#f59e0b', 'in-progress': '#8b5cf6', pending: '#6b7280' };

// ── Reusable Card ──
const GlassCard = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-sm p-6 ${className}`}
  >
    {children}
  </motion.div>
);

// ── Mini metric card ──
const MetricCard = ({ icon: Icon, label, value, sub, color, delay }) => (
  <GlassCard delay={delay} className="flex items-start gap-4">
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </GlassCard>
);

// ── Section header ──
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
      <Icon className="w-4 h-4 text-blue-600" />
    </div>
    <div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  </div>
);

// ── Custom recharts tooltip ──
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-slate-200 px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Main dashboard ──
export default function AdminAnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [queryTrends, setQueryTrends] = useState({ trends: [], pendingQueries: 0 });
  const [appointmentData, setAppointmentData] = useState({ dailyTrends: [], statusDistribution: [], urgencyDistribution: [] });
  const [aiPerf, setAiPerf] = useState(null);
  const [criticalCases, setCriticalCases] = useState({ cases: [], summary: {} });
  const [activityFeed, setActivityFeed] = useState([]);
  const [efficiencyScore, setEfficiencyScore] = useState({ score: 0, breakdown: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, w, qt, aa, ai, cc, af, es] = await Promise.allSettled([
        api.get('admin-analytics/stats'),
        api.get('admin-analytics/workload'),
        api.get('admin-analytics/query-trends'),
        api.get('admin-analytics/appointment-analytics'),
        api.get('admin-analytics/ai-performance'),
        api.get('admin-analytics/critical-cases'),
        api.get('admin-analytics/activity-feed'),
        api.get('admin-analytics/efficiency-score'),
      ]);

      const d = (r) => r.status === 'fulfilled' ? (r.value?.data?.data ?? r.value?.data) : null;

      if (d(s))  setStats(d(s));
      if (d(w))  setWorkload(d(w));
      if (d(qt)) setQueryTrends(d(qt));
      if (d(aa)) setAppointmentData(d(aa));
      if (d(ai)) setAiPerf(d(ai));
      if (d(cc)) setCriticalCases(d(cc));
      if (d(af)) setActivityFeed(d(af));
      if (d(es)) setEfficiencyScore(d(es));
    } catch (e) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-3">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const shortDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Hospital operational intelligence — real-time insights</p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* ── Efficiency Score Hero ── */}
      <GlassCard delay={0} className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-blue-50 via-white to-violet-50">
        <div className="relative w-36 h-36 flex-shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={efficiencyScore.score >= 70 ? '#10b981' : efficiencyScore.score >= 40 ? '#f59e0b' : '#ef4444'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(efficiencyScore.score / 100) * 327} 327`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-900">{efficiencyScore.score}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Score</span>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> Hospital Efficiency Score
          </h2>
          <p className="text-sm text-slate-500 mt-1">Composite metric derived from query resolution, appointment completion, cancellation rate, and critical case management.</p>
          <div className="flex flex-wrap gap-4 mt-3">
            {efficiencyScore.breakdown && Object.entries(efficiencyScore.breakdown).map(([key, val]) => (
              <div key={key} className="text-center">
                <p className="text-lg font-bold text-slate-800">{val}{typeof val === 'number' && val <= 100 && key !== 'pendingQueueLoad' && key !== 'criticalUnresolved' ? '%' : ''}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{key.replace(/([A-Z])/g, ' $1')}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={Users}         label="Total Patients"     value={stats?.totalPatients ?? '—'}     color="from-blue-500 to-blue-600"    delay={0.05} />
        <MetricCard icon={Users}         label="Active Users"       value={stats?.totalUsers ?? '—'}        color="from-violet-500 to-violet-600" delay={0.1} />
        <MetricCard icon={Activity}      label="Active Queries"     value={stats?.activeQueries ?? '—'}     color="from-cyan-500 to-cyan-600"    delay={0.15} />
        <MetricCard icon={AlertTriangle} label="Critical Alerts"    value={stats?.criticalAlerts ?? '—'}    color="from-red-500 to-red-600"      delay={0.2} />
        <MetricCard icon={Calendar}      label="Appts Today"        value={stats?.appointmentsToday ?? '—'} color="from-emerald-500 to-emerald-600" delay={0.25} />
        <MetricCard icon={Calendar}      label="Total Appts"        value={stats?.totalAppointments ?? '—'} color="from-amber-500 to-amber-600"  delay={0.3} />
      </div>

      {/* ── Row: Workload + Query Trends ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload */}
        <GlassCard delay={0.15}>
          <SectionHeader icon={BarChart3} title="Doctor Workload Distribution" subtitle="Queries + appointments per physician" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="queries" name="Queries" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="appointments" name="Appointments" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Query Trends */}
        <GlassCard delay={0.2}>
          <SectionHeader icon={TrendingUp} title="Query Resolution Trends" subtitle={`${queryTrends.pendingQueries} pending queries`} />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={queryTrends.trends} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={shortDate} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="opened" name="Opened" stroke="#3b82f6" fill="url(#gradOpened)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fill="url(#gradResolved)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* ── Row: Appointment Trends + Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Line Chart */}
        <GlassCard delay={0.25} className="lg:col-span-2">
          <SectionHeader icon={Calendar} title="Appointment Trends" subtitle="Booked, completed & cancelled — last 14 days" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={appointmentData.dailyTrends} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={shortDate} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="booked" name="Booked" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Pie: Status Distribution */}
        <GlassCard delay={0.3}>
          <SectionHeader icon={PieChart} title="Appointment Status" subtitle="Distribution by status" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie data={appointmentData.statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {appointmentData.statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* ── Row: AI Performance + Critical Cases ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Performance */}
        <GlassCard delay={0.35}>
          <SectionHeader icon={Brain} title="AI Performance Analytics" subtitle="Suggestion acceptance & coverage" />
          {aiPerf && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-extrabold text-blue-700">{aiPerf.aiGenerated}</p>
                  <p className="text-[10px] text-blue-500 font-semibold uppercase">AI Generated</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-extrabold text-emerald-700">{aiPerf.acceptanceRate}%</p>
                  <p className="text-[10px] text-emerald-500 font-semibold uppercase">Acceptance</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-extrabold text-violet-700">{aiPerf.aiCoverage}%</p>
                  <p className="text-[10px] text-violet-500 font-semibold uppercase">Coverage</p>
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={aiPerf.breakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {aiPerf.breakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </GlassCard>

        {/* Critical Cases */}
        <GlassCard delay={0.4}>
          <SectionHeader icon={AlertTriangle} title="Critical Case Monitor" subtitle={`${criticalCases.summary?.totalCritical || 0} critical · ${criticalCases.summary?.totalUrgent || 0} urgent`} />
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {(criticalCases.cases || []).map((c, i) => (
              <div key={c.id || i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <span className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.priority === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.message}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className={`font-bold uppercase ${c.priority === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{c.priority}</span>
                    <span>Patient: {c.patient}</span>
                    <span>→ {c.assignedTo}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.status === 'open' ? 'bg-red-50 text-red-600' : c.status === 'triaged' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
            {(!criticalCases.cases || criticalCases.cases.length === 0) && (
              <div className="text-center py-10 text-slate-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-medium">No critical cases — all clear</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Row: Urgency Pie + Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgency */}
        <GlassCard delay={0.45}>
          <SectionHeader icon={Shield} title="Urgency Distribution" subtitle="Appointment urgency levels" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie data={appointmentData.urgencyDistribution} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {appointmentData.urgencyDistribution.map((entry, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Activity Feed */}
        <GlassCard delay={0.5} className="lg:col-span-2">
          <SectionHeader icon={Clock} title="Real-Time Activity Feed" subtitle="Latest hospital operations" />
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {activityFeed.map((a, i) => (
              <div key={a.id || i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.success === false ? 'bg-red-500' : a.action === 'login' ? 'bg-emerald-500' : a.action === 'create' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-700">{a.user}</span>
                  <span className="text-slate-400 mx-1">·</span>
                  <span className="text-slate-500">{a.action} {a.resourceType}</span>
                  {a.detail && <span className="text-slate-400 text-xs ml-1">— {a.detail}</span>}
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ''}</span>
                {a.success === false && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
              </div>
            ))}
            {activityFeed.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">No recent activity</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
