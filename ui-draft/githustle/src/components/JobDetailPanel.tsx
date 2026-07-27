import React, { useState } from 'react';
import { Job, Milestone } from '../types';
import { Calendar, Clock, DollarSign, Star, Send, Shield, Sparkles, Check, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JobDetailPanelProps {
  key?: string | React.Key;
  job: Job;
  onSubmitProposal: (coverLetter: string, rate: number, weeks: number, milestones: Milestone[]) => void;
  onBackMobile?: () => void; // Mobile back button
}

export default function JobDetailPanel({ job, onSubmitProposal, onBackMobile }: JobDetailPanelProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedRate, setProposedRate] = useState(job.budget);
  const [timelineWeeks, setTimelineWeeks] = useState(4);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [customMilestones, setCustomMilestones] = useState<Milestone[]>([
    {
      id: 'm1',
      title: 'Milestone 1: Project kickoff and core setup',
      amount: Math.round(job.budget * 0.3),
      dueDate: '2026-08-10',
      status: 'pending',
      deliverableDesc: 'Technical specifications sheet, code repository structure, and database schema bootstrap.',
      submittedFile: null,
      submittedAt: null
    },
    {
      id: 'm2',
      title: 'Milestone 2: Feature development & API integration',
      amount: Math.round(job.budget * 0.7),
      dueDate: '2026-08-25',
      status: 'pending',
      deliverableDesc: 'Fully integrated payment hooks, e-wallet flows, and mobile responsive dashboard templates.',
      submittedFile: null,
      submittedAt: null
    }
  ]);

  const handleAddMilestone = () => {
    const nextId = `m_${Date.now()}`;
    const newMs: Milestone = {
      id: nextId,
      title: `Milestone ${customMilestones.length + 1}: Custom Deliverable`,
      amount: 10000,
      dueDate: '2026-08-30',
      status: 'pending',
      deliverableDesc: 'Provide high-quality working deliverables verified in staging environment.',
      submittedFile: null,
      submittedAt: null
    };
    setCustomMilestones([...customMilestones, newMs]);
  };

  const handleRemoveMilestone = (id: string) => {
    setCustomMilestones(customMilestones.filter(m => m.id !== id));
  };

  const handleMilestoneChange = (id: string, field: keyof Milestone, value: any) => {
    setCustomMilestones(
      customMilestones.map(m => m.id === id ? { ...m, [field]: value } : m)
    );
  };

  // Simulate AI proposal draft generation (using custom stream-like typing effect)
  const generateAIProposal = () => {
    setIsGeneratingAI(true);
    setCoverLetter('');
    
    const draftText = `Dear ${job.client.name},\n\nI reviewed your posting for a ${job.title} at ${job.client.company}. With deep experience in ${job.skills.slice(0, 3).join(', ')}, I can build a production-grade interface that scales effectively.\n\nFor SareSari or KargoPH type projects, I focus on:\n1. Strict input validation and secure API webhook signatures.\n2. Clean modular folder structures that ease maintenance.\n3. Fluid mobile-first responsive styling to ensure perfect cross-device visibility.\n\nI have structured my bid around ${customMilestones.length} milestones to tie funding strictly to clear, testable deliverables. I would love to connect to discuss details!\n\nBest regards,\nCarlo Mendoza`;

    let i = 0;
    const interval = setInterval(() => {
      if (i < draftText.length) {
        setCoverLetter(prev => prev + draftText.charAt(i));
        i += 4; // faster typewriter speed
      } else {
        clearInterval(interval);
        setIsGeneratingAI(false);
      }
    }, 15);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim()) return;
    onSubmitProposal(coverLetter, proposedRate, timelineWeeks, customMilestones);
    setIsApplying(false);
    // Reset state
    setCoverLetter('');
  };

  const formattedBudget = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(job.budget);

  return (
    <div className="h-full flex flex-col bg-[#080808] text-[#E5E5E5]">
      {/* Header */}
      <div className="p-6 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button 
              onClick={onBackMobile}
              className="md:hidden p-2 hover:bg-zinc-900 rounded-full text-zinc-500"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-semibold block">
              {job.client.company}
            </span>
            <h2 className="font-sans font-medium text-lg text-white tracking-tight mt-0.5">
              {job.title}
            </h2>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-base font-semibold text-white block">
            {formattedBudget}
          </span>
          <span className="font-mono text-[10px] text-zinc-500">
            {job.budgetType === 'fixed' ? 'Fixed Scope' : 'Hourly Budget'}
          </span>
        </div>
      </div>

      {/* Main Scroll Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <AnimatePresence mode="wait">
          {!isApplying ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              key="job-info"
              className="space-y-6"
            >
              {/* Job Info block */}
              <div>
                <h4 className="font-sans font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-2">
                  Job Description
                </h4>
                <p className="font-sans text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </div>

              {/* Skills required */}
              <div>
                <h4 className="font-sans font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-2.5">
                  Requirements &amp; Tech Stack
                </h4>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="font-mono text-[11px] font-medium px-2.5 py-1 bg-zinc-900 border border-subtle text-zinc-400 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                  <span className="font-mono text-[11px] font-medium px-2.5 py-1 bg-zinc-950 border border-zinc-850 text-zinc-300 rounded uppercase">
                    {job.experienceLevel} Level Required
                  </span>
                </div>
              </div>

              {/* Trust block */}
              <div className="p-4 bg-zinc-900/40 rounded-lg border border-subtle flex items-start gap-4">
                <Shield className="w-5 h-5 text-zinc-300 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-sans text-xs font-semibold text-white">
                    Milestone Safe Payments
                  </h5>
                  <p className="font-sans text-[11px] text-zinc-400 leading-relaxed">
                    This project uses GitHustle Safe-Escrow. Funds are deposited by the client per milestone and only released when you deliver verify-ready code.
                  </p>
                </div>
              </div>

              {/* Client specifications */}
              <div className="border-t border-subtle pt-6">
                <h4 className="font-sans font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-3">
                  About the Client
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 block">Client Representative</span>
                    <span className="font-sans text-xs font-medium text-zinc-200">{job.client.name}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 block">Verified Location</span>
                    <span className="font-sans text-xs font-medium text-zinc-200">{job.client.location}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 block">Client Satisfaction</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span className="font-mono text-xs font-semibold text-zinc-200">{job.client.rating}</span>
                      <span className="text-[10px] text-zinc-500">(24 Reviews)</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 block">Payments Verified</span>
                    <span className="font-sans text-xs font-medium text-zinc-300">Yes · BDO &amp; GCash Connected</span>
                  </div>
                </div>
              </div>

              {/* Project Action Panel */}
              <div className="border-t border-subtle pt-6">
                <button
                  onClick={() => setIsApplying(true)}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-sans text-xs font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-150 cursor-pointer shadow-sm hover:shadow"
                >
                  <Send className="w-4 h-4" />
                  <span>Pitch a Custom Proposal</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              key="apply-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Cover Letter Heading */}
              <div className="flex items-center justify-between">
                <h3 className="font-sans font-semibold text-sm text-white">
                  Your Proposal Pitch
                </h3>
                <button
                  type="button"
                  onClick={generateAIProposal}
                  disabled={isGeneratingAI}
                  className="font-sans text-xs text-zinc-300 hover:text-white font-semibold flex items-center gap-1.5 bg-zinc-900 border border-subtle hover:border-zinc-500 px-3 py-1.5 rounded-md transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isGeneratingAI ? 'Generating...' : 'AI Proposal Assistant'}</span>
                </button>
              </div>

              {/* Pitch editor */}
              <div>
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Cover Letter (Outline experience, stack, and local PH delivery timeline)
                </label>
                <textarea
                  required
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full min-h-[220px] font-sans text-xs text-zinc-100 bg-zinc-950/40 border border-subtle rounded-lg p-3 focus:outline-none focus:border-zinc-500 resize-y leading-relaxed"
                  placeholder="Explain why you are the perfect fit. Highlight experience with GCash, Maya, local DB performance, or mobile responsiveness."
                />
              </div>

              {/* Terms Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Bid Amount (PHP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-mono text-xs text-zinc-500">₱</span>
                    <input
                      type="number"
                      required
                      value={proposedRate}
                      onChange={(e) => setProposedRate(Number(e.target.value))}
                      className="w-full font-mono text-xs text-zinc-100 bg-zinc-950/40 border border-subtle rounded-lg py-2 pl-6 pr-3 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Delivery Timeline (Weeks)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={timelineWeeks}
                    onChange={(e) => setTimelineWeeks(Number(e.target.value))}
                    className="w-full font-mono text-xs text-zinc-100 bg-zinc-950/40 border border-subtle rounded-lg py-2 px-3 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Milestones proposer */}
              <div className="border-t border-subtle pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-sans font-semibold text-xs text-zinc-300 uppercase tracking-wider">
                      Proposed Project Milestones
                    </h4>
                    <p className="font-sans text-[11px] text-zinc-500">
                      Break down your pitch into deliverables. Total budget: ₱{proposedRate.toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="font-sans text-xs font-semibold text-zinc-300 flex items-center gap-1 hover:text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Phase</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {customMilestones.map((ms, index) => (
                    <div key={ms.id} className="p-4 bg-zinc-900/40 border border-subtle rounded-lg space-y-3 relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            required
                            value={ms.title}
                            onChange={(e) => handleMilestoneChange(ms.id, 'title', e.target.value)}
                            className="w-full font-sans text-xs font-medium text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-zinc-500 focus:outline-none py-0.5"
                            placeholder={`Milestone ${index + 1} Title`}
                          />
                        </div>
                        <div className="w-32 relative shrink-0">
                          <span className="absolute left-2.5 top-1.5 font-mono text-[11px] text-zinc-500">₱</span>
                          <input
                            type="number"
                            required
                            value={ms.amount}
                            onChange={(e) => handleMilestoneChange(ms.id, 'amount', Number(e.target.value))}
                            className="w-full font-mono text-xs text-zinc-100 bg-zinc-950/40 border border-subtle rounded px-2 pl-5 py-1 focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(ms.id)}
                          disabled={customMilestones.length <= 1}
                          className="text-zinc-500 hover:text-red-400 disabled:opacity-30 mt-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-zinc-500 font-mono block mb-0.5">Target Due Date</label>
                          <input
                            type="date"
                            required
                            value={ms.dueDate}
                            onChange={(e) => handleMilestoneChange(ms.id, 'dueDate', e.target.value)}
                            className="w-full font-mono text-[11px] text-zinc-300 border border-subtle bg-zinc-950/40 rounded px-2 py-1 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500 font-mono block mb-0.5">Deliverable description</label>
                          <input
                            type="text"
                            required
                            value={ms.deliverableDesc}
                            onChange={(e) => handleMilestoneChange(ms.id, 'deliverableDesc', e.target.value)}
                            className="w-full font-sans text-[11px] text-zinc-300 border border-subtle bg-zinc-950/40 rounded px-2 py-1 focus:outline-none"
                            placeholder="E.g., GitHub link, DB queries"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom buttons */}
              <div className="flex gap-3 border-t border-subtle pt-6">
                <button
                  type="button"
                  onClick={() => setIsApplying(false)}
                  className="flex-1 font-sans text-xs font-semibold text-zinc-400 hover:bg-zinc-900 border border-zinc-700 py-3 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 font-sans text-xs font-semibold text-black bg-white hover:bg-zinc-200 py-3 px-4 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Final Pitch</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
