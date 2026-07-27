import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { 
  MagnifyingGlass, 
  Funnel, 
  ArrowRight, 
  Folder, 
  User, 
  Clock, 
  Notebook, 
  CheckCircle,
  Warning
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

interface WorkspaceHubProps {
  projects: Project[];
  activeRole: 'freelancer' | 'client';
  onOpenWorkspace: (projectId: string) => void;
  showToast: (msg: string) => void;
}

export default function WorkspaceHub({ 
  projects, 
  activeRole, 
  onOpenWorkspace, 
  showToast 
}: WorkspaceHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'disputed'>('all');

  // Derive organic activity indicator per card
  const getActivityIndicator = (project: Project) => {
    // Check documents
    if (project.documents && project.documents.length > 0) {
      const doc = project.documents[0];
      return {
        text: `Updated doc "${doc.title}"`,
        icon: Notebook,
        colorClass: 'text-gh-teal bg-gh-teal/10 border-gh-teal/20'
      };
    }
    // Check milestones
    if (project.milestones && project.milestones.length > 0) {
      const submitted = project.milestones.find(m => m.status === 'submitted');
      if (submitted) {
        return {
          text: `In Review: "${submitted.title}"`,
          icon: Clock,
          colorClass: 'text-gh-amber bg-gh-amber/10 border-gh-amber/20'
        };
      }
      const approved = project.milestones.find(m => m.status === 'approved');
      if (approved) {
        return {
          text: `Completed: "${approved.title}"`,
          icon: CheckCircle,
          colorClass: 'text-gh-green bg-gh-green/10 border-gh-green/20'
        };
      }
    }
    // Check disputed
    if (project.status === 'disputed') {
      return {
        text: 'Dispute filed on escrow',
        icon: Warning,
        colorClass: 'text-gh-red bg-gh-red/10 border-gh-red/20'
      };
    }

    return {
      text: 'No recent board activity',
      icon: Folder,
      colorClass: 'text-text-muted bg-slate-50 border-slate-200'
    };
  };

  // Filter & Search logic
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Filter by status
      if (filterStatus !== 'all' && project.status !== filterStatus) {
        return false;
      }
      // Search by title or client/freelancer name
      const query = searchQuery.toLowerCase();
      const matchTitle = project.jobTitle.toLowerCase().includes(query);
      const matchClient = project.clientName.toLowerCase().includes(query);
      const matchFreelancer = project.freelancerName.toLowerCase().includes(query);
      return matchTitle || matchClient || matchFreelancer;
    });
  }, [projects, filterStatus, searchQuery]);

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0 select-none pb-8">
      {/* Header section with asymmetric alignment (Design Variance: 8) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5 bg-white p-6 rounded-2xl shadow-card">
        <div className="space-y-1.5 max-w-xl">
          <h1 className="font-sans font-bold text-2xl tracking-tighter text-gh-ink">
            Live Workspace Hub
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            Direct secure pipelines into real-time collaborative assets, whiteboard designs, structural specs, and financial ledgers for active contracts.
          </p>
        </div>

        {/* Counter Widget */}
        <div className="flex items-center gap-3 bg-surface-0 border border-border p-3 rounded-xl shrink-0 self-start md:self-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-gh-teal animate-pulse" />
          <div className="flex flex-col">
            <span className="font-mono font-bold text-sm text-gh-ink">
              {projects.filter(p => p.status === 'active').length}
            </span>
            <span className="text-[9px] uppercase tracking-wider font-sans font-extrabold text-text-muted">
              Active Escrows
            </span>
          </div>
        </div>
      </div>

      {/* Control Strip: Search & Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspace room, customer, engineer..."
            className="w-full h-10 pl-9 pr-4 bg-slate-50 border border-border rounded-xl font-sans text-xs focus:ring-2 focus:ring-gh-teal focus:border-gh-teal focus:bg-white transition-all outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {(['all', 'active', 'completed', 'disputed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold tracking-tight uppercase border transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-gh-teal text-white border-gh-teal shadow-sm'
                  : 'bg-white text-text-secondary border-border hover:bg-slate-50 hover:text-text-primary'
              }`}
            >
              {status === 'all' ? 'All workspaces' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Workspaces */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {filteredProjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[300px] bg-white border border-border border-dashed rounded-2xl p-8 text-center"
            >
              <Folder size={48} className="text-slate-200 mb-4" weight="thin" />
              <p className="font-sans font-bold text-sm text-text-primary mb-1">
                No active workspaces found
              </p>
              <p className="text-xs text-text-muted max-w-sm leading-relaxed mb-4">
                Verify your search parameters or select a different pipeline filter state above.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="px-4 py-2 bg-gh-teal hover:bg-gh-teal-hover text-white font-sans text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Reset Hub Filters
              </button>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filteredProjects.map((project) => {
                const activity = getActivityIndicator(project);
                const ActivityIcon = activity.icon;

                return (
                  <motion.div
                    key={project.id}
                    layoutId={`hub-card-${project.id}`}
                    whileHover={{ scale: 1.01, y: -2 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    className="group bg-white border border-border hover:border-gh-teal/30 rounded-2xl p-5 shadow-card hover:shadow-elevated flex flex-col justify-between transition-shadow relative"
                  >
                    {/* Status Pill Indicator */}
                    <div className="absolute top-5 right-5">
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        project.status === 'active' 
                          ? 'bg-gh-teal-light text-gh-teal border-gh-teal/20'
                          : project.status === 'completed'
                          ? 'bg-green-50 text-gh-green border-green-200'
                          : 'bg-red-50 text-gh-red border-red-200'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Project Meta */}
                      <div className="space-y-1 pr-14">
                        <h3 className="font-sans font-bold text-sm text-gh-ink line-clamp-1 group-hover:text-gh-teal transition-colors">
                          {project.jobTitle}
                        </h3>
                        <p className="text-[10px] text-text-secondary font-medium flex items-center gap-1.5">
                          <User size={12} className="text-text-muted" />
                          <span>
                            {activeRole === 'freelancer' 
                              ? `Client: ${project.clientName}`
                              : `Engineer: ${project.freelancerName}`}
                          </span>
                        </p>
                      </div>

                      {/* Organic Live Activity Ribbon */}
                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${activity.colorClass}`}>
                        <ActivityIcon size={14} className="shrink-0" />
                        <span className="font-sans font-semibold text-[10px] truncate">
                          {activity.text}
                        </span>
                      </div>

                      {/* Micro Metric Block */}
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3.5 text-[10px]">
                        <div>
                          <span className="text-text-muted block uppercase tracking-wider font-sans font-bold text-[8px]">
                            Contract Value
                          </span>
                          <span className="font-mono font-bold text-gh-ink">
                            ₱{project.totalBudget.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted block uppercase tracking-wider font-sans font-bold text-[8px]">
                            Last Updated
                          </span>
                          <span className="font-mono text-text-secondary">
                            Jul 26, 3:12 PM
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider">
                        SECURE PIPELINE
                      </span>
                      <button
                        onClick={() => {
                          onOpenWorkspace(project.id);
                          showToast(`Connecting to ${project.jobTitle} workspace...`);
                        }}
                        className="px-3 py-1.5 bg-slate-50 group-hover:bg-gh-teal text-text-secondary group-hover:text-white rounded-lg font-sans font-bold text-[10px] flex items-center gap-1 transition-all duration-200 cursor-pointer"
                      >
                        <span>Open Workspace</span>
                        <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
