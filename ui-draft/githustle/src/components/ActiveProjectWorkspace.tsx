import React, { useState, useRef, useEffect } from 'react';
import { Project, Milestone, Message, CollabDocument, BoardElement, StickyNote, AuditLogEntry } from '../types';
import { 
  FileText, MessageSquare, ClipboardList, PenTool, PhoneCall, 
  Send, Check, AlertCircle, FileUp, ShieldAlert, ChevronRight, 
  Activity, Save, Plus, Palette, RotateCcw, Camera, LogOut
} from 'lucide-react';
import { motion } from 'motion/react';

interface ActiveProjectWorkspaceProps {
  key?: string | React.Key;
  project: Project;
  userRole: 'client' | 'freelancer';
  onUpdateProject: (updated: Project) => void;
  onOpenDispute: (milestoneTitle: string, reason: string, amount: number) => void;
}

export default function ActiveProjectWorkspace({ 
  project, 
  userRole, 
  onUpdateProject, 
  onOpenDispute 
}: ActiveProjectWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'milestones' | 'chat' | 'docs' | 'board' | 'stickies' | 'call'>('milestones');
  
  // Chat state
  const [typedMessage, setTypedMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Document state
  const [selectedDocId, setSelectedDocId] = useState<string>(project.documents[0]?.id || '');
  const [docContent, setDocContent] = useState<string>(project.documents[0]?.content || '');
  
  // Board states
  const [boardElements, setBoardElements] = useState<BoardElement[]>(project.boardElements || []);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Sticky states
  const [stickies, setStickies] = useState<StickyNote[]>(project.stickyNotes || []);
  const [newStickyText, setNewStickyText] = useState('');
  const [stickyColor, setStickyColor] = useState('#fef3c7');

  // Voice/Whiteboard Call state
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [brushColor, setBrushColor] = useState('#0f766e');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Deliverable submission state
  const [submittingMsId, setSubmittingMsId] = useState<string | null>(null);
  const [submittedFile, setSubmittedFile] = useState('');
  const [submittedDesc, setSubmittedDesc] = useState('');

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [project.messages]);

  // Voice call timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  // Whiteboard Canvas Drawing Logic
  useEffect(() => {
    if (activeTab === 'call' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = brushColor;
      }
    }
  }, [activeTab, brushColor]);

  // Handle drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Add system logs helper
  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date().toISOString().split('T')[0]}`,
      actor: userRole === 'client' ? project.clientName : project.freelancerName,
      action,
      details
    };
    return [newLog, ...project.auditLogs];
  };

  // Deliverable submit handler
  const handleMilestoneSubmit = (milestoneId: string) => {
    if (!submittedFile) return;

    const updatedMilestones = project.milestones.map(ms => {
      if (ms.id === milestoneId) {
        return {
          ...ms,
          status: 'submitted' as const,
          submittedFile,
          submittedAt: new Date().toISOString(),
          deliverableDesc: submittedDesc || ms.deliverableDesc
        };
      }
      return ms;
    });

    const targetMs = project.milestones.find(m => m.id === milestoneId);
    const logs = addAuditLog(
      'Submitted Deliverable',
      `Submitted ${submittedFile} for ${targetMs?.title || 'milestone'}.`
    );

    const updatedProject: Project = {
      ...project,
      milestones: updatedMilestones,
      auditLogs: logs
    };

    onUpdateProject(updatedProject);
    setSubmittingMsId(null);
    setSubmittedFile('');
    setSubmittedDesc('');
  };

  // Client approvals/rejections
  const handleMilestoneReview = (milestoneId: string, action: 'approve' | 'reject', rejectReason?: string) => {
    const updatedMilestones = project.milestones.map(ms => {
      if (ms.id === milestoneId) {
        return {
          ...ms,
          status: action === 'approve' ? ('approved' as const) : ('pending' as const),
          submittedFile: action === 'approve' ? ms.submittedFile : null,
          submittedAt: action === 'approve' ? ms.submittedAt : null
        };
      }
      return ms;
    });

    const targetMs = project.milestones.find(m => m.id === milestoneId);
    let logs = [];
    
    if (action === 'approve') {
      logs = addAuditLog(
        'Approved Milestone',
        `Released escrow payment of ₱${targetMs?.amount.toLocaleString()} for ${targetMs?.title}.`
      );
    } else {
      logs = addAuditLog(
        'Rejected Milestone',
        `Requested revisions for ${targetMs?.title}. Reason: ${rejectReason || 'Layout mismatch.'}`
      );
    }

    // Check if project is completely approved
    const allApproved = updatedMilestones.every(ms => ms.status === 'approved');

    const updatedProject: Project = {
      ...project,
      milestones: updatedMilestones,
      status: allApproved ? ('completed' as const) : project.status,
      auditLogs: logs
    };

    onUpdateProject(updatedProject);
  };

  // Client opens dispute
  const handleMilestoneDispute = (ms: Milestone) => {
    onOpenDispute(
      ms.title,
      `Milestone submission rejected repeatedly. Delivery quality does not match specified designs for ${ms.title}.`,
      ms.amount
    );

    const updatedMilestones = project.milestones.map(m => {
      if (m.id === ms.id) {
        return { ...m, status: 'rejected' as const };
      }
      return m;
    });

    const logs = addAuditLog(
      'Opened Dispute',
      `Initiated platform mediation review for ${ms.title} (Value: ₱${ms.amount.toLocaleString()}).`
    );

    const updatedProject: Project = {
      ...project,
      status: 'disputed',
      milestones: updatedMilestones,
      auditLogs: logs
    };

    onUpdateProject(updatedProject);
  };

  // Send message handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      senderName: userRole === 'client' ? project.clientName : project.freelancerName,
      senderRole: userRole,
      text: typedMessage,
      timestamp: new Date().toISOString()
    };

    const updatedProject: Project = {
      ...project,
      messages: [...project.messages, newMsg]
    };

    onUpdateProject(updatedProject);
    setTypedMessage('');
  };

  // Collaborative document save
  const handleSaveDoc = () => {
    const updatedDocs = project.documents.map(doc => {
      if (doc.id === selectedDocId) {
        return {
          ...doc,
          content: docContent,
          updatedAt: new Date().toISOString(),
          updatedBy: userRole === 'client' ? project.clientName : project.freelancerName
        };
      }
      return doc;
    });

    const logs = addAuditLog(
      'Saved Document',
      `Updated spec sheet specifications for document: ${project.documents.find(d => d.id === selectedDocId)?.title || 'Scope'}.`
    );

    onUpdateProject({
      ...project,
      documents: updatedDocs,
      auditLogs: logs
    });
  };

  // Draggable Visual Board actions
  const handleAddBoardElement = (type: 'rectangle' | 'circle' | 'arrow') => {
    const newEl: BoardElement = {
      id: `el_${Date.now()}`,
      type,
      x: 100,
      y: 100,
      width: type === 'arrow' ? undefined : 120,
      height: type === 'arrow' ? undefined : 50,
      label: type === 'arrow' ? 'Arrow Connection' : 'New Component Node',
      color: type === 'circle' ? '#0f766e' : '#1e2d3d'
    };

    const updatedElements = [...boardElements, newEl];
    setBoardElements(updatedElements);
    
    onUpdateProject({
      ...project,
      boardElements: updatedElements
    });
  };

  const handleDragElement = (id: string, dx: number, dy: number) => {
    const updated = boardElements.map(el => {
      if (el.id === id) {
        return { ...el, x: Math.max(0, el.x + dx), y: Math.max(0, el.y + dy) };
      }
      return el;
    });
    setBoardElements(updated);
    onUpdateProject({
      ...project,
      boardElements: updated
    });
  };

  // Interactive Sticky note handler
  const handleAddSticky = () => {
    if (!newStickyText.trim()) return;
    const newSt: StickyNote = {
      id: `st_${Date.now()}`,
      text: newStickyText,
      color: stickyColor,
      x: 30 + Math.random() * 120,
      y: 40 + Math.random() * 100,
      isShared: true
    };

    const updated = [...stickies, newSt];
    setStickies(updated);
    setNewStickyText('');

    const logs = addAuditLog(
      'Pinned Sticky Note',
      `Added lightweight annotation: "${newSt.text.slice(0, 20)}..."`
    );

    onUpdateProject({
      ...project,
      stickyNotes: updated,
      auditLogs: logs
    });
  };

  const handleRemoveSticky = (id: string) => {
    const updated = stickies.filter(s => s.id !== id);
    setStickies(updated);
    onUpdateProject({
      ...project,
      stickyNotes: updated
    });
  };

  // Snapshot Whiteboard
  const handleSaveSnapshot = () => {
    if (!canvasRef.current) return;
    const snapshotUrl = 'whiteboard_snapshot_v' + (project.calls[0]?.whiteboardSnapshots.length + 1 || 1) + '.png';
    
    const logs = addAuditLog(
      'Saved Whiteboard Frame',
      `Captured collaborative drawing frame ${snapshotUrl} during discussion.`
    );

    onUpdateProject({
      ...project,
      auditLogs: logs
    });
  };

  const formatSecs = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-[#080808] text-[#E5E5E5]">
      {/* Upper bar: details about current workspace */}
      <div className="px-6 py-4 border-b border-subtle flex items-center justify-between bg-zinc-950/40">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-sans font-medium text-sm text-white">
              Workspace: {project.jobTitle}
            </h2>
            <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
              project.status === 'disputed' ? 'bg-red-950/40 text-red-400 border border-red-900/50' :
              project.status === 'completed' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-zinc-900 text-zinc-300 border border-subtle'
            }`}>
              {project.status}
            </span>
          </div>
          <span className="font-sans text-[11px] text-zinc-500 block mt-0.5">
            Client: {project.clientName} · Developer: {project.freelancerName}
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-zinc-500 block">Total Escrow Pool</span>
          <span className="font-mono text-sm font-semibold text-white">₱{project.totalBudget.toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-subtle px-6 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 transition shrink-0 ${
            activeTab === 'milestones' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Milestones</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 transition shrink-0 relative ${
            activeTab === 'chat' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Real-Time Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 transition shrink-0 ${
            activeTab === 'docs' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Specs &amp; Docs</span>
        </button>
        <button
          onClick={() => setActiveTab('board')}
          className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 transition shrink-0 ${
            activeTab === 'board' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Diagram Board</span>
        </button>
        <button
          onClick={() => setActiveTab('stickies')}
          className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 transition shrink-0 ${
            activeTab === 'stickies' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Sticky Notes</span>
        </button>
        <button
          onClick={() => setActiveTab('call')}
          className={`flex items-center gap-1.5 py-3 text-xs font-medium border-b-2 transition shrink-0 ${
            activeTab === 'call' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Whiteboard Call</span>
        </button>
      </div>

      {/* Main Tab Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-zinc-950/20">
        {/* MILESTONES TAB */}
        {activeTab === 'milestones' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <h3 className="font-sans font-semibold text-xs text-zinc-400 uppercase tracking-wider mb-2">
              Project Delivery Timeline
            </h3>

            <div className="space-y-4">
              {project.milestones.map((ms, index) => (
                <div 
                  key={ms.id} 
                  className={`p-5 bg-zinc-900/10 border rounded-xl transition duration-150 ${
                    ms.status === 'approved' ? 'border-emerald-950/60 shadow-sm' :
                    ms.status === 'submitted' ? 'border-amber-950/60 shadow' : 'border-subtle'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="font-mono text-[9px] uppercase font-semibold text-zinc-500">
                        Phase {index + 1}
                      </span>
                      <h4 className="font-sans font-medium text-sm text-white mt-0.5">
                        {ms.title}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-semibold text-white block">
                        ₱{ms.amount.toLocaleString()}
                      </span>
                      <span className={`inline-block font-mono text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mt-1 ${
                        ms.status === 'approved' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30' :
                        ms.status === 'submitted' ? 'bg-amber-950/30 text-amber-400 border border-amber-900/30 animate-pulse' :
                        'bg-zinc-900 text-zinc-400 border border-subtle'
                      }`}>
                        {ms.status === 'approved' ? 'Paid' : ms.status === 'submitted' ? 'Submitted' : 'Funded'}
                      </span>
                    </div>
                  </div>

                  <p className="font-sans text-xs text-zinc-400 mt-2.5 leading-relaxed">
                    {ms.deliverableDesc}
                  </p>

                  {/* Submission data logs */}
                  {ms.submittedFile && (
                    <div className="mt-4 p-3 bg-zinc-950/40 rounded border border-subtle flex items-center gap-3 text-xs">
                      <FileUp className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-mono font-medium text-zinc-200 block truncate">{ms.submittedFile}</span>
                        <span className="text-[10px] text-zinc-500 block">Submitted: {new Date(ms.submittedAt || '').toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions depending on role & status */}
                  <div className="mt-4 pt-3 border-t border-subtle/50 flex flex-wrap gap-2 items-center text-xs text-zinc-500">
                    <span className="font-mono text-[10px]">Due: {ms.dueDate}</span>

                    {/* Freelancer submissions */}
                    {userRole === 'freelancer' && ms.status === 'pending' && submittingMsId !== ms.id && (
                      <button
                        onClick={() => setSubmittingMsId(ms.id)}
                        className="ml-auto font-sans text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-3 py-1.5 rounded transition cursor-pointer"
                      >
                        Submit Deliverable
                      </button>
                    )}

                    {/* Submitting form expansion */}
                    {submittingMsId === ms.id && (
                      <div className="w-full mt-3 p-4 bg-zinc-900/40 border border-subtle rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-mono text-zinc-500 block mb-1 uppercase">Deliverable Filename</label>
                            <input 
                              type="text"
                              value={submittedFile}
                              onChange={(e) => setSubmittedFile(e.target.value)}
                              placeholder="e.g., repository_v1.tar.gz"
                              className="w-full text-xs font-mono border border-subtle rounded p-1.5 bg-zinc-950/40 text-white focus:outline-none focus:border-zinc-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-mono text-zinc-500 block mb-1 uppercase">Brief description</label>
                            <input 
                              type="text"
                              value={submittedDesc}
                              onChange={(e) => setSubmittedDesc(e.target.value)}
                              placeholder="Describe deliverables..."
                              className="w-full text-xs font-sans border border-subtle rounded p-1.5 bg-zinc-950/40 text-white focus:outline-none focus:border-zinc-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button 
                            onClick={() => setSubmittingMsId(null)}
                            className="font-sans text-xs px-2.5 py-1 text-zinc-400 hover:bg-zinc-900 rounded"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleMilestoneSubmit(ms.id)}
                            disabled={!submittedFile}
                            className="font-sans text-xs px-3 py-1 bg-white text-black hover:bg-zinc-200 rounded disabled:opacity-40 cursor-pointer font-semibold"
                          >
                            Confirm Upload
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Client approvals & reviews */}
                    {userRole === 'client' && ms.status === 'submitted' && (
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => handleMilestoneDispute(ms)}
                          className="font-sans text-xs font-semibold text-red-400 bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Escalate Dispute</span>
                        </button>
                        <button
                          onClick={() => handleMilestoneReview(ms.id, 'reject')}
                          className="font-sans text-xs font-semibold text-zinc-300 hover:bg-zinc-900 px-3 py-1.5 rounded transition border border-subtle cursor-pointer"
                        >
                          Request Revision
                        </button>
                        <button
                          onClick={() => handleMilestoneReview(ms.id, 'approve')}
                          className="font-sans text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve &amp; Pay</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REAL-TIME CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {project.messages.map((msg) => {
                const isMe = (userRole === 'client' && msg.senderRole === 'client') || 
                             (userRole === 'freelancer' && msg.senderRole === 'freelancer');
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3.5 rounded-xl border text-xs shadow-sm ${
                      isMe 
                        ? 'bg-zinc-900/80 border-subtle text-zinc-100 rounded-tr-none' 
                        : 'bg-zinc-950/60 border-zinc-900 text-zinc-300 rounded-tl-none'
                    }`}>
                      <div className="flex justify-between items-baseline gap-4 mb-1">
                        <span className="font-sans font-bold text-[10px] text-zinc-400">
                          {msg.senderName} ({msg.senderRole === 'client' ? 'Client' : 'Dev'})
                        </span>
                        <span className="font-mono text-[9px] text-zinc-500">
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line text-zinc-200">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Form inputs */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-subtle bg-[#080808] flex gap-2">
              <input
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder="Type your secure project message here... (Files can be uploaded in Milestones)"
                className="flex-1 text-xs font-sans px-4 py-2.5 border border-subtle rounded-lg focus:outline-none focus:border-zinc-500 bg-zinc-950/40 text-white"
              />
              <button 
                type="submit"
                className="bg-white hover:bg-zinc-200 text-black p-2.5 rounded-lg transition shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* SPECS & DOCS TAB */}
        {activeTab === 'docs' && (
          <div className="flex-1 flex min-h-0">
            {/* Sidebar with spec sheets */}
            <div className="w-48 bg-zinc-950/40 border-r border-subtle p-4 space-y-2 shrink-0">
              <span className="text-[9px] font-mono font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Documents</span>
              {project.documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setDocContent(doc.content);
                  }}
                  className={`w-full text-left p-2 rounded text-xs font-medium truncate flex items-center gap-1.5 transition ${
                    selectedDocId === doc.id ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-900/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{doc.title}</span>
                </button>
              ))}
            </div>

            {/* Document editor */}
            <div className="flex-1 flex flex-col bg-[#080808] p-6 min-h-0">
              {selectedDocId ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-subtle mb-4">
                    <div>
                      <h4 className="font-sans font-medium text-xs text-zinc-300 uppercase tracking-wider">
                        {project.documents.find(d => d.id === selectedDocId)?.title}
                      </h4>
                      <span className="text-[10px] text-zinc-500">
                        Last edited by {project.documents.find(d => d.id === selectedDocId)?.updatedBy} at {new Date(project.documents.find(d => d.id === selectedDocId)?.updatedAt || '').toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={handleSaveDoc}
                      className="font-sans text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-3 py-1.5 rounded flex items-center gap-1 transition cursor-pointer shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Draft</span>
                    </button>
                  </div>
                  <textarea
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    className="flex-1 w-full p-4 border border-subtle rounded-lg text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-500 resize-none leading-relaxed bg-zinc-950/40"
                    placeholder="Write project requirements, milestone specs, or scope updates..."
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                  <FileText className="w-8 h-8 stroke-1 mb-2 text-zinc-600" />
                  <span className="text-xs">No document selected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DIAGRAM BOARD TAB */}
        {activeTab === 'board' && (
          <div className="flex-1 flex flex-col bg-[#080808] min-h-0 p-4">
            <div className="pb-3 border-b border-subtle mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-sans font-medium text-xs text-zinc-300 uppercase tracking-wider">
                  Visual Architecture Board
                </h4>
                <p className="font-sans text-[11px] text-zinc-500">
                  Interactive scoping diagram synced in real-time. Use buttons below to construct nodes.
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleAddBoardElement('rectangle')}
                  className="font-sans text-xs px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded cursor-pointer border border-subtle"
                >
                  + Add Rectangle Node
                </button>
                <button
                  onClick={() => handleAddBoardElement('circle')}
                  className="font-sans text-xs px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded cursor-pointer border border-subtle"
                >
                  + Add Circle Gateway
                </button>
              </div>
            </div>

            {/* Interactive canvas board */}
            <div className="flex-1 bg-zinc-950 border border-subtle rounded-lg relative overflow-hidden min-h-0">
              {boardElements.map(el => (
                <div
                  key={el.id}
                  style={{ left: `${el.x}px`, top: `${el.y}px` }}
                  className={`absolute p-3 rounded shadow-sm border select-none transition-shadow ${
                    el.type === 'circle' ? 'rounded-full w-24 h-24 flex flex-col justify-center items-center text-center' : 'w-40'
                  } ${
                    selectedElementId === el.id ? 'ring-2 ring-white border-white bg-zinc-900' : 'border-subtle bg-zinc-950/80'
                  }`}
                  onClick={() => setSelectedElementId(el.id)}
                >
                  <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    {el.type}
                  </div>
                  <input
                    type="text"
                    value={el.label}
                    onChange={(e) => {
                      const updated = boardElements.map(x => x.id === el.id ? { ...x, label: e.target.value } : x);
                      setBoardElements(updated);
                      onUpdateProject({ ...project, boardElements: updated });
                    }}
                    className="w-full text-center text-xs font-sans font-medium text-white bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                  <div className="flex justify-between mt-2 select-none">
                    <button 
                      onClick={() => handleDragElement(el.id, -20, 0)}
                      className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 px-1"
                    >
                      Left
                    </button>
                    <button 
                      onClick={() => handleDragElement(el.id, 20, 0)}
                      className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 px-1"
                    >
                      Right
                    </button>
                    <button 
                      onClick={() => handleDragElement(el.id, 0, -20)}
                      className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 px-1"
                    >
                      Up
                    </button>
                    <button 
                      onClick={() => handleDragElement(el.id, 0, 20)}
                      className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 px-1"
                    >
                      Down
                    </button>
                  </div>
                </div>
              ))}

              {boardElements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs">
                  No visual design nodes placed yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* STICKY NOTES TAB */}
        {activeTab === 'stickies' && (
          <div className="flex-1 flex flex-col bg-[#080808] p-4 min-h-0">
            <div className="pb-3 border-b border-subtle mb-4 flex items-end justify-between">
              <div>
                <h4 className="font-sans font-medium text-xs text-white uppercase tracking-wider">
                  Shared Sticky Annotations
                </h4>
                <p className="font-sans text-[11px] text-zinc-500">
                  Pin quick ideas, parameters, or local e-wallet sandbox codes.
                </p>
              </div>

              {/* Add form */}
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={newStickyText}
                  onChange={(e) => setNewStickyText(e.target.value)}
                  placeholder="Note text..."
                  className="text-xs font-sans border border-subtle rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-500 bg-zinc-950/40 text-white w-48"
                />
                <select
                  value={stickyColor}
                  onChange={(e) => setStickyColor(e.target.value)}
                  className="text-xs font-sans border border-subtle rounded px-1.5 py-1.5 bg-zinc-950/40 text-zinc-300 focus:outline-none"
                >
                  <option value="#fef3c7">Amber</option>
                  <option value="#ccfbf1">Teal</option>
                  <option value="#f1f5f9">Gray</option>
                </select>
                <button
                  onClick={handleAddSticky}
                  className="bg-white text-black p-2 rounded hover:bg-zinc-200 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Grid of stickies */}
            <div className="flex-1 overflow-y-auto bg-zinc-950/40 p-4 border border-subtle rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {stickies.map(st => (
                  <div
                    key={st.id}
                    style={{ backgroundColor: st.color }}
                    className="p-4 rounded-lg shadow-sm border border-subtle relative group flex flex-col justify-between min-h-[100px]"
                  >
                    <p className="font-sans text-xs text-zinc-900 font-medium leading-relaxed break-words">{st.text}</p>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-zinc-200/50">
                      <span className="text-[9px] font-mono text-zinc-500">Annotation</span>
                      <button
                        onClick={() => handleRemoveSticky(st.id)}
                        className="text-[10px] text-zinc-600 hover:text-red-600 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {stickies.length === 0 && (
                  <div className="col-span-full py-12 text-center text-zinc-500 text-xs">
                    Pin your first project sticky note above
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WHITEBOARD CALL TAB */}
        {activeTab === 'call' && (
          <div className="flex-1 flex flex-col bg-zinc-950 text-white min-h-0 p-6 space-y-4">
            {/* Call Control Strip */}
            <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl border border-subtle">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${callActive ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`} />
                <div>
                  <h4 className="text-xs font-semibold">
                    {callActive ? `Active Call (${formatSecs(callDuration)})` : 'Collaboration Voice Channel'}
                  </h4>
                  <span className="text-[10px] text-zinc-500">
                    Joint interactive whiteboard session powered by WebRTC
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {!callActive ? (
                  <button
                    onClick={() => setCallActive(true)}
                    className="font-sans text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Join Call Session
                  </button>
                ) : (
                  <button
                    onClick={() => setCallActive(false)}
                    className="font-sans text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Leave Call
                  </button>
                )}
              </div>
            </div>

            {/* Drawing whiteboard */}
            <div className="flex-1 flex gap-4 min-h-0">
              {/* Controls bar */}
              <div className="w-16 bg-zinc-900 rounded-xl border border-subtle p-3 flex flex-col items-center gap-4 shrink-0 justify-between py-6">
                <div className="flex flex-col items-center gap-3.5">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Colors</span>
                  <button
                    onClick={() => setBrushColor('#0f766e')}
                    className={`w-5 h-5 rounded-full bg-teal-600 border-2 ${brushColor === '#0f766e' ? 'border-white' : 'border-transparent'}`}
                  />
                  <button
                    onClick={() => setBrushColor('#dc2626')}
                    className={`w-5 h-5 rounded-full bg-red-600 border-2 ${brushColor === '#dc2626' ? 'border-white' : 'border-transparent'}`}
                  />
                  <button
                    onClick={() => setBrushColor('#d97706')}
                    className={`w-5 h-5 rounded-full bg-amber-500 border-2 ${brushColor === '#d97706' ? 'border-white' : 'border-transparent'}`}
                  />
                  <button
                    onClick={() => setBrushColor('#ffffff')}
                    className={`w-5 h-5 rounded-full bg-white border-2 ${brushColor === '#ffffff' ? 'border-white' : 'border-transparent'}`}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={clearCanvas} 
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300"
                    title="Clear All"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleSaveSnapshot} 
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-300"
                    title="Snapshot Whiteboard"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawing area */}
              <div className="flex-1 bg-zinc-900/40 border border-subtle rounded-xl overflow-hidden relative flex flex-col">
                <div className="p-2 bg-zinc-950 border-b border-subtle text-[10px] text-zinc-500 flex justify-between">
                  <span>Draw on whiteboard to visualize system layouts</span>
                  <span>Color: <span style={{ color: brushColor }}>{brushColor}</span></span>
                </div>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="flex-1 w-full bg-transparent cursor-crosshair"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side Audit Panel toggle */}
      <div className="px-6 py-3 border-t border-subtle bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-sans font-medium text-zinc-300">Project History Audit Trail</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-600 uppercase">Always-on security audit</span>
      </div>

      {/* Audit Log lines scroll */}
      <div className="h-28 overflow-y-auto bg-zinc-950/40 border-t border-subtle px-6 py-3 space-y-2 select-none">
        {project.auditLogs.map(log => (
          <div key={log.id} className="text-[11px] font-sans text-zinc-400 leading-relaxed flex gap-4">
            <span className="font-mono text-[10px] text-zinc-600 shrink-0 select-none">{log.timestamp}</span>
            <p className="flex-1">
              <span className="font-semibold text-zinc-300">{log.actor}</span>{' '}
              <span className="text-zinc-300 font-medium uppercase text-[9px] tracking-wider border border-zinc-800 px-1 py-0.5 rounded bg-zinc-900/50">{log.action}</span>{' '}
              <span className="text-zinc-500">{log.details}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
