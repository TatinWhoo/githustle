import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, Message, Milestone } from '../types';
import { 
  ChatTeardropText,
  Paperclip,
  Image as ImageIcon,
  PaperPlaneTilt,
  Checks,
  Sparkle,
  Calendar,
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  Warning,
  FileText,
  Plus,
  Trash,
  X,
  FileArrowDown,
  ArrowRight,
  SealCheck,
  EnvelopeSimple,
  FolderOpen,
  Receipt,
  User,
  Checks as ChecksFilled,
  WarningOctagon,
  ArrowSquareDown,
  Notification,
  CloudArrowUp,
  Users,
  ShieldCheck,
  CaretDown,
  Kanban
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { mockSocket } from '../lib/socket';
import SharedWorkspaceView from './SharedWorkspaceView';
import PaymentInvoiceModal from './PaymentInvoiceModal';
import CustomDropdown from './CustomDropdown';

function getDateSeparatorLabel(timestamp: string): string {
  const msgDate = new Date(timestamp);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfThisWeek = new Date(startOfToday.getTime() - (now.getDay() * 86400000));

  const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
  const msgTime = msgDay.getTime();

  if (msgTime >= startOfToday.getTime()) return 'Today';
  if (msgTime >= startOfYesterday.getTime()) return 'Yesterday';
  if (msgTime >= startOfThisWeek.getTime()) {
    return msgDate.toLocaleDateString('en-PH', { weekday: 'long' }); // "Monday", "Tuesday", etc.
  }
  return msgDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function getConversationListTime(timestamp: string): string {
  const msgDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - msgDate.getTime();
  const diffHours = diffMs / 3600000;

  if (diffHours < 24) {
    return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // "2:45 PM"
  }
  if (diffHours < 48) return 'Yesterday';
  if (diffHours < 7 * 24) {
    return msgDate.toLocaleDateString('en-PH', { weekday: 'short' }); // "Mon", "Tue"
  }
  return msgDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); // "Jul 14"
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3 select-none">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider shrink-0 bg-surface-0 px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

interface ConversationSpaceProps {
  projects: Project[];
  activeRole: 'freelancer' | 'client';
  onUpdateProject: (updated: Project) => void;
  showToast: (msg: string) => void;
}

export default function ConversationSpace({
  projects,
  activeRole,
  onUpdateProject,
  showToast
}: ConversationSpaceProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [mobileActiveSubView, setMobileActiveSubView] = useState<'channels' | 'chat' | 'ledger'>('channels');
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [convSearchQuery, setConvSearchQuery] = useState('');

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadHash, setUploadHash] = useState('');

  // Right-panel tabs: "milestones" | "files" | "invoice"
  const [activeRightTab, setActiveRightTab] = useState<'milestones' | 'files' | 'invoice'>('milestones');
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);

  // Floating Shared Workspace Modal & Presence Simulation
  const [isSharedWorkspaceOpen, setIsSharedWorkspaceOpen] = useState(false);
  const [simOtherPeerActive, setSimOtherPeerActive] = useState(true);
  const [simOtherPeerAction, setSimOtherPeerAction] = useState<'reading notes' | 'editing tables' | 'drawing flowchart' | 'idle'>('editing tables');

  // Collapsible Audit ledger state
  const [auditExpanded, setAuditExpanded] = useState(false);

  // SLA Release request modal state
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [selectedMilestoneForRelease, setSelectedMilestoneForRelease] = useState<string>('');
  const [releaseWorkSummary, setReleaseWorkSummary] = useState('');

  // Invoice management states
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'pending' | 'paid' | 'overdue' | 'disputed'>('all');
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [newInvoiceMilestoneId, setNewInvoiceMilestoneId] = useState('');
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState('');
  const [newInvoiceNotes, setNewInvoiceNotes] = useState('');

  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editInvoiceDueDate, setEditInvoiceDueDate] = useState('');
  const [editInvoiceNotes, setEditInvoiceNotes] = useState('');

  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'maya' | 'bank' | 'card' | 'paypal'>('gcash');

  // AI draft states
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiDraftMessage, setAiDraftMessage] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Periodic Peer simulation for presence
  useEffect(() => {
    if (!isSharedWorkspaceOpen) return;
    const interval = setInterval(() => {
      // Toggle active status occasionally, and random actions
      setSimOtherPeerActive(prev => {
        const nextActive = Math.random() > 0.15; // 85% chance of staying online
        if (nextActive) {
          const actions: Array<'reading notes' | 'editing tables' | 'drawing flowchart' | 'idle'> = [
            'reading notes',
            'editing tables',
            'drawing flowchart',
            'idle'
          ];
          setSimOtherPeerAction(actions[Math.floor(Math.random() * actions.length)]);
        }
        return nextActive;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [isSharedWorkspaceOpen]);

  const filteredProjects = useMemo(() => {
    if (!convSearchQuery) return projects;
    return projects.filter(p => 
      p.jobTitle.toLowerCase().includes(convSearchQuery.toLowerCase()) || 
      p.freelancerName.toLowerCase().includes(convSearchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(convSearchQuery.toLowerCase())
    );
  }, [projects, convSearchQuery]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to chat end
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeProject?.messages, isTyping, uploadProgress]);

  const activeProjectRef = useRef(activeProject);
  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  const onUpdateProjectRef = useRef(onUpdateProject);
  const showToastRef = useRef(showToast);
  useEffect(() => {
    onUpdateProjectRef.current = onUpdateProject;
    showToastRef.current = showToast;
  }, [onUpdateProject, showToast]);

  // Establish socket listeners on project switch
  useEffect(() => {
    if (!activeProject) return;

    // Simulate joining project socket room
    mockSocket.emit('join_project', { projectId: activeProject.id });

    // New Message listener
    const handleNewSocketMessage = (data: any) => {
      const latestProject = activeProjectRef.current;
      if (!latestProject) return;

      const isSystemLog = data.senderName === 'System Agent' || 
                          data.senderName === 'System Auditor Partner' ||
                          (data.id && (data.id.startsWith('msg_system_') || data.id.startsWith('msg_reply_'))) ||
                          (data.text && (data.text.includes('Secure Escrow handshake') || data.text.includes('Auto-ack:')));

      if (isSystemLog) {
        const timestampStr = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`;
        const auditLogEntry = {
          id: `log_socket_${Date.now()}`,
          timestamp: timestampStr,
          actor: data.senderName || 'System',
          action: 'Audit Log Link',
          details: data.text
        };

        const updated = {
          ...latestProject,
          auditLogs: [auditLogEntry, ...latestProject.auditLogs]
        };
        onUpdateProjectRef.current(updated);
        showToastRef.current(`Audit Ledger Sync: Handshake validated successfully.`);
        return;
      }

      // Append if it relates to current project
      if (data.id && latestProject.messages.every(m => m.id !== data.id)) {
        const socketMsg: Message = {
          id: data.id,
          senderName: data.senderName,
          senderRole: data.senderRole,
          text: data.text,
          timestamp: data.timestamp || new Date().toISOString()
        };

        const updated = {
          ...latestProject,
          messages: [...latestProject.messages, socketMsg]
        };
        onUpdateProjectRef.current(updated);
        showToastRef.current(`Transmitted payload: "${data.senderName}" updated thread.`);
      }
    };

    // Message status checks updater
    const handleStatusUpdate = (data: any) => {
      showToastRef.current(`Audit channel ack: Delivery checksum match for package.`);
    };

    const handleTypingStart = (data: any) => {
      if (data.projectId === activeProjectRef.current?.id) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.projectId === activeProjectRef.current?.id) {
        setIsTyping(false);
      }
    };

    mockSocket.on('new_message', handleNewSocketMessage);
    mockSocket.on('message_status_update', handleStatusUpdate);
    mockSocket.on('typing_start', handleTypingStart);
    mockSocket.on('typing_stop', handleTypingStop);

    return () => {
      mockSocket.off('new_message', handleNewSocketMessage);
      mockSocket.off('message_status_update', handleStatusUpdate);
      mockSocket.off('typing_start', handleTypingStart);
      mockSocket.off('typing_stop', handleTypingStop);
    };
  }, [activeProject?.id]);

  const handleSendMessage = (textToSend = newMessage) => {
    if (!textToSend.trim() && !attachedFile) return;
    if (!activeProject) return;

    const senderName = activeRole === 'freelancer' ? activeProject.freelancerName : activeProject.clientName;
    const senderRole = activeRole;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      senderName,
      senderRole,
      text: attachedFile 
        ? `${textToSend} (Attached File: ${attachedFile})`
        : textToSend,
      timestamp: new Date().toISOString()
    };

    const newLog = {
      id: `log_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: senderName,
      action: 'Message Sent',
      details: attachedFile ? `Sent message with attachment "${attachedFile}"` : 'Sent chat message'
    };

    const updatedProject: Project = {
      ...activeProject,
      messages: [...activeProject.messages, newMsg],
      auditLogs: [newLog, ...activeProject.auditLogs]
    };

    onUpdateProject(updatedProject);
    setNewMessage('');
    setAttachedFile(null);

    // Emit via socket to simulate client/server sync
    mockSocket.emit('send_message', {
      id: newMsg.id,
      projectId: activeProject.id,
      senderName,
      senderRole,
      text: newMsg.text
    });
  };

  const triggerAIDraft = () => {
    setAiPanelOpen(true);
    setAiGenerating(true);
    setAiDraftMessage('');

    const fullDraft = `Hi, I have finalized the core codebase parameters on our secure server. Webhooks are completely verified against GCash's SHA256 public key. I will bundle the file package and submit it under Milestone 2 for your review. Let me know if you would like me to tune any slow SQL queries before finalizing.`;
    
    let currentText = '';
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < fullDraft.length) {
        currentText += fullDraft[idx];
        setAiDraftMessage(currentText);
        idx += 3; // stream fast
      } else {
        setAiDraftMessage(fullDraft);
        setAiGenerating(false);
        clearInterval(interval);
      }
    }, 40);
  };

  const applyAIDraft = () => {
    setNewMessage(aiDraftMessage);
    setAiPanelOpen(false);
  };

  // Drag and Drop simulated actions
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      simulateFileUpload(files[0].name);
    }
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      simulateFileUpload(files[0].name);
    }
  };

  const simulateFileUpload = (filename: string) => {
    setUploadFileName(filename);
    setUploadProgress(1);
    setUploadHash('');

    let currentProgress = 1;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        // Generate mock SHA256
        const characters = 'abcdef0123456789';
        let generatedHash = 'sha256_';
        for (let i = 0; i < 16; i++) {
          generatedHash += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setUploadHash(generatedHash);

        // After verification, attach file
        setTimeout(() => {
          setAttachedFile(filename);
          setUploadProgress(null);
          showToast(`File "${filename}" locked & verified with hash: ${generatedHash}`);

          // Auto transmit deliverable transfer log msg
          const systemMsg: Message = {
            id: `msg_file_${Date.now()}`,
            senderName: activeRole === 'freelancer' ? activeProject.freelancerName : activeProject.clientName,
            senderRole: activeRole,
            text: `Deliverable Payload uploaded: ${filename} (Verified SHA256: ${generatedHash})`,
            timestamp: new Date().toISOString()
          };

          const updated = {
            ...activeProject,
            messages: [...activeProject.messages, systemMsg]
          };
          onUpdateProject(updated);
        }, 800);
      } else {
        setUploadProgress(currentProgress);
      }
    }, 150);
  };

  // Milestone submissions / approvals
  const handleMilestoneAction = (milestoneId: string, action: 'submit' | 'approve') => {
    if (!activeProject) return;

    const updatedMilestones = activeProject.milestones.map(ms => {
      if (ms.id === milestoneId) {
        if (action === 'submit') {
          return {
            ...ms,
            status: 'in-review' as const,
            submittedFile: 'gcash_integration_package.tar.gz',
            submittedAt: new Date().toISOString()
          };
        } else if (action === 'approve') {
          return { ...ms, status: 'approved' as const };
        }
      }
      return ms;
    });

    const isAllApproved = updatedMilestones.every(m => m.status === 'approved');

    const actionText = action === 'submit' ? 'Submitted Milestone Phase' : 'Approved Milestone Phase';
    const detailText = action === 'submit' 
      ? 'Uploaded gcash_integration_package.tar.gz for review' 
      : 'Approved deliverables, released escrow funds.';

    const newLog = {
      id: `log_ms_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeRole === 'freelancer' ? activeProject.freelancerName : activeProject.clientName,
      action: actionText,
      details: detailText
    };

    onUpdateProject({
      ...activeProject,
      status: isAllApproved ? 'completed' : activeProject.status,
      milestones: updatedMilestones,
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    showToast(`Milestone status updated: ${action === 'submit' ? 'SUBMITTED' : 'APPROVED'}`);
  };

  // Submit Milestone Release Request
  const handleSubmitReleaseRequest = () => {
    if (!selectedMilestoneForRelease) return;

    const ms = activeProject.milestones.find(m => m.id === selectedMilestoneForRelease);
    if (!ms) return;

    // Build the beautiful release invoice request message
    const invoiceRequestText = `SLA_RELEASE_REQUEST_BLOCK\nMilestone: ${ms.title}\nAmount: ₱${ms.amount.toLocaleString()}\nReport: ${releaseWorkSummary || 'Specifications fully delivered to staging environment for validation.'}\nMilestoneId: ${ms.id}`;

    const newMsg: Message = {
      id: `msg_release_${Date.now()}`,
      senderName: activeProject.freelancerName,
      senderRole: 'freelancer',
      text: invoiceRequestText,
      timestamp: new Date().toISOString()
    };

    // Transition milestone status to 'in-review'
    const updatedMilestones = activeProject.milestones.map(m => {
      if (m.id === selectedMilestoneForRelease) {
        return {
          ...m,
          status: 'in-review' as const,
          submittedFile: 'sla_release_snapshot.zip',
          submittedAt: new Date().toISOString()
        };
      }
      return m;
    });

    const newLog = {
      id: `log_release_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeProject.freelancerName,
      action: 'Release Requested',
      details: `Dispatched release request for ${ms.title}`
    };

    onUpdateProject({
      ...activeProject,
      messages: [...activeProject.messages, newMsg],
      milestones: updatedMilestones,
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    // Notify other channel
    mockSocket.emit('notification', {
      id: `notif_${Date.now()}`,
      title: 'Payout Release Signature Needed',
      message: `Developer has filed an SLA validation trigger for ${ms.title}.`
    });

    setIsReleaseModalOpen(false);
    setSelectedMilestoneForRelease('');
    setReleaseWorkSummary('');
    showToast('Escrow SLA release payload dispatched. Client notified.');
  };

  // Client validates the custom checklist and triggers direct release
  const handleClientVerifyAndPay = (milestoneId: string, messageId: string) => {
    const updatedMilestones = activeProject.milestones.map(m => {
      if (m.id === milestoneId) {
        return { ...m, status: 'approved' as const };
      }
      return m;
    });

    const isAllApproved = updatedMilestones.every(m => m.status === 'approved');

    // Replace the chat request message text to show complete status
    const updatedMessages = activeProject.messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          text: msg.text.replace('SLA_RELEASE_REQUEST_BLOCK', 'SLA_RELEASE_REQUEST_APPROVED')
        };
      }
      return msg;
    });

    const newLog = {
      id: `log_payout_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeProject.clientName,
      action: 'Escrow Released',
      details: `Checked GCash checklist handshake. Released ₱${activeProject.milestones.find(m => m.id === milestoneId)?.amount.toLocaleString()}`
    };

    onUpdateProject({
      ...activeProject,
      messages: updatedMessages,
      milestones: updatedMilestones,
      status: isAllApproved ? 'completed' : activeProject.status,
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    showToast('Secure handover completed. GCash Escrow released!');
  };

  // Send Invoice Outstanding Reminder
  const handleSendInvoiceReminder = (msTitle: string, amount: number, invoiceId: string) => {
    const reminderText = `Outstanding Escrow Alert: Milestone "${msTitle}" (₱${amount.toLocaleString()}) invoice ${invoiceId} requires review signature. Funds are securely locked in smart contract. Please execute checklist.`;
    
    const reminderMsg: Message = {
      id: `msg_remind_${Date.now()}`,
      senderName: activeProject.freelancerName,
      senderRole: 'freelancer',
      text: reminderText,
      timestamp: new Date().toISOString()
    };

    const newLog = {
      id: `log_remind_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeProject.freelancerName,
      action: 'Invoice Reminder Sent',
      details: `Dispatched SLA signature reminder for ${invoiceId}`
    };

    onUpdateProject({
      ...activeProject,
      messages: [...activeProject.messages, reminderMsg],
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    // Fire simulated socket dispatch to raise top bell counter!
    mockSocket.emit('notification', {
      id: `notif_remind_${Date.now()}`,
      title: 'SLA Invoice Urgent Reminder',
      message: `${activeProject.freelancerName} sent a payout release alert for ₱${amount.toLocaleString()}.`
    });

    showToast(`Invoice reminder dispatched for ${invoiceId}`);
  };

  const handleCreateInvoice = () => {
    if (!newInvoiceMilestoneId || !activeProject) return;
    const ms = activeProject.milestones.find(m => m.id === newInvoiceMilestoneId);
    if (!ms) return;

    const invoiceId = `INV-2026-0${Math.floor(100 + Math.random() * 899)}`;
    const newInv = {
      id: invoiceId,
      milestone_id: ms.id,
      milestone_title: ms.title,
      project_id: activeProject.id,
      project_title: activeProject.jobTitle,
      amount: ms.amount,
      status: 'pending' as const,
      notes: newInvoiceNotes,
      due_date: newInvoiceDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const structuredMsgText = `INVOICE_CREATED_BLOCK\nInvoice ID: ${invoiceId}\nMilestone: ${ms.title}\nAmount: ₱${ms.amount.toLocaleString()}\nNotes: ${newInvoiceNotes || 'No notes specified.'}\nDueDate: ${newInv.due_date}`;

    const newMsg: Message = {
      id: `msg_inv_${Date.now()}`,
      senderName: activeProject.freelancerName,
      senderRole: 'freelancer',
      text: structuredMsgText,
      timestamp: new Date().toISOString()
    };

    const newLog = {
      id: `log_inv_create_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeProject.freelancerName,
      action: 'Invoice Created',
      details: `Generated invoice ${invoiceId} for ${ms.title}`
    };

    const currentInvoices = activeProject.invoices || [];
    onUpdateProject({
      ...activeProject,
      invoices: [...currentInvoices, newInv],
      messages: [...activeProject.messages, newMsg],
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    setIsCreateInvoiceModalOpen(false);
    showToast(`Invoice ${invoiceId} generated successfully.`);
  };

  const handleEditInvoice = () => {
    if (!editingInvoice || !activeProject) return;

    const updatedInvoices = (activeProject.invoices || []).map(inv => {
      if (inv.id === editingInvoice.id) {
        return {
          ...inv,
          due_date: editInvoiceDueDate,
          notes: editInvoiceNotes
        };
      }
      return inv;
    });

    const newLog = {
      id: `log_inv_edit_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeProject.freelancerName,
      action: 'Invoice Edited',
      details: `Updated due date/notes of invoice ${editingInvoice.id}`
    };

    onUpdateProject({
      ...activeProject,
      invoices: updatedInvoices,
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    setIsEditInvoiceModalOpen(false);
    setEditingInvoice(null);
    showToast(`Invoice ${editingInvoice.id} has been modified.`);
  };

  const handlePaymentCommit = (method: string) => {
    if (!payingInvoice || !activeProject) return;

    // Commit the payment
    const updatedInvoices = (activeProject.invoices || []).map(inv => {
      if (inv.id === payingInvoice.id) {
        return {
          ...inv,
          status: 'paid' as const,
          paid_at: new Date().toISOString(),
          payment_method: method
        };
      }
      return inv;
    });

    // Also auto-approve corresponding milestone!
    const updatedMilestones = activeProject.milestones.map(ms => {
      if (ms.id === payingInvoice.milestone_id) {
        return { ...ms, status: 'approved' as const };
      }
      return ms;
    });

    const isAllApproved = updatedMilestones.every(m => m.status === 'approved');

    const newLog = {
      id: `log_inv_pay_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeProject.clientName,
      action: 'Invoice Settled',
      details: `Completed secure handshake for ${payingInvoice.id} using ${method.toUpperCase()}`
    };

    const systemConfirmMsg: Message = {
      id: `msg_pay_confirm_${Date.now()}`,
      senderName: activeProject.clientName,
      senderRole: 'client',
      text: `INVOICE_PAID_BLOCK\nInvoice ID: ${payingInvoice.id}\nMilestone: ${payingInvoice.milestone_title}\nAmount: ₱${payingInvoice.amount.toLocaleString()}\nMethod: ${method.toUpperCase()}`,
      timestamp: new Date().toISOString()
    };

    onUpdateProject({
      ...activeProject,
      invoices: updatedInvoices,
      milestones: updatedMilestones,
      status: isAllApproved ? 'completed' : activeProject.status,
      messages: [...activeProject.messages, systemConfirmMsg],
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    setIsPayInvoiceModalOpen(false);
    setPayingInvoice(null);
    showToast(`Invoice ${payingInvoice.id} settled successfully!`);
  };

  const handleMarkPaidManual = (invoiceId: string) => {
    if (!activeProject) return;
    const inv = (activeProject.invoices || []).find(i => i.id === invoiceId);
    if (!inv) return;

    const updatedInvoices = (activeProject.invoices || []).map(i => {
      if (i.id === invoiceId) {
        return {
          ...i,
          status: 'paid' as const,
          paid_at: new Date().toISOString(),
          payment_method: 'bank' as const
        };
      }
      return i;
    });

    const updatedMilestones = activeProject.milestones.map(ms => {
      if (ms.id === inv.milestone_id) {
        return { ...ms, status: 'approved' as const };
      }
      return ms;
    });

    const isAllApproved = updatedMilestones.every(m => m.status === 'approved');

    const newLog = {
      id: `log_manual_pay_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeProject.clientName,
      action: 'Invoice Settled Manual',
      details: `Manual bank receipt verification for invoice ${invoiceId}`
    };

    onUpdateProject({
      ...activeProject,
      invoices: updatedInvoices,
      milestones: updatedMilestones,
      status: isAllApproved ? 'completed' : activeProject.status,
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    showToast(`Invoice ${invoiceId} marked as manually settled.`);
  };

  const openDisputeSim = (milestoneTitle: string, amount: number) => {
    const reason = prompt('Specify the visual overlap or technical failure to open a mediation ticket:');
    if (!reason) return;
    
    const newLog = {
      id: `log_ms_${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toISOString().split('T')[0]}`,
      actor: activeRole === 'client' ? activeProject.clientName : activeProject.freelancerName,
      action: 'Dispute Escalated',
      details: `Opened Dispute Case: ${reason}`
    };

    onUpdateProject({
      ...activeProject,
      status: 'disputed' as const,
      auditLogs: [newLog, ...activeProject.auditLogs]
    });

    showToast('Mediation dispute filed. Escrow funds are frozen.');
  };

  // Files list construction
  const projectFiles = useMemo(() => {
    const list = [
      { id: 'f1', name: 'technical_specifications.md', size: '24 KB', uploader: 'Carlo Mendoza', date: 'Jul 15' },
      { id: 'f2', name: 'BDO_transfer_verification_hook.js', size: '12 KB', uploader: 'Carlo Mendoza', date: 'Jul 18' }
    ];
    activeProject?.milestones.forEach(ms => {
      if (ms.submittedFile) {
        list.push({
          id: `f_ms_${ms.id}`,
          name: ms.submittedFile,
          size: '4.2 MB',
          uploader: activeProject.freelancerName,
          date: ms.submittedAt ? new Date(ms.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'
        });
      }
    });
    return list;
  }, [activeProject]);

  return (
    <div className="flex-grow flex flex-col bg-white rounded-2xl border border-border overflow-hidden h-[calc(100dvh-140px)] md:h-[740px] max-h-[85dvh] min-h-[500px] shadow-[0_1px_3px_rgba(15,25,35,0.04)] text-xs text-text-primary">
      
      {/* Mobile Top Segmented Control */}
      <div className="md:hidden grid grid-cols-3 bg-surface-0 border-b border-border p-1.5 shrink-0 font-sans gap-1">
        <button
          onClick={() => setMobileActiveSubView('channels')}
          className={`py-2 rounded-lg font-bold text-center text-[11px] transition duration-200 cursor-pointer ${
            mobileActiveSubView === 'channels' ? 'bg-white text-gh-teal shadow-sm border border-border/60' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Inbox ({projects.length})
        </button>
        <button
          onClick={() => setMobileActiveSubView('chat')}
          className={`py-2 rounded-lg font-bold text-center text-[11px] transition duration-200 cursor-pointer ${
            mobileActiveSubView === 'chat' ? 'bg-white text-gh-teal shadow-sm border border-border/60' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Chat Thread
        </button>
        <button
          onClick={() => setMobileActiveSubView('ledger')}
          className={`py-2 rounded-lg font-bold text-center text-[11px] transition duration-200 cursor-pointer ${
            mobileActiveSubView === 'ledger' ? 'bg-white text-gh-teal shadow-sm border border-border/60' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Ledger Panel
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden h-full">
        
        {/* 1. LEFT: CONVERSATION LIST */}
        <div className={`${mobileActiveSubView === 'channels' ? 'flex' : 'hidden'} md:flex md:col-span-3 bg-surface-0 border-r border-border flex-col h-full overflow-hidden`}>
        
        <div className="p-3 border-b border-border space-y-2 bg-white">
          <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-text-muted">Conversations Lock</span>
          <div className="relative">
            <input
              type="text"
              value={convSearchQuery}
              onChange={(e) => setConvSearchQuery(e.target.value)}
              placeholder="Search contracts..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface-0 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gh-teal"
            />
            <ChatTeardropText size={14} className="text-text-muted absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {filteredProjects.map(proj => {
            const isSelected = proj.id === selectedProjectId;
            const visibleMessages = proj.messages.filter(msg => {
              const isSystemLog = msg.senderName === 'System Agent' || 
                                  msg.senderName === 'System Auditor Partner' ||
                                  msg.id?.startsWith('msg_system_') || 
                                  msg.id?.startsWith('msg_reply_') ||
                                  msg.text?.includes('Secure Escrow handshake') ||
                                  msg.text?.includes('Auto-ack:');
              return !isSystemLog;
            });
            const lastMsg = visibleMessages[visibleMessages.length - 1];
            return (
              <button
                key={proj.id}
                onClick={() => {
                  setSelectedProjectId(proj.id);
                  setMobileActiveSubView('chat');
                }}
                className={`w-full text-left p-3.5 transition flex flex-col gap-1 cursor-pointer ${
                  isSelected ? 'bg-white border-l-2 border-gh-teal shadow-sm' : 'hover:bg-white/50'
                }`}
              >
                <div className="flex justify-between items-start w-full gap-2">
                  <span className={`font-sans font-bold text-xs tracking-tight truncate ${isSelected ? 'text-gh-teal-hover' : 'text-text-primary'}`}>
                    {proj.jobTitle}
                  </span>
                  <span className="font-mono text-[9px] text-text-muted shrink-0">
                    ₱{(proj.totalBudget / 1000).toFixed(0)}K
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-text-secondary">
                  <span className="font-semibold">{activeRole === 'freelancer' ? proj.clientName : proj.freelancerName}</span>
                  <span className="w-1 h-1 rounded-full bg-text-muted"></span>
                  <span className="font-mono text-[9px] text-text-muted truncate">
                    {lastMsg ? getConversationListTime(lastMsg.timestamp) : 'Active'}
                  </span>
                </div>

                <p className="text-[10px] text-text-muted line-clamp-1 mt-1 leading-normal">
                  {lastMsg ? (lastMsg.text.startsWith('SLA_RELEASE_REQUEST_BLOCK') ? 'SLA Escrow Payout requested' : lastMsg.text) : 'No conversations recorded.'}
                </p>

                <div className="flex justify-between items-center w-full mt-2 pt-1 border-t border-border/40">
                  <span className="text-[8px] uppercase font-mono tracking-wider font-bold text-text-muted">Escrow Channel</span>
                  <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded-full font-bold ${
                    proj.status === 'completed' ? 'bg-gh-green-light text-gh-green' :
                    proj.status === 'disputed' ? 'bg-gh-red-light text-gh-red' :
                    'bg-gh-teal-light text-gh-teal-hover'
                  }`}>
                    {proj.status}
                  </span>
                </div>

              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-border bg-white text-center text-[10px] text-text-muted">
          Active secure socket channels.
        </div>

      </div>

      {/* 2. CENTER: MESSAGE THREAD & INPUT */}
      <div className={`${mobileActiveSubView === 'chat' ? 'flex' : 'hidden'} md:flex md:col-span-6 flex-col h-full overflow-hidden bg-surface-0 relative`}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}>
        
        {/* Absolute Drag Overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gh-ink/90 z-20 flex flex-col items-center justify-center text-center p-6 border-4 border-dashed border-gh-teal m-2 rounded-2xl"
            >
              <CloudArrowUp size={48} className="text-gh-teal animate-bounce mb-3" />
              <h4 className="font-sans font-bold text-base text-white">Upload Secure Escrow Deliverables</h4>
              <p className="text-xs text-white/60 max-w-xs mt-1.5 leading-relaxed">
                Release your file snapshot here. SHA256 checksum integrity headers will be compiled on staging nodes automatically.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project Header Band */}
        <div className="p-3 bg-white border-b border-border flex items-center justify-between shrink-0 h-[56px] z-10 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex -space-x-1.5 shrink-0">
              <div className="w-6 h-6 rounded-full bg-gh-teal text-white font-bold text-[9px] flex items-center justify-center border border-white font-mono">
                {activeProject.clientName.slice(0, 1)}
              </div>
              <div className="w-6 h-6 rounded-full bg-gh-ink text-white font-bold text-[9px] flex items-center justify-center border border-white font-mono">
                {activeProject.freelancerName.slice(0, 1)}
              </div>
            </div>
            
            <div className="min-w-0">
              <h4 className="font-sans font-bold text-xs truncate text-gh-ink leading-tight">
                {activeProject.jobTitle}
              </h4>
              <p className="text-[10px] text-text-muted truncate leading-none mt-0.5">
                Client: {activeProject.clientName} ↔ Dev: {activeProject.freelancerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsSharedWorkspaceOpen(true)}
              className="px-3 py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white text-[10px] font-sans font-bold rounded-lg shadow-sm cursor-pointer transition flex items-center gap-1 shrink-0"
              title="Open the Dedicated Shared Workspace"
            >
              <Kanban size={13} weight="bold" />
              <span>LIVE WORKSPACE</span>
            </button>
            <span className="font-mono text-xs font-bold text-gh-teal">
              ₱{activeProject.totalBudget.toLocaleString()}
            </span>
            <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ${
              activeProject.status === 'completed' ? 'bg-gh-green-light text-gh-green' :
              activeProject.status === 'disputed' ? 'bg-gh-red-light text-gh-red' :
              'bg-gh-teal-light text-gh-teal'
            }`}>
              {activeProject.status}
            </span>
          </div>
        </div>

        {/* Uploading progress bar */}
        {uploadProgress !== null && (
          <div className="bg-white border-b border-border p-3 shrink-0 flex items-center gap-4 text-xs">
            <CloudArrowUp size={20} className="text-gh-teal animate-pulse" />
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-mono font-bold mb-1">
                <span>VERIFYING SIGNATURE: {uploadFileName}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gh-teal h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              {uploadProgress === 100 && (
                <span className="text-[9px] font-mono text-gh-teal animate-pulse block mt-1 font-semibold">
                  Compiling SHA256 handover signature...
                </span>
              )}
            </div>
          </div>
        )}

        {/* TASK 5A: COLLAPSIBLE AUDIT LEDGER */}
        {activeProject?.auditLogs && activeProject.auditLogs.length > 0 && (
          <div className="bg-surface-0 border-b border-border shrink-0 text-xs transition-all">
            <button
              onClick={() => setAuditExpanded(!auditExpanded)}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 text-text-secondary font-semibold">
                <ShieldCheck size={14} className="text-gh-teal" weight="bold" />
                <span className="font-mono text-[10px] tracking-wider uppercase">Escrow Ledger Audit Trail</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-slate-200 text-text-primary rounded-full font-bold">
                  {activeProject.auditLogs.filter(log => log.action && !log.action.startsWith('Auto-ack')).length} Events
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-text-muted font-mono text-[9px]">
                <span>{auditExpanded ? 'COLLAPSE' : 'EXPAND'}</span>
                <CaretDown size={12} className={`transition-transform duration-200 ${auditExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
            
            <AnimatePresence>
              {auditExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border/50 bg-white"
                >
                  <div className="max-h-[140px] overflow-y-auto p-3 divide-y divide-border/40 font-mono text-[9px]">
                    {activeProject.auditLogs
                      .filter(log => log.action && !log.action.startsWith('Auto-ack'))
                      .map((log) => (
                        <div key={log.id} className="py-1.5 flex justify-between items-start gap-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-gh-ink uppercase tracking-tight">{log.action || 'Audit Event'}</span>
                            <p className="text-[9px] text-text-muted leading-tight">{log.details}</p>
                          </div>
                          <span className="text-text-muted shrink-0 text-right whitespace-nowrap">
                            {log.timestamp}
                          </span>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Message Thread Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center">
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted bg-white border border-border px-2 py-0.5 rounded">
              Immutable Escrow Ledged Created · {new Date(activeProject.messages[0]?.timestamp || Date.now()).toLocaleDateString()}
            </span>
          </div>

          {(() => {
            let lastDateLabel = '';
            return activeProject.messages
              .filter(msg => {
                const isSystemLog = msg.senderName === 'System Agent' || 
                                    msg.senderName === 'System Auditor Partner' ||
                                    msg.id?.startsWith('msg_system_') || 
                                    msg.id?.startsWith('msg_reply_') ||
                                    msg.text?.includes('Secure Escrow handshake') ||
                                    msg.text?.includes('Auto-ack:');
                return !isSystemLog;
              })
              .map((msg, idx) => {
                const isOutgoing = (activeRole === 'freelancer' && msg.senderRole === 'freelancer') || 
                                   (activeRole === 'client' && msg.senderRole === 'client');

                const dateLabel = getDateSeparatorLabel(msg.timestamp);
                const showSeparator = dateLabel !== lastDateLabel;
                if (showSeparator) {
                  lastDateLabel = dateLabel;
                }

                const renderMessageBody = () => {
                  // Check if this message is a custom SLA Release request block
                  const isReleaseRequest = msg.text.startsWith('SLA_RELEASE_REQUEST_BLOCK');
                  const isReleaseApproved = msg.text.startsWith('SLA_RELEASE_REQUEST_APPROVED');

                  if (isReleaseRequest || isReleaseApproved) {
                    const lines = msg.text.split('\n');
                    const msTitle = lines[1]?.replace('Milestone: ', '') || '';
                    const msAmount = lines[2]?.replace('Amount: ', '') || '';
                    const msReport = lines[3]?.replace('Report: ', '') || '';
                    const msId = lines[4]?.replace('MilestoneId: ', '') || '';

                    return (
                      <div className="flex justify-center my-4 w-full text-xs">
                        <div className="bg-white border border-border rounded-xl p-4 max-w-md w-full shadow-sm space-y-3 relative overflow-hidden">
                          {/* Visual side marker */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${isReleaseApproved ? 'bg-gh-green' : 'bg-gh-amber'}`} />
                          
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 text-gh-ink font-semibold">
                              <Receipt size={16} className={isReleaseApproved ? 'text-gh-green' : 'text-gh-amber animate-pulse'} />
                              <span className="font-mono text-[10px] tracking-wider uppercase font-bold">
                                {isReleaseApproved ? 'SLA Released & Disbursed' : 'SLA Release Request'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] font-bold text-gh-teal">{msAmount}</span>
                          </div>

                          <div className="space-y-1">
                            <h5 className="font-sans font-bold text-xs text-gh-ink">{msTitle}</h5>
                            <p className="text-[10px] text-text-secondary leading-relaxed">
                              {msReport}
                            </p>
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-mono text-text-muted pt-2 border-t border-border/60">
                            <span>Verification Snapshot</span>
                            <span>{isReleaseApproved ? 'Escrow Handshake Approved' : 'Escrow Pending Sign-off'}</span>
                          </div>

                          {/* Client action pay button */}
                          {!isReleaseApproved && activeRole === 'client' && (
                            <button
                              onClick={() => handleClientVerifyAndPay(msId, msg.id)}
                              className="w-full mt-2 py-2 bg-gh-teal hover:bg-gh-teal-hover text-white font-sans font-bold text-xs rounded transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <CheckCircle size={14} weight="fill" />
                              <span>Verify SLA Checklist & Pay</span>
                            </button>
                          )}

                          {isReleaseApproved && (
                            <div className="mt-2 py-1.5 bg-gh-green-light/20 text-gh-green font-mono text-center rounded text-[10px] font-bold">
                              Transaction Lock Settled on Staging Node
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const isInvoiceCreated = msg.text.startsWith('INVOICE_CREATED_BLOCK');
                  const isInvoicePaid = msg.text.startsWith('INVOICE_PAID_BLOCK');

                  if (isInvoiceCreated) {
                    const lines = msg.text.split('\n');
                    const invId = lines[1]?.replace('Invoice ID: ', '') || '';
                    const msTitle = lines[2]?.replace('Milestone: ', '') || '';
                    const amount = lines[3]?.replace('Amount: ', '') || '';
                    const notes = lines[4]?.replace('Notes: ', '') || '';
                    const dueDate = lines[5]?.replace('DueDate: ', '') || '';

                    const invoiceObj = (activeProject.invoices || []).find(inv => inv.id === invId);
                    const currentStatus = invoiceObj ? invoiceObj.status : 'pending';
                    const isPaid = currentStatus === 'paid';

                    return (
                      <div className="flex justify-center my-4 w-full text-xs">
                        <div className="bg-white border border-border rounded-xl p-4 max-w-md w-full shadow-sm space-y-3 relative overflow-hidden text-xs">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPaid ? 'bg-gh-green' : 'bg-gh-teal'}`} />
                          
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 text-gh-ink font-semibold">
                              <Receipt size={16} className={isPaid ? 'text-gh-green' : 'text-gh-teal animate-pulse'} />
                              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-text-primary">
                                {isPaid ? 'Invoice Paid & Settled' : 'Milestone Invoice Generated'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] font-bold text-gh-teal">{amount}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] text-text-muted font-bold">{invId}</span>
                              <span className="w-1 h-1 rounded-full bg-text-muted" />
                              <h5 className="font-sans font-bold text-xs text-gh-ink truncate">{msTitle}</h5>
                            </div>
                            {notes && (
                              <p className="text-[10px] text-text-secondary leading-relaxed bg-surface-0 p-2 rounded border border-border/40 mt-1 italic">
                                "{notes}"
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-mono text-text-muted pt-2 border-t border-border/60">
                            <span>Due Date: {dueDate}</span>
                            <span>{isPaid ? 'Escrow Handshake Approved' : 'Payment Awaiting Signature'}</span>
                          </div>

                          {!isPaid && activeRole === 'client' && (
                            <button
                              onClick={() => {
                                const targetInv = (activeProject.invoices || []).find(inv => inv.id === invId);
                                if (targetInv) {
                                  setPayingInvoice(targetInv);
                                  setPaymentMethod('gcash');
                                  setIsPayInvoiceModalOpen(true);
                                }
                              }}
                              className="w-full mt-2 py-2 bg-gh-teal hover:bg-gh-teal-hover text-white font-sans font-bold text-xs rounded transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <CheckCircle size={14} weight="fill" />
                              <span>Review & Pay Invoice</span>
                            </button>
                          )}

                          {isPaid && (
                            <div className="mt-2 py-1.5 bg-gh-green-light/20 text-gh-green font-mono text-center rounded text-[10px] font-bold">
                              Funds Disbursed via GCash Escrow Handshake
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (isInvoicePaid) {
                    const lines = msg.text.split('\n');
                    const invId = lines[1]?.replace('Invoice ID: ', '') || '';
                    const msTitle = lines[2]?.replace('Milestone: ', '') || '';
                    const amount = lines[3]?.replace('Amount: ', '') || '';
                    const method = lines[4]?.replace('Method: ', '') || '';

                    return (
                      <div className="flex justify-center my-4 w-full text-xs">
                        <div className="bg-white border border-border rounded-xl p-4 max-w-md w-full shadow-sm space-y-3 relative overflow-hidden text-xs">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gh-green" />
                          
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 text-gh-green font-semibold">
                              <SealCheck size={16} className="text-gh-green" />
                              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-text-primary">
                                Transaction Succeeded
                              </span>
                            </div>
                            <span className="font-mono text-[10px] font-bold text-gh-green">{amount}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] text-text-muted font-bold">{invId}</span>
                              <span className="w-1 h-1 rounded-full bg-text-muted" />
                              <h5 className="font-sans font-bold text-xs text-gh-ink truncate">{msTitle}</h5>
                            </div>
                            <p className="text-[10px] text-text-secondary mt-1">
                              Cleared and settled securely through the GitHustle GCash Escrow gateway.
                            </p>
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-mono text-text-muted pt-2 border-t border-border/40">
                            <span>Method: {method}</span>
                            <span className="text-gh-green font-bold flex items-center gap-1">
                              <SealCheck size={10} weight="fill" />
                              <span>SLA Handover Complete</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className={`flex items-end gap-2 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                      
                      {!isOutgoing && (
                        <div className="w-7 h-7 rounded-full bg-gh-teal-light text-gh-teal-hover flex items-center justify-center font-bold text-[10px] shrink-0 border border-gh-teal/10 font-mono">
                          {msg.senderName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-1 max-w-[75%]">
                        <div className="flex items-baseline justify-between gap-4 text-[10px] text-text-muted px-1">
                          <span className="font-semibold text-text-secondary">{msg.senderName}</span>
                          <span className="font-mono text-[8px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className={`p-3 rounded-xl leading-relaxed ${
                          isOutgoing 
                            ? 'bg-white border border-border rounded-br-sm shadow-sm' 
                            : 'bg-gh-teal-light/45 text-gh-teal-hover border border-gh-teal/5 rounded-bl-sm'
                        }`}>
                          {msg.text}
                        </div>
                      </div>

                      {isOutgoing && (
                        <ChecksFilled size={14} className="text-gh-teal shrink-0 mb-1" />
                      )}

                    </div>
                  );
                };

                return (
                  <React.Fragment key={msg.id || idx}>
                    {showSeparator && <DateSeparator label={dateLabel} />}
                    {renderMessageBody()}
                  </React.Fragment>
                );
              });
          })()}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gh-teal-light text-gh-teal-hover flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                  {activeRole === 'freelancer' ? activeProject.clientName.slice(0, 2).toUpperCase() : activeProject.freelancerName.slice(0, 2).toUpperCase()}
                </div>
                <div className="bg-white border border-border px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
              <span className="text-[9px] text-text-muted italic ml-9">
                {activeRole === 'freelancer' ? activeProject.clientName : activeProject.freelancerName} is composing a secure message...
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Message Input Controls */}
        <div className="p-3 bg-white border-t border-border shrink-0 z-10 shadow-md">
          
          {attachedFile && (
            <div className="p-2 mb-2 bg-gh-teal-light/35 border border-gh-teal/10 rounded-md flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-mono text-gh-teal-hover font-semibold">
                <FileText size={14} />
                <span>Staged Attachment: {attachedFile}</span>
              </div>
              <button onClick={() => setAttachedFile(null)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="space-y-2">
            
            <div className="relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${activeRole === 'freelancer' ? activeProject.clientName : activeProject.freelancerName}...`}
                rows={1}
                className="w-full pr-24 pl-3 py-2.5 bg-surface-0 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gh-teal leading-relaxed resize-none"
              />
              
              <div className="absolute right-2.5 top-1.5 flex items-center gap-1.5">
                
                {/* File picker */}
                <label className="p-1 text-text-muted hover:text-text-primary cursor-pointer" title="Attach File">
                  <Paperclip size={16} />
                  <input type="file" onChange={handleManualFileSelect} className="hidden" />
                </label>

                {/* Sparkle AI Draft */}
                <button
                  type="button"
                  onClick={triggerAIDraft}
                  className="p-1 text-gh-teal hover:text-gh-teal-hover cursor-pointer"
                  title="Generate AI Response Draft"
                >
                  <Sparkle size={16} weight="fill" />
                </button>

                <button
                  type="submit"
                  className="p-1.5 bg-gh-teal text-white hover:bg-gh-teal-hover rounded-md transition cursor-pointer shadow-sm"
                  title="Send Message"
                >
                  <PaperPlaneTilt size={12} weight="bold" />
                </button>

              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-text-muted px-1">
              <span>Press enter to transmit. Drag files over the thread to audit deliverables.</span>
              <span>Gateway Channel: TLS v1.3</span>
            </div>

          </form>

        </div>

      </div>

      {/* 3. RIGHT: PROJECT STATUS & MILESTONES */}
      <div className={`${mobileActiveSubView === 'ledger' ? 'flex' : 'hidden'} md:flex md:col-span-3 bg-white border-l border-border flex-col h-full overflow-hidden`}>
        
        {/* Tab Headers */}
        <div className="grid grid-cols-3 text-center border-b border-border bg-surface-0 text-[10px] shrink-0 font-sans font-bold uppercase tracking-wider text-text-muted">
          <button
            onClick={() => setActiveRightTab('milestones')}
            className={`py-3 transition cursor-pointer flex items-center justify-center gap-1 ${activeRightTab === 'milestones' ? 'text-gh-teal border-b-2 border-gh-teal bg-white font-bold' : 'hover:bg-white/40'}`}
          >
            <span>Milestones</span>
          </button>
          <button
            onClick={() => setActiveRightTab('files')}
            className={`py-3 transition cursor-pointer flex items-center justify-center gap-1 ${activeRightTab === 'files' ? 'text-gh-teal border-b-2 border-gh-teal bg-white font-bold' : 'hover:bg-white/40'}`}
          >
            <span>Files</span>
          </button>
          <button
            onClick={() => setActiveRightTab('invoice')}
            className={`py-3 transition cursor-pointer flex items-center justify-center gap-1 ${activeRightTab === 'invoice' ? 'text-gh-teal border-b-2 border-gh-teal bg-white font-bold' : 'hover:bg-white/40'}`}
          >
            <span>Invoices</span>
          </button>
        </div>

        {/* Tab content area */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {/* MILESTONES TAB */}
          {activeRightTab === 'milestones' && (
            <div className="space-y-4">
              
              {/* Header block with Export button */}
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className="font-sans font-extrabold text-[10px] text-text-muted tracking-wider uppercase">Project Milestones Ledger</span>
                <button
                  onClick={() => {
                    const content = `========================================================================
                      ESCROW PHILIPPINES SECURE SMART CONTRACT
========================================================================
PROJECT ID: ${activeProject.id.toUpperCase()}
PROJECT TITLE: ${activeProject.jobTitle || (activeProject as any).title || ''}
CLIENT: ${activeProject.clientName}
FREELANCER: ${activeProject.freelancerName}
TOTAL ESCROW BUDGET: ₱${activeProject.totalBudget.toLocaleString()}
STATUS: ${activeProject.status.toUpperCase()}
IMMUTABLE BLOCK SIGNATURE: SECURE-LEDGER-HASH-${activeProject.id.toUpperCase()}-${Date.now()}

------------------------------------------------------------------------
                             MILESTONES LIST
------------------------------------------------------------------------
${activeProject.milestones.map((m, i) => `
[Milestone #${i + 1}] ${m.title}
  - Deliverable Specs: ${m.deliverableDesc}
  - Due Date: ${new Date(m.dueDate).toLocaleDateString()}
  - Escrow Budget Allocated: ₱${m.amount.toLocaleString()}
  - Current Status: ${m.status.toUpperCase()}
`).join('\n')}

------------------------------------------------------------------------
                          COMPLIANCE AUDIT TRAILS
------------------------------------------------------------------------
${(activeProject.auditLogs || []).map((l) => `
[${new Date(l.timestamp).toLocaleString()}] ${l.action || (l as any).title}
Details: ${l.details}
`).join('\n')}

------------------------------------------------------------------------
This contract specification sheet has been compiled and cryptographically 
stamped by Escrow Philippines, stored securely on the sandbox ledger.
========================================================================`;
                    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Escrow_Contract_${(activeProject.jobTitle || (activeProject as any).title || '').replace(/\s+/g, '_')}.txt`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast('Escrow contract ledger specification exported successfully.');
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-text-secondary border border-border/60 hover:text-text-primary rounded text-[9px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Export Contract Specification Document"
                >
                  <FileArrowDown size={11} weight="bold" />
                  <span>EXPORT CONTRACT</span>
                </button>
              </div>

              {/* PREMIUM VISUAL MILESTONE TRACKER PROGRESS BAR */}
              <div className="bg-slate-50/60 rounded-xl border border-border/50 p-3.5 space-y-3.5 select-none">
                <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
                  <span className="font-bold uppercase tracking-tight">Escrow Released</span>
                  <span className="font-bold text-gh-teal">
                    ₱{activeProject.milestones.filter(m => m.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} / ₱{activeProject.totalBudget.toLocaleString()} ({Math.round((activeProject.milestones.filter(m => m.status === 'approved').length / activeProject.milestones.length) * 100)}%)
                  </span>
                </div>

                {/* Horizontal Timeline Segment Tracks */}
                <div className="relative pt-1">
                  {/* Timeline track behind */}
                  <div className="absolute top-[21px] left-3 right-3 h-1 bg-slate-200 rounded-full" />
                  
                  {/* Active segment track */}
                  <div 
                    className="absolute top-[21px] left-3 h-1 bg-gh-teal rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.max(0, Math.min(100, (activeProject.milestones.filter(m => m.status === 'approved').length / Math.max(1, activeProject.milestones.length - 1)) * 100))}%`
                    }}
                  />

                  {/* Node checkpoints */}
                  <div className="relative flex justify-between">
                    {activeProject.milestones.map((m, index) => {
                      const isComplete = m.status === 'approved';
                      const isReview = m.status === 'in-review';
                      return (
                        <div 
                          key={m.id}
                          onClick={() => setExpandedMilestoneId(m.id)}
                          className="flex flex-col items-center cursor-pointer group"
                        >
                          <div 
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[9px] font-black z-10 border-2 shadow-sm transition-all duration-300 ${
                              isComplete ? 'bg-gh-teal border-gh-teal text-white scale-105' :
                              isReview ? 'bg-white border-gh-amber text-gh-amber animate-pulse' :
                              'bg-white border-border text-text-muted group-hover:border-slate-400'
                            }`}
                            title={`${m.title} - ${m.status}`}
                          >
                            {isComplete ? '✓' : index + 1}
                          </div>
                          <span className="font-sans text-[8px] font-bold text-text-muted group-hover:text-text-primary mt-1 text-center truncate max-w-[55px] leading-tight block">
                            {m.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Milestones list tree */}
              <div className="space-y-2.5">
                {activeProject.milestones.map((ms, idx) => {
                  const isExpanded = expandedMilestoneId === ms.id;
                  return (
                    <div 
                      key={ms.id} 
                      className="border border-border rounded-lg overflow-hidden bg-surface-0 hover:border-gh-teal/40 transition"
                    >
                      <div 
                        onClick={() => setExpandedMilestoneId(isExpanded ? null : ms.id)}
                        className="p-3 flex justify-between items-start gap-2 cursor-pointer bg-white"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              ms.status === 'approved' ? 'bg-gh-green' :
                              ms.status === 'in-review' ? 'bg-gh-amber' :
                              'bg-text-muted'
                            }`} />
                            <span className="font-sans font-semibold text-text-primary text-[11px] leading-tight block truncate max-w-[130px]">
                              {ms.title}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] text-text-muted block">
                            Due {new Date(ms.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="font-mono font-bold text-[11px] text-gh-teal block">
                            ₱{ms.amount.toLocaleString()}
                          </span>
                          
                          {/* Quick Milestone Actions */}
                          {activeRole === 'freelancer' && ms.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMilestoneAction(ms.id, 'submit');
                              }}
                              className="px-1.5 py-0.5 bg-gh-teal-light hover:bg-gh-teal text-gh-teal hover:text-white rounded text-[8px] font-mono font-bold transition cursor-pointer uppercase tracking-tight border border-gh-teal/10"
                              title="Submit deliverables instantly"
                            >
                              QUICK SUBMIT
                            </button>
                          )}

                          {activeRole === 'client' && ms.status === 'in-review' && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openDisputeSim(ms.title, ms.amount)}
                                className="px-1.5 py-0.5 bg-gh-red-light/60 hover:bg-gh-red text-gh-red hover:text-white rounded text-[8px] font-mono font-bold transition cursor-pointer uppercase tracking-tight border border-gh-red/10"
                                title="File escrow dispute instantly"
                              >
                                DISPUTE
                              </button>
                              <button
                                onClick={() => handleMilestoneAction(ms.id, 'approve')}
                                className="px-1.5 py-0.5 bg-gh-teal-light hover:bg-gh-teal text-gh-teal hover:text-white rounded text-[8px] font-mono font-bold transition cursor-pointer uppercase tracking-tight border border-gh-teal/10"
                                title="Approve & release funds instantly"
                              >
                                RELEASE
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3 border-t border-border/60 bg-white space-y-3">
                          <p className="text-[10px] text-text-secondary leading-relaxed">
                            {ms.deliverableDesc}
                          </p>

                          {ms.submittedFile && (
                            <div className="p-2 bg-surface-0 border border-border rounded text-[10px] space-y-1.5">
                              <span className="font-mono text-[9px] text-text-muted block uppercase font-bold">Submitted Deliverables</span>
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-gh-teal-hover truncate max-w-[120px]">{ms.submittedFile}</span>
                                <button className="text-gh-teal hover:underline flex items-center gap-0.5 cursor-pointer">
                                  <FileArrowDown size={12} />
                                  <span>Open</span>
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            {activeRole === 'freelancer' && ms.status === 'pending' && (
                              <button
                                onClick={() => handleMilestoneAction(ms.id, 'submit')}
                                className="w-full py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white rounded font-sans font-bold text-[10px] transition cursor-pointer"
                              >
                                Submit Milestone Deliverables
                              </button>
                            )}

                            {activeRole === 'client' && ms.status === 'in-review' && (
                              <div className="flex gap-2 w-full">
                                <button
                                  onClick={() => openDisputeSim(ms.title, ms.amount)}
                                  className="flex-1 py-1.5 bg-gh-red-light text-gh-red border border-gh-red/10 rounded font-sans font-bold text-[10px] transition cursor-pointer text-center"
                                >
                                  File Dispute
                                </button>
                                <button
                                  onClick={() => handleMilestoneAction(ms.id, 'approve')}
                                  className="flex-1 py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white rounded font-sans font-bold text-[10px] transition cursor-pointer"
                                >
                                  Release Funds
                                </button>
                              </div>
                            )}

                            {ms.status === 'approved' && (
                              <div className="w-full p-2 bg-gh-green-light/20 border border-gh-green/10 rounded text-center font-mono text-[10px] text-gh-green font-bold">
                                Escrow Released & Completed
                              </div>
                            )}
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Freelancer Request Escrow Release Button */}
              {activeRole === 'freelancer' && (
                <button
                  onClick={() => setIsReleaseModalOpen(true)}
                  className="w-full py-2.5 bg-gh-teal hover:bg-gh-teal-hover text-white rounded-lg font-sans font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Receipt size={14} weight="bold" />
                  <span>Request Escrow Release</span>
                </button>
              )}

            </div>
          )}

          {/* FILES TAB */}
          {activeRightTab === 'files' && (
            <div className="space-y-4">
              
              <label className="p-4 border-2 border-dashed border-border hover:border-gh-teal rounded-lg text-center cursor-pointer hover:bg-surface-0 transition flex flex-col items-center justify-center gap-1.5">
                <FolderOpen size={24} className="text-text-muted" />
                <span className="font-sans font-semibold text-text-primary text-[11px]">Choose files to upload</span>
                <p className="text-[9px] text-text-muted">ZIP, PDF, SQL, CJS up to 50MB</p>
                <input type="file" onChange={handleManualFileSelect} className="hidden" />
              </label>

              <div className="space-y-1.5">
                <span className="font-mono text-[9px] uppercase text-text-muted font-bold tracking-wider">Indexed Assets</span>
                
                {projectFiles.map(file => (
                  <div key={file.id} className="p-2.5 bg-surface-0 border border-border hover:border-border/80 rounded-lg flex items-center justify-between text-[11px] transition">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={18} className="text-text-muted shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono text-text-primary block truncate max-w-[150px]">{file.name}</span>
                        <span className="text-[9px] text-text-muted block mt-0.5">{file.size} · {file.uploader}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => showToast(`Initiated secure file chunk download for: "${file.name}"`)}
                      className="p-1.5 text-text-secondary hover:text-gh-teal cursor-pointer shrink-0"
                    >
                      <FileArrowDown size={14} />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* INVOICES TAB */}
          {activeRightTab === 'invoice' && (
            <div className="space-y-3 flex flex-col h-full overflow-hidden text-xs">
              {/* Filter Row */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1.5 shrink-0 scrollbar-none border-b border-border/40">
                {(['all', 'pending', 'paid', 'overdue', 'disputed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setInvoiceFilter(filter)}
                    className={`px-2 py-1 rounded text-[8px] font-mono uppercase font-bold tracking-tight transition cursor-pointer shrink-0 ${
                      invoiceFilter === filter
                        ? 'bg-gh-teal text-white'
                        : 'bg-surface-0 hover:bg-border/60 text-text-muted border border-border/50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Action Button for Freelancer */}
              {activeRole === 'freelancer' && (
                <button
                  onClick={() => {
                    const unInvoicedMilestone = activeProject.milestones.find(
                      (m) => !(activeProject.invoices || []).some((inv) => inv.milestone_id === m.id)
                    );
                    setNewInvoiceMilestoneId(unInvoicedMilestone?.id || '');
                    setNewInvoiceDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                    setNewInvoiceNotes('');
                    setIsCreateInvoiceModalOpen(true);
                  }}
                  className="w-full py-1.5 bg-gh-teal-light text-gh-teal-hover border border-gh-teal/10 hover:bg-gh-teal-light/60 rounded-md font-sans font-bold text-[9px] uppercase tracking-wide transition cursor-pointer flex items-center justify-center gap-1 shadow-sm shrink-0"
                >
                  <Plus size={10} weight="bold" />
                  <span>Create Invoice</span>
                </button>
              )}

              {/* Invoice Cards Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-4 min-h-0">
                {(() => {
                  const projectInvoices = activeProject.invoices || [];
                  const filteredInvoices = projectInvoices.filter((inv) => {
                    if (invoiceFilter === 'all') return true;
                    return inv.status === invoiceFilter;
                  });

                  if (filteredInvoices.length === 0) {
                    return (
                      <div className="text-center py-8 text-text-muted space-y-1.5">
                        <Receipt size={24} className="mx-auto text-border" />
                        <p className="font-sans text-[10px]">No invoices matching "{invoiceFilter}"</p>
                      </div>
                    );
                  }

                  return filteredInvoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    const isUnpaid = inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'disputed';
                    return (
                      <div key={inv.id} className="p-3 bg-surface-0 border border-border rounded-lg space-y-2 hover:border-gh-teal/30 transition">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-[9px] text-gh-teal font-bold block">{inv.id}</span>
                            <span className="font-sans text-[11px] text-text-primary block truncate max-w-[150px] font-semibold mt-0.5">{inv.milestone_title}</span>
                          </div>
                          <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            inv.status === 'paid' ? 'bg-gh-green-light text-gh-green' :
                            inv.status === 'overdue' ? 'bg-gh-red-light text-gh-red animate-pulse' :
                            inv.status === 'disputed' ? 'bg-gh-amber-light text-gh-amber' :
                            'bg-border text-text-secondary'
                          }`}>
                            {inv.status}
                          </span>
                        </div>

                        {inv.notes && (
                          <p className="text-[9px] text-text-secondary leading-normal italic bg-white p-1.5 rounded border border-border/40">
                            "{inv.notes}"
                          </p>
                        )}

                        <div className="space-y-1 text-[10px] font-mono border-t border-border/40 pt-2">
                          <div className="flex justify-between items-center text-text-muted">
                            <span>Lock Amount</span>
                            <strong className="text-text-primary font-bold">₱{inv.amount.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between items-center text-text-muted text-[9px]">
                            <span>Due Date</span>
                            <span className="text-text-secondary">{inv.due_date}</span>
                          </div>
                          {inv.paid_at && (
                            <div className="flex justify-between items-center text-text-muted text-[9px]">
                              <span>Settled At</span>
                              <span className="text-gh-green">{new Date(inv.paid_at).toLocaleDateString()}</span>
                            </div>
                          )}
                          {inv.payment_method && (
                            <div className="flex justify-between items-center text-text-muted text-[9px]">
                              <span>Method</span>
                              <span className="text-text-secondary uppercase">{inv.payment_method}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {isUnpaid && (
                          <div className="flex gap-2 pt-2 border-t border-border/30">
                            {activeRole === 'freelancer' && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingInvoice(inv);
                                    setEditInvoiceDueDate(inv.due_date);
                                    setEditInvoiceNotes(inv.notes || '');
                                    setIsEditInvoiceModalOpen(true);
                                  }}
                                  className="flex-1 py-1 text-center bg-white border border-border hover:bg-surface-0 rounded font-sans font-bold text-[9px] transition cursor-pointer"
                                >
                                  Edit Info
                                </button>
                                <button
                                  onClick={() => handleSendInvoiceReminder(inv.milestone_title, inv.amount, inv.id)}
                                  className="flex-1 py-1 text-center font-sans font-bold text-[9px] text-gh-teal hover:underline transition cursor-pointer"
                                >
                                  Reminder
                                </button>
                              </>
                            )}

                            {activeRole === 'client' && (
                              <>
                                <button
                                  onClick={() => {
                                    setPayingInvoice(inv);
                                    setPaymentMethod('gcash');
                                    setIsPayInvoiceModalOpen(true);
                                  }}
                                  className="flex-1 py-1 text-center bg-gh-teal hover:bg-gh-teal-hover text-white rounded font-sans font-bold text-[9px] transition cursor-pointer shadow-sm"
                                >
                                  Pay Invoice
                                </button>
                                <button
                                  onClick={() => handleMarkPaidManual(inv.id)}
                                  className="flex-1 py-1 text-center bg-surface-0 hover:bg-border/40 text-text-primary border border-border rounded font-sans font-semibold text-[9px] transition cursor-pointer"
                                >
                                  Mark Manual
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

        </div>
      </div>

      </div> {/* closes .flex-1.grid */}

      {/* D. FLOATING AI STREAMING DRAFT PANEL */}
      <AnimatePresence>
        {aiPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setAiPanelOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 inset-x-0 bg-white border-t border-border p-5 rounded-t-2xl shadow-2xl z-50 font-sans text-xs max-w-lg mx-auto"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-border">
                <div className="flex items-center gap-1.5 text-gh-teal">
                  <Sparkle size={18} weight="fill" className="animate-spin" />
                  <span className="font-sans font-bold text-xs uppercase tracking-wider text-gh-ink">
                    AI Client Communication Assistant
                  </span>
                </div>
                <button onClick={() => setAiPanelOpen(false)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <p className="text-text-secondary leading-relaxed font-sans">
                  Generate contextually appropriate messaging scripts automatically mapping to milestones completions, deliverables verification, or timeline audits.
                </p>

                <div className="p-4 bg-surface-0 border border-border rounded-xl font-sans text-xs text-text-primary min-h-[100px] max-h-[150px] overflow-y-auto leading-relaxed relative shadow-inner">
                  {aiDraftMessage}
                  {aiGenerating && (
                    <span className="inline-block w-1.5 h-3.5 bg-gh-teal ml-1 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-border">
                <button
                  onClick={() => setAiPanelOpen(false)}
                  className="px-3.5 py-1.5 border border-border hover:bg-surface-0 rounded font-semibold cursor-pointer"
                >
                  Discard Draft
                </button>
                <button
                  onClick={applyAIDraft}
                  disabled={aiGenerating}
                  className="px-4 py-1.5 text-white bg-gh-teal hover:bg-gh-teal-hover rounded font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Insert Draft Into Input
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* E. FREELANCER RELEASE ESCROW REQUEST MODAL */}
      <AnimatePresence>
        {isReleaseModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReleaseModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-20 max-w-md w-full bg-white border border-border p-5 rounded-xl shadow-xl z-50 font-sans text-xs"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-border">
                <div className="flex items-center gap-1.5 text-gh-teal">
                  <Receipt size={18} weight="fill" />
                  <span className="font-sans font-bold text-xs uppercase tracking-wider text-gh-ink">
                    Release Escrow Milestone Request
                  </span>
                </div>
                <button onClick={() => setIsReleaseModalOpen(false)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Select Target Milestone Payout</label>
                  <CustomDropdown
                    options={
                      [
                        { value: "", label: "-- Choose active milestone --" },
                        ...activeProject.milestones
                          .filter(m => m.status !== 'approved')
                          .map(m => ({
                            value: m.id,
                            label: `${m.title} (₱${m.amount.toLocaleString()})`
                          }))
                      ]
                    }
                    value={selectedMilestoneForRelease}
                    onChange={(val) => setSelectedMilestoneForRelease(val)}
                    placeholder="-- Choose active milestone --"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Deliverables Evidence Report</label>
                  <textarea
                    rows={4}
                    value={releaseWorkSummary}
                    onChange={(e) => setReleaseWorkSummary(e.target.value)}
                    placeholder="Provide hosting links, Git commit hashes, or staging endpoints. This information will be embedded in the immutable escrow signature ledger."
                    className="w-full font-sans px-3 py-2 border border-border rounded-md bg-surface-0 focus:outline-none focus:border-gh-teal resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsReleaseModalOpen(false)}
                  className="px-3.5 py-1.5 border border-border hover:bg-surface-0 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReleaseRequest}
                  disabled={!selectedMilestoneForRelease}
                  className="px-4 py-1.5 text-white bg-gh-teal hover:bg-gh-teal-hover rounded font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Transmit Signature Handshake
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* F. CREATE INVOICE MODAL */}
      <AnimatePresence>
        {isCreateInvoiceModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateInvoiceModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-20 max-w-md w-full bg-white border border-border p-5 rounded-xl shadow-xl z-50 font-sans text-xs"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-border">
                <div className="flex items-center gap-1.5 text-gh-teal">
                  <Receipt size={18} weight="fill" />
                  <span className="font-sans font-bold text-xs uppercase tracking-wider text-gh-ink">
                    Generate Milestone Escrow Invoice
                  </span>
                </div>
                <button onClick={() => setIsCreateInvoiceModalOpen(false)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Select Target Milestone</label>
                  <CustomDropdown
                    options={
                      [
                        { value: "", label: "-- Choose active milestone --" },
                        ...activeProject.milestones
                          .filter(m => !(activeProject.invoices || []).some(inv => inv.milestone_id === m.id))
                          .map(m => ({
                            value: m.id,
                            label: `${m.title} (₱${m.amount.toLocaleString()})`
                          }))
                      ]
                    }
                    value={newInvoiceMilestoneId}
                    onChange={(val) => setNewInvoiceMilestoneId(val)}
                    placeholder="-- Choose active milestone --"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Due Date</label>
                  <input
                    type="date"
                    value={newInvoiceDueDate}
                    onChange={(e) => setNewInvoiceDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md bg-white text-text-secondary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Notes / Terms Summary</label>
                  <textarea
                    rows={3}
                    value={newInvoiceNotes}
                    onChange={(e) => setNewInvoiceNotes(e.target.value)}
                    placeholder="Specify delivery notes or direct settlement instructions..."
                    className="w-full font-sans px-3 py-2 border border-border rounded-md bg-surface-0 focus:outline-none focus:border-gh-teal resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceModalOpen(false)}
                  className="px-3.5 py-1.5 border border-border hover:bg-surface-0 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateInvoice}
                  disabled={!newInvoiceMilestoneId}
                  className="px-4 py-1.5 text-white bg-gh-teal hover:bg-gh-teal-hover rounded font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Generate Securing Ledger Record
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* G. EDIT INVOICE MODAL */}
      <AnimatePresence>
        {isEditInvoiceModalOpen && editingInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditInvoiceModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-20 max-w-md w-full bg-white border border-border p-5 rounded-xl shadow-xl z-50 font-sans text-xs"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-border">
                <div className="flex items-center gap-1.5 text-gh-teal">
                  <Receipt size={18} weight="fill" />
                  <span className="font-sans font-bold text-xs uppercase tracking-wider text-gh-ink">
                    Edit Milestone Invoice Info
                  </span>
                </div>
                <button onClick={() => setIsEditInvoiceModalOpen(false)} className="text-text-muted hover:text-text-primary p-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] uppercase text-text-muted font-bold block">Invoice Identifier</span>
                  <span className="font-mono text-xs text-text-primary font-bold">{editingInvoice.id}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Due Date</label>
                  <input
                    type="date"
                    value={editInvoiceDueDate}
                    onChange={(e) => setEditInvoiceDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md bg-white text-text-secondary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-text-primary">Notes / Terms Summary</label>
                  <textarea
                    rows={3}
                    value={editInvoiceNotes}
                    onChange={(e) => setEditInvoiceNotes(e.target.value)}
                    className="w-full font-sans px-3 py-2 border border-border rounded-md bg-surface-0 focus:outline-none focus:border-gh-teal resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditInvoiceModalOpen(false)}
                  className="px-3.5 py-1.5 border border-border hover:bg-surface-0 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditInvoice}
                  className="px-4 py-1.5 text-white bg-gh-teal hover:bg-gh-teal-hover rounded font-bold shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PaymentInvoiceModal
        isOpen={isPayInvoiceModalOpen}
        onClose={() => setIsPayInvoiceModalOpen(false)}
        payingInvoice={payingInvoice}
        onPayConfirm={handlePaymentCommit}
      />

      {/* HUGE DEDICATED COLLABORATIVE LIVE WORKSPACE HUB OVERLAY (Task 3) */}
      <AnimatePresence>
        {isSharedWorkspaceOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden"
            >
              {/* Workspace Overlay Header */}
              <div className="p-4 bg-slate-50 border-b border-border flex items-center justify-between shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gh-teal/10 text-gh-teal rounded-lg">
                    <Kanban size={20} weight="fill" />
                  </div>
                  <div>
                    <h3 className="font-sans font-extrabold text-sm text-gh-ink uppercase tracking-wider">Shared Workspace Live Hub</h3>
                    <p className="text-[10px] text-text-muted leading-none">Collaborative workspace shared between Client and Freelancer.</p>
                  </div>
                </div>

                {/* Real-time Presence Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gh-teal/20 bg-gh-teal/5 text-[11px]">
                  {simOtherPeerActive ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-gh-green animate-pulse" />
                      <span className="font-sans font-bold text-gh-teal">
                        {activeRole === 'freelancer' ? activeProject.clientName : activeProject.freelancerName} (Active)
                      </span>
                      <span className="text-text-muted font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-border/50">
                        {simOtherPeerAction}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      <span className="font-sans font-bold text-text-muted">
                        {activeRole === 'freelancer' ? activeProject.clientName : activeProject.freelancerName} is idle/offline
                      </span>
                    </>
                  )}
                </div>



                {/* Close Overlay */}
                <button
                  onClick={() => setIsSharedWorkspaceOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-text-muted hover:text-text-primary cursor-pointer transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Workspace Content Viewport */}
              <div className="flex-grow overflow-hidden p-4 bg-slate-50/50">
                <SharedWorkspaceView
                  activeProject={activeProject}
                  onUpdateProject={onUpdateProject}
                  activeRole={activeRole}
                  showToast={showToast}
                  layoutMode="fullscreen"
                />
              </div>

              {/* Workspace Audit Ledger Footer */}
              <div className="p-3 bg-slate-100 border-t border-border shrink-0 select-none">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                  <ShieldCheck size={12} className="text-gh-teal" />
                  <span className="font-bold uppercase tracking-wider">COLLABORATIVE HISTORIC EVENT LEDGER</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-text-secondary leading-tight truncate">
                  {activeProject.auditLogs && activeProject.auditLogs.length > 0 ? (
                    <span>
                      [{new Date(activeProject.auditLogs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] {activeProject.auditLogs[0].action || (activeProject.auditLogs[0] as any).title}: {activeProject.auditLogs[0].details}
                    </span>
                  ) : (
                    <span>No workspace sync operations recorded yet.</span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
