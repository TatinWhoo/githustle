import React, { useState } from 'react';
import { Dispute, Project, AuditLogEntry } from '../types';
import { ShieldAlert, Check, RotateCcw, AlertTriangle, FileText, Send, UserCheck, MessageSquare } from 'lucide-react';

interface AdminDisputePanelProps {
  disputes: Dispute[];
  projects: Project[];
  onResolveDispute: (disputeId: string, resolution: 'release' | 'revision' | 'refund', adminNotes: string) => void;
}

export default function AdminDisputePanel({ disputes, projects, onResolveDispute }: AdminDisputePanelProps) {
  const [selectedDisputeId, setSelectedDisputeId] = useState<string>(disputes[0]?.id || '');
  const [adminNotes, setAdminNotes] = useState('');

  const activeDispute = disputes.find(d => d.id === selectedDisputeId);
  const activeProject = projects.find(p => p.id === activeDispute?.projectId);

  const handleAction = (resolution: 'release' | 'revision' | 'refund') => {
    if (!activeDispute) return;
    onResolveDispute(activeDispute.id, resolution, adminNotes);
    setAdminNotes('');
  };

  return (
    <div className="h-full flex flex-col bg-[#080808] text-[#E5E5E5]">
      {/* Top Admin Header */}
      <div className="px-6 py-4 border-b border-subtle bg-zinc-950/40 flex items-center justify-between">
        <div>
          <h2 className="font-sans font-semibold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>Trust &amp; Safety Disputes Mediation Queue</span>
          </h2>
          <p className="font-sans text-[11px] text-zinc-500 mt-0.5">
            Review escrow disputes, project conversation context, and logs to resolve billing claims.
          </p>
        </div>
        <span className="font-mono text-xs text-red-400 font-bold bg-red-950/40 border border-red-900/50 px-2.5 py-0.5 rounded">
          {disputes.length} Open Case{disputes.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Disputes Queue */}
        <div className="w-72 border-r border-subtle overflow-y-auto p-4 space-y-2 shrink-0 bg-[#080808]">
          <span className="text-[9px] font-mono font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Dispute Tickets
          </span>
          {disputes.map(disp => (
            <button
              key={disp.id}
              onClick={() => {
                setSelectedDisputeId(disp.id);
                setAdminNotes('');
              }}
              className={`w-full text-left p-3.5 rounded-lg border text-xs transition flex flex-col gap-1.5 ${
                selectedDisputeId === disp.id
                  ? 'border-red-900 bg-red-950/10 shadow-sm'
                  : 'border-subtle hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-mono font-bold text-[10px] text-red-400">DISP-{disp.id.slice(-3).toUpperCase()}</span>
                <span className="font-mono text-[10px] font-semibold text-white">₱{disp.amountDisputed.toLocaleString()}</span>
              </div>
              <h4 className="font-sans font-medium text-zinc-200 line-clamp-1">
                {disp.projectTitle}
              </h4>
              <p className="text-[10px] text-zinc-500 line-clamp-2 leading-normal">
                {disp.reason}
              </p>
              <div className="flex justify-between items-center w-full pt-1.5 border-t border-subtle">
                <span className="text-[9px] text-zinc-500">Escrow Locked</span>
                <span className="font-mono text-[9px] text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded uppercase font-bold border border-red-900/30">
                  {disp.status}
                </span>
              </div>
            </button>
          ))}

          {disputes.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No active escrow disputes in queue
            </div>
          )}
        </div>

        {/* Right Side: Dispute Detail Workspace */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 bg-zinc-950/10">
          {activeDispute && activeProject ? (
            <>
              {/* Card Banner */}
              <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg flex gap-3.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-sans text-xs font-semibold text-white">
                    Escrow Dispute Review: {activeDispute.milestoneTitle}
                  </h4>
                  <p className="font-sans text-[11px] text-zinc-400 leading-relaxed">
                    Client <span className="font-semibold text-zinc-200">{activeDispute.clientName}</span> claims the deliverable is un-ready or overlaps on mobile viewport. Developer <span className="font-semibold text-zinc-200">{activeDispute.freelancerName}</span> maintains the code meets requirements, stating subsequent changes constitute unpaid scope.
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-xs font-mono text-zinc-500">
                    <span>Disputed Amount: <strong className="text-white">₱{activeDispute.amountDisputed.toLocaleString()}</strong></span>
                    <span>Opened: {new Date(activeDispute.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Grid of logs & chat side by side */}
              <div className="grid grid-cols-2 gap-6 min-h-0">
                {/* Conversations */}
                <div className="space-y-3">
                  <h4 className="font-sans font-semibold text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Project Message Context</span>
                  </h4>

                  <div className="p-4 bg-zinc-900/30 border border-subtle rounded-lg max-h-72 overflow-y-auto space-y-3">
                    {activeProject.messages.slice(-5).map(msg => (
                      <div key={msg.id} className="p-2.5 bg-zinc-950/60 rounded border border-zinc-900 text-xs">
                        <div className="flex justify-between text-[10px] text-zinc-500 font-semibold mb-1">
                          <span>{msg.senderName} ({msg.senderRole === 'client' ? 'Client' : 'Dev'})</span>
                          <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-zinc-300 leading-normal">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Trail */}
                <div className="space-y-3">
                  <h4 className="font-sans font-semibold text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Immutable Project Logs</span>
                  </h4>

                  <div className="p-4 bg-zinc-900/30 border border-subtle rounded-lg max-h-72 overflow-y-auto space-y-2.5 font-mono text-[10px]">
                    {activeProject.auditLogs.map(log => (
                      <div key={log.id} className="border-b border-subtle pb-2 last:border-0 last:pb-0 text-zinc-400">
                        <span className="text-[9px] text-zinc-600 block mb-0.5">{log.timestamp}</span>
                        <span className="text-white font-semibold">{log.actor}</span>{' '}
                        <span className="text-zinc-300 uppercase text-[8px] font-bold border border-zinc-800 px-1 py-0.5 rounded bg-zinc-900/50">{log.action}</span> - {log.details}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes area */}
              <div className="border-t border-subtle pt-5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Internal Administrative Mediation Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full min-h-[90px] font-sans text-xs text-zinc-100 bg-zinc-950/40 border border-subtle rounded-lg p-3 focus:outline-none focus:border-zinc-500"
                  placeholder="Record your audit observations. These notes are archived in the security ledger for compliance records."
                />
              </div>

              {/* Admin Actions Bar */}
              <div className="border-t border-subtle pt-5 flex justify-end gap-3">
                <button
                  onClick={() => handleAction('refund')}
                  className="font-sans text-xs font-semibold text-red-400 bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  Refund Client / Cancel Milestone
                </button>
                <button
                  onClick={() => handleAction('revision')}
                  className="font-sans text-xs font-semibold text-zinc-300 hover:bg-zinc-900 border border-subtle px-4 py-2.5 rounded-lg transition cursor-pointer"
                >
                  Request Deliverable Revision
                </button>
                <button
                  onClick={() => handleAction('release')}
                  className="font-sans text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-4 py-2.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Release Escrow to Freelancer</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-12">
              <ShieldAlert className="w-10 h-10 text-zinc-700 stroke-1 mb-2 animate-bounce" />
              <span className="text-xs">Select a dispute ticket to view technical scope and resolve the escrow claim.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
