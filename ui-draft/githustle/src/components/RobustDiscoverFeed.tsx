import React, { useState, useMemo, useEffect } from 'react';
import { Job, Milestone, FreelancerService } from '../types';
import { 
  Compass,
  SlidersHorizontal,
  MapPin,
  Calendar,
  Users,
  ShieldCheck,
  Warning,
  Sparkle,
  Check,
  CheckCircle,
  Plus,
  Trash,
  Clock,
  ArrowRight,
  Briefcase,
  User,
  Lightning,
  BookmarkSimple,
  MagnifyingGlass,
  CheckSquare,
  CaretRight,
  X,
  SealCheck,
  Handshake,
  Star,
  ArrowsCounterClockwise,
  PaperPlaneTilt,
  Cpu,
  Bookmark,
  FunnelSimple
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

interface RobustDiscoverFeedProps {
  jobs: Job[];
  filteredJobs: Job[];
  selectedJobId: string;
  onSelectJob: (id: string) => void;
  onSubmitProposal: (coverLetter: string, rate: number, weeks: number, milestones: Milestone[]) => void;
  isPostingJob: boolean;
  setIsPostingJob: (val: boolean) => void;
  onPostJobSubmit: (e: React.FormEvent) => void;
  // Filter bindings
  searchText: string;
  setSearchText: (val: string) => void;
  budgetRange: number;
  setBudgetRange: (val: number) => void;
  experienceLevel: string;
  setExperienceLevel: (val: string) => void;
  budgetType: string;
  setBudgetType: (val: string) => void;
  selectedField: string;
  onSetField: (field: string) => void;
  onResetFilters: () => void;
  // Form poster states
  newJobTitle: string;
  setNewJobTitle: (val: string) => void;
  newJobDesc: string;
  setNewJobDesc: (val: string) => void;
  newJobBudget: number;
  setNewJobBudget: (val: number) => void;
  newJobType: 'fixed' | 'hourly';
  setNewJobType: (val: 'fixed' | 'hourly') => void;
  newJobSkills: string;
  setNewJobSkills: (val: string) => void;
  newJobExp: 'entry' | 'mid' | 'senior';
  setNewJobExp: (val: 'entry' | 'mid' | 'senior') => void;
}

const FIELD_CATEGORIES = [
  { id: 'all', label: 'All Fields' },
  { id: 'Web Development', label: 'Web Dev' },
  { id: 'Mobile Development', label: 'Mobile Dev' },
  { id: 'Software Development', label: 'Software Dev' },
  { id: 'UI/UX Design', label: 'UI/UX Design' },
  { id: 'Graphic Design', label: 'Graphic Design' },
  { id: 'Data & Infrastructure', label: 'Data & Infra' },
  { id: 'AI / Machine Learning', label: 'AI / ML' },
  { id: 'DevOps', label: 'DevOps' },
  { id: 'Blockchain / Web3', label: 'Blockchain' },
  { id: 'QA & Testing', label: 'QA & Testing' },
];

export default function RobustDiscoverFeed({
  jobs,
  filteredJobs,
  selectedJobId,
  onSelectJob,
  onSubmitProposal,
  isPostingJob,
  setIsPostingJob,
  onPostJobSubmit,
  searchText,
  setSearchText,
  budgetRange,
  setBudgetRange,
  experienceLevel,
  setExperienceLevel,
  budgetType,
  setBudgetType,
  selectedField,
  onSetField,
  onResetFilters,
  newJobTitle,
  setNewJobTitle,
  newJobDesc,
  setNewJobDesc,
  newJobBudget,
  setNewJobBudget,
  newJobType,
  setNewJobType,
  newJobSkills,
  setNewJobSkills,
  newJobExp,
  setNewJobExp,
}: RobustDiscoverFeedProps) {
  
  // 1. Role / Board Switcher state persisted in localStorage
  const [activeBoard, setActiveBoard] = useState<'contracts' | 'services'>(() => {
    return (localStorage.getItem('feed_mode') as 'contracts' | 'services') || 'contracts';
  });

  // Handle feed switch & state reset
  const handleBoardSwitch = (board: 'contracts' | 'services') => {
    setActiveBoard(board);
    localStorage.setItem('feed_mode', board);
    onResetFilters();
    setCursor(1);
    setHasMore(true);
  };

  // 2. Pagination cursor simulation
  const [cursor, setCursor] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Proposal overlay modal state
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [proposalJob, setProposalJob] = useState<Job | null>(null);

  // Proposal Fields with validation
  const [coverLetter, setCoverLetter] = useState('');
  const [coverLetterTouched, setCoverLetterTouched] = useState(false);
  const [bidRate, setBidRate] = useState(50000);
  const [bidWeeks, setBidWeeks] = useState(4);
  const [timelineType, setTimelineType] = useState<'7' | '14' | '21' | '30' | '45' | '60' | 'custom'>('30');
  const [proposalMilestones, setProposalMilestones] = useState<Omit<Milestone, 'id' | 'submittedFile' | 'submittedAt'>[]>([
    { title: 'Technical Wireframes & Architecture Specs', amount: 15000, dueDate: '2026-08-01', status: 'pending', deliverableDesc: 'High fidelity UI outline with responsive parameters.' },
    { title: 'Core Functionality & Payment Webhooks', amount: 25000, dueDate: '2026-08-10', status: 'pending', deliverableDesc: 'GCash signature checking and ledger integration.' },
    { title: 'Staging Deployment & Final Handshake', amount: 10000, dueDate: '2026-08-15', status: 'pending', deliverableDesc: 'Comprehensive unit tests and database optimization.' }
  ]);

  // Saved Jobs state
  const [savedJobIds, setSavedJobIds] = useState<string[]>(['job_002']);

  // Applied job IDs tracking (to grey out)
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // 3. AI Drafting State and Rate Limiter
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [aiCounter, setAiCounter] = useState<number>(() => {
    return Number(localStorage.getItem('ai_request_count') || '0');
  });
  const [rateLimitActive, setRateLimitActive] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Synchronize timeline selector input to weeks
  useEffect(() => {
    if (timelineType !== 'custom') {
      const days = parseInt(timelineType, 10);
      setBidWeeks(Math.ceil(days / 7));
    }
  }, [timelineType]);

  // Rate Limiter countdown ticker
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && rateLimitActive) {
      setRateLimitActive(false);
      setAiCounter(0);
      localStorage.setItem('ai_request_count', '0');
    }
  }, [countdown, rateLimitActive]);



  // Freelancer Services offerings mock data
  const servicesList: FreelancerService[] = [
    {
      id: 'ser_1',
      title: 'GCash Webhooks & Secure API payment setup',
      description: 'I will write custom integration scripts for GCash and Maya webhooks. Includes full SHA256 signature verification and automated Postgres transaction ledger locking.',
      freelancerName: 'Carlo Mendoza',
      skills: ['GCash API', 'Node.js', 'PostgreSQL', 'Express'],
      field: 'Web Development',
      rate: 35000,
      experienceLevel: 'senior',
      deliveryDays: 7,
      rating: 4.9,
      completedJobs: 24
    },
    {
      id: 'ser_2',
      title: 'Composite Database Auditing & Query Tuner',
      description: 'Tuning slow SQL indexes on Cloud SQL to resolve peak hours performance issues. Deploying PgBouncer pooling systems and composite indices filters.',
      freelancerName: 'Isabelle Reyes',
      skills: ['PostgreSQL', 'Cloud SQL', 'PgBouncer', 'Queries'],
      field: 'Data & Infrastructure',
      rate: 1500,
      experienceLevel: 'senior',
      deliveryDays: 3,
      rating: 5.0,
      completedJobs: 41
    },
    {
      id: 'ser_3',
      title: 'Vue 3 + Tailwind Dashboard Layout Spec',
      description: 'High-performance customer portal interfaces matching pixel-perfect designs. Leverages Framer spring mechanics and zero layout shifts on mobile.',
      freelancerName: 'Renz Macaraeg',
      skills: ['Vue 3', 'Tailwind CSS', 'TypeScript', 'UI Design'],
      field: 'UI/UX Design',
      rate: 45000,
      experienceLevel: 'mid',
      deliveryDays: 10,
      rating: 4.8,
      completedJobs: 18
    }
  ];

  // Unique skills extracted across all available jobs
  const availableSkills = useMemo(() => {
    const list = jobs.flatMap(j => j.skills);
    return Array.from(new Set(list));
  }, [jobs]);

  const handleOpenProposalModal = (job: Job) => {
    setProposalJob(job);
    setBidRate(job.budget);
    setCoverLetter('');
    setCoverLetterTouched(false);
    setProposalModalOpen(true);
  };

  const submitProposalWrapper = () => {
    if (!proposalJob) return;
    if (coverLetter.length < 50 || coverLetter.length > 2000) {
      alert('Cover letter pitch must be between 50 and 2000 characters.');
      return;
    }

    setIsSubmittingProposal(true);

    // Simulate 1200ms network submission
    setTimeout(() => {
      const formattedMilestones: Milestone[] = proposalMilestones.map((ms, idx) => ({
        ...ms,
        id: `ms_proposed_${idx}_${Date.now()}`,
        submittedFile: null,
        submittedAt: null
      }));

      onSubmitProposal(coverLetter, bidRate, bidWeeks, formattedMilestones);
      setAppliedJobIds(prev => [...prev, proposalJob.id]);
      setIsSubmittingProposal(false);
      setProposalModalOpen(false);
    }, 1200);
  };

  // Optimistic Save with failure rollback (1 in 10 chance fails to satisfy spec)
  const toggleSaveJob = (id: string) => {
    const wasSaved = savedJobIds.includes(id);
    
    // Update immediately (Optimistic UI)
    if (wasSaved) {
      setSavedJobIds(prev => prev.filter(savedId => savedId !== id));
    } else {
      setSavedJobIds(prev => [...prev, id]);
    }

    // Simulate network API request response
    setTimeout(() => {
      // 10% chance to fail and rollback
      const isError = Math.random() < 0.12;
      if (isError) {
        // Rollback
        if (wasSaved) {
          setSavedJobIds(prev => [...prev, id]);
        } else {
          setSavedJobIds(prev => prev.filter(savedId => savedId !== id));
        }
        // Emit visual event trigger
        const audio = new Audio();
        audio.volume = 0.5;
        // Simple state alert in interface instead of direct prompt
        alert('Audit Gateway: Bookmark write failed due to connection handshake loss. Action reverted.');
      }
    }, 600);
  };

  // Simulated Load More Pagination
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setCursor(prev => prev + 1);
      setIsLoadingMore(false);
      if (cursor >= 3) {
        setHasMore(false);
      }
    }, 1100);
  };

  // AI Stream generator simulation
  const handleAiDraft = () => {
    if (rateLimitActive) {
      alert(`AI limit reached. Please wait ${countdown}s for API lease renewal.`);
      return;
    }

    const currentCount = aiCounter + 1;
    setAiCounter(currentCount);
    localStorage.setItem('ai_request_count', currentCount.toString());

    if (currentCount === 9) {
      alert('SLA Tracer Warning: You have exactly 1 AI request remaining this minute.');
    } else if (currentCount >= 10) {
      setRateLimitActive(true);
      setCountdown(47); // 47s countdown
      alert('API Rate Limiter: You have hit the AI limit of 10 requests per minute. Custom tokens frozen.');
      return;
    }

    setIsAiStreaming(true);
    setCoverLetter('');
    setCoverLetterTouched(true);

    const fullResponse = `Dear ${proposalJob?.client.name || 'Client'},\n\nI am writing to propose a secure, production-grade integration for your project. As an experienced full-stack engineer, I specialize in implementing absolute viewport stability, custom Webhook receivers (with SHA256 signature checking), and optimized Postgres connections on Cloud SQL.\n\nMy proposed architectural approach includes:\n- Building resilient Express API middleware with strict type safety.\n- Offloading CPU peaks on PostgreSQL utilizing composite index configurations and PgBouncer locks.\n- Creating a high-fidelity single-column mobile view fallback to guarantee zero layout shifts.\n\nI have configured three structured escrow milestone payouts linked to verified deliverables. Ready to begin work immediately under SuperAdmin oversight!`;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < fullResponse.length) {
        setCoverLetter(prev => prev + fullResponse.charAt(currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsAiStreaming(false);
      }
    }, 12);
  };

  // Character validation logic
  const isCoverLetterValid = coverLetter.length >= 50 && coverLetter.length <= 2000;

  return (
    <div className="flex-1 flex flex-col gap-6 min-h-0 text-text-primary">
      


      {/* A. HERO BAND (Teal to Snow, Left aligned, H1 weight, Role Toggles) */}
      <section className="bg-gradient-to-br from-gh-teal-light/20 via-surface-1 to-surface-0 border border-border p-6 md:p-8 rounded-2xl shadow-[0_1px_3px_rgba(15,25,35,0.04)] flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <h1 className="font-sans font-bold text-2xl md:text-3xl tracking-tight text-gh-ink">
              {activeBoard === 'contracts' ? 'Secure Escrow Contracts' : 'Verified Developer Talent'}
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              {activeBoard === 'contracts' 
                ? 'Browse high-stakes development jobs with automatic escrow locks, milestones protection, and superadmin mediation oversight.' 
                : 'Connect directly with certified software experts offering high-density technical solutions with verified escrow tracks.'}
            </p>
          </div>
          
          {/* Post needed service button */}
          <div className="flex items-center gap-3 shrink-0">
            {activeBoard === 'contracts' ? (
              <button
                onClick={() => setIsPostingJob(true)}
                className="text-xs font-semibold text-white bg-gh-teal hover:bg-gh-teal-hover px-4 py-2.5 rounded-md transition-all duration-200 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>Post Escrow Job</span>
              </button>
            ) : (
              <div className="text-[11px] font-mono bg-gh-teal-light text-gh-teal-hover px-3 py-1.5 rounded-md border border-gh-teal/10 font-bold flex items-center gap-1.5">
                <SealCheck size={14} weight="fill" />
                <span>Escrow Audited Services</span>
              </div>
            )}
          </div>
        </div>

        {/* Big Search Autocomplete Bar (48px tall) */}
        <div className="relative max-w-2xl w-full">
          <div className="relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by tech keywords (Laravel, Vue 3, PostgreSQL, Google Maps...)"
              className="w-full text-xs font-sans pl-10 pr-24 py-3.5 bg-white border border-border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-gh-teal focus:border-gh-teal text-text-primary placeholder-text-muted"
            />
            <MagnifyingGlass size={18} className="text-text-muted absolute left-3.5 top-3.5" />
            
            <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
              <span className="hidden sm:inline font-mono text-[9px] text-text-muted bg-surface-0 border border-border px-1.5 py-0.5 rounded">
                ⌘ K
              </span>
            </div>
          </div>
        </div>

        {/* Dual Mode Switcher Toggles (Pill group) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBoardSwitch('contracts')}
              className={`font-sans text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                activeBoard === 'contracts' 
                  ? 'bg-gh-teal text-white shadow-sm' 
                  : 'bg-white hover:bg-surface-0 text-text-secondary border border-border'
              }`}
            >
              <Briefcase size={14} weight={activeBoard === 'contracts' ? 'bold' : 'regular'} />
              <span>Browse Contracts ({filteredJobs.length})</span>
            </button>
            
            <button
              onClick={() => handleBoardSwitch('services')}
              className={`font-sans text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                activeBoard === 'services' 
                  ? 'bg-gh-teal text-white shadow-sm' 
                  : 'bg-white hover:bg-surface-0 text-text-secondary border border-border'
              }`}
            >
              <Handshake size={14} weight={activeBoard === 'services' ? 'bold' : 'regular'} />
              <span>Browse Services ({servicesList.length})</span>
            </button>
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden flex items-center gap-1 px-3 py-2 bg-slate-50 border border-border rounded-lg text-xs font-bold text-text-secondary cursor-pointer hover:bg-slate-100 transition"
          >
            <FunnelSimple size={14} />
            <span>{showMobileFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {(experienceLevel !== 'all' || budgetType !== 'all' || selectedField !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-gh-teal" />
            )}
          </button>
        </div>
      </section>

      {/* B. MAIN SPLIT SEARCH FEED */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
        
        {/* Sticky Filter Panel */}
        <aside className={`${showMobileFilters ? 'block' : 'hidden'} md:block md:col-span-3 space-y-6 md:sticky md:top-20 h-fit bg-white p-5 rounded-xl border border-border`}>
          
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-sans font-semibold text-xs text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal size={14} weight="bold" />
              <span>Filters Ledger</span>
            </span>
            <button
              onClick={onResetFilters}
              className="text-[10px] font-mono text-gh-red hover:underline font-bold cursor-pointer"
            >
              Clear all
            </button>
          </div>

          {/* Experience level checkboxes */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase text-text-muted font-bold tracking-wider">Experience Track</p>
            <div className="space-y-1.5">
              {['entry', 'mid', 'senior'].map(lvl => (
                <label key={lvl} className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition">
                  <input
                    type="checkbox"
                    checked={experienceLevel === lvl}
                    onChange={() => setExperienceLevel(experienceLevel === lvl ? 'all' : lvl)}
                    className="rounded border-border text-gh-teal focus:ring-gh-teal"
                  />
                  <span className="capitalize">{lvl} Specialist</span>
                </label>
              ))}
            </div>
          </div>

          {/* Job Type Fixed vs Hourly */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase text-text-muted font-bold tracking-wider">Escrow Style</p>
            <div className="grid grid-cols-2 gap-1 bg-surface-0 p-1 rounded-md border border-border text-center text-[10px]">
              <button
                onClick={() => setBudgetType(budgetType === 'fixed' ? 'all' : 'fixed')}
                className={`py-1 rounded font-semibold cursor-pointer ${budgetType === 'fixed' ? 'bg-white text-gh-teal border border-border shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                Fixed Price
              </button>
              <button
                onClick={() => setBudgetType(budgetType === 'hourly' ? 'all' : 'hourly')}
                className={`py-1 rounded font-semibold cursor-pointer ${budgetType === 'hourly' ? 'bg-white text-gh-teal border border-border shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
              >
                Hourly Rate
              </button>
            </div>
          </div>

          {/* Field Filter */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase text-text-muted font-bold tracking-wider">
              Field Filter
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FIELD_CATEGORIES.map(cat => {
                const isActive = selectedField === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSetField(cat.id)}
                    className={`font-mono text-[9px] px-2 py-1 rounded transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-gh-teal-light text-gh-teal-hover border border-gh-teal/20 font-bold'
                        : 'bg-surface-0 border border-border text-text-secondary hover:bg-border/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget Range Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="uppercase text-text-muted font-bold tracking-wider">Max Budget Limit</span>
              <span className="text-gh-teal font-bold">₱{budgetRange.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={150000}
              step={2000}
              value={budgetRange}
              onChange={(e) => setBudgetRange(Number(e.target.value))}
              className="w-full accent-gh-teal h-1 bg-border rounded-lg cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-border text-[11px] text-text-muted leading-relaxed">
            Showing <strong className="text-text-primary font-mono">{activeBoard === 'contracts' ? filteredJobs.length : servicesList.length}</strong> listings.
          </div>

        </aside>

        {/* FEED AREA */}
        <section className="md:col-span-9 space-y-4">
          
          {selectedField !== 'all' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gh-teal-light border border-gh-teal/10 rounded text-[9px] font-mono text-gh-teal-hover mb-2">
              <FunnelSimple size={10} weight="fill" />
              Showing <strong>{filteredJobs.length}</strong> results in <strong>{selectedField}</strong>
              <button onClick={() => onSetField('all')} className="ml-auto hover:text-gh-teal underline cursor-pointer">Clear</button>
            </div>
          )}
          
          {activeBoard === 'contracts' ? (
            /* Browse Jobs mode */
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredJobs.slice(0, cursor * 2).map((job, idx) => {
                  const isFeatured = idx === 0; // First element layout variation
                  const isSaved = savedJobIds.includes(job.id);
                  const isApplied = appliedJobIds.includes(job.id);
                  
                  return (
                    <motion.article
                      key={job.id}
                      layoutId={`job-card-${job.id}`}
                      className={`bg-white border border-border rounded-xl p-5 hover:border-gh-teal hover:shadow-md transition-all duration-300 flex flex-col justify-between relative cursor-pointer ${
                        isFeatured ? 'lg:col-span-2 bg-gradient-to-r from-white via-white to-gh-teal-light/5' : ''
                      } ${isApplied ? 'opacity-65' : ''}`}
                    >
                      <div>
                        {/* Topmeta */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gh-ink/5 border border-border flex items-center justify-center font-bold text-[10px] text-gh-ink">
                              {job.client.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-sans font-semibold text-xs text-text-primary block leading-none">
                                {job.client.name}
                              </span>
                              <span className="font-mono text-[9px] text-text-muted block mt-0.5">
                                {job.client.company} · ⭐ {job.client.rating}
                              </span>
                            </div>
                          </div>

                          {isFeatured && (
                            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 bg-gh-amber-light text-gh-amber border border-gh-amber/20 rounded-full font-bold flex items-center gap-1">
                              <Lightning size={10} weight="fill" />
                              <span>Promoted Escrow</span>
                            </span>
                          )}
                        </div>

                        {/* Title & Budget */}
                        <div className="flex justify-between items-start gap-4 mt-1.5">
                          <div className="flex flex-col gap-1 items-start">
                            <h3 className="font-sans font-bold text-sm md:text-base text-gh-ink tracking-tight hover:text-gh-teal transition">
                              {job.title}
                            </h3>
                            {job.field && (
                              <span className="font-mono text-[8px] px-2 py-0.5 rounded-full bg-gh-teal/10 text-gh-teal-hover border border-gh-teal/15 font-semibold">
                                {job.field}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-sm md:text-base font-bold text-gh-teal block">
                              ₱{job.budget.toLocaleString()}
                            </span>
                            <span className="font-mono text-[9px] uppercase text-text-muted block mt-0.5 font-bold">
                              {job.budgetType === 'fixed' ? 'Fixed Price' : 'Hourly Rate'}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="font-sans text-xs text-text-secondary leading-relaxed mt-2.5 line-clamp-2">
                          {job.description}
                        </p>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {job.skills.map(skill => (
                            <span
                              key={skill}
                              className="font-mono text-[9px] font-medium px-2 py-0.5 bg-gh-blue-light text-gh-blue rounded border border-gh-blue/10"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-border text-[11px] text-text-muted">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-text-muted" />
                            <span>PH Staging</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-text-muted" />
                            <span>Due {job.deadline}</span>
                          </span>
                        </div>

                        {/* Bookmark & Apply */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveJob(job.id);
                            }}
                            className="p-2 rounded-md border border-border hover:bg-surface-0 transition cursor-pointer"
                            title="Save contract"
                          >
                            <BookmarkSimple 
                              size={14} 
                              weight={isSaved ? 'fill' : 'regular'} 
                              className={isSaved ? 'text-gh-teal' : 'text-text-secondary'} 
                            />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isApplied) return;
                              handleOpenProposalModal(job);
                            }}
                            disabled={isApplied}
                            className={`font-sans text-[10px] font-bold px-3.5 py-1.5 rounded-md transition duration-150 cursor-pointer flex items-center gap-1 shadow-sm ${
                              isApplied 
                                ? 'bg-zinc-100 text-text-muted border border-border cursor-not-allowed' 
                                : 'text-white bg-gh-teal hover:bg-gh-teal-hover'
                            }`}
                          >
                            <span>{isApplied ? 'Applied' : 'Bid Proposal'}</span>
                            {!isApplied && <ArrowRight size={10} weight="bold" />}
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>

              {/* Skeletons on pagination loading */}
              {isLoadingMore && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 animate-pulse">
                  {[1, 2].map(i => (
                    <div key={i} className="bg-white border border-border rounded-xl p-5 h-[190px] flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                          <div className="h-3 bg-slate-200 rounded w-24"></div>
                        </div>
                        <div className="h-4 bg-slate-200 rounded w-3/4 mt-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-full mt-2"></div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-border">
                        <div className="h-3 bg-slate-200 rounded w-20"></div>
                        <div className="h-6 bg-slate-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Load More Trigger */}
              {filteredJobs.length > 0 && (
                <div className="text-center pt-4">
                  {hasMore ? (
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-5 py-2.5 bg-white border border-border text-xs font-semibold text-gh-ink rounded-lg shadow-sm hover:bg-surface-0 transition flex items-center gap-2 mx-auto cursor-pointer"
                    >
                      <ArrowsCounterClockwise size={14} className={isLoadingMore ? 'animate-spin' : ''} />
                      <span>{isLoadingMore ? 'Refetching indices...' : 'Load more contracts'}</span>
                    </button>
                  ) : (
                    <div className="py-6 text-center border-t border-dashed border-border mt-4">
                      <CheckCircle size={20} className="text-gh-teal mx-auto mb-1.5" />
                      <p className="font-sans text-xs text-text-muted">You've seen all contracts. Ledger fully up to date.</p>
                    </div>
                  )}
                </div>
              )}

              {filteredJobs.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border border-border p-6 flex flex-col items-center justify-center">
                  <Briefcase size={48} className="text-border mb-3" />
                  <span className="font-sans font-bold text-text-primary text-sm">No Jobs Match Filters</span>
                  <p className="text-xs text-text-secondary max-w-xs text-center mt-1 leading-relaxed">
                    We couldn't find any contract corresponding to your strict parameters. Try clearing the search string or reset sliders.
                  </p>
                  <button
                    onClick={onResetFilters}
                    className="mt-4 text-xs font-semibold text-gh-teal hover:underline cursor-pointer"
                  >
                    Clear Filter Ledger
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Browse Services mode */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {servicesList.map(service => (
                <article
                  key={service.id}
                  className="bg-white border border-border rounded-xl p-5 hover:border-gh-teal hover:shadow-[0_4px_20px_rgba(15,118,110,0.03)] transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Expert info */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gh-teal-light text-gh-teal flex items-center justify-center font-bold text-xs border border-gh-teal/10 font-mono">
                          {service.freelancerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-sans font-bold text-xs text-gh-ink block">
                            {service.freelancerName}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-gh-amber font-mono font-semibold">
                            <Star size={10} weight="fill" />
                            <span>{service.rating} ({service.completedJobs} complete)</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-gh-teal bg-gh-teal-light border border-gh-teal/10 p-1 rounded-full text-xs" title="Verified Escrow Expert">
                        <SealCheck size={14} weight="fill" />
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h4 className="font-sans font-bold text-xs md:text-sm text-gh-ink tracking-tight leading-snug mt-2 line-clamp-1">
                      {service.title}
                    </h4>
                    <p className="font-sans text-[11px] text-text-secondary leading-relaxed mt-2 line-clamp-3">
                      {service.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {service.skills.map(s => (
                        <span key={s} className="font-mono text-[8px] bg-surface-0 border border-border text-text-secondary px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Foot actions */}
                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-border">
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted block font-bold leading-none">Deliver Rate</span>
                      <span className="font-mono text-sm font-bold text-gh-teal block mt-1">
                        ₱{service.rate.toLocaleString()}
                        {service.id === 'ser_2' && <span className="text-[10px] text-text-secondary">/hr</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => alert(`Escrow Direct Offer triggered for service ${service.title}`)}
                        className="font-sans text-[10px] font-semibold text-white bg-gh-teal hover:bg-gh-teal-hover px-3.5 py-1.5 rounded-md transition shadow-sm cursor-pointer"
                      >
                        Hire Expert
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

        </section>

      </div>

      {/* C. POP-UP CLIENT JOB POSTING DIALOG */}
      <AnimatePresence>
        {isPostingJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPostingJob(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-10 max-w-xl w-full bg-white border border-border p-6 rounded-xl shadow-xl z-50 font-sans max-h-[85vh] overflow-y-auto text-xs"
            >
              
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2 text-gh-teal">
                  <Handshake size={18} weight="fill" />
                  <span className="font-sans font-bold text-sm text-gh-ink uppercase tracking-wide">
                    Create Escrow Job Specification
                  </span>
                </div>
                <button onClick={() => setIsPostingJob(false)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={onPostJobSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-semibold text-text-primary">Contract Job Title</label>
                  <input
                    type="text"
                    required
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="e.g., Laravel API + Vue 3 Client Dashboard"
                    className="w-full font-sans px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal bg-surface-0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text-primary">Deliverable Scope & Security Mandate</label>
                  <textarea
                    rows={4}
                    required
                    value={newJobDesc}
                    onChange={(e) => setNewJobDesc(e.target.value)}
                    placeholder="Specify code requirements, secure webhook handling, signature checking, Postgres indexes, or PgBouncer rules. State what freelancers must build to get escrow released."
                    className="w-full font-sans px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal bg-surface-0 leading-relaxed resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-text-primary">Budget Type</label>
                    <select
                      value={newJobType}
                      onChange={(e) => setNewJobType(e.target.value as 'fixed' | 'hourly')}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none bg-white text-text-secondary"
                    >
                      <option value="fixed">Fixed Price Lock</option>
                      <option value="hourly">Hourly Billing</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-primary">Contract Budget (PHP)</label>
                    <input
                      type="number"
                      required
                      value={newJobBudget}
                      onChange={(e) => setNewJobBudget(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal bg-surface-0 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-text-primary">Required Tech Tags (Comma split)</label>
                    <input
                      type="text"
                      required
                      value={newJobSkills}
                      onChange={(e) => setNewJobSkills(e.target.value)}
                      placeholder="Laravel, Vue 3, PostgreSQL, Express"
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal bg-surface-0 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-text-primary">SLA Specialist Level</label>
                    <select
                      value={newJobExp}
                      onChange={(e) => setNewJobExp(e.target.value as 'entry' | 'mid' | 'senior')}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none bg-white text-text-secondary"
                    >
                      <option value="entry">Entry Developer</option>
                      <option value="mid">Mid Specialist</option>
                      <option value="senior">Senior Architect</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPostingJob(false)}
                    className="font-sans px-4 py-2 border border-border hover:bg-surface-0 rounded-md transition font-medium cursor-pointer"
                  >
                    Cancel Draft
                  </button>
                  <button
                    type="submit"
                    className="font-sans px-5 py-2 text-white bg-gh-teal hover:bg-gh-teal-hover rounded-md transition font-bold shadow-sm cursor-pointer"
                  >
                    Lock & Publish Escrow Contract
                  </button>
                </div>
              </form>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* D. INTERACTIVE PROPOSAL & MILESTONES SPECIFICATION OVERLAY */}
      <AnimatePresence>
        {proposalModalOpen && proposalJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setProposalModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 max-w-lg w-full bg-white border-l border-border shadow-2xl z-50 p-6 flex flex-col font-sans text-xs"
            >
              
              <div className="flex justify-between items-center pb-3.5 border-b border-border">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-gh-teal font-bold block">Bid Proposal Form</span>
                  <h3 className="font-sans font-bold text-sm text-gh-ink truncate max-w-sm mt-0.5">
                    {proposalJob.title}
                  </h3>
                </div>
                <button onClick={() => setProposalModalOpen(false)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable bid parameters */}
              <div className="flex-1 overflow-y-auto py-4 space-y-5">
                
                {/* Client spec summary info */}
                <div className="p-3.5 bg-surface-0 border border-border rounded-lg leading-relaxed text-text-secondary">
                  <span className="font-mono text-[8px] uppercase font-bold tracking-wider text-text-primary block mb-1">Contract Mandate</span>
                  {proposalJob.description}
                </div>

                {/* Cover Pitch text */}
                <div className="space-y-1.5 relative">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-text-primary block">Your Expert Pitch & Cover Letter</label>
                    
                    <button
                      type="button"
                      onClick={handleAiDraft}
                      disabled={isAiStreaming || rateLimitActive}
                      className="font-sans font-bold text-[9px] uppercase tracking-wide text-gh-teal bg-gh-teal-light hover:bg-gh-teal/20 px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition disabled:opacity-40"
                    >
                      <Sparkle size={10} weight="fill" className={isAiStreaming ? 'animate-spin' : ''} />
                      <span>{isAiStreaming ? 'Streaming...' : rateLimitActive ? `Rate Locked (${countdown}s)` : 'Draft with AI'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={coverLetter}
                    onChange={(e) => {
                      setCoverLetter(e.target.value);
                      setCoverLetterTouched(true);
                    }}
                    onBlur={() => setCoverLetterTouched(true)}
                    placeholder="Describe how your stack will comply with the specified escrow targets. Highlight previous custom webhook setups, Cloud SQL index tuning, or reactive UI frameworks..."
                    className={`w-full font-sans px-3 py-2 border rounded-md focus:outline-none transition leading-relaxed resize-none text-xs ${
                      isAiStreaming ? 'bg-teal-50 border-gh-teal shadow-inner animate-pulse' : 'bg-surface-0 border-border focus:border-gh-teal'
                    } ${coverLetterTouched && !isCoverLetterValid ? 'border-gh-red focus:border-gh-red' : ''}`}
                  />
                  
                  {/* Live Character Counter */}
                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <span className={coverLetterTouched && !isCoverLetterValid ? 'text-gh-red font-bold' : 'text-text-muted'}>
                      {coverLetterTouched && coverLetter.length < 50 && 'Requires minimum 50 characters.'}
                      {coverLetterTouched && coverLetter.length > 2000 && 'Maximum character count exceeded.'}
                    </span>
                    <span className="font-mono text-text-muted">
                      <strong className={isCoverLetterValid ? 'text-gh-teal' : 'text-gh-red'}>{coverLetter.length}</strong> / 2000 chars
                    </span>
                  </div>
                </div>

                {/* Cost & Timeline Parameters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-text-primary block">Proposed Milestone Sum (PHP)</label>
                    <input
                      type="number"
                      value={bidRate}
                      onChange={(e) => setBidRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal bg-surface-0 font-mono font-bold text-gh-teal"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="font-semibold text-text-primary block">Delivery Timeline</label>
                    <select
                      value={timelineType}
                      onChange={(e) => setTimelineType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:border-gh-teal bg-white text-text-secondary"
                    >
                      <option value="7">7 Days (Fast Track)</option>
                      <option value="14">14 Days (Standard)</option>
                      <option value="21">21 Days</option>
                      <option value="30">30 Days (1 Month)</option>
                      <option value="45">45 Days</option>
                      <option value="60">60 Days (2 Months)</option>
                      <option value="custom">Custom Week Range</option>
                    </select>

                    {timelineType === 'custom' && (
                      <input
                        type="number"
                        value={bidWeeks}
                        onChange={(e) => setBidWeeks(Number(e.target.value))}
                        placeholder="Weeks count..."
                        className="w-full mt-2 px-3 py-1.5 border border-border rounded-md focus:outline-none bg-surface-0 font-mono text-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Structured Milestones Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <label className="font-semibold text-text-primary">Escrow Release Milestones ({proposalMilestones.length})</label>
                    <button
                      type="button"
                      onClick={() => {
                        setProposalMilestones([...proposalMilestones, {
                          title: 'SLA Milestone Phase',
                          amount: 10000,
                          dueDate: '2026-08-20',
                          status: 'pending',
                          deliverableDesc: 'Describe the deliverables for this escrow milestone.'
                        }]);
                      }}
                      className="text-[10px] font-mono text-gh-teal hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} weight="bold" />
                      <span>Add Milestone</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-text-muted leading-relaxed font-sans">
                    Set up sequential escrow targets. Funds must be locked in the contract for each active phase, and are released only upon successful deliverables validation.
                  </p>

                  <div className="space-y-3 pt-1">
                    {proposalMilestones.map((milestone, idx) => (
                      <div key={idx} className="p-3 bg-surface-0 border border-border rounded-lg space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => setProposalMilestones(proposalMilestones.filter((_, i) => i !== idx))}
                          className="absolute right-2 top-2 text-text-muted hover:text-gh-red cursor-pointer"
                          title="Remove milestone"
                        >
                          <Trash size={12} />
                        </button>

                        <div className="grid grid-cols-12 gap-2 text-xs">
                          <div className="col-span-12">
                            <input
                              type="text"
                              value={milestone.title}
                              onChange={(e) => {
                                const list = [...proposalMilestones];
                                list[idx].title = e.target.value;
                                setProposalMilestones(list);
                              }}
                              className="w-full font-sans bg-transparent border-b border-border/60 hover:border-border focus:border-gh-teal focus:outline-none pb-0.5 font-semibold text-text-primary"
                              placeholder="Milestone phase title..."
                            />
                          </div>

                          <div className="col-span-6">
                            <span className="text-[9px] font-mono text-text-muted block uppercase font-bold">Fund amount</span>
                            <input
                              type="number"
                              value={milestone.amount}
                              onChange={(e) => {
                                const list = [...proposalMilestones];
                                list[idx].amount = Number(e.target.value);
                                setProposalMilestones(list);
                              }}
                              className="w-full font-mono bg-transparent focus:outline-none text-gh-teal font-bold mt-0.5"
                            />
                          </div>

                          <div className="col-span-6">
                            <span className="text-[9px] font-mono text-text-muted block uppercase font-bold">Target Date</span>
                            <input
                              type="date"
                              value={milestone.dueDate}
                              onChange={(e) => {
                                const list = [...proposalMilestones];
                                list[idx].dueDate = e.target.value;
                                setProposalMilestones(list);
                              }}
                              className="w-full font-mono bg-transparent focus:outline-none text-text-secondary mt-0.5"
                            />
                          </div>

                          <div className="col-span-12 mt-1">
                            <textarea
                              rows={2}
                              value={milestone.deliverableDesc}
                              onChange={(e) => {
                                const list = [...proposalMilestones];
                                list[idx].deliverableDesc = e.target.value;
                                setProposalMilestones(list);
                              }}
                              placeholder="Deliverable specifications..."
                              className="w-full font-sans text-[10px] bg-white border border-border rounded p-1 focus:outline-none leading-normal resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-gh-teal-light/20 border border-gh-teal/10 rounded-md text-right text-xs">
                    <span className="font-sans text-text-secondary mr-2">Sum of structured phases:</span>
                    <strong className="font-mono text-gh-teal">
                      ₱{proposalMilestones.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

              </div>

              {/* Sticky bottom CTA */}
              <div className="pt-4 border-t border-border flex justify-end gap-2.5">
                <button
                  onClick={() => setProposalModalOpen(false)}
                  className="font-sans px-4 py-2 border border-border hover:bg-surface-0 rounded-md font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitProposalWrapper}
                  disabled={!isCoverLetterValid || isSubmittingProposal || proposalMilestones.reduce((acc, curr) => acc + curr.amount, 0) === 0}
                  className="font-sans px-5 py-2 text-white bg-gh-teal hover:bg-gh-teal-hover rounded-md font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingProposal ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Publish Secure Bid & Proposal</span>
                  )}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
