import React from 'react';
import { Job } from '../types';
import { Calendar, Briefcase, DollarSign, MapPin, Users } from 'lucide-react';

interface JobCardProps {
  key?: string | React.Key;
  job: Job;
  isSelected: boolean;
  onSelect: () => void;
}

export default function JobCard({ job, isSelected, onSelect }: JobCardProps) {
  // Format currency with Philippine Peso symbol
  const formattedBudget = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(job.budget);

  return (
    <div
      onClick={onSelect}
      className={`p-5 cursor-pointer border-b border-subtle transition-all duration-200 hover:bg-zinc-900/30 ${
        isSelected ? 'bg-zinc-900/60 border-r-2 border-r-white' : ''
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            {job.client.company}
          </span>
          <h3 className={`font-sans font-medium text-sm tracking-tight mt-1 transition-colors ${
            isSelected ? 'text-white' : 'text-zinc-200'
          }`}>
            {job.title}
          </h3>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-sm font-semibold text-white block">
            {formattedBudget}
            {job.budgetType === 'hourly' && <span className="text-xs text-zinc-500"> / hr</span>}
          </span>
          <span className="font-mono text-[10px] text-zinc-500 block mt-1">
            {job.budgetType === 'fixed' ? 'Fixed Price' : 'Hourly Engagement'}
          </span>
        </div>
      </div>

      <p className="font-sans text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
        {job.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {job.skills.map((skill) => (
          <span
            key={skill}
            className="font-mono text-[10px] font-medium px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded border border-subtle"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-subtle text-[11px] text-zinc-500">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
          <span>{job.client.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span>Post: {job.postedDate}</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Users className="w-3.5 h-3.5 text-zinc-500" />
          <span>{job.proposalsCount} proposals</span>
        </div>
      </div>
    </div>
  );
}
