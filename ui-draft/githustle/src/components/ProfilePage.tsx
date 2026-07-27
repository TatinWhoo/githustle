import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { 
  ArrowLeft, 
  PencilSimple, 
  Plus, 
  Trash, 
  Star, 
  SealCheck, 
  CreditCard, 
  IdentificationCard, 
  Briefcase, 
  Calendar, 
  MapPin, 
  Coin,
  CheckCircle,
  Clock,
  ShieldCheck
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfilePageProps {
  activeRole: 'freelancer' | 'client' | 'admin';
  projects: Project[];
  onBack: () => void;
  showToast: (msg: string) => void;
}

// Initial mock profile states
interface FreelancerProfile {
  name: string;
  tagline: string;
  location: string;
  hourlyRate: number;
  experience: 'Entry' | 'Mid' | 'Senior';
  bio: string;
  skills: string[];
  portfolio: Array<{ id: string; title: string; desc: string; amount: number; imageSeed: string }>;
}

interface ClientProfile {
  company: string;
  contactName: string;
  tagline: string;
  location: string;
  totalPaid: number;
  bio: string;
}

export default function ProfilePage({ 
  activeRole, 
  projects, 
  onBack, 
  showToast 
}: ProfilePageProps) {
  const isFreelancer = activeRole === 'freelancer' || activeRole === 'admin';

  // State for Freelancer Carlo Mendoza
  const [freelancerData, setFreelancerData] = useState<FreelancerProfile>({
    name: 'Carlo Mendoza',
    tagline: 'Full-Stack Developer & GCash Integration Expert',
    location: 'Quezon City, Metro Manila',
    hourlyRate: 1250,
    experience: 'Senior',
    bio: 'Building production-grade backends for Filipino startups since 2021. Specialized in GCash webhook microservices, digital wallet integrations, and high-concurrency cloud infrastructure.',
    skills: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'Redis', 'TypeScript', 'TailwindCSS'],
    portfolio: [
      { id: 'p1', title: 'E-Comm Gateway', desc: 'React + Custom Payment Portal', amount: 120000, imageSeed: 'portfolio1' },
      { id: 'p2', title: 'GCash Webhook SDK', desc: 'Reliable Node.js SDK for wallet webhooks', amount: 85000, imageSeed: 'portfolio2' },
      { id: 'p3', title: 'PH Cargo Logistics App', desc: 'Realtime mobile dispatcher console', amount: 250000, imageSeed: 'portfolio3' },
    ]
  });

  // State for Client Mia Santos / KargoPH Express
  const [clientData, setClientData] = useState<ClientProfile>({
    company: 'KargoPH Express',
    contactName: 'Mia Santos',
    tagline: 'Operations Head & Infrastructure Director',
    location: 'Makati City, Metro Manila',
    totalPaid: 2400000,
    bio: 'We build last-mile delivery infrastructure for small-to-medium Filipino e-commerce ventures. Looking for senior cloud architects and React UI specialists for ongoing logistics integrations.'
  });

  const [editMode, setEditMode] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [autoSaveState, setAutoSaveState] = useState<'Saved' | 'Saving...' | 'Unsaved Changes'>('Saved');

  // Local draft states during edit mode
  const [draftFree, setDraftFree] = useState<FreelancerProfile>({ ...freelancerData });
  const [draftClient, setDraftClient] = useState<ClientProfile>({ ...clientData });

  // Sync draft on enter edit mode
  useEffect(() => {
    if (editMode) {
      setDraftFree({ ...freelancerData });
      setDraftClient({ ...clientData });
      setAutoSaveState('Unsaved Changes');
    }
  }, [editMode]);

  const handleSave = () => {
    setAutoSaveState('Saving...');
    setTimeout(() => {
      if (isFreelancer) {
        setFreelancerData({ ...draftFree });
      } else {
        setClientData({ ...draftClient });
      }
      setAutoSaveState('Saved');
      setEditMode(false);
      showToast('Profile changes published securely.');
    }, 500);
  };

  const handleCancel = () => {
    setEditMode(false);
    setAutoSaveState('Saved');
  };

  // Add portfolio project
  const handleAddProject = () => {
    const id = `p_${Date.now()}`;
    const newProj = {
      id,
      title: 'New Project Entry',
      desc: 'Tech stack integration',
      amount: 45000,
      imageSeed: `seed_${id}`
    };
    setDraftFree(prev => ({
      ...prev,
      portfolio: [...prev.portfolio, newProj]
    }));
  };

  // Delete portfolio project
  const handleDeleteProject = (id: string) => {
    setDraftFree(prev => ({
      ...prev,
      portfolio: prev.portfolio.filter(p => p.id !== id)
    }));
  };

  return (
    <div className="flex-grow flex flex-col space-y-6 min-h-0 select-none pb-8 text-xs text-text-primary">
      {/* Top action bar with back button */}
      <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-border shrink-0 shadow-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-border hover:bg-slate-100 rounded-xl font-sans font-bold text-text-secondary cursor-pointer transition"
        >
          <ArrowLeft size={14} />
          <span>Go Back</span>
        </button>

        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {editMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-border bg-white hover:bg-slate-50 text-text-secondary font-sans font-bold rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-gh-teal hover:bg-gh-teal-hover text-white font-sans font-bold rounded-xl cursor-pointer transition shadow-sm"
                >
                  Publish Changes
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gh-teal hover:bg-gh-teal-hover text-white font-sans font-bold rounded-xl cursor-pointer transition shadow-sm"
              >
                <PencilSimple size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </AnimatePresence>

          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-text-muted bg-slate-50 px-2.5 py-1.5 rounded-lg border border-border">
            <span className={`w-1.5 h-1.5 rounded-full ${autoSaveState === 'Saving...' ? 'bg-gh-amber animate-ping' : 'bg-gh-teal'}`} />
            <span className="uppercase font-bold">{autoSaveState}</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-1">
        {/* Asymmetric Profile Banner Shell (Geist headers, dark sleek band) */}
        <div className="bg-gradient-to-br from-gh-ink to-gh-ink2 text-white rounded-2xl p-6 md:p-8 shadow-elevated relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gh-teal/10 rounded-full blur-3xl" />
          
          <div className="flex flex-col md:flex-row items-center gap-6 z-10 text-center md:text-left">
            {/* Avatar / Brand Logo */}
            <div className="relative shrink-0">
              <img
                src={isFreelancer 
                  ? `https://ui-avatars.com/api/?name=Carlo+Mendoza&background=0D9488&color=fff&size=96`
                  : `https://ui-avatars.com/api/?name=KargoPH+Express&background=1E2D3D&color=fff&size=96`
                }
                alt="Profile Avatar"
                referrerPolicy="no-referrer"
                className={`w-24 h-24 border-4 border-white/10 shrink-0 ${isFreelancer ? 'rounded-full' : 'rounded-2xl'}`}
              />
              {isFreelancer && (
                <span className="absolute -bottom-1 -right-1 bg-gh-amber text-gh-ink text-[8px] font-sans font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tight shadow-md border border-gh-amber">
                  PRO
                </span>
              )}
            </div>

            {/* Profile Core Header */}
            <div className="space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                <h2 className="font-sans font-bold text-2xl tracking-tighter text-white">
                  {isFreelancer ? freelancerData.name : clientData.company}
                </h2>
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="bg-gh-teal/20 text-gh-teal-light text-[9px] font-sans font-bold px-2 py-0.5 rounded-full border border-gh-teal/25 flex items-center gap-1">
                    <SealCheck size={10} className="text-gh-teal" />
                    <span>{isFreelancer ? 'Verified Expert' : 'Verified Business Payer'}</span>
                  </span>
                </div>
              </div>

              {editMode ? (
                <div className="space-y-2 max-w-lg">
                  <input
                    type="text"
                    value={isFreelancer ? draftFree.tagline : draftClient.tagline}
                    onChange={(e) => isFreelancer 
                      ? setDraftFree({ ...draftFree, tagline: e.target.value })
                      : setDraftClient({ ...draftClient, tagline: e.target.value })
                    }
                    className="w-full h-8 bg-white/5 border border-white/10 rounded px-2.5 text-white font-sans text-xs outline-none focus:border-gh-teal/50"
                    placeholder="Professional tagline..."
                  />
                  <input
                    type="text"
                    value={isFreelancer ? draftFree.location : draftClient.location}
                    onChange={(e) => isFreelancer 
                      ? setDraftFree({ ...draftFree, location: e.target.value })
                      : setDraftClient({ ...draftClient, location: e.target.value })
                    }
                    className="w-full h-8 bg-white/5 border border-white/10 rounded px-2.5 text-white font-sans text-xs outline-none focus:border-gh-teal/50"
                    placeholder="Location details..."
                  />
                </div>
              ) : (
                <div className="space-y-1 text-white/80 font-sans text-xs">
                  <p className="font-semibold text-gh-teal-light text-sm">
                    {isFreelancer ? freelancerData.tagline : clientData.tagline}
                  </p>
                  <p className="flex items-center gap-1.5 justify-center md:justify-start">
                    <MapPin size={12} className="text-gh-teal-light" />
                    <span>{isFreelancer ? freelancerData.location : clientData.location}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Badge Banner (Right Aligned) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0 text-center md:text-right font-sans z-10 self-stretch md:self-auto flex md:flex-col justify-around md:justify-center gap-2">
            <div>
              <span className="text-white/60 block uppercase tracking-wider text-[8px] font-bold">
                {isFreelancer ? 'Success Rate' : 'Payer Rating'}
              </span>
              <span className="font-mono font-bold text-base text-gh-teal-light">
                {isFreelancer ? '93.4%' : '4.8 / 5.0'}
              </span>
            </div>
            <div className="border-l md:border-l-0 md:border-t border-white/10 pt-0 md:pt-2 pl-4 md:pl-0">
              <span className="text-white/60 block uppercase tracking-wider text-[8px] font-bold">
                {isFreelancer ? 'Completed Contracts' : 'Total Spent'}
              </span>
              <span className="font-mono font-bold text-base text-white">
                {isFreelancer ? '47 jobs' : '₱2.4M'}
              </span>
            </div>
          </div>
        </div>

        {/* Bento Stats Row (4-Cell grid) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-border rounded-2xl p-5 text-center shadow-card space-y-1">
            <span className="text-[9px] text-text-muted uppercase tracking-wider font-sans font-bold">
              {isFreelancer ? 'Hourly Pricing' : 'Linked GCash Payer'}
            </span>
            <p className="font-mono font-bold text-xl text-text-primary">
              {isFreelancer ? `₱${freelancerData.hourlyRate.toLocaleString()}` : 'Verified'}
            </p>
            <p className="text-[10px] text-text-secondary">
              {isFreelancer ? 'Standard Senior rate' : 'Automatic disbursement'}
            </p>
          </div>

          <div className="bg-white border border-border rounded-2xl p-5 text-center shadow-card space-y-1">
            <span className="text-[9px] text-text-muted uppercase tracking-wider font-sans font-bold">
              {isFreelancer ? 'Experience Level' : 'Ongoing Escrows'}
            </span>
            <p className="font-sans font-bold text-xl text-text-primary">
              {isFreelancer ? freelancerData.experience : '3 Projects'}
            </p>
            <p className="text-[10px] text-text-secondary">
              {isFreelancer ? '6+ Years active' : 'Secure escrow state'}
            </p>
          </div>

          <div className="bg-white border border-border rounded-2xl p-5 text-center shadow-card space-y-1">
            <span className="text-[9px] text-text-muted uppercase tracking-wider font-sans font-bold">
              Average Rating
            </span>
            <p className="font-sans font-bold text-xl text-text-primary flex items-center justify-center gap-1">
              <Star size={18} weight="fill" className="text-gh-amber" />
              <span>4.9</span>
            </p>
            <p className="text-[10px] text-text-secondary">
              Based on client history
            </p>
          </div>

          <div className="bg-white border border-border rounded-2xl p-5 text-center shadow-card space-y-1">
            <span className="text-[9px] text-text-muted uppercase tracking-wider font-sans font-bold">
              Platform Badges
            </span>
            <div className="flex items-center justify-center gap-1 pt-1">
              <span className="w-6 h-6 rounded-full bg-gh-teal/10 flex items-center justify-center border border-gh-teal/20" title="Email Verified">
                <CheckCircle size={14} className="text-gh-teal" />
              </span>
              <span className="w-6 h-6 rounded-full bg-gh-blue/10 flex items-center justify-center border border-gh-blue/20" title="Payment Verified">
                <CreditCard size={14} className="text-gh-blue" />
              </span>
              <span className="w-6 h-6 rounded-full bg-gh-green/10 flex items-center justify-center border border-gh-green/20" title="Identity Verified">
                <IdentificationCard size={14} className="text-gh-green" />
              </span>
            </div>
            <p className="text-[10px] text-text-secondary mt-1">
              Secure trust signals
            </p>
          </div>
        </div>

        {/* Bio Spec & Skills */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bio Description (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="font-sans font-bold text-sm text-gh-ink border-b border-slate-100 pb-2">
              Corporate / Personal Bio Biography
            </h3>
            
            {editMode ? (
              <div className="space-y-1">
                <textarea
                  rows={4}
                  maxLength={280}
                  value={isFreelancer ? draftFree.bio : draftClient.bio}
                  onChange={(e) => isFreelancer
                    ? setDraftFree({ ...draftFree, bio: e.target.value })
                    : setDraftClient({ ...draftClient, bio: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-border rounded-xl font-sans text-xs focus:ring-2 focus:ring-gh-teal outline-none transition"
                  placeholder="Tell clients about your work style, credentials..."
                />
                <div className="flex justify-end">
                  <span className="text-[10px] font-mono text-text-muted">
                    {((isFreelancer ? draftFree.bio : draftClient.bio) || '').length} / 280 characters
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-secondary leading-relaxed font-sans">
                {isFreelancer ? freelancerData.bio : clientData.bio}
              </p>
            )}

            {/* Verification Checklist */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <span className="text-[9px] uppercase tracking-wider font-sans font-extrabold text-text-muted block">
                GitHustle Direct Verification Indicators
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-border rounded-xl">
                  <CheckCircle size={16} className="text-gh-green shrink-0" />
                  <div>
                    <p className="font-sans font-bold text-[10px] text-text-primary">Email Authenticated</p>
                    <p className="text-[9px] text-text-muted">Direct institutional match</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-border rounded-xl">
                  <CreditCard size={16} className="text-gh-green shrink-0" />
                  <div>
                    <p className="font-sans font-bold text-[10px] text-text-primary">Disbursement Linked</p>
                    <p className="text-[9px] text-text-muted">Instant GCash endpoints</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-border rounded-xl">
                  <IdentificationCard size={16} className="text-gh-green shrink-0" />
                  <div>
                    <p className="font-sans font-bold text-[10px] text-text-primary">Identity Escrow Match</p>
                    <p className="text-[9px] text-text-muted">0 negative arbitration history</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Scope & Rates (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-border rounded-2xl p-6 shadow-card space-y-5">
            <div className="space-y-4">
              <h3 className="font-sans font-bold text-sm text-gh-ink border-b border-slate-100 pb-2">
                {isFreelancer ? 'Skills & Rates Matrix' : 'Company Overview'}
              </h3>

              {isFreelancer ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-text-muted block font-sans font-semibold text-[10px] uppercase tracking-wide mb-1.5">
                      Hourly Escrow Value
                    </span>
                    {editMode ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans font-bold text-text-muted text-xs">
                          ₱
                        </span>
                        <input
                          type="number"
                          value={draftFree.hourlyRate}
                          onChange={(e) => setDraftFree({ ...draftFree, hourlyRate: Number(e.target.value) })}
                          className="w-full h-10 pl-7 pr-3 bg-slate-50 border border-border rounded-xl font-mono text-xs focus:ring-2 focus:ring-gh-teal outline-none"
                        />
                      </div>
                    ) : (
                      <p className="font-mono font-bold text-lg text-gh-teal">
                        ₱{freelancerData.hourlyRate.toLocaleString()} / hr
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-text-muted block font-sans font-semibold text-[10px] uppercase tracking-wide mb-1.5">
                      Expertise Stack
                    </span>
                    
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50 border border-border rounded-xl">
                          {draftFree.skills.map(sk => (
                            <span 
                              key={sk} 
                              onClick={() => setDraftFree(prev => ({ ...prev, skills: prev.skills.filter(s => s !== sk) }))}
                              className="bg-white border border-border hover:bg-red-50 hover:text-gh-red text-text-primary px-2.5 py-1 rounded-full cursor-pointer font-sans font-semibold text-[10px] flex items-center gap-1 transition"
                            >
                              <span>{sk}</span>
                              <Trash size={10} className="text-text-muted hover:text-gh-red" />
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newSkill.trim()) {
                                setDraftFree(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
                                setNewSkill('');
                              }
                            }}
                            placeholder="Add tag (Press Enter)"
                            className="flex-1 h-9 px-2.5 bg-slate-50 border border-border rounded-xl font-sans text-xs focus:ring-2 focus:ring-gh-teal outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {freelancerData.skills.map((sk) => (
                          <span
                            key={sk}
                            className="bg-gh-teal-light text-gh-teal font-sans font-bold text-[10px] px-2.5 py-1 rounded-full border border-gh-teal/15"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 font-sans">
                  <div>
                    <span className="text-text-muted text-[10px] font-semibold uppercase tracking-wider block">
                      Representative Agent
                    </span>
                    <p className="font-bold text-xs text-text-primary">
                      {clientData.contactName}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px] font-semibold uppercase tracking-wider block">
                      Platform Trust Rating
                    </span>
                    <p className="font-bold text-xs text-gh-green flex items-center gap-1">
                      <ShieldCheck size={14} className="text-gh-green" />
                      <span>Verified Active Client (Zero Escrow Disputes)</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Section (Freelancer Only) */}
        {isFreelancer && (
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-sans font-bold text-sm text-gh-ink">
                Verified Technical Portfolio
              </h3>
              {editMode && (
                <button
                  onClick={handleAddProject}
                  className="px-3 py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white font-sans font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Plus size={12} />
                  <span>Add Project</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {((editMode ? draftFree.portfolio : freelancerData.portfolio) || []).map((p, idx) => (
                <div
                  key={p.id}
                  className="group bg-slate-50 border border-border rounded-xl p-4 relative overflow-hidden flex flex-col justify-between hover:border-gh-teal/30 hover:bg-white transition-all duration-200"
                >
                  <div className="space-y-2.5">
                    {/* Dummy image using Picsum */}
                    <img
                      src={`https://picsum.photos/seed/${p.imageSeed}/400/225`}
                      alt={p.title}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-video object-cover rounded-lg border border-border"
                    />
                    
                    {editMode ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={p.title}
                          onChange={(e) => {
                            const updated = draftFree.portfolio.map(item => item.id === p.id ? { ...item, title: e.target.value } : item);
                            setDraftFree({ ...draftFree, portfolio: updated });
                          }}
                          className="w-full h-8 bg-white border border-border rounded px-2 font-sans text-xs outline-none focus:ring-1 focus:ring-gh-teal"
                          placeholder="Project title..."
                        />
                        <input
                          type="text"
                          value={p.desc}
                          onChange={(e) => {
                            const updated = draftFree.portfolio.map(item => item.id === p.id ? { ...item, desc: e.target.value } : item);
                            setDraftFree({ ...draftFree, portfolio: updated });
                          }}
                          className="w-full h-8 bg-white border border-border rounded px-2 font-sans text-xs outline-none focus:ring-1 focus:ring-gh-teal"
                          placeholder="Tech stack..."
                        />
                        <input
                          type="number"
                          value={p.amount}
                          onChange={(e) => {
                            const updated = draftFree.portfolio.map(item => item.id === p.id ? { ...item, amount: Number(e.target.value) } : item);
                            setDraftFree({ ...draftFree, portfolio: updated });
                          }}
                          className="w-full h-8 bg-white border border-border rounded px-2 font-mono text-xs outline-none focus:ring-1 focus:ring-gh-teal"
                          placeholder="Contract value..."
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <h4 className="font-sans font-bold text-xs text-gh-ink">
                          {p.title}
                        </h4>
                        <p className="text-[10px] text-text-secondary">
                          {p.desc}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
                    <span className="font-mono font-semibold text-text-primary text-[10px]">
                      ₱{p.amount.toLocaleString()}
                    </span>
                    {editMode ? (
                      <button
                        onClick={() => handleDeleteProject(p.id)}
                        className="p-1 hover:bg-red-50 text-gh-red rounded transition cursor-pointer"
                        title="Remove project"
                      >
                        <Trash size={12} />
                      </button>
                    ) : (
                      <span className="text-[9px] uppercase tracking-wider font-sans font-bold text-gh-teal">
                        Escrow Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white border border-border rounded-2xl p-6 shadow-card space-y-4">
          <h3 className="font-sans font-bold text-sm text-gh-ink border-b border-slate-100 pb-2.5">
            Recent Client & Engineer Reviews
          </h3>

          <div className="space-y-4 divide-y divide-slate-100">
            <div className="pt-1 first:pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={12} weight="fill" className="text-gh-amber" />
                  ))}
                  <span className="font-sans font-bold text-[10px] text-text-primary ml-1.5">
                    Juan Reyes / TechStart PH
                  </span>
                </div>
                <span className="font-mono text-[9px] text-text-muted">Apr 2025</span>
              </div>
              <p className="text-xs text-text-secondary italic leading-relaxed pl-1.5 border-l-2 border-slate-200">
                "Carlo delivered beyond original specification. Super reliable on difficult GCash wallet microservices."
              </p>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <Star key={i} size={12} weight="fill" className="text-gh-amber" />
                  ))}
                  <Star size={12} weight="regular" className="text-slate-300" />
                  <span className="font-sans font-bold text-[10px] text-text-primary ml-1.5">
                    Mia Santos / KargoPH Express
                  </span>
                </div>
                <span className="font-mono text-[9px] text-text-muted">Feb 2025</span>
              </div>
              <p className="text-xs text-text-secondary italic leading-relaxed pl-1.5 border-l-2 border-slate-200">
                "Excellent infrastructure code quality. Slight delay on milestone delivery due to webhook API shifts."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
