import React, { useState, useMemo } from 'react';
import { Job, Project, Dispute, Milestone } from './types';
import { INITIAL_JOBS, INITIAL_PROJECTS, INITIAL_DISPUTES } from './mockData';
import RobustDiscoverFeed from './components/RobustDiscoverFeed';
import ConversationSpace from './components/ConversationSpace';
import PersonalSpace from './components/PersonalSpace';
import AdminDashboard from './components/AdminDashboard';
import ProfilePage from './components/ProfilePage';
import { 
  Compass, 
  ChatTeardropText, 
  Notebook, 
  Database, 
  Bell, 
  MagnifyingGlass, 
  Sparkle,
  User,
  CaretRight,
  UserGear,
  List,
  X,
  Lightning,
  BookmarkSimple,
  UserCircle,
  CrownSimple,
  Question,
  GearSix,
  SignOut
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Simulator Role selection: freelancer, client, admin
  const [activeRole, setActiveRole] = useState<'freelancer' | 'client' | 'admin'>('freelancer');
  
  // App primary tabs: hub, chat, personal, admin, profile, live, saved, premium, help, settings
  const [activeTab, setActiveTab] = useState<
    'hub' | 'chat' | 'personal' | 'admin' | 'profile' |
    'live' | 'saved' | 'premium' | 'help' | 'settings'
  >('hub');

  // Sidebar collapsed state for desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile drawer open state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Profile dropdown open state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Primary shared data ledger states
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [disputes, setDisputes] = useState<Dispute[]>(INITIAL_DISPUTES);
  
  // Selections
  const [selectedJobId, setSelectedJobId] = useState<string>(INITIAL_JOBS[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(INITIAL_PROJECTS[0]?.id || '');
  
  // Search and Filters
  const [searchText, setSearchText] = useState('');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [budgetRange, setBudgetRange] = useState<number>(120000);
  const [experienceLevel, setExperienceLevel] = useState<string>('all');
  const [budgetType, setBudgetType] = useState<string>('all');

  // Client-side Custom Job poster state
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobBudget, setNewJobBudget] = useState(40000);
  const [newJobType, setNewJobType] = useState<'fixed' | 'hourly'>('fixed');
  const [newJobSkills, setNewJobSkills] = useState('');
  const [newJobExp, setNewJobExp] = useState<'entry' | 'mid' | 'senior'>('mid');

  // Toast / System Broadcast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Set field filter
  const handleSetField = (field: string) => {
    setSelectedField(field);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedField('all');
    setBudgetRange(120000);
    setExperienceLevel('all');
    setBudgetType('all');
  };

  // Filtered jobs memo
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const text = `${job.title} ${job.description} ${job.client.company}`.toLowerCase();
      if (searchText && !text.includes(searchText.toLowerCase())) return false;
      if (job.budget > budgetRange) return false;
      if (budgetType !== 'all' && job.budgetType !== budgetType) return false;
      if (experienceLevel !== 'all' && job.experienceLevel !== experienceLevel) return false;
      if (selectedField !== 'all' && job.field !== selectedField) return false;
      return true;
    });
  }, [jobs, searchText, budgetRange, budgetType, experienceLevel, selectedField]);

  // Handle new custom proposal submission (Freelancer -> Client)
  const handleProposalSubmit = (
    coverLetter: string, 
    rate: number, 
    weeks: number, 
    milestones: Milestone[]
  ) => {
    const targetJob = jobs.find(j => j.id === selectedJobId) || jobs[0];

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      jobTitle: targetJob ? targetJob.title : 'Custom Payment Contract Integration',
      clientId: `client_${Date.now()}`,
      clientName: targetJob ? targetJob.client.name : 'Juan Reyes',
      freelancerId: 'free_current',
      freelancerName: 'Carlo Mendoza',
      totalBudget: rate,
      status: 'active',
      milestones: milestones.map((m, idx) => ({
        ...m,
        id: `ms_proposed_${idx}_${Date.now()}`
      })),
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          senderName: 'Carlo Mendoza',
          senderRole: 'freelancer',
          text: `Hi! I have submitted my custom escrow proposal with ${milestones.length} structured milestones. Cover Pitch: ${coverLetter}`,
          timestamp: new Date().toISOString()
        }
      ],
      documents: [],
      boardElements: [],
      stickyNotes: [],
      calls: [],
      sharedTables: [],
      auditLogs: [
        { 
          id: `log_init_${Date.now()}`, 
          timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`, 
          actor: 'Carlo Mendoza', 
          action: 'Escrow Proposal Filed', 
          details: `Contract budget locked at ₱${rate.toLocaleString()} over ${weeks} weeks.` 
        }
      ]
    };

    setProjects([newProject, ...projects]);
    setSelectedProjectId(newProject.id);

    // Update job count
    setJobs(prevJobs => prevJobs.map(j => {
      if (j.id === selectedJobId) {
        return { ...j, proposalsCount: j.proposalsCount + 1 };
      }
      return j;
    }));

    showToast(`Escrow milestone contract initiated for ₱${rate.toLocaleString()}. Navigating to Conversation Workspace...`);
    setActiveTab('chat');
  };

  // Handle new job posting from Client
  const handlePostJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobDesc.trim()) return;

    const newJob: Job = {
      id: `job_${Date.now()}`,
      title: newJobTitle,
      description: newJobDesc,
      budget: newJobBudget,
      budgetType: newJobType,
      skills: newJobSkills.split(',').map(s => s.trim()).filter(Boolean),
      field: 'Web Development',
      experienceLevel: newJobExp,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      postedDate: new Date().toISOString().split('T')[0],
      client: {
        name: 'Mia Santos',
        company: 'KargoPH Express',
        rating: 4.9,
        location: 'Makati City, PH'
      },
      proposalsCount: 0
    };

    setJobs([newJob, ...jobs]);
    setSelectedJobId(newJob.id);
    setIsPostingJob(false);

    // Reset fields
    setNewJobTitle('');
    setNewJobDesc('');
    setNewJobBudget(40000);
    setNewJobType('fixed');
    setNewJobSkills('');
    setNewJobExp('mid');

    showToast(`Successfully published escrow contract: "${newJob.title}"`);
    setActiveTab('hub');
  };

  // Dispute escalation handler
  const handleOpenDispute = (milestoneTitle: string, reason: string, amount: number) => {
    const activeProj = projects.find(p => p.id === selectedProjectId) || projects[0];
    
    const newDispute: Dispute = {
      id: `disp_${Date.now()}`,
      projectId: selectedProjectId,
      projectTitle: activeProj ? activeProj.jobTitle : 'E-commerce Custom Redesign',
      clientName: activeProj ? activeProj.clientName : 'Juan Reyes',
      freelancerName: activeProj ? activeProj.freelancerName : 'Carlo Mendoza',
      reason,
      amountDisputed: amount,
      status: 'open',
      createdAt: new Date().toISOString(),
      milestoneTitle
    };

    setDisputes([newDispute, ...disputes]);
    
    // Update active project status
    setProjects(projects.map(p => {
      if (p.id === selectedProjectId) {
        const auditLogEntry = {
          id: `log_disp_${Date.now()}`,
          timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
          actor: activeRole === 'client' ? p.clientName : p.freelancerName,
          action: 'Dispute Filed',
          details: `Opened mediation ticket for "${milestoneTitle}". Escrow funds temporarily frozen.`
        };
        return {
          ...p,
          status: 'disputed' as const,
          auditLogs: [auditLogEntry, ...p.auditLogs]
        };
      }
      return p;
    }));

    showToast(`Conflict ticket filed with SuperAdmin Desk. Milestone funds locked for safety.`);
  };

  // Administrative dispute resolutions (from AdminDashboard)
  const handleResolveDispute = (
    disputeId: string, 
    resolution: 'release' | 'revision' | 'refund', 
    adminNotes: string
  ) => {
    const targetDispute = disputes.find(d => d.id === disputeId);
    if (!targetDispute) return;

    // Filter resolved dispute out of queue
    setDisputes(prev => prev.filter(d => d.id !== disputeId));

    // Resolve milestone and project values in projects list
    setProjects(prevProjects => prevProjects.map(proj => {
      if (proj.id === targetDispute.projectId) {
        let updatedMilestones = proj.milestones;
        let projStatus = proj.status;

        if (resolution === 'release') {
          updatedMilestones = proj.milestones.map(ms => {
            if (ms.title === targetDispute.milestoneTitle) {
              return { ...ms, status: 'approved' as const };
            }
            return ms;
          });
          projStatus = updatedMilestones.every(m => m.status === 'approved') ? 'completed' : 'active';
        } else if (resolution === 'revision') {
          updatedMilestones = proj.milestones.map(ms => {
            if (ms.title === targetDispute.milestoneTitle) {
              return { ...ms, status: 'pending' as const, submittedFile: null, submittedAt: null };
            }
            return ms;
          });
          projStatus = 'active';
        } else if (resolution === 'refund') {
          updatedMilestones = proj.milestones.map(ms => {
            if (ms.title === targetDispute.milestoneTitle) {
              return { ...ms, status: 'pending' as const, amount: 0, deliverableDesc: 'Escrow cancelled and refunded to client.' };
            }
            return ms;
          });
          projStatus = 'active';
        }

        const newLog = {
          id: `log_resolved_${Date.now()}`,
          timestamp: `Admin Audit - ${new Date().toISOString().split('T')[0]}`,
          actor: 'SuperAdmin Mediation Desk',
          action: 'Resolved Claim',
          details: `Resolution action: ${resolution.toUpperCase()}. Notes: ${adminNotes || 'SLA complied review.'}`
        };

        return {
          ...proj,
          status: projStatus,
          milestones: updatedMilestones,
          auditLogs: [newLog, ...proj.auditLogs]
        };
      }
      return proj;
    }));

    showToast(`Conflict ticket successfully finalized. Resolution: ${resolution.toUpperCase()}`);
  };

  const primaryNavItems = [
    { id: 'hub',       label: 'Public Hub',       icon: Compass          },
    { id: 'chat',      label: 'Conversations',    icon: ChatTeardropText },
    { id: 'personal',  label: 'Personal Space',   icon: Notebook         },
    { id: 'live',      label: 'Live Workspaces',  icon: Lightning        },
    { id: 'saved',     label: 'Saved Posts',       icon: BookmarkSimple   },
    { id: 'admin',     label: 'Admin Desk',       icon: Database         },
  ] as const;

  const utilityNavItems = [
    { id: 'profile',   label: 'Profile',    icon: UserCircle },
    { id: 'premium',   label: 'Premium',    icon: CrownSimple },
    { id: 'help',      label: 'Help',       icon: Question   },
    { id: 'settings',  label: 'Settings',   icon: GearSix    },
  ] as const;

  const currentRoleLabel = activeRole === 'freelancer' ? 'Freelancer Expert' : activeRole === 'client' ? 'Client Node' : 'Trust Auditor';

  return (
    <div className="min-h-[100dvh] bg-surface-0 text-text-primary flex flex-col font-sans select-none overflow-x-hidden antialiased">
      
      {/* 1. STICKY TOPNAV (Height 56px, background #0F1923) */}
      <header className="h-[56px] bg-gh-ink border-b border-white/5 text-white sticky top-0 z-50 shrink-0">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
          
          {/* Logo & Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)} 
              className="lg:hidden text-white/80 hover:text-white p-1 rounded transition cursor-pointer"
              aria-label="Toggle Mobile Menu"
            >
              <List size={22} weight="bold" />
            </button>
            
            <div className="flex items-center gap-1">
              <span className="font-sans font-semibold text-lg tracking-tight">Git</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gh-teal"></span>
              <span className="font-sans font-light text-lg tracking-tight text-white/90">Hustle</span>
              <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded font-bold ml-2">
                Compliance Gateway
              </span>
            </div>
          </div>

          {/* Quick Search bar (flex-1 max-w-md) with #0D9488 accent */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search contracts, skills, docs..."
              className="w-full text-xs font-sans pl-9 pr-3 py-1.5 bg-white/8 border border-white/10 rounded-md placeholder-white/40 text-white focus:outline-none focus:border-gh-teal focus:ring-1 focus:ring-gh-teal transition"
            />
            <MagnifyingGlass size={16} className="text-white/40 absolute left-3 top-2.5" />
          </div>

          {/* User Controls & Dropdowns */}
          <div className="flex items-center gap-4">
            
            {/* Notification Bell */}
            <div className="relative cursor-pointer group">
              <Bell size={20} className="text-white/70 group-hover:text-white transition" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gh-red rounded-full animate-pulse"></span>
            </div>

            {/* Simulated Role Dropdown Selector (Clean interface switcher) */}
            <div className="hidden sm:flex items-center bg-white/5 border border-white/10 p-1 rounded-md">
              <button
                onClick={() => {
                  setActiveRole('freelancer');
                  showToast('Switched simulator perspective to Freelancer.');
                }}
                className={`font-sans text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer ${
                  activeRole === 'freelancer' ? 'bg-gh-teal text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                Freelancer
              </button>
              <button
                onClick={() => {
                  setActiveRole('client');
                  showToast('Switched simulator perspective to Client.');
                }}
                className={`font-sans text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer ${
                  activeRole === 'client' ? 'bg-gh-teal text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                Client
              </button>
              <button
                onClick={() => {
                  setActiveRole('admin');
                  showToast('Switched simulator perspective to Trust Auditor.');
                }}
                className={`font-sans text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer ${
                  activeRole === 'admin' ? 'bg-gh-teal text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                Auditor
              </button>
            </div>

            {/* Profile Avatar Trigger */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-8 h-8 rounded-full bg-gh-teal flex items-center justify-center font-bold text-xs cursor-pointer text-white border border-white/10"
              >
                CM
              </button>
              
              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-lg shadow-lg py-1 text-xs text-text-primary z-50 font-sans"
                  >
                    <div className="p-3 border-b border-border">
                      <p className="font-semibold text-text-primary">Carlo Mendoza</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{currentRoleLabel}</p>
                    </div>
                    <div className="p-1">
                      <button 
                        onClick={() => { setActiveTab('profile'); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-0 rounded transition font-bold text-gh-teal"
                      >
                        View Profile
                      </button>
                      <button 
                        onClick={() => { setActiveTab('personal'); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-0 rounded transition"
                      >
                        My Workspace
                      </button>
                      <button 
                        onClick={() => { setActiveRole('admin'); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-surface-0 rounded text-gh-red transition"
                      >
                        Audit Dashboard
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT SCREEN BODY */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* SIDEBAR: background #1E2D3D (220px or 56px collapsed on lg viewports) */}
        <aside 
          className={`hidden lg:flex flex-col shrink-0 bg-gh-ink2 border-r border-white/5 text-white/90 transition-all duration-300 ${
            sidebarCollapsed ? 'w-14' : 'w-56'
          }`}
        >
          {/* Collapse toggle row */}
          <div className="p-3 flex justify-between items-center border-b border-white/5">
            {!sidebarCollapsed && <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-white/30">Workspace Menu</span>}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 text-white/40 hover:text-white rounded hover:bg-white/5 ml-auto cursor-pointer"
            >
              <CaretRight size={14} className={`transform transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Primary Navigation Items */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {!sidebarCollapsed && (
              <p className="text-[9px] uppercase text-white/25 font-bold tracking-wider px-2 pb-1 pt-0.5">
                Navigate
              </p>
            )}
            {primaryNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-sans font-medium text-xs tracking-wide transition cursor-pointer ${
                    isActive 
                      ? 'bg-gh-teal/15 border-l-2 border-gh-teal text-gh-teal-light font-semibold' 
                      : 'text-white/65 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-gh-teal' : 'text-white/50'} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {item.id === 'live' && !sidebarCollapsed && (
                    <span className="ml-auto text-[8px] font-mono bg-gh-teal/20 text-gh-teal px-1.5 py-0.5 rounded-full font-bold">
                      LIVE
                    </span>
                  )}
                </button>
              );
            })}

            {/* Divider */}
            <div className="my-2 mx-2 border-t border-white/5" />

            {/* Utility Navigation Items */}
            {!sidebarCollapsed && (
              <p className="text-[9px] uppercase text-white/25 font-bold tracking-wider px-2 pb-1">
                Account
              </p>
            )}
            {utilityNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-sans font-medium text-xs tracking-wide transition cursor-pointer ${
                    isActive 
                      ? 'bg-gh-teal/15 border-l-2 border-gh-teal text-gh-teal-light font-semibold' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-gh-teal' : 'text-white/40'} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}

            {/* Sign Out Action */}
            <button
              onClick={() => showToast('Signed out. Redirecting...')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md font-sans font-medium text-xs text-red-400/80 hover:text-red-300 hover:bg-red-900/20 transition cursor-pointer mt-1"
            >
              <SignOut size={16} className="text-red-400/60" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </nav>

          {/* Active Status Badge in Sidebar Footer */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-white/5 bg-black/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gh-teal animate-pulse"></span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">Secure Node Online</span>
              </div>
              <div className="mt-2 text-[11px] font-sans text-white/50 leading-tight">
                Role: <strong className="text-gh-teal-light">{currentRoleLabel}</strong>
              </div>
            </div>
          )}
        </aside>

        {/* MOBILE DRAWER PORTAL */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileDrawerOpen(false)}
                className="fixed inset-0 bg-black z-40 lg:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed top-0 bottom-0 left-0 w-64 bg-gh-ink2 text-white z-50 p-4 flex flex-col gap-4 lg:hidden overflow-y-auto"
              >
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="font-sans font-semibold text-sm">GitHustle</span>
                  <button onClick={() => setMobileDrawerOpen(false)} className="p-1 cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-white/30 font-bold tracking-wider px-2">Navigate</p>
                  {primaryNavItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id as typeof activeTab); setMobileDrawerOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-sans font-medium text-xs tracking-wide transition cursor-pointer ${
                          isActive 
                            ? 'bg-gh-teal/15 border-l-2 border-gh-teal text-gh-teal-light font-semibold' 
                            : 'text-white/65 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'text-gh-teal' : 'text-white/50'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  <div className="my-2 border-t border-white/10" />

                  <p className="text-[10px] uppercase text-white/30 font-bold tracking-wider px-2 pt-1">Account</p>
                  {utilityNavItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id as typeof activeTab); setMobileDrawerOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-sans font-medium text-xs tracking-wide transition cursor-pointer ${
                          isActive 
                            ? 'bg-gh-teal/15 border-l-2 border-gh-teal text-gh-teal-light font-semibold' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-gh-teal' : 'text-white/40'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => { showToast('Signed out. Redirecting...'); setMobileDrawerOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md font-sans font-medium text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 transition cursor-pointer mt-1"
                  >
                    <SignOut size={16} className="text-red-400/70" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Mobile Simulator switcher */}
                <div className="mt-auto pt-4 border-t border-white/10 space-y-2">
                  <p className="text-[10px] uppercase text-white/30 font-bold tracking-wider px-2">Simulation Role</p>
                  <div className="grid grid-cols-3 gap-1 bg-white/5 border border-white/10 p-1 rounded-md text-center text-[10px]">
                    <button 
                      onClick={() => { setActiveRole('freelancer'); setMobileDrawerOpen(false); }}
                      className={`py-1 rounded font-semibold cursor-pointer ${activeRole === 'freelancer' ? 'bg-gh-teal text-white' : 'text-white/60'}`}
                    >
                      Dev
                    </button>
                    <button 
                      onClick={() => { setActiveRole('client'); setMobileDrawerOpen(false); }}
                      className={`py-1 rounded font-semibold cursor-pointer ${activeRole === 'client' ? 'bg-gh-teal text-white' : 'text-white/60'}`}
                    >
                      Client
                    </button>
                    <button 
                      onClick={() => { setActiveRole('admin'); setMobileDrawerOpen(false); }}
                      className={`py-1 rounded font-semibold cursor-pointer ${activeRole === 'admin' ? 'bg-gh-teal text-white' : 'text-white/60'}`}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* 3. CORE COMPONENT WORKSPACE PAGE */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            
            {/* PAGE A: PUBLIC HUB & DOUBLE-SIDED FEED */}
            {activeTab === 'hub' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="hub-page"
                className="flex-1 flex flex-col min-h-0"
              >
                <RobustDiscoverFeed
                  jobs={jobs}
                  filteredJobs={filteredJobs}
                  selectedJobId={selectedJobId}
                  onSelectJob={setSelectedJobId}
                  onSubmitProposal={handleProposalSubmit}
                  isPostingJob={isPostingJob}
                  setIsPostingJob={setIsPostingJob}
                  onPostJobSubmit={handlePostJobSubmit}
                  searchText={searchText}
                  setSearchText={setSearchText}
                  budgetRange={budgetRange}
                  setBudgetRange={setBudgetRange}
                  experienceLevel={experienceLevel}
                  setExperienceLevel={setExperienceLevel}
                  budgetType={budgetType}
                  setBudgetType={setBudgetType}
                  selectedField={selectedField}
                  onSetField={handleSetField}
                  onResetFilters={handleResetFilters}
                  newJobTitle={newJobTitle}
                  setNewJobTitle={setNewJobTitle}
                  newJobDesc={newJobDesc}
                  setNewJobDesc={setNewJobDesc}
                  newJobBudget={newJobBudget}
                  setNewJobBudget={setNewJobBudget}
                  newJobType={newJobType}
                  setNewJobType={setNewJobType}
                  newJobSkills={newJobSkills}
                  setNewJobSkills={setNewJobSkills}
                  newJobExp={newJobExp}
                  setNewJobExp={setNewJobExp}
                />
              </motion.div>
            )}

            {/* PAGE B: CONVERSATION SPACE */}
            {activeTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="chat-page"
                className="flex-1 flex flex-col min-h-0"
              >
                {projects.length > 0 ? (
                  <ConversationSpace
                    projects={projects}
                    activeRole={activeRole === 'admin' ? 'freelancer' : activeRole}
                    onUpdateProject={(updated) => {
                      setProjects(projects.map(p => p.id === updated.id ? updated : p));
                    }}
                    showToast={showToast}
                  />
                ) : (
                  <div className="text-center py-24 bg-white rounded-xl border border-border flex flex-col items-center justify-center max-w-xl mx-auto p-6">
                    <div className="w-12 h-12 rounded-full bg-gh-teal-light flex items-center justify-center text-gh-teal mb-4">
                      <ChatTeardropText size={24} weight="bold" />
                    </div>
                    <span className="font-sans font-bold text-text-primary text-sm">No Active Escrow Channels</span>
                    <p className="text-xs text-text-secondary max-w-xs text-center mt-1.5 leading-relaxed">
                      Apply to a contract on the Public Hub or hire a registered freelancer to lock escrow and begin real-time communication.
                    </p>
                    <button
                      onClick={() => setActiveTab('hub')}
                      className="mt-5 text-xs font-semibold text-white bg-gh-teal hover:bg-gh-teal-hover px-4 py-2 rounded-md transition-all shadow-sm cursor-pointer"
                    >
                      Browse public hub
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* PAGE C: PERSONAL WORKSPACE (Notion Style) */}
            {activeTab === 'personal' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="personal-page"
                className="flex-1 flex flex-col min-h-0"
              >
                <PersonalSpace 
                  projects={projects} 
                  onUpdateProject={(updated) => {
                    setProjects(projects.map(p => p.id === updated.id ? updated : p));
                  }}
                  showToast={showToast}
                />
              </motion.div>
            )}

            {/* PAGE D: TRUST & SAFETY MEDIATION & ADMIN DESK */}
            {activeTab === 'admin' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="admin-page"
                className="flex-1 flex flex-col min-h-0"
              >
                <AdminDashboard
                  disputes={disputes}
                  projects={projects}
                  onResolveDispute={handleResolveDispute}
                />
              </motion.div>
            )}

            {/* PAGE E: PROFILE PAGE */}
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="profile-page"
                className="flex-1 flex flex-col min-h-0"
              >
                <ProfilePage
                  activeRole={activeRole}
                  projects={projects}
                  onBack={() => setActiveTab('hub')}
                  showToast={showToast}
                />
              </motion.div>
            )}

            {/* PAGE F: LIVE WORKSPACES */}
            {activeTab === 'live' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="live-page"
                className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8 bg-white border border-border rounded-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <Lightning size={30} className="text-gh-teal" weight="fill" />
                </div>
                <div>
                  <h2 className="font-sans font-extrabold text-xl text-text-primary mb-2">Live Workspaces</h2>
                  <p className="text-sm text-text-muted max-w-md leading-relaxed">
                    Jump directly into active collaborative workspaces in real-time. View live presence, shared architecture canvases, and concurrent editing sessions.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-text-muted bg-slate-50 border border-border px-3 py-1.5 rounded-full font-bold">
                  REAL-TIME DISCOVERY ENGINE ONLINE
                </span>
              </motion.div>
            )}

            {/* PAGE G: SAVED POSTS */}
            {activeTab === 'saved' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="saved-page"
                className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8 bg-white border border-border rounded-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <BookmarkSimple size={30} className="text-amber-500" weight="fill" />
                </div>
                <div>
                  <h2 className="font-sans font-extrabold text-xl text-text-primary mb-2">Saved Posts</h2>
                  <p className="text-sm text-text-muted max-w-md leading-relaxed">
                    Bookmark contract opportunities, technical specs, and developer profiles for instant retrieval.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-text-muted bg-slate-50 border border-border px-3 py-1.5 rounded-full font-bold">
                  BOOKMARK VAULT READY
                </span>
              </motion.div>
            )}

            {/* PAGE H: PREMIUM */}
            {activeTab === 'premium' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="premium-page"
                className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8 bg-white border border-border rounded-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <CrownSimple size={30} className="text-purple-600" weight="fill" />
                </div>
                <div>
                  <h2 className="font-sans font-extrabold text-xl text-text-primary mb-2">GitHustle Pro Tier</h2>
                  <p className="text-sm text-text-muted max-w-md leading-relaxed">
                    Unlock zero escrow platform fees, verified auditor priority support, custom domain binding for diagrams, and unlimited workspace history.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-text-muted bg-slate-50 border border-border px-3 py-1.5 rounded-full font-bold">
                  PRO SUBSCRIPTION PORTAL
                </span>
              </motion.div>
            )}

            {/* PAGE I: HELP & SUPPORT */}
            {activeTab === 'help' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="help-page"
                className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8 bg-white border border-border rounded-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Question size={30} className="text-blue-600" weight="fill" />
                </div>
                <div>
                  <h2 className="font-sans font-extrabold text-xl text-text-primary mb-2">Help & Documentation</h2>
                  <p className="text-sm text-text-muted max-w-md leading-relaxed">
                    Explore dispute mediation guides, flowchart shortcut cheat sheets, contract escrow lifecycle documentation, and technical support ticketing.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-text-muted bg-slate-50 border border-border px-3 py-1.5 rounded-full font-bold">
                  KNOWLEDGE BASE & SUPPORT DESK
                </span>
              </motion.div>
            )}

            {/* PAGE J: SETTINGS */}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                key="settings-page"
                className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8 bg-white border border-border rounded-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <GearSix size={30} className="text-slate-600" weight="fill" />
                </div>
                <div>
                  <h2 className="font-sans font-extrabold text-xl text-text-primary mb-2">Account Settings</h2>
                  <p className="text-sm text-text-muted max-w-md leading-relaxed">
                    Configure webhooks, SSH keys, payout banking credentials, email alert thresholds, and security preferences.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-text-muted bg-slate-50 border border-border px-3 py-1.5 rounded-full font-bold">
                  SYSTEM PREFERENCES
                </span>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

      </div>

      {/* Floating toast notification banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-gh-ink text-white p-4 rounded-xl shadow-lg border border-white/10 flex items-start gap-3 max-w-sm"
          >
            <Sparkle size={20} weight="fill" className="text-gh-teal shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-sans font-bold text-xs block text-white">Ledger Gateway Broadcast</span>
              <p className="font-sans text-[11px] text-white/85 leading-normal">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
