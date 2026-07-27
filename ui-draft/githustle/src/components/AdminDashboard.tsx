import React, { useState, useMemo, useEffect } from 'react';
import { Dispute, Project } from '../types';
import { 
  Warning, 
  FileText, 
  CheckCircle, 
  Terminal, 
  Coins, 
  Clock, 
  ArrowRight,
  Notebook,
  ArrowsLeftRight,
  Cpu,
  ArrowsCounterClockwise,
  SealCheck,
  User,
  ChartLineUp,
  EnvelopeSimple,
  Hammer,
  Shield,
  UserGear,
  Funnel,
  TrendUp,
  X,
  WarningOctagon
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  CartesianGrid 
} from 'recharts';

interface AdminDashboardProps {
  disputes: Dispute[];
  projects: Project[];
  onResolveDispute: (id: string, action: 'release' | 'revision' | 'refund', notes: string) => void;
}

interface SimulatedUser {
  id: string;
  name: string;
  role: 'Freelancer Node' | 'Client Node';
  status: 'Authorized' | 'Restricted';
  reputation: number;
}

export default function AdminDashboard({
  disputes,
  projects,
  onResolveDispute
}: AdminDashboardProps) {
  const [selectedDisputeId, setSelectedDisputeId] = useState<string>(disputes[0]?.id || '');
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Dynamic interactive metrics selector
  // 'escrow' | 'sla' | 'trends'
  const [activeMetricTab, setActiveMetricTab] = useState<'escrow' | 'sla' | 'trends'>('escrow');

  // User list states with ban toggles
  const [simulatedUsers, setSimulatedUsers] = useState<SimulatedUser[]>([
    { id: 'usr_01', name: 'Mia Santos', role: 'Client Node', status: 'Authorized', reputation: 4.9 },
    { id: 'usr_02', name: 'Carlo Mendoza', role: 'Freelancer Node', status: 'Authorized', reputation: 4.8 },
    { id: 'usr_03', name: 'Juan Reyes', role: 'Client Node', status: 'Authorized', reputation: 4.5 }
  ]);

  // Toast notification state localized for admin desk
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const triggerAdminToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3000);
  };

  // Log filter criteria states
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('All');
  const [logActorFilter, setLogActorFilter] = useState<string>('All');

  const activeDispute = useMemo(() => {
    return disputes.find(disp => disp.id === selectedDisputeId) || disputes[0];
  }, [disputes, selectedDisputeId]);

  const activeProject = useMemo(() => {
    if (!activeDispute) return null;
    return projects.find(proj => proj.id === activeDispute.projectId) || null;
  }, [projects, activeDispute]);

  const handleAction = (resolutionType: 'release' | 'revision' | 'refund') => {
    if (!activeDispute) return;
    if (!adminNotes.trim()) {
      triggerAdminToast('official SLA justification is required.');
      return;
    }
    onResolveDispute(activeDispute.id, resolutionType, adminNotes);
    
    // Append resolution log
    const timestamp = new Date().toLocaleTimeString();
    const newLogLine = `[AUDIT] [${timestamp}] ARBITRATION final decision on ${activeDispute.id}: ${resolutionType.toUpperCase()}. Decision note: "${adminNotes}"`;
    setLogs(prev => [newLogLine, ...prev]);

    setAdminNotes('');
    triggerAdminToast(`Finalized Case: ${resolutionType.toUpperCase()}`);
  };

  // High-fidelity compliance metrics
  const stats = useMemo(() => {
    const totalOpenClaims = disputes.filter(d => d.status === 'open').length;
    return {
      escrowPool: 4821500,
      slaMediation: 99.8,
      activeClaims: totalOpenClaims,
      processedLedgerCount: 382 + (disputes.filter(d => d.status === 'resolved').length)
    };
  }, [disputes]);

  // Filtered disputes list
  const filteredDisputes = useMemo(() => {
    if (statusFilter === 'all') return disputes;
    if (statusFilter === 'active') return disputes.filter(d => d.status === 'open');
    return disputes.filter(d => d.status === 'resolved');
  }, [disputes, statusFilter]);

  // Simulated raw system logs
  const [logs, setLogs] = useState<string[]>([
    '[AUDIT] System arbitration desk fully initialized.',
    '[MEDIATION] Alert: Ticket DISP_001 triggered for project_01. Claim: "UI shift on older mobile render viewports."',
    '[GCASH] SHA256 webhook authorized by sandbox signature handshake: VERIFIED',
    '[ESCROW] Deposited ₱50,000.00 into contract lock channel: project_01',
    '[DB] pg_stat_statements: No slow-performing SQL query bottlenecks identified.',
    '[DB] Cloud SQL Postgres connection pooling healthy. [Pooled slots: 25]',
    '[SYSTEM] Booting GitHustle secure mediation gateway server on port 3000...'
  ]);

  const handleRefreshLogs = () => {
    setIsRefreshingLogs(true);
    setTimeout(() => {
      const stamp = new Date().toLocaleTimeString();
      const mockLines = [
        `[AUDIT] [${stamp}] SuperAdmin initiated active connection diagnostics scan.`,
        `[DB] [${stamp}] PgBouncer status active. Average database query latency is 4ms.`,
        `[GCASH] [${stamp}] Listening for incoming Maya payment gateway webhooks...`,
        `[ESCROW] [${stamp}] Frozen capital pool synchronized. Active volume: ₱${stats.escrowPool.toLocaleString()}`
      ];
      setLogs(prev => [...mockLines, ...prev].slice(0, 20));
      setIsRefreshingLogs(false);
      triggerAdminToast('Diagnostic logs sweep completed.');
    }, 1200);
  };

  // BAN/RESTRICT USER ACTION
  const handleToggleRestrictUser = (userId: string) => {
    const targetUser = simulatedUsers.find(u => u.id === userId);
    if (!targetUser) return;

    const nextStatus = targetUser.status === 'Authorized' ? 'Restricted' : 'Authorized';
    setSimulatedUsers(simulatedUsers.map(u => u.id === userId ? { ...u, status: nextStatus } : u));

    // Append to audit terminal logs
    const stamp = new Date().toLocaleTimeString();
    const actionLog = `[SECURITY] [${stamp}] Administrative authority action: Node ${targetUser.id} (${targetUser.name}) updated status to ${nextStatus.toUpperCase()}`;
    setLogs(prev => [actionLog, ...prev]);

    triggerAdminToast(`${targetUser.name} security key is now ${nextStatus.toUpperCase()}`);
  };

  // Filter terminal logs on the fly
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filter check
      if (logCategoryFilter !== 'All') {
        if (!log.includes(`[${logCategoryFilter}]`)) return false;
      }
      // Actor filter check
      if (logActorFilter !== 'All') {
        const lowerLog = log.toLowerCase();
        if (!lowerLog.includes(logActorFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, logCategoryFilter, logActorFilter]);

  // CHART DATASETS FOR METRICS switcher
  const escrowData = [
    { name: 'KargoPH Hook', volume: 850000 },
    { name: 'RideShare GPS', volume: 1450000 },
    { name: 'GCash Gateway', volume: 2150000 },
    { name: 'Courier Core', volume: 371500 }
  ];

  const resolutionVelocityData = [
    { month: 'Mar', hours: 24 },
    { month: 'Apr', hours: 18 },
    { month: 'May', hours: 11 },
    { month: 'Jun', hours: 6 },
    { month: 'Jul', hours: 4 }
  ];

  const disputeTrendsData = [
    { day: 'Jul 15', tickets: 2 },
    { day: 'Jul 16', tickets: 4 },
    { day: 'Jul 17', tickets: 1 },
    { day: 'Jul 18', tickets: 5 },
    { day: 'Jul 19', tickets: 3 },
    { day: 'Jul 20', tickets: 2 }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 min-h-0 text-text-primary text-xs relative">
      
      {/* LOCAL ADMIN Toast notification banner */}
      <AnimatePresence>
        {adminToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 bg-gh-ink text-white p-3.5 rounded-xl border border-white/10 flex items-center gap-2.5 shadow-lg max-w-sm"
          >
            <WarningOctagon size={18} className="text-gh-red shrink-0 animate-pulse" />
            <div className="font-sans font-bold text-[11px]">
              {adminToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP: ESCROW OPERATIONS STATS BOARD */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        
        {/* Stat 1 */}
        <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-gh-teal-light text-gh-teal flex items-center justify-center border border-gh-teal/15">
            <Coins size={20} weight="fill" />
          </div>
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted block font-bold leading-none">
              Global Escrow Volume
            </span>
            <span className="font-mono text-base font-bold text-gh-ink block mt-1.5">
              ₱{stats.escrowPool.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-gh-blue-light text-gh-blue flex items-center justify-center border border-gh-blue/15">
            <ChartLineUp size={20} weight="fill" />
          </div>
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted block font-bold leading-none">
              Mediation SLA Rate
            </span>
            <span className="font-mono text-base font-bold text-gh-ink block mt-1.5">
              {stats.slaMediation}% <span className="text-[10px] text-gh-green font-bold">&lt; 4h</span>
            </span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-gh-red-light text-gh-red flex items-center justify-center border border-gh-red/15">
            <Shield size={20} weight="fill" className="text-gh-red animate-pulse" />
          </div>
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted block font-bold leading-none">
              Active Claims
            </span>
            <span className="font-mono text-base font-bold text-gh-red block mt-1.5">
              {stats.activeClaims} disputes
            </span>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-gh-teal-light text-gh-teal flex items-center justify-center border border-gh-teal/15">
            <SealCheck size={20} weight="fill" />
          </div>
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted block font-bold leading-none">
              Immutable Records
            </span>
            <span className="font-mono text-base font-bold text-gh-ink block mt-1.5">
              {stats.processedLedgerCount} TX
            </span>
          </div>
        </div>

      </section>

      {/* MID A: INTERACTIVE GRAPH METRICS PANEL */}
      <section className="bg-white p-5 rounded-2xl border border-border space-y-4 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-border pb-3">
          <div className="space-y-0.5">
            <h3 className="font-sans font-bold text-sm text-gh-ink flex items-center gap-1.5">
              <TrendUp size={16} className="text-gh-teal" />
              <span>Real-Time Audit Metrics Projections</span>
            </h3>
            <p className="text-[10px] text-text-muted leading-none">Select operational metrics below to dynamically project server ledger velocity.</p>
          </div>

          {/* Interactive Metric Switcher Buttons */}
          <div className="flex bg-surface-0 rounded border border-border p-1 text-[10px] font-bold">
            <button
              onClick={() => setActiveMetricTab('escrow')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${activeMetricTab === 'escrow' ? 'bg-gh-teal text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Escrow Volumes
            </button>
            <button
              onClick={() => setActiveMetricTab('sla')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${activeMetricTab === 'sla' ? 'bg-gh-teal text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Mediation Velocity
            </button>
            <button
              onClick={() => setActiveMetricTab('trends')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${activeMetricTab === 'trends' ? 'bg-gh-teal text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
            >
              Dispute Trends
            </button>
          </div>
        </div>

        {/* Dynamic Recharts Box */}
        <div className="h-44 w-full">
          {activeMetricTab === 'escrow' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={escrowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                <Tooltip formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Capital locked']} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                <Bar dataKey="volume" fill="#0D9488" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeMetricTab === 'sla' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resolutionVelocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                <Tooltip formatter={(value) => [`${value} Hours`, 'Average Payout Match SLA']} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="hours" stroke="#0D9488" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeMetricTab === 'trends' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={disputeTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                <Tooltip formatter={(value) => [`${value} Tickets`, 'Daily Claim Initiated']} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="tickets" stroke="#EF4444" strokeWidth={2} fill="#FEE2E2" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <p className="text-[10px] text-text-secondary leading-relaxed font-sans text-center">
          {activeMetricTab === 'escrow' && 'Active locked capital on GCash node webhooks. Volume tracks standard Philippines Peso escrow transactions.'}
          {activeMetricTab === 'sla' && 'Average duration before administrative arbitration is cleared. SLA payout velocity has improved 600% since April integrations.'}
          {activeMetricTab === 'trends' && 'Escalated dispute logs over days of July. High-volume periods reflect contract finalization weeks.'}
        </p>
      </section>

      {/* MID B: USER SEGMENT CONTROL & DISPUTE WRITING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 shrink-0">
        
        {/* User Management Panel (col-span-4) */}
        <div className="lg:col-span-4 bg-white border border-border p-4 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gh-ink font-sans font-bold">
              <UserGear size={16} className="text-gh-teal" />
              <span>User Node Management</span>
            </div>
            <p className="text-[10px] text-text-muted leading-tight">Restrict API authorization keys or access profiles of network users instantly.</p>
          </div>

          <div className="space-y-2.5">
            {simulatedUsers.map(user => (
              <div key={user.id} className="p-3 bg-surface-0 border border-border rounded-xl flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="font-sans font-semibold text-text-primary block truncate">{user.name}</span>
                  <span className="font-mono text-[9px] text-text-muted block">{user.role} · Reputation {user.reputation}⭐</span>
                  
                  {/* Authorized vs Banned Badge */}
                  <span className={`inline-block font-mono text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                    user.status === 'Authorized' ? 'bg-gh-green-light text-gh-green' : 'bg-gh-red-light text-gh-red'
                  }`}>
                    {user.status}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleRestrictUser(user.id)}
                  className={`px-2.5 py-1.5 text-[10px] font-sans font-bold rounded transition cursor-pointer shrink-0 ${
                    user.status === 'Authorized' 
                      ? 'bg-gh-red-light text-gh-red hover:bg-gh-red hover:text-white border border-gh-red/10' 
                      : 'bg-gh-green-light text-gh-green hover:bg-gh-green hover:text-white border border-gh-green/10'
                  }`}
                >
                  {user.status === 'Authorized' ? 'Restrict' : 'Authorize'}
                </button>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-surface-0 border border-border rounded-lg text-[9px] text-text-muted font-mono leading-relaxed">
            RESTRICTION ACTION: Suspends standard GCash escrow withdraw handshakes. Suspends new public hub proposal dispatches.
          </div>
        </div>

        {/* Dispute Tickets Queue (col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-border rounded-2xl overflow-hidden shadow-sm h-[320px] grid grid-cols-1 md:grid-cols-12">
          
          {/* Dispute Sidebar */}
          <div className="md:col-span-5 bg-surface-0 border-r border-border flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-border flex justify-between items-center bg-white">
              <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-text-muted">Conflict File Queue</span>
              <span className="font-mono text-[8px] bg-gh-red-light text-gh-red px-1.5 py-0.5 rounded font-bold">{disputes.filter(d => d.status === 'open').length} Claims</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {filteredDisputes.map(disp => {
                const isSelected = disp.id === selectedDisputeId;
                return (
                  <button
                    key={disp.id}
                    onClick={() => setSelectedDisputeId(disp.id)}
                    className={`w-full text-left p-3 transition flex flex-col gap-1 cursor-pointer ${
                      isSelected ? 'bg-white border-l-2 border-gh-red shadow-sm font-semibold' : 'hover:bg-white/50'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-[9px] font-bold text-gh-red">{disp.id}</span>
                      <span className={`font-mono text-[8px] uppercase px-1 py-0.5 rounded ${
                        disp.status === 'open' ? 'bg-gh-amber-light text-gh-amber' : 'bg-gh-green-light text-gh-green'
                      }`}>{disp.status}</span>
                    </div>
                    <span className="font-sans text-text-primary block truncate max-w-[130px] font-bold">{disp.projectTitle}</span>
                    <span className="text-[9px] text-text-muted block mt-0.5">₱{disp.amountDisputed.toLocaleString()} frozen</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dispute Content */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden">
            {activeDispute ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-3.5 bg-white">
                <div className="flex justify-between items-start border-b border-border/60 pb-2">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-gh-red font-bold block">Contested Milestone</span>
                    <span className="font-sans font-bold text-xs text-gh-ink block leading-tight mt-0.5">{activeDispute.milestoneTitle}</span>
                  </div>
                  <strong className="font-mono text-xs text-gh-teal-hover">₱{activeDispute.amountDisputed.toLocaleString()}</strong>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 text-[10.5px]">
                  <blockquote className="p-3 bg-red-50/25 border border-red-100 rounded-lg text-text-secondary italic">
                    "{activeDispute.reason}"
                  </blockquote>

                  {activeDispute.status === 'open' ? (
                    <div className="space-y-2 pt-1.5">
                      <textarea
                        rows={2}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="State technical metrics matching wireframes specs to justify this payout..."
                        className="w-full font-sans px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal bg-white leading-relaxed resize-none text-[10px]"
                      />

                      <div className="grid grid-cols-3 gap-1.5 font-sans font-bold text-[9px]">
                        <button onClick={() => handleAction('release')} className="py-2 bg-gh-teal text-white hover:bg-gh-teal-hover rounded transition cursor-pointer text-center">
                          Disburse
                        </button>
                        <button onClick={() => handleAction('revision')} className="py-2 bg-gh-ink text-white hover:bg-zinc-800 rounded transition cursor-pointer text-center">
                          Order Code Rev
                        </button>
                        <button onClick={() => handleAction('refund')} className="py-2 bg-gh-red text-white hover:bg-gh-red-hover rounded transition cursor-pointer text-center">
                          Refund Client
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-gh-green-light/10 border border-gh-green/10 rounded-lg text-center text-gh-green font-mono text-[10px] font-bold">
                      MEDIATION RESOLVED: Funds cleared to destination channels.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-text-muted p-4">
                <Shield size={24} className="text-border mb-1" />
                <span className="font-sans font-bold text-xs">No Contested Files Selected</span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* SYSTEM AUDIT LOGS TERMINAL (JetBrains Mono, dark background) */}
      <section className="bg-gh-ink rounded-xl border border-white/5 overflow-hidden text-white shadow-lg p-5 space-y-4 shrink-0">
        
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Terminal size={18} weight="fill" className="text-gh-teal animate-pulse" />
            <div>
              <span className="font-sans font-bold text-xs uppercase tracking-wider">System Audit Terminal</span>
              <p className="text-[9px] text-white/40 leading-none mt-0.5">Real-time port 3000 callback ledgers & database operations logs.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Log Category Filter Dropdown */}
            <div className="flex items-center gap-1 text-[10px] font-mono text-white/60">
              <Funnel size={12} />
              <span>Category:</span>
              <select
                value={logCategoryFilter}
                onChange={(e) => setLogCategoryFilter(e.target.value)}
                className="bg-white/10 border border-white/10 rounded px-1 py-0.5 text-white text-[9px] focus:outline-none"
              >
                <option value="All" className="bg-gh-ink">All</option>
                <option value="AUDIT" className="bg-gh-ink">Arbitration</option>
                <option value="DB" className="bg-gh-ink">Database</option>
                <option value="GCASH" className="bg-gh-ink">GCash</option>
                <option value="ESCROW" className="bg-gh-ink">Escrow</option>
                <option value="SECURITY" className="bg-gh-ink">Security</option>
              </select>
            </div>

            {/* Log Actor Filter Dropdown */}
            <div className="flex items-center gap-1 text-[10px] font-mono text-white/60">
              <User size={12} />
              <span>Actor:</span>
              <select
                value={logActorFilter}
                onChange={(e) => setLogActorFilter(e.target.value)}
                className="bg-white/10 border border-white/10 rounded px-1 py-0.5 text-white text-[9px] focus:outline-none"
              >
                <option value="All" className="bg-gh-ink">All Actors</option>
                <option value="Mia Santos" className="bg-gh-ink">Mia Santos</option>
                <option value="Carlo Mendoza" className="bg-gh-ink">Carlo Mendoza</option>
                <option value="SuperAdmin" className="bg-gh-ink">SuperAdmin</option>
              </select>
            </div>

            <button
              onClick={handleRefreshLogs}
              disabled={isRefreshingLogs}
              className="px-3 py-1 bg-white/10 hover:bg-white/15 text-[10px] font-mono rounded text-white flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
            >
              <ArrowsCounterClockwise size={12} className={isRefreshingLogs ? 'animate-spin' : ''} />
              <span>{isRefreshingLogs ? 'Syncing...' : 'Sweep Logs'}</span>
            </button>
          </div>
        </div>

        {/* Real-time styled code lines */}
        <div className="font-mono text-[11px] leading-relaxed space-y-1 max-h-[160px] overflow-y-auto bg-black/40 p-3.5 rounded border border-white/5 text-teal-400">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-white/30 shrink-0 select-none">[{idx + 104}]</span>
              <span className={
                log.includes('Alert') || log.includes('SECURITY') ? 'text-gh-red' : 
                log.includes('AUDIT') || log.includes('ARBITRATION') ? 'text-gh-teal-light' : 
                log.includes('SYSTEM') ? 'text-white/80' : 
                'text-teal-400'
              }>
                {log}
              </span>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-white/30 italic text-center py-4">
              No matching log signatures found. Adjust filters.
            </div>
          )}
          {isRefreshingLogs && (
            <div className="flex items-center gap-2 text-white/40 italic">
              <span>Syncing database audit indices...</span>
            </div>
          )}
        </div>

      </section>

    </div>
  );
}
