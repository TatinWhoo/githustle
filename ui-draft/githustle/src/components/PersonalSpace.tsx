import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Plus, 
  Trash, 
  CheckSquare, 
  Square, 
  Check, 
  Warning, 
  Star, 
  PushPin, 
  DotsThree, 
  ArrowRight,
  Sparkle,
  Image as ImageIcon,
  TextH,
  TextT,
  ListBullets,
  FileCode,
  Notebook,
  PushPinSlash,
  Clock,
  Backspace,
  Paperclip,
  TrashSimple,
  PencilSimple,
  CalendarCheck,
  CaretRight,
  CaretLeft,
  X,
  FileText as FileTextIcon,
  Receipt,
  UserCheck,
  ArrowArcRight,
  Sparkle as SparkleIcon,
  FolderSimple,
  Kanban,
  Table
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Milestone } from '../types';
import CustomDropdown from './CustomDropdown';
import CustomPromptModal from './CustomPromptModal';
import FlowchartCanvas from './FlowchartCanvas';
import WorkspaceTable from './WorkspaceTable';
import { migrateFlowchart, migrateTable } from './SharedWorkspaceView';

// Editor block interface
interface EditorBlock {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'checklist' | 'code' | 'callout' | 'divider' | 'quote' | 'table';
  content: string;
  checked?: boolean;
  tableData?: string[][];
}

interface PersonalPage {
  id: string;
  title: string;
  icon: string;
  starred: boolean;
  coverImage: string | null;
  blocks: EditorBlock[];
  updatedAt: string;
}

interface StickyNote {
  id: string;
  text: string;
  color: 'yellow' | 'teal' | 'white' | 'pink';
  x: number;
  y: number;
  pinned: boolean;
}

interface Reminder {
  id: string;
  text: string;
  dueDate: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface CustomCalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'deadline' | 'meeting' | 'milestone' | 'personal' | 'proposal';
  priority?: 'high' | 'medium' | 'low' | 'critical';
  time?: string;
  notes?: string;
  completed?: boolean;
}

interface PersonalSpaceProps {
  projects: Project[];
  onUpdateProject?: (updated: Project) => void;
  showToast?: (msg: string) => void;
}

export default function PersonalSpace({ 
  projects = [],
  onUpdateProject,
  showToast
}: PersonalSpaceProps) {
  // Sidebar view selection: 'document' | 'sticky-board' | 'calendar' | 'reminders' | 'flowchart' | 'personal-tables'
  const [activeView, setActiveView] = useState<'document' | 'sticky-board' | 'calendar' | 'reminders' | 'flowchart' | 'personal-tables'>('document');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Debounced auto-save status: 'Saved' | 'Saving...' | 'Unsaved Changes'
  const [autoSaveState, setAutoSaveState] = useState<'Saved' | 'Saving...' | 'Unsaved'>('Saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Personal Tables states
  const [personalTables, setPersonalTables] = useState<any[]>(() => {
    const saved = localStorage.getItem('githustle_personal_tables');
    const raw = saved ? JSON.parse(saved) : [
      {
        id: 'ptable_1',
        name: 'My Personal Client Leads',
        columns: ['Lead Name', 'Company', 'Budget', 'Status'],
        rows: [
          ['Sari-Sari Tech', 'SariSari Inc.', '₱120,000', 'Prospecting'],
          ['E-Jeepney Logistics', 'PH Transit Corp', '₱450,000', 'Negotiating'],
          ['Palengke Delivery', 'Aling Maria Foods', '₱85,000', 'Won & Contracted']
        ],
        createdAt: new Date().toISOString()
      }
    ];
    return raw.map((t: any) => migrateTable(t));
  });
  const [selectedPersonalTableId, setSelectedPersonalTableId] = useState<string>(personalTables[0]?.id || '');

  // Derived active personal table
  const activePersonalTable = useMemo(() => {
    const raw = personalTables.find(t => t.id === selectedPersonalTableId) || personalTables[0];
    return raw ? migrateTable(raw) : null;
  }, [personalTables, selectedPersonalTableId]);

  // Sync personal tables with localStorage
  useEffect(() => {
    localStorage.setItem('githustle_personal_tables', JSON.stringify(personalTables));
  }, [personalTables]);

  // Personal Flowchart diagram states (Task 4)
  const [personalFlowcharts, setPersonalFlowcharts] = useState<any[]>(() => {
    const saved = localStorage.getItem('githustle_personal_flowcharts');
    return saved ? JSON.parse(saved) : [
      {
        id: 'pflow_default',
        name: 'My Personal Process Flow',
        elements: [
          { id: 'pnode_1', type: 'rectangle', x: 80, y: 80, label: 'Auth Middleware', color: '#14b8a6' },
          { id: 'pnode_2', type: 'oval', x: 260, y: 140, label: 'Escrow Handshake', color: '#22c55e' }
        ],
        createdAt: new Date().toISOString()
      }
    ];
  });
  const [selectedPersonalFlowchartId, setSelectedPersonalFlowchartId] = useState<string>(() => {
    return personalFlowcharts[0]?.id || 'pflow_default';
  });

  // Task 5E: Personal Flowchart Auto-Save Indicator
  const [personalSaveState, setPersonalSaveState] = useState<'Saved to Cloud Node' | 'Saving...' | 'Unsaved changes'>('Saved to Cloud Node');

  // Derive active flowchart
  const activePersonalFlowchart = useMemo(() => {
    const raw = personalFlowcharts.find(f => f.id === selectedPersonalFlowchartId) || personalFlowcharts[0];
    return raw ? migrateFlowchart(raw) : null;
  }, [personalFlowcharts, selectedPersonalFlowchartId]);

  const persistPersonalFlowchartChanges = (nds: any[], eds: any[]) => {
    if (!activePersonalFlowchart) return;
    setPersonalSaveState('Saving...');
    
    const updated = personalFlowcharts.map(f => {
      if (f.id === activePersonalFlowchart.id) {
        return {
          ...f,
          nodes: nds,
          edges: eds,
          elements: undefined
        };
      }
      return f;
    });
    setPersonalFlowcharts(updated);
    localStorage.setItem('githustle_personal_flowcharts', JSON.stringify(updated));
    setPersonalSaveState('Saved to Cloud Node');
  };

  const defaultPages: PersonalPage[] = [
    {
      id: 'page_1',
      title: 'GCash Webhook Specs & Validation Keys',
      icon: '🔌',
      starred: true,
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      blocks: [
        { id: 'b1', type: 'h1', content: 'Technical API Hook Scope' },
        { id: 'b2', type: 'callout', content: 'Local express node is binding on port 3000. All incoming sandbox GCash pay webhooks must route through secure signature validation filters.' },
        { id: 'b3', type: 'h2', content: 'Required Webhook Event Triggers' },
        { id: 'b4', type: 'checklist', content: 'gcash.payment.authorized (Hold and lock escrow)', checked: true },
        { id: 'b5', type: 'checklist', content: 'gcash.payment.disbursed (Finalize ledgers)', checked: false },
        { id: 'b6', type: 'divider', content: '' },
        { id: 'b7', type: 'quote', content: 'Verify payload signature with GCash public key in order to secure against spoof attacks.' },
        { id: 'b8', type: 'code', content: '// Secure check\nconst hash = crypto.createHmac("sha256", process.env.GCASH_API_SECRET);\nconst signature = hash.update(req.body).digest("hex");' }
      ],
      updatedAt: 'Jul 20, 9:15 AM'
    },
    {
      id: 'page_2',
      title: 'PostgreSQL Connection Pooling Strategy',
      icon: '🗄️',
      starred: false,
      coverImage: null,
      blocks: [
        { id: 'b2_1', type: 'h1', content: 'PgBouncer & Cloud SQL Configs' },
        { id: 'b2_2', type: 'paragraph', content: 'We need to benchmark maximum open client sockets during high concurrent transactions to prevent PostgreSQL CPU hitting 100% capacity.' },
        { id: 'b2_3', type: 'table', content: '', tableData: [
          ['Metric', 'Single Pool', 'Pooled (PgBouncer)'],
          ['Connect Latency', '85ms', '14ms'],
          ['Max Concurrent Users', '150', '2500'],
          ['CPU load under peak', '98%', '22%']
        ]}
      ],
      updatedAt: 'Jul 19, 4:30 PM'
    }
  ];

  const defaultStickies: StickyNote[] = [
    { id: 'st_1', text: 'Ask client Mia for direct GCash sandbox keys on Monday.', color: 'yellow', x: 40, y: 50, pinned: true },
    { id: 'st_2', text: 'Audit PostgreSQL composite index on driver coords (lat, long) before Wednesday freeze.', color: 'teal', x: 280, y: 80, pinned: false },
    { id: 'st_3', text: 'Confirm design sign-off on mobile viewport checkout button overlapping overlap error.', color: 'pink', x: 120, y: 260, pinned: false }
  ];

  const defaultReminders: Reminder[] = [
    { id: 'rem_1', text: 'Benchmark GCash webhook callback latency under 150ms.', dueDate: '2026-07-21', completed: false, priority: 'high' },
    { id: 'rem_2', text: 'Tune Cloud SQL index queries and write audit logs.', dueDate: '2026-07-22', completed: true, priority: 'medium' },
    { id: 'rem_3', text: 'Confirm viewport CSS overlaps on older iOS browser models.', dueDate: '2026-07-20', completed: false, priority: 'high' },
    { id: 'rem_4', text: 'Submit weekly milestone billing hours ledger.', dueDate: '2026-07-26', completed: false, priority: 'low' }
  ];

  // PERSISTENCE LAYERS: Pages
  const [pages, setPages] = useState<PersonalPage[]>(() => {
    const saved = localStorage.getItem('githustle_notion_pages');
    return saved ? JSON.parse(saved) : defaultPages;
  });
  const [selectedPageId, setSelectedPageId] = useState<string>(() => {
    return pages[0]?.id || 'page_1';
  });

  // PERSISTENCE LAYERS: Sticky Notes
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem('githustle_whiteboard_notes');
    return saved ? JSON.parse(saved) : defaultStickies;
  });

  // PERSISTENCE LAYERS: Reminders
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('githustle_reminders');
    return saved ? JSON.parse(saved) : defaultReminders;
  });

  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderPriority, setNewReminderPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Trigger auto-save write
  const triggerAutoSaveWrite = (updatedPages: PersonalPage[]) => {
    setAutoSaveState('Saving...');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('githustle_notion_pages', JSON.stringify(updatedPages));
      setAutoSaveState('Saved');
    }, 600); // 600ms on typing completion
  };

  // Sync state writes
  useEffect(() => {
    localStorage.setItem('githustle_whiteboard_notes', JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  useEffect(() => {
    localStorage.setItem('githustle_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Clean timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // PERSISTENCE LAYERS: Personal Calendar Custom Events & Notes
  const [userCustomEvents, setUserCustomEvents] = useState<CustomCalendarEvent[]>(() => {
    const saved = localStorage.getItem('githustle_personal_calendar_events');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: 'ev_1', date: '2026-07-22', title: 'GCash Webhook Code Freeze', type: 'deadline', priority: 'high', notes: 'Complete all endpoint tests before 5 PM' },
      { id: 'ev_2', date: '2026-07-25', title: 'Staging Delivery Review', type: 'meeting', priority: 'medium', time: '14:00' },
      { id: 'ev_4', date: '2026-07-15', title: 'Postgres Connection Tuner Audit', type: 'personal', priority: 'low' }
    ];
  });

  const [dayNotesMap, setDayNotesMap] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('githustle_personal_calendar_day_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      '2026-07-20': 'Client sync at 10 AM. Review API response payloads.'
    };
  });

  const [currentCalDate, setCurrentCalDate] = useState<Date>(() => new Date(2026, 6, 1));
  const [selectedDay, setSelectedDay] = useState<string>('2026-07-20');
  const [selectedDateModal, setSelectedDateModal] = useState<string | null>(null);

  // Modal new event form state
  const [modalNewTitle, setModalNewTitle] = useState('');
  const [modalNewType, setModalNewType] = useState<'deadline' | 'meeting' | 'milestone' | 'personal'>('deadline');
  const [modalNewPriority, setModalNewPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [modalNewTime, setModalNewTime] = useState('');
  const [modalNewNotes, setModalNewNotes] = useState('');

  useEffect(() => {
    localStorage.setItem('githustle_personal_calendar_events', JSON.stringify(userCustomEvents));
  }, [userCustomEvents]);

  useEffect(() => {
    localStorage.setItem('githustle_personal_calendar_day_notes', JSON.stringify(dayNotesMap));
  }, [dayNotesMap]);

  // Custom prompt and confirm states
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [promptPlaceholder, setPromptPlaceholder] = useState('');
  const [promptDefaultValue, setPromptDefaultValue] = useState('');
  const [promptOnConfirm, setPromptOnConfirm] = useState<(val: string) => void>(() => () => {});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [confirmOnConfirm, setConfirmOnConfirm] = useState<() => void>(() => () => {});

  const triggerPrompt = (title: string, description: string, placeholder: string, defaultValue: string, onConfirm: (val: string) => void) => {
    setPromptTitle(title);
    setPromptDescription(description);
    setPromptPlaceholder(placeholder);
    setPromptDefaultValue(defaultValue);
    setPromptOnConfirm(() => onConfirm);
    setPromptOpen(true);
  };

  const triggerConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmTitle(title);
    setConfirmDescription(description);
    setConfirmOnConfirm(() => onConfirm);
    setConfirmOpen(true);
  };

  // Slash command menu states
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Compute active page
  const activePage = useMemo(() => {
    return pages.find(p => p.id === selectedPageId) || pages[0];
  }, [pages, selectedPageId]);

  // Dynamic Calendar Sync: Milestones + Custom on the fly
  const calendarEvents = useMemo(() => {
    const events = [...userCustomEvents];
    
    projects.forEach(proj => {
      proj.milestones.forEach(ms => {
        // Enforce July 2026 format for viewability, fallback to standard
        const targetDate = ms.dueDate;
        events.push({
          id: `ms_ev_${ms.id}`,
          date: targetDate,
          title: `${proj.jobTitle.slice(0, 15)}... - ${ms.title}`,
          type: ms.status === 'approved' ? 'completed' : ms.status === 'submitted' ? 'review' : 'milestone'
        });
      });
    });

    return events;
  }, [projects, userCustomEvents]);

  // Document view helper handlers
  const handleUpdatePageTitle = (val: string) => {
    const updated = pages.map(p => {
      if (p.id === selectedPageId) {
        return { ...p, title: val, updatedAt: 'Just now' };
      }
      return p;
    });
    setPages(updated);
    triggerAutoSaveWrite(updated);
  };

  const handleUpdateBlockContent = (blockId: string, val: string) => {
    const updated = pages.map(p => {
      if (p.id === selectedPageId) {
        const updatedBlocks = p.blocks.map(b => {
          if (b.id === blockId) {
            return { ...b, content: val };
          }
          return b;
        });
        return { ...p, blocks: updatedBlocks, updatedAt: 'Just now' };
      }
      return p;
    });
    setPages(updated);
    triggerAutoSaveWrite(updated);
  };

  const handleToggleBlockChecked = (blockId: string) => {
    const updated = pages.map(p => {
      if (p.id === selectedPageId) {
        const updatedBlocks = p.blocks.map(b => {
          if (b.id === blockId) {
            return { ...b, checked: !b.checked };
          }
          return b;
        });
        return { ...p, blocks: updatedBlocks };
      }
      return p;
    });
    setPages(updated);
    localStorage.setItem('githustle_notion_pages', JSON.stringify(updated));
  };

  const handleUpdateTableCell = (blockId: string, rowIndex: number, colIndex: number, val: string) => {
    const updated = pages.map(p => {
      if (p.id === selectedPageId) {
        const updatedBlocks = p.blocks.map(b => {
          if (b.id === blockId && b.tableData) {
            const data = b.tableData.map((row, rIdx) => 
              row.map((cell, cIdx) => (rIdx === rowIndex && cIdx === colIndex) ? val : cell)
            );
            return { ...b, tableData: data };
          }
          return b;
        });
        return { ...p, blocks: updatedBlocks, updatedAt: 'Just now' };
      }
      return p;
    });
    setPages(updated);
    triggerAutoSaveWrite(updated);
  };

  const handleDeleteBlock = (blockId: string) => {
    const updated = pages.map(p => {
      if (p.id === selectedPageId) {
        return { ...p, blocks: p.blocks.filter(b => b.id !== blockId) };
      }
      return p;
    });
    setPages(updated);
    localStorage.setItem('githustle_notion_pages', JSON.stringify(updated));
  };

  const handleAddBlock = (type: EditorBlock['type']) => {
    if (!activePage) return;
    
    const newBlock: EditorBlock = {
      id: `block_${Date.now()}`,
      type,
      content: type === 'checklist' ? 'List item parameter...' : type === 'code' ? '// write code...' : 'New text spec...'
    };

    if (type === 'checklist') {
      newBlock.checked = false;
    } else if (type === 'table') {
      newBlock.tableData = [
        ['Heading Column 1', 'Column 2', 'Column 3'],
        ['Specs A', 'Spec B', 'Metric C'],
        ['120ms', 'Enabled', 'Verified']
      ];
    }

    const updated = pages.map(p => {
      if (p.id === selectedPageId) {
        let index = p.blocks.findIndex(b => b.id === activeBlockId);
        if (index === -1) index = p.blocks.length - 1;
        
        const b = [...p.blocks];
        b.splice(index + 1, 0, newBlock);
        return { ...p, blocks: b };
      }
      return p;
    });

    setPages(updated);
    localStorage.setItem('githustle_notion_pages', JSON.stringify(updated));
    setSlashMenuOpen(false);
  };

  // Create page
  const handleCreateNewPage = () => {
    const newP: PersonalPage = {
      id: `page_${Date.now()}`,
      title: 'Untitled Specification Workspace',
      icon: '📄',
      starred: false,
      coverImage: null,
      blocks: [
        { id: `b_${Date.now()}_1`, type: 'h1', content: 'New Specification Document' },
        { id: `b_${Date.now()}_2`, type: 'paragraph', content: 'Type / in empty block areas to display block layout formatting controls.' }
      ],
      updatedAt: 'Just now'
    };
    const updated = [newP, ...pages];
    setPages(updated);
    localStorage.setItem('githustle_notion_pages', JSON.stringify(updated));
    setSelectedPageId(newP.id);
    setActiveView('document');
  };

  const handleDeletePage = (id: string) => {
    if (pages.length <= 1) return;
    const remaining = pages.filter(p => p.id !== id);
    setPages(remaining);
    localStorage.setItem('githustle_notion_pages', JSON.stringify(remaining));
    setSelectedPageId(remaining[0].id);
  };

  const handleToggleStarPage = (id: string) => {
    const updated = pages.map(p => p.id === id ? { ...p, starred: !p.starred } : p);
    setPages(updated);
    localStorage.setItem('githustle_notion_pages', JSON.stringify(updated));
  };

  // Sticky board helpers
  const handleCreateStickyNote = () => {
    const colors: StickyNote['color'][] = ['yellow', 'teal', 'pink', 'white'];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const newNote: StickyNote = {
      id: `st_${Date.now()}`,
      text: 'Double click to jot notes, drag around or toggle pin metrics.',
      color: col,
      x: 100 + Math.random() * 150,
      y: 100 + Math.random() * 150,
      pinned: false
    };
    setStickyNotes([...stickyNotes, newNote]);
  };

  const handleUpdateStickyText = (id: string, text: string) => {
    setStickyNotes(stickyNotes.map(st => st.id === id ? { ...st, text } : st));
  };

  const handleTogglePinSticky = (id: string) => {
    setStickyNotes(stickyNotes.map(st => st.id === id ? { ...st, pinned: !st.pinned } : st));
  };

  const handleDeleteSticky = (id: string) => {
    setStickyNotes(stickyNotes.filter(st => st.id !== id));
  };

  // Draggable Absolute Position Logic
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDownNote = (e: React.MouseEvent, noteId: string) => {
    const note = stickyNotes.find(st => st.id === noteId);
    if (!note || note.pinned) return;
    setDraggingNoteId(noteId);
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingNoteId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 100; // Center offset
    const y = e.clientY - rect.top - 80;

    // Boundary constraints
    const safeX = Math.max(10, Math.min(rect.width - 210, x));
    const safeY = Math.max(10, Math.min(rect.height - 190, y));

    setStickyNotes(prev => prev.map(n => n.id === draggingNoteId ? { ...n, x: safeX, y: safeY } : n));
  };

  const handleMouseUpCanvas = () => {
    setDraggingNoteId(null);
  };

  // Dynamic Month layout days
  const calYear = currentCalDate.getFullYear();
  const calMonth = currentCalDate.getMonth(); // 0-indexed

  const monthDays = useMemo(() => {
    const days = [];
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      const dStr = i < 10 ? `0${i}` : `${i}`;
      const mStr = (calMonth + 1) < 10 ? `0${calMonth + 1}` : `${calMonth + 1}`;
      days.push(`${calYear}-${mStr}-${dStr}`);
    }
    return days;
  }, [calYear, calMonth]);

  // First day of month offset (0 = Mon, 6 = Sun)
  const monthStartOffset = useMemo(() => {
    const day = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun, 1 = Mon...
    return day === 0 ? 6 : day - 1;
  }, [calYear, calMonth]);

  const monthYearLabel = useMemo(() => {
    return currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentCalDate]);

  const handlePrevCalMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextCalMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayCalMonth = () => {
    const now = new Date();
    setCurrentCalDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const dStr = now.toISOString().split('T')[0];
    setSelectedDay(dStr);
    setSelectedDateModal(dStr);
  };

  const handleAddModalEvent = (dateStr: string) => {
    if (!modalNewTitle.trim()) {
      showToast?.('Title is required for a deadline or event.');
      return;
    }
    const newEv: CustomCalendarEvent = {
      id: `ev_${Date.now()}`,
      date: dateStr,
      title: modalNewTitle.trim(),
      type: modalNewType,
      priority: modalNewPriority,
      time: modalNewTime.trim() || undefined,
      notes: modalNewNotes.trim() || undefined,
      completed: false
    };
    setUserCustomEvents(prev => [newEv, ...prev]);
    setModalNewTitle('');
    setModalNewTime('');
    setModalNewNotes('');
    showToast?.(`Deadline added for ${dateStr}.`);
  };

  const handleToggleEventCompleted = (eventId: string) => {
    setUserCustomEvents(prev =>
      prev.map(e => e.id === eventId ? { ...e, completed: !e.completed } : e)
    );
  };

  const handleDeleteCalendarEvent = (eventId: string) => {
    setUserCustomEvents(prev => prev.filter(e => e.id !== eventId));
    showToast?.('Event removed.');
  };

  const handleUpdateDayNotes = (dateStr: string, text: string) => {
    setDayNotesMap(prev => ({ ...prev, [dateStr]: text }));
  };

  // Compute active daily list
  const activeDayEvents = useMemo(() => {
    const events = calendarEvents.filter(e => e.date === selectedDay);
    
    // Also locate actual system milestones matching selectedDay
    const systemMatches: { id: string; milestone: Milestone; proj: Project }[] = [];
    projects.forEach(proj => {
      proj.milestones.forEach(m => {
        if (m.dueDate === selectedDay) {
          systemMatches.push({ id: `sys_ms_${m.id}`, milestone: m, proj });
        }
      });
    });

    return { events, systemMatches };
  }, [calendarEvents, projects, selectedDay]);

  const handleAddCalendarEvent = (title: string) => {
    if (!title.trim()) return;
    const newEv = {
      id: `ev_${Date.now()}`,
      date: selectedDay,
      title,
      type: 'meeting'
    };
    setUserCustomEvents([...userCustomEvents, newEv]);
  };

  // Reminders Actions
  const handleAddReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;

    const newRem: Reminder = {
      id: `rem_${Date.now()}`,
      text: newReminderText,
      dueDate: selectedDay,
      completed: false,
      priority: newReminderPriority
    };

    setReminders([newRem, ...reminders]);
    setNewReminderText('');
  };

  const handleToggleReminder = (id: string) => {
    setReminders(reminders.map(rem => rem.id === id ? { ...rem, completed: !rem.completed } : rem));
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(rem => rem.id !== id));
  };

  return (
    <div className="flex-grow flex flex-col bg-white rounded-2xl border border-border overflow-hidden h-[calc(100dvh-140px)] lg:h-[740px] max-h-[85dvh] min-h-[500px] shadow-[0_1px_3px_rgba(15,25,35,0.04)] text-xs text-text-primary">
      
      {/* Mobile Control Header Bar */}
      <div className="lg:hidden flex items-center justify-between bg-surface-0 border-b border-border p-3 shrink-0 select-none">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-sans font-bold text-text-secondary cursor-pointer hover:bg-slate-50 transition"
        >
          {mobileSidebarOpen ? 'Hide Menu' : 'View Menu'}
          <span className="w-1.5 h-1.5 rounded-full bg-gh-teal" />
        </button>
        <span className="font-sans font-bold text-xs text-gh-ink tracking-tight">
          {activeView === 'document' ? 'Workspace Spec Editor' :
           activeView === 'sticky-board' ? 'Sticky Whiteboard' :
           activeView === 'calendar' ? 'Milestones Logs' :
           activeView === 'reminders' ? 'Personal To-dos' :
           activeView === 'flowchart' ? 'Personal Flowcharts' :
           'Personal Spreadsheets'}
        </span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gh-teal animate-pulse" />
          <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider">{autoSaveState}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden h-full">
        
        {/* 1. WORKSPACE SIDEBAR */}
        <aside className={`${mobileSidebarOpen ? 'flex' : 'hidden'} lg:flex lg:col-span-3 bg-surface-0 border-r border-border flex-col h-full overflow-hidden`}>
        
        {/* User Card */}
        <div className="p-4 border-b border-border flex items-center gap-3 bg-white shrink-0">
          <div className="w-9 h-9 rounded-full bg-gh-teal-light text-gh-teal flex items-center justify-center font-bold text-xs border border-gh-teal/10">
            CM
          </div>
          <div>
            <span className="font-sans font-bold text-xs text-gh-ink block leading-none">Notion Workspace</span>
            <span className="font-mono text-[9px] text-text-muted block mt-1 uppercase tracking-wider font-bold">Carlo Mendoza</span>
          </div>
        </div>

        {/* Action Row */}
        <div className="p-3 bg-white/20 shrink-0">
          <button
            onClick={handleCreateNewPage}
            className="w-full py-2 bg-gh-teal hover:bg-gh-teal-hover text-white text-xs font-sans font-bold rounded-md transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
          >
            <Plus size={14} weight="bold" />
            <span>New Spec Page</span>
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          
          <div className="space-y-1">
            <p className="text-[9px] uppercase font-mono font-bold text-text-muted tracking-wider px-2">Global Views</p>
            
            <button
              onClick={() => { setActiveView('sticky-board'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md font-sans text-xs transition cursor-pointer ${
                activeView === 'sticky-board' ? 'bg-gh-teal/10 text-gh-teal-hover font-semibold' : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              <PushPin size={15} className={activeView === 'sticky-board' ? 'text-gh-teal' : 'text-text-muted'} />
              <span>Sticky Whiteboard</span>
            </button>

            <button
              onClick={() => { setActiveView('calendar'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md font-sans text-xs transition cursor-pointer ${
                activeView === 'calendar' ? 'bg-gh-teal/10 text-gh-teal-hover font-semibold' : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              <Calendar size={15} className={activeView === 'calendar' ? 'text-gh-teal' : 'text-text-muted'} />
              <span>Milestones & Logs</span>
            </button>

            <button
              onClick={() => { setActiveView('reminders'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md font-sans text-xs transition cursor-pointer ${
                activeView === 'reminders' ? 'bg-gh-teal/10 text-gh-teal-hover font-semibold' : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              <CheckSquare size={15} className={activeView === 'reminders' ? 'text-gh-teal' : 'text-text-muted'} />
              <span>Personal To-dos</span>
            </button>

            <button
              onClick={() => { setActiveView('flowchart'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md font-sans text-xs transition cursor-pointer ${
                activeView === 'flowchart' ? 'bg-gh-teal/10 text-gh-teal-hover font-semibold' : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              <Kanban size={15} className={activeView === 'flowchart' ? 'text-gh-teal' : 'text-text-muted'} />
              <span>Personal Flowcharts</span>
            </button>

            <button
              onClick={() => { setActiveView('personal-tables'); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md font-sans text-xs transition cursor-pointer ${
                activeView === 'personal-tables' ? 'bg-gh-teal/10 text-gh-teal-hover font-semibold' : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              <Table size={15} className={activeView === 'personal-tables' ? 'text-gh-teal' : 'text-text-muted'} />
              <span>Personal Tables</span>
            </button>
          </div>

          {/* STARRED SPECIFICATION DOCUMENTS */}
          {pages.some(p => p.starred) && (
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-mono font-bold text-text-muted tracking-wider px-2">Starred Pages</p>
              {pages.filter(p => p.starred).map(p => (
                <button
                  key={`starred-${p.id}`}
                  onClick={() => { setSelectedPageId(p.id); setActiveView('document'); setMobileSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-md text-xs font-sans transition cursor-pointer ${
                    activeView === 'document' && selectedPageId === p.id ? 'bg-gh-teal/10 text-gh-teal-hover font-semibold' : 'text-text-secondary hover:bg-black/5'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate max-w-[150px]">
                    <span>{p.icon}</span>
                    <span className="truncate">{p.title}</span>
                  </span>
                  <Star size={12} weight="fill" className="text-gh-amber shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* PAGES SYSTEM DOCUMENT TREE */}
          <div className="space-y-1">
            <p className="text-[9px] uppercase font-mono font-bold text-text-muted tracking-wider px-2">Documents Tree</p>
            {pages.map(p => {
              const isSelected = activeView === 'document' && selectedPageId === p.id;
              return (
                <div
                  key={p.id}
                  className={`group w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-sans transition cursor-pointer ${
                    isSelected ? 'bg-gh-teal/10 text-gh-teal-hover font-semibold' : 'text-text-secondary hover:bg-black/5'
                  }`}
                  onClick={() => { setSelectedPageId(p.id); setActiveView('document'); setMobileSidebarOpen(false); }}
                >
                  <span className="flex items-center gap-2 truncate max-w-[140px]">
                    <span className="shrink-0">{p.icon}</span>
                    <span className="truncate">{p.title}</span>
                  </span>
                  
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleStarPage(p.id); }}
                      className="p-0.5 text-text-muted hover:text-gh-amber cursor-pointer"
                    >
                      <Star size={11} weight={p.starred ? 'fill' : 'regular'} className={p.starred ? 'text-gh-amber' : ''} />
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePage(p.id); }}
                        className="p-0.5 text-text-muted hover:text-gh-red cursor-pointer"
                      >
                        <TrashSimple size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Interactive feedback saving bar */}
        <div className="p-3 border-t border-border bg-white text-[10px] text-text-muted flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${autoSaveState === 'Saving...' ? 'bg-gh-amber animate-ping' : 'bg-gh-green'}`}></span>
            <span className="font-mono uppercase tracking-wider font-bold">Autosave Engine</span>
          </div>
          <span className="font-mono uppercase tracking-wider font-bold text-gh-teal">{autoSaveState}</span>
        </div>

      </aside>

      {/* 2. RIGHT DISPLAY PORTAL */}
      <section className="lg:col-span-9 h-full flex flex-col overflow-hidden bg-surface-0 relative">
        
        {/* TOP LEVEL SUB-TAB STRIP */}
        <div className="p-3 border-b border-border bg-white shrink-0">
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none snap-x">
            {[
              { id: 'document', label: 'Documents', icon: FileText, view: 'document' as const },
              { id: 'sticky-board', label: 'Board', icon: PushPin, view: 'sticky-board' as const },
              { id: 'tables', label: 'Tables', icon: Table, view: 'personal-tables' as const },
              { id: 'flowchart', label: 'Flowchart', icon: Kanban, view: 'flowchart' as const },
              { id: 'calendar', label: 'Calendar', icon: Calendar, view: 'calendar' as const },
              { id: 'reminders', label: 'Reminders', icon: CheckSquare, view: 'reminders' as const }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeView === tab.view;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveView(tab.view);
                    setMobileSidebarOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition whitespace-nowrap cursor-pointer snap-center select-none ${
                    isActive 
                      ? 'bg-white text-gh-teal shadow-sm font-bold' 
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  style={{ minWidth: 'max-content' }}
                >
                  <Icon size={14} className={isActive ? 'text-gh-teal' : 'text-text-muted'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* A. NOTION DOCUMENT EDITOR VIEW */}
        {activeView === 'document' && activePage && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            
            {activePage.coverImage ? (
              <div className="h-24 w-full overflow-hidden relative shrink-0">
                <img 
                  src={activePage.coverImage} 
                  alt="cover" 
                  className="w-full h-full object-cover filter brightness-75"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => {
                    const updated = pages.map(p => p.id === selectedPageId ? { ...p, coverImage: null } : p);
                    setPages(updated);
                    localStorage.setItem('githustle_notion_pages', JSON.stringify(updated));
                  }}
                  className="absolute right-3 top-3 text-[10px] font-mono uppercase bg-black/60 hover:bg-black/80 px-2 py-1 rounded text-white font-bold cursor-pointer transition"
                >
                  Remove Cover
                </button>
              </div>
            ) : (
              <div className="pt-4 px-8 shrink-0 bg-white">
                <button
                  onClick={() => {
                    const updated = pages.map(p => p.id === selectedPageId ? { ...p, coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80' } : p);
                    setPages(updated);
                    localStorage.setItem('githustle_notion_pages', JSON.stringify(updated));
                  }}
                  className="text-[10px] font-mono text-text-muted hover:text-text-primary uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon size={12} />
                  <span>Add cover header</span>
                </button>
              </div>
            )}

            <div className="px-8 pt-4 pb-2 border-b border-border/40 bg-white shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const icons = ['🗄️', '🔌', '📄', '🛡️', '⚡', '🤖', '👑', '⚙️'];
                    const next = icons[(icons.indexOf(activePage.icon) + 1) % icons.length];
                    const updated = pages.map(p => p.id === selectedPageId ? { ...p, icon: next } : p);
                    setPages(updated);
                    localStorage.setItem('githustle_notion_pages', JSON.stringify(updated));
                  }}
                  className="text-2xl p-1 bg-surface-0 hover:bg-border/40 rounded transition cursor-pointer animate-pulse"
                  title="Cycle Icon badge"
                >
                  {activePage.icon}
                </button>

                <div className="font-mono text-[10px] text-text-muted flex items-center gap-1 uppercase tracking-wider font-bold">
                  <span>Workspace</span>
                  <CaretRight size={10} />
                  <span>Docs Tree</span>
                  <CaretRight size={10} />
                  <span className="text-gh-teal">{activePage.title.slice(0, 18)}...</span>
                </div>
              </div>

              <div className="text-[10px] text-text-muted font-mono font-bold flex items-center gap-1">
                <Clock size={11} />
                <span>Last edited: {activePage.updatedAt}</span>
              </div>
            </div>

            {/* Document Blocks List */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 bg-white relative">
              
              <input
                type="text"
                value={activePage.title}
                onChange={(e) => handleUpdatePageTitle(e.target.value)}
                className="w-full font-sans font-bold text-2xl text-gh-ink border-b border-transparent hover:border-border/40 focus:border-gh-teal focus:outline-none pb-1.5 mb-2"
                placeholder="Document specifications title..."
              />

              <div className="space-y-3 pb-24">
                {activePage.blocks.map((block) => (
                  <div 
                    key={block.id} 
                    className="relative group flex items-start gap-2 text-xs"
                    onClick={() => setActiveBlockId(block.id)}
                  >
                    
                    {/* Left control block bar */}
                    <div className="absolute -left-6 top-0.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 z-20">
                      <button
                        onClick={() => {
                          setActiveBlockId(block.id);
                          setSlashMenuOpen(!slashMenuOpen);
                        }}
                        className="p-0.5 bg-surface-0 hover:bg-border rounded text-text-muted cursor-pointer"
                        title="Block Formatter Menu"
                      >
                        <Plus size={10} weight="bold" />
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-0.5 bg-surface-0 hover:bg-gh-red-light rounded text-text-muted hover:text-gh-red cursor-pointer"
                        title="Delete Block"
                      >
                        <Trash size={10} />
                      </button>
                    </div>

                    {/* Paragraph */}
                    {block.type === 'paragraph' && (
                      <textarea
                        rows={1}
                        value={block.content}
                        onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                        placeholder="Type spec details or '/' for slash command settings..."
                        className="w-full bg-transparent focus:outline-none focus:bg-surface-0 rounded px-1.5 py-0.5 text-text-secondary leading-relaxed resize-none font-sans"
                      />
                    )}

                    {/* Headings */}
                    {block.type === 'h1' && (
                      <input
                        type="text"
                        value={block.content}
                        onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                        placeholder="Heading 1..."
                        className="w-full font-sans font-bold text-lg text-gh-ink bg-transparent focus:outline-none"
                      />
                    )}
                    {block.type === 'h2' && (
                      <input
                        type="text"
                        value={block.content}
                        onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                        placeholder="Heading 2..."
                        className="w-full font-sans font-bold text-sm text-gh-ink bg-transparent focus:outline-none mt-2"
                      />
                    )}
                    {block.type === 'h3' && (
                      <input
                        type="text"
                        value={block.content}
                        onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                        placeholder="Heading 3..."
                        className="w-full font-sans font-bold text-xs text-text-primary bg-transparent focus:outline-none mt-1"
                      />
                    )}

                    {/* Checklist */}
                    {block.type === 'checklist' && (
                      <div className="flex items-start gap-2 w-full px-1.5 py-0.5 hover:bg-surface-0 rounded">
                        <button
                          type="button"
                          onClick={() => handleToggleBlockChecked(block.id)}
                          className="mt-0.5 shrink-0 text-gh-teal cursor-pointer"
                        >
                          {block.checked ? (
                            <CheckSquare size={15} weight="bold" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                        <textarea
                          rows={1}
                          value={block.content}
                          onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                          className={`w-full bg-transparent focus:outline-none resize-none leading-relaxed text-text-secondary ${block.checked ? 'line-through text-text-muted' : ''}`}
                        />
                      </div>
                    )}

                    {/* Divider */}
                    {block.type === 'divider' && (
                      <div className="w-full py-2 shrink-0">
                        <div className="border-t border-border/70" />
                      </div>
                    )}

                    {/* Quotes */}
                    {block.type === 'quote' && (
                      <div className="w-full pl-3.5 border-l-2 border-gh-teal/50 py-1 bg-surface-0 rounded-r-md">
                        <textarea
                          rows={1}
                          value={block.content}
                          onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                          className="w-full bg-transparent focus:outline-none text-text-secondary font-sans italic resize-none leading-relaxed text-xs"
                          placeholder="Quote parameters..."
                        />
                      </div>
                    )}

                    {/* Callouts */}
                    {block.type === 'callout' && (
                      <div className="w-full p-3.5 bg-gh-amber-light/35 border border-gh-amber/15 rounded-xl flex items-start gap-2.5">
                        <Warning size={16} className="text-gh-amber shrink-0 mt-0.5 animate-pulse" />
                        <textarea
                          rows={2}
                          value={block.content}
                          onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                          className="w-full bg-transparent focus:outline-none text-text-secondary leading-relaxed resize-none text-[11px]"
                          placeholder="Observed warning spec block..."
                        />
                      </div>
                    )}

                    {/* Code Blocks */}
                    {block.type === 'code' && (
                      <div className="w-full p-3.5 bg-gh-ink rounded-lg text-white border border-white/5 font-mono text-[11px] leading-relaxed relative">
                        <span className="absolute right-2 top-2 font-mono text-[8px] uppercase tracking-wider text-white/30 font-bold">JavaScript</span>
                        <textarea
                          rows={4}
                          value={block.content}
                          onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                          className="w-full bg-transparent focus:outline-none font-mono text-white/95 leading-normal resize-none"
                          placeholder="// write code..."
                        />
                      </div>
                    )}

                    {/* Tables */}
                    {block.type === 'table' && block.tableData && (
                      <div className="w-full overflow-x-auto border border-border rounded-lg bg-surface-0">
                        <table className="w-full text-xs text-left">
                          <tbody className="divide-y divide-border">
                            {block.tableData.map((row, rIdx) => (
                              <tr key={rIdx} className={rIdx === 0 ? 'bg-white font-bold' : ''}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-2 border-r border-border">
                                    <input
                                      type="text"
                                      value={cell}
                                      onChange={(e) => handleUpdateTableCell(block.id, rIdx, cIdx, e.target.value)}
                                      className="w-full bg-transparent focus:outline-none text-[11px] font-sans"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                ))}
              </div>

            </div>

            {/* Float Slash Menu */}
            <AnimatePresence>
              {slashMenuOpen && (
                <div className="absolute left-10 bottom-12 bg-white border border-border shadow-lg rounded-lg p-2 max-w-[200px] w-full z-30 font-sans text-xs space-y-1">
                  <span className="text-[9px] uppercase font-mono font-bold text-text-muted px-2 block border-b border-border pb-1">Insert Block</span>
                  <button onClick={() => handleAddBlock('paragraph')} className="w-full text-left px-2 py-1.5 hover:bg-surface-0 rounded flex items-center gap-1.5 cursor-pointer">
                    <TextT size={14} /> <span>Paragraph</span>
                  </button>
                  <button onClick={() => handleAddBlock('h1')} className="w-full text-left px-2 py-1.5 hover:bg-surface-0 rounded flex items-center gap-1.5 cursor-pointer">
                    <TextH size={14} weight="bold" /> <span>Heading 1</span>
                  </button>
                  <button onClick={() => handleAddBlock('h2')} className="w-full text-left px-2 py-1.5 hover:bg-surface-0 rounded flex items-center gap-1.5 cursor-pointer">
                    <TextH size={14} /> <span>Heading 2</span>
                  </button>
                  <button onClick={() => handleAddBlock('checklist')} className="w-full text-left px-2 py-1.5 hover:bg-surface-0 rounded flex items-center gap-1.5 cursor-pointer">
                    <CheckSquare size={14} /> <span>Checklist</span>
                  </button>
                  <button onClick={() => handleAddBlock('code')} className="w-full text-left px-2 py-1.5 hover:bg-surface-0 rounded flex items-center gap-1.5 cursor-pointer">
                    <FileCode size={14} /> <span>Code Snippet</span>
                  </button>
                  <button onClick={() => handleAddBlock('callout')} className="w-full text-left px-2 py-1.5 hover:bg-surface-0 rounded flex items-center gap-1.5 cursor-pointer">
                    <Warning size={14} /> <span>Warning Alert</span>
                  </button>
                </div>
              )}
            </AnimatePresence>

            <div className="p-2.5 bg-surface-0 border-t border-border text-[10px] text-text-muted flex justify-between shrink-0 font-mono">
              <span>Press the '+' icon next to any line to insert modular specification blocks.</span>
              <span>Immunity Checksum Status: Active</span>
            </div>

          </div>
        )}

        {/* B. STICKY NOTES BOARD WHITEBOARD VIEW */}
        {activeView === 'sticky-board' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            <div className="p-4 bg-white border-b border-border flex justify-between items-center shrink-0">
              <div className="space-y-0.5">
                <h3 className="font-sans font-bold text-sm text-gh-ink">Sticky Whiteboard Canvas</h3>
                <p className="text-[10px] text-text-muted leading-none">Freeform dotted workspace. Drag elements to align sprint targets.</p>
              </div>

              <button
                onClick={handleCreateStickyNote}
                className="px-3 py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white rounded font-sans font-semibold text-xs shadow-sm transition flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>Add Sticky</span>
              </button>
            </div>

            {/* Dotted canvas with coordinates logic */}
            <div 
              ref={canvasRef}
              onMouseMove={handleMouseMoveCanvas}
              onMouseUp={handleMouseUpCanvas}
              onMouseLeave={handleMouseUpCanvas}
              className="flex-1 relative overflow-hidden bg-surface-0 cursor-default select-none"
              style={{
                backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            >
              <AnimatePresence>
                {stickyNotes.map((st, idx) => {
                  const rotation = idx % 2 === 0 ? '-1deg' : '0.8deg';
                  const isDragging = draggingNoteId === st.id;
                  
                  return (
                    <motion.div
                      key={st.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onMouseDown={(e) => handleMouseDownNote(e, st.id)}
                      className={`absolute w-48 p-3 rounded-lg shadow-md border flex flex-col justify-between h-40 transition-shadow ${
                        isDragging ? 'shadow-xl cursor-grabbing z-40 scale-102 border-gh-teal bg-teal-50' : 'z-10'
                      } ${
                        st.color === 'yellow' ? 'bg-yellow-50/90 border-yellow-200 text-yellow-900' :
                        st.color === 'teal' ? 'bg-gh-teal-light/95 border-teal-200 text-teal-950' :
                        st.color === 'pink' ? 'bg-red-50/90 border-red-200 text-red-950' :
                        'bg-white border-border text-text-primary'
                      }`}
                      style={{
                        left: `${st.x}px`,
                        top: `${st.y}px`,
                        transform: `rotate(${rotation})`
                      }}
                    >
                      <div className="flex justify-between items-center pb-1.5 border-b border-black/5 shrink-0 select-none">
                        <button
                          onClick={() => handleTogglePinSticky(st.id)}
                          className="p-0.5 text-black/40 hover:text-black/80 cursor-pointer"
                          title="Pin sticky"
                        >
                          {st.pinned ? (
                            <PushPin size={12} weight="fill" className="text-gh-teal" />
                          ) : (
                            <PushPinSlash size={12} />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteSticky(st.id)}
                          className="p-0.5 text-black/30 hover:text-gh-red cursor-pointer ml-auto"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <textarea
                        value={st.text}
                        onChange={(e) => handleUpdateStickyText(st.id, e.target.value)}
                        className="flex-1 w-full bg-transparent focus:outline-none resize-none leading-relaxed text-[11px] font-sans mt-1.5 focus:bg-white/40 rounded p-1"
                        placeholder="Type notes..."
                      />

                      <span className="font-mono text-[8px] opacity-40 uppercase block text-right font-bold">
                        {st.pinned ? 'Pinned Lock' : 'Grabbing Active'}
                      </span>

                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {stickyNotes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted">
                  <PushPin size={32} className="text-border mb-2 animate-bounce text-gh-teal" />
                  <span className="font-sans font-bold text-xs">Whiteboard Canvas is Empty</span>
                  <button onClick={handleCreateStickyNote} className="mt-2 text-xs text-gh-teal font-semibold hover:underline cursor-pointer">
                    Create New Note
                  </button>
                </div>
              )}

            </div>

          </div>
        )}

        {/* C. CALENDAR OPERATIONS VIEW MONTH GRID */}
        {activeView === 'calendar' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            
            <div className="p-4 bg-white border-b border-border flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="space-y-0.5">
                <h3 className="font-sans font-bold text-sm text-gh-ink">Personal Operations Calendar</h3>
                <p className="text-[10px] text-text-muted leading-none">Click any date cell to expand into a modal to manage notes and set deadlines.</p>
              </div>

              {/* Month Navigation Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTodayCalMonth}
                  className="px-2.5 py-1 text-xs font-sans font-semibold bg-surface-0 border border-border hover:bg-slate-100 rounded-md transition cursor-pointer text-text-primary"
                >
                  Today
                </button>
                <div className="flex items-center border border-border rounded-md bg-white overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevCalMonth}
                    className="p-1.5 hover:bg-surface-0 text-text-secondary hover:text-gh-ink transition cursor-pointer"
                    title="Previous Month"
                  >
                    <CaretLeft size={14} weight="bold" />
                  </button>
                  <span className="px-3 font-mono text-xs font-bold text-gh-ink min-w-[110px] text-center select-none">
                    {monthYearLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextCalMonth}
                    className="p-1.5 hover:bg-surface-0 text-text-secondary hover:text-gh-ink transition cursor-pointer"
                    title="Next Month"
                  >
                    <CaretRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0 overflow-y-auto">
              
              {/* Calendar Grid */}
              <div className="lg:col-span-8 bg-white border border-border p-3.5 rounded-xl h-full flex flex-col justify-between">
                
                <div className="grid grid-cols-7 text-center font-mono text-[10px] text-text-muted border-b border-border pb-2 font-bold uppercase tracking-wider">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                <div className="flex-1 grid grid-cols-7 gap-1.5 mt-2.5 font-mono text-[10px]">
                  {/* Dynamic start offset for month's 1st day */}
                  {Array.from({ length: monthStartOffset }).map((_, idx) => (
                    <span key={`offset-${idx}`} className="bg-surface-0/30 rounded-lg border border-transparent" />
                  ))}
                  
                  {monthDays.map(dayStr => {
                    const dayNum = parseInt(dayStr.split('-')[2]);
                    const isSelected = dayStr === selectedDay;
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isToday = dayStr === todayStr;
                    const dayEvents = calendarEvents.filter(e => e.date === dayStr);
                    const hasNotes = !!dayNotesMap[dayStr]?.trim();

                    return (
                      <button
                        key={dayStr}
                        onClick={() => {
                          setSelectedDay(dayStr);
                          setSelectedDateModal(dayStr);
                        }}
                        className={`p-1.5 rounded-lg border text-left flex flex-col justify-between min-h-[64px] relative cursor-pointer hover:bg-slate-50 transition group ${
                          isSelected ? 'border-gh-teal bg-gh-teal/5 font-semibold shadow-xs' : 'border-border/60 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            isToday ? 'bg-gh-teal text-white shadow-2xs' : 'text-text-primary'
                          }`}>
                            {dayNum}
                          </span>

                          <div className="flex items-center gap-1">
                            {hasNotes && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Has Personal Notes" />
                            )}
                            {dayEvents.length > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-gh-teal animate-pulse" title={`${dayEvents.length} events`} />
                            )}
                          </div>
                        </div>

                        {/* Event tags */}
                        <div className="space-y-0.5 truncate w-full mt-1">
                          {dayEvents.slice(0, 2).map((e, index) => (
                            <span 
                              key={`${e.id}-${index}`} 
                              className={`block truncate text-[8px] px-1 py-0.5 rounded font-bold uppercase ${
                                e.completed ? 'bg-emerald-50 text-emerald-700 line-through opacity-70' :
                                e.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                e.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {e.title}
                            </span>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="text-[8px] text-text-muted font-bold block text-right">
                              +{dayEvents.length - 2} more
                            </span>
                          )}
                        </div>

                        <span className="text-[8px] text-gh-teal opacity-0 group-hover:opacity-100 transition block text-right font-bold mt-1">
                          Expand ↗
                        </span>
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Agenda Day pane */}
              <div className="lg:col-span-4 bg-white border border-border p-4 rounded-xl flex flex-col justify-between h-full overflow-hidden">
                
                <div className="space-y-3 flex-1 overflow-y-auto">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted font-bold">
                      Selected Date Agenda: {selectedDay}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDateModal(selectedDay)}
                      className="text-[10px] text-gh-teal hover:underline font-bold cursor-pointer"
                    >
                      Open Full Modal
                    </button>
                  </div>

                  {/* Daily Scratchpad preview */}
                  <div className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-lg space-y-1">
                    <span className="text-[9px] font-mono font-bold text-amber-800 uppercase block">Daily Notes</span>
                    <p className="text-[11px] text-amber-950 font-sans line-clamp-2 italic">
                      {dayNotesMap[selectedDay] || 'No personal notes written for this date. Click "Open Full Modal" to edit.'}
                    </p>
                  </div>

                  {/* System Milestone syncing */}
                  {activeDayEvents.systemMatches.map(match => (
                    <div 
                      key={match.id} 
                      className="p-3 rounded-lg border border-gh-teal/20 bg-gh-teal-light/20 space-y-2 relative"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded font-bold bg-gh-teal text-white shadow-xs">
                          SYSTEM MILESTONE
                        </span>
                        <span className="font-mono text-[10px] font-bold text-gh-teal-hover">
                          ₱{match.milestone.amount.toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="font-sans font-bold text-xs text-gh-ink leading-tight block">
                          {match.milestone.title}
                        </span>
                        <p className="text-[10px] text-text-secondary leading-normal font-sans">
                          {match.milestone.deliverableDesc}
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-mono text-text-muted pt-1 border-t border-border/60">
                        <span>Project Context</span>
                        <strong className="text-gh-ink truncate max-w-[100px]">{match.proj.jobTitle}</strong>
                      </div>
                    </div>
                  ))}

                  {/* User custom events */}
                  {activeDayEvents.events.map(e => (
                    <div key={e.id} className="p-2.5 rounded-lg bg-surface-0 border border-border space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`font-mono text-[8px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          e.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          e.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {e.type} · {e.priority || 'medium'}
                        </span>
                        {e.time && (
                          <span className="font-mono text-[9px] text-text-muted font-bold">
                            {e.time}
                          </span>
                        )}
                      </div>
                      <span className={`font-sans font-bold text-xs leading-tight block mt-1 ${
                        e.completed ? 'line-through text-text-muted' : 'text-text-primary'
                      }`}>
                        {e.title}
                      </span>
                    </div>
                  ))}

                  {activeDayEvents.events.length === 0 && activeDayEvents.systemMatches.length === 0 && (
                    <p className="text-[11px] text-text-secondary italic pt-2 font-sans">
                      No operational events scheduled on this date.
                    </p>
                  )}
                </div>

                {/* Quick Expand button */}
                <button
                  type="button"
                  onClick={() => setSelectedDateModal(selectedDay)}
                  className="w-full mt-3 py-2 bg-gh-ink hover:bg-zinc-800 text-white font-sans font-bold rounded-lg cursor-pointer transition text-center text-xs flex items-center justify-center gap-1.5"
                >
                  <span>Expand Modal & Set Deadlines</span>
                  <ArrowRight size={14} />
                </button>

              </div>

            </div>

          </div>
        )}

        {/* D. REMINDERS SCREEN VIEW */}
        {activeView === 'reminders' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white p-6 space-y-6">
            
            <div className="border-b border-border pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-sm text-gh-ink">Personal To-do Compliance Reminders</h3>
                <p className="text-[10px] text-text-muted leading-none">Track manual verification tasks and secure sandbox deployments.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto">
              
              {/* Reminders List */}
              <div className="lg:col-span-8 space-y-2.5">
                {reminders.map(rem => (
                  <div 
                    key={rem.id} 
                    className="p-3 bg-surface-0 border border-border rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button 
                        onClick={() => handleToggleReminder(rem.id)}
                        className="text-gh-teal hover:scale-105 transition cursor-pointer"
                      >
                        {rem.completed ? (
                          <CheckSquare size={18} weight="fill" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>

                      <div className="min-w-0">
                        <span className={`font-sans leading-snug block truncate max-w-[300px] ${
                          rem.completed ? 'line-through text-text-muted' : 'text-text-primary font-semibold'
                        }`}>
                          {rem.text}
                        </span>
                        <span className="font-mono text-[9px] text-text-muted block mt-0.5">
                          Target Coordinate Date: {rem.dueDate} · Priority: {rem.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteReminder(rem.id)}
                      className="p-1.5 text-text-secondary hover:text-gh-red cursor-pointer shrink-0"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}

                {reminders.length === 0 && (
                  <p className="text-text-muted italic text-center py-12">No pending manual compliance checks recorded.</p>
                )}
              </div>

              {/* Add reminder panel */}
              <div className="lg:col-span-4 bg-surface-0 border border-border p-4 rounded-xl h-fit space-y-4">
                <h4 className="font-sans font-bold text-xs text-gh-ink">File Verification Task</h4>
                
                <form onSubmit={handleAddReminderSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary uppercase">Task Description</label>
                    <input 
                      type="text" 
                      value={newReminderText}
                      onChange={(e) => setNewReminderText(e.target.value)}
                      placeholder="E.g., Inspect iOS viewport margin overlaps..."
                      className="w-full px-2.5 py-1.5 bg-white border border-border rounded focus:outline-none focus:border-gh-teal text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary uppercase block mb-1">Associated Date</label>
                    <CustomDropdown
                      options={monthDays.map(day => ({ value: day, label: day }))}
                      value={selectedDay}
                      onChange={(val) => setSelectedDay(val)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary uppercase">Risk Level / Priority</label>
                    <div className="grid grid-cols-3 gap-1 text-center font-mono text-[9px] font-bold">
                      {(['low', 'medium', 'high'] as const).map(prio => (
                        <button
                          key={prio}
                          type="button"
                          onClick={() => setNewReminderPriority(prio)}
                          className={`py-1 rounded border capitalize cursor-pointer ${
                            newReminderPriority === prio 
                              ? 'border-gh-teal bg-gh-teal/5 text-gh-teal font-semibold' 
                              : 'border-border bg-white text-text-muted hover:bg-surface-0'
                          }`}
                        >
                          {prio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2 bg-gh-teal hover:bg-gh-teal-hover text-white rounded font-sans font-bold text-xs shadow-sm transition cursor-pointer text-center"
                  >
                    Lock Task
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}

        {/* E. FLOWCHART SCREEN VIEW (Task 4) */}
        {activeView === 'flowchart' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <div className="p-4 border-b border-border bg-white flex justify-between items-center shrink-0 gap-4 flex-wrap">
              <div className="space-y-0.5 min-w-[200px]">
                <h3 className="font-sans font-bold text-sm text-gh-ink uppercase tracking-wider">Personal Architectural Builder</h3>
                <p className="text-[10px] text-text-muted leading-none">Draft private system architectures and sequence diagrams securely.</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Personal Flowchart Auto-Save Indicator */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono bg-slate-50 border border-border px-2.5 py-1 rounded-md select-none">
                  <span className={`w-1.5 h-1.5 rounded-full ${personalSaveState === 'Saving...' ? 'bg-gh-amber animate-ping' : 'bg-gh-green'}`} />
                  <span className="font-bold text-text-muted">STATUS:</span>
                  <span className={`font-extrabold uppercase ${personalSaveState === 'Saving...' ? 'text-gh-amber' : 'text-gh-teal'}`}>
                    {personalSaveState}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Flowcharts list and CRUD actions */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 shrink-0 bg-slate-50/50 select-none">
              <div className="flex items-center gap-1 overflow-x-auto max-w-[60%] scrollbar-none">
                {personalFlowcharts.map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedPersonalFlowchartId(f.id)}
                    className={`px-2.5 py-1 rounded font-sans text-[10px] font-bold tracking-tight transition cursor-pointer shrink-0 border ${
                      selectedPersonalFlowchartId === f.id
                        ? 'bg-gh-teal text-white border-gh-teal shadow-sm'
                        : 'text-text-secondary hover:bg-slate-100 border-transparent'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Create Flowchart */}
                <button
                  onClick={() => {
                    triggerPrompt(
                      'Create Personal Flowchart',
                      'Specify a flowchart layout name for your private architectural work.',
                      'E.g., Payment Sequence, DB Pool...',
                      'Sequence Flow',
                      (name) => {
                        if (!name) return;
                        const newFlowchart = {
                          id: `pflow_${Date.now()}`,
                          name: name,
                          nodes: [
                            {
                              id: `pnode_${Date.now()}_1`,
                              type: 'process',
                              position: { x: 80, y: 80 },
                              data: {
                                label: 'Entry Middleware',
                                color: '#14b8a6',
                                description: 'Gateway middleware check',
                                milestoneStatus: 'pending',
                                milestoneAmount: 0,
                                milestoneDueDate: new Date().toISOString().split('T')[0]
                              },
                              width: 140,
                              height: 48
                            },
                            {
                              id: `pnode_${Date.now()}_2`,
                              type: 'terminal',
                              position: { x: 280, y: 80 },
                              data: {
                                label: 'Success Termination',
                                color: '#22c55e',
                                description: 'Terminating end state',
                                milestoneStatus: 'pending',
                                milestoneAmount: 0,
                                milestoneDueDate: new Date().toISOString().split('T')[0]
                              },
                              width: 140,
                              height: 48
                            }
                          ],
                          edges: [],
                          createdAt: new Date().toISOString()
                        };
                        const updated = [...personalFlowcharts, newFlowchart];
                        setPersonalFlowcharts(updated);
                        setSelectedPersonalFlowchartId(newFlowchart.id);
                        showToast?.(`Flowchart diagram "${name}" created.`);
                      }
                    );
                  }}
                  className="px-2.5 py-1 bg-gh-teal hover:bg-gh-teal-hover text-white text-[10px] font-sans font-bold rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Plus size={10} />
                  <span>Create Flowchart</span>
                </button>

                {/* Rename Flowchart */}
                {selectedPersonalFlowchartId && (
                  <button
                    onClick={() => {
                      const curName = activePersonalFlowchart?.name || 'Main Flowchart';
                      triggerPrompt(
                        'Rename Personal Flowchart',
                        'Specify a new title for this private architectural canvas.',
                        curName,
                        curName,
                        (newName) => {
                          if (!newName || newName === curName) return;
                          const updated = personalFlowcharts.map(f => 
                            f.id === activePersonalFlowchart.id ? { ...f, name: newName } : f
                          );
                          setPersonalFlowcharts(updated);
                          showToast?.(`Flowchart renamed to "${newName}".`);
                        }
                      );
                    }}
                    className="px-2.5 py-1 border border-border hover:bg-slate-50 text-text-secondary text-[10px] font-sans font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <PencilSimple size={10} />
                    <span>Rename</span>
                  </button>
                )}

                {/* Delete Flowchart */}
                {selectedPersonalFlowchartId && (personalFlowcharts.length > 1 || selectedPersonalFlowchartId !== 'pflow_default') && (
                  <button
                    onClick={() => {
                      const curName = activePersonalFlowchart?.name || 'Flowchart';
                      triggerConfirm(
                        'Delete Personal Flowchart',
                        `Are you absolutely sure you want to permanently delete flowchart "${curName}"? This cannot be undone.`,
                        () => {
                          const updated = personalFlowcharts.filter(f => f.id !== activePersonalFlowchart.id);
                          setPersonalFlowcharts(updated);
                          setSelectedPersonalFlowchartId(updated[0]?.id || 'pflow_default');
                          showToast?.(`Flowchart "${curName}" permanently purged.`);
                        }
                      );
                    }}
                    className="px-2.5 py-1 border border-red-200 hover:bg-red-50 text-gh-red text-[10px] font-sans font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash size={10} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reusable Flowchart Canvas */}
            <div className="flex-1 flex flex-col min-h-0">
              <FlowchartCanvas
                flowchartId={activePersonalFlowchart?.id || 'pflow_default'}
                initialNodes={activePersonalFlowchart?.nodes || []}
                initialEdges={activePersonalFlowchart?.edges || []}
                onSave={(nodes, edges) => {
                  persistPersonalFlowchartChanges(nodes, edges);
                }}
                showToast={showToast || (() => {})}
                isPersonal={true}
                title="Personal Architecture Diagram"
              />
            </div>
          </div>
        )}

        {activeView === 'personal-tables' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            <div className="p-4 border-b border-border bg-white flex justify-between items-center shrink-0 gap-4 flex-wrap">
              <div className="space-y-0.5">
                <h3 className="font-sans font-bold text-sm text-gh-ink uppercase tracking-wider">Personal Database Tables</h3>
                <p className="text-[10px] text-text-muted leading-none">Manage personal spreadsheets, cost items, and lead pipelines privately.</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    triggerPrompt(
                      'Create Personal Grid',
                      'Specify a unique descriptor or channel label for your personal pipeline ledger.',
                      'E.g., Lead Sheet, Expenses...',
                      'Lead Sheet',
                      (name) => {
                        if (!name) return;
                        const col1Id = `col_${Date.now()}_1`;
                        const col2Id = `col_${Date.now()}_2`;
                        const col3Id = `col_${Date.now()}_3`;
                        const col4Id = `col_${Date.now()}_4`;

                        const newTable = {
                          id: `ptable_${Date.now()}`,
                          name: name,
                          columns: [
                            { id: col1Id, header: 'Item / Lead', type: 'text' as const, width: 160 },
                            { id: col2Id, header: 'Status', type: 'status' as const, width: 140 },
                            { id: col3Id, header: 'Budget', type: 'currency' as const, width: 140 },
                            { id: col4Id, header: 'Target Date', type: 'date' as const, width: 140 }
                          ],
                          rows: [
                            {
                              id: `row_${Date.now()}_1`,
                              cells: {
                                [col1Id]: 'Server Node Setup',
                                [col2Id]: 'in-progress',
                                [col3Id]: '₱2,500',
                                [col4Id]: new Date().toISOString().split('T')[0]
                              }
                            }
                          ],
                          createdAt: new Date().toISOString(),
                          createdBy: 'freelancer' as const
                        };
                        const updated = [...personalTables, newTable];
                        setPersonalTables(updated);
                        setSelectedPersonalTableId(newTable.id);
                        showToast?.(`Grid table "${name}" created.`);
                      }
                    );
                  }}
                  className="px-2.5 py-1 bg-gh-teal text-white hover:bg-gh-teal-hover text-[10px] font-sans font-bold rounded-md transition shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Plus size={10} weight="bold" />
                  <span>Create Grid</span>
                </button>
              </div>
            </div>

            {/* Grid Table Workspace */}
            <div className="flex-1 overflow-auto p-4 flex flex-col min-h-0">
              {/* Tables selector tabs */}
              {personalTables.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-border/65 shrink-0 scrollbar-none mb-3">
                  {personalTables.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedPersonalTableId(t.id)}
                      className={`px-3 py-1.5 rounded font-sans text-[11px] font-bold tracking-tight transition cursor-pointer shrink-0 border ${
                        selectedPersonalTableId === t.id
                          ? 'bg-gh-teal text-white border-gh-teal shadow-sm'
                          : 'bg-slate-50 text-text-secondary hover:bg-slate-100 border-border'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 flex flex-col min-h-0">
                {selectedPersonalTableId && activePersonalTable ? (
                  <WorkspaceTable
                    table={activePersonalTable}
                    onUpdate={(updatedTable) => {
                      const updated = personalTables.map(t =>
                        t.id === updatedTable.id ? updatedTable : t
                      );
                      setPersonalTables(updated);
                    }}
                    onDelete={() => {
                      const updated = personalTables.filter(t => t.id !== activePersonalTable.id);
                      const nextId = updated[0]?.id || '';
                      setPersonalTables(updated);
                      setSelectedPersonalTableId(nextId);
                      showToast?.(`Table "${activePersonalTable.name}" deleted.`);
                    }}
                    onRename={(newName) => {
                      const updated = personalTables.map(t =>
                        t.id === activePersonalTable.id ? { ...t, name: newName } : t
                      );
                      setPersonalTables(updated);
                      showToast?.(`Table renamed to "${newName}".`);
                    }}
                    showToast={showToast || (() => {})}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-text-secondary">
                    <SparkleIcon size={24} className="text-slate-300 animate-pulse mb-2" />
                    <p className="font-sans font-bold text-xs text-text-primary">No Personal Table Active</p>
                    <p className="text-[10px] text-text-muted/70 max-w-xs mt-1">Deploy a private spreadsheet or database grid to map lead channels.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </section>

      </div> {/* closes flex-1 flex flex-col lg:grid ... */}

      {/* Custom Prompt Modal */}
      <CustomPromptModal
        isOpen={promptOpen}
        title={promptTitle}
        description={promptDescription}
        placeholder={promptPlaceholder}
        defaultValue={promptDefaultValue}
        onConfirm={(val) => {
          promptOnConfirm(val);
          setPromptOpen(false);
        }}
        onCancel={() => setPromptOpen(false)}
      />

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmOpen(false)}
              className="absolute inset-0 bg-black"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="relative bg-white border border-border rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-4 font-sans select-none"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 text-gh-red border border-red-100 rounded-lg shrink-0">
                  <Warning size={18} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-sans font-bold text-xs text-text-primary uppercase tracking-wide">
                    {confirmTitle}
                  </h4>
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    {confirmDescription}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="px-3.5 py-1.5 border border-border hover:bg-slate-50 text-text-secondary rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmOnConfirm();
                    setConfirmOpen(false);
                  }}
                  className="px-4 py-1.5 bg-gh-red hover:bg-red-600 text-white rounded-lg shadow-sm transition cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expanded Date Modal */}
      <AnimatePresence>
        {selectedDateModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDateModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative bg-white border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden font-sans select-none z-10"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-gh-teal/20 text-gh-teal rounded-lg border border-gh-teal/30">
                    <Calendar size={20} weight="bold" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-white flex items-center gap-2">
                      <span>{new Date(selectedDateModal + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </h3>
                    <p className="text-[10px] text-slate-300">Set personal notes, track task deadlines, and inspect linked milestones.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDateModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-6">
                
                {/* 1. Personal Date Notes / Scratchpad */}
                <div className="space-y-2 bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <Notebook size={14} className="text-amber-700" />
                      <span>Personal Day Notes & Memos</span>
                    </label>
                    <span className="text-[9px] text-amber-700 font-mono font-semibold">Auto-saved to Local Storage</span>
                  </div>
                  <textarea
                    rows={3}
                    value={dayNotesMap[selectedDateModal] || ''}
                    onChange={(e) => handleUpdateDayNotes(selectedDateModal, e.target.value)}
                    placeholder="Write custom notes, meeting memos, or reminders for this day..."
                    className="w-full bg-white border border-amber-200/80 rounded-lg p-2.5 text-xs font-sans focus:outline-none focus:border-amber-500 leading-relaxed text-slate-800 placeholder-slate-400"
                  />
                </div>

                {/* 2. Deadlines & Scheduled Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="text-xs font-bold text-gh-ink uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-gh-teal" />
                      <span>Scheduled Deadlines & Events ({userCustomEvents.filter(e => e.date === selectedDateModal).length})</span>
                    </h4>
                  </div>

                  {/* List of events for selected date */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {userCustomEvents.filter(e => e.date === selectedDateModal).map(e => (
                      <div
                        key={e.id}
                        className={`p-3 border rounded-xl flex items-start justify-between gap-3 transition ${
                          e.completed ? 'bg-slate-50 border-border/60 opacity-60' : 'bg-white border-border shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleEventCompleted(e.id)}
                            className="mt-0.5 text-gh-teal hover:scale-110 transition cursor-pointer shrink-0"
                          >
                            {e.completed ? <CheckSquare size={18} weight="fill" /> : <Square size={18} />}
                          </button>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                e.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                e.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                                e.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {e.type} · {e.priority || 'medium'}
                              </span>
                              {e.time && (
                                <span className="font-mono text-[10px] font-bold text-text-muted flex items-center gap-1">
                                  <Clock size={11} />
                                  <span>{e.time}</span>
                                </span>
                              )}
                            </div>
                            <h5 className={`font-sans font-bold text-xs leading-snug ${
                              e.completed ? 'line-through text-text-muted' : 'text-gh-ink'
                            }`}>
                              {e.title}
                            </h5>
                            {e.notes && (
                              <p className="text-[11px] text-text-secondary leading-snug font-sans">
                                {e.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCalendarEvent(e.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer shrink-0 transition"
                          title="Delete Event"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}

                    {userCustomEvents.filter(e => e.date === selectedDateModal).length === 0 && (
                      <p className="text-xs text-text-muted italic py-3 text-center">
                        No custom deadlines or tasks set for this date yet.
                      </p>
                    )}
                  </div>

                  {/* Add Deadline Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddModalEvent(selectedDateModal);
                    }}
                    className="p-3.5 bg-surface-0 border border-border rounded-xl space-y-3 mt-2"
                  >
                    <span className="font-mono text-[10px] font-bold text-gh-ink uppercase tracking-wider block">
                      + Add New Deadline / Task for this Date
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={modalNewTitle}
                        onChange={(e) => setModalNewTitle(e.target.value)}
                        placeholder="Deadline title (e.g., Code Freeze & QA Run)"
                        required
                        className="px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs font-sans focus:outline-none focus:border-gh-teal"
                      />
                      <input
                        type="text"
                        value={modalNewTime}
                        onChange={(e) => setModalNewTime(e.target.value)}
                        placeholder="Time (Optional, e.g., 17:00)"
                        className="px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs font-sans focus:outline-none focus:border-gh-teal"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-bold text-text-secondary uppercase shrink-0">Type:</label>
                        <select
                          value={modalNewType}
                          onChange={(e: any) => setModalNewType(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-border rounded text-xs focus:outline-none"
                        >
                          <option value="deadline">Deadline</option>
                          <option value="meeting">Meeting</option>
                          <option value="milestone">Milestone</option>
                          <option value="personal">Personal Task</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-bold text-text-secondary uppercase shrink-0">Priority:</label>
                        <select
                          value={modalNewPriority}
                          onChange={(e: any) => setModalNewPriority(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-border rounded text-xs focus:outline-none"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={modalNewNotes}
                      onChange={(e) => setModalNewNotes(e.target.value)}
                      placeholder="Optional notes or instructions..."
                      className="w-full px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs font-sans focus:outline-none focus:border-gh-teal"
                    />

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-gh-teal hover:bg-gh-teal-hover text-white font-sans font-bold text-xs rounded-lg shadow-2xs transition cursor-pointer text-center"
                    >
                      Save Deadline to Calendar
                    </button>
                  </form>
                </div>

                {/* 3. System Project Milestones */}
                {projects.flatMap(p => p.milestones.filter(m => m.dueDate === selectedDateModal).map(m => ({ milestone: m, project: p }))).length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <h4 className="text-xs font-bold text-gh-ink uppercase font-mono tracking-wider">
                      Workspace System Deliverables
                    </h4>
                    {projects.flatMap(p => p.milestones.filter(m => m.dueDate === selectedDateModal).map(m => ({ milestone: m, project: p }))).map(({ milestone, project }) => (
                      <div key={milestone.id} className="p-3 bg-gh-teal-light/30 border border-gh-teal/20 rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[9px] font-bold text-gh-teal uppercase">
                            Escrow Milestone · ₱{milestone.amount.toLocaleString()}
                          </span>
                          <span className="font-mono text-[9px] uppercase font-bold text-text-muted">
                            {milestone.status}
                          </span>
                        </div>
                        <h5 className="font-sans font-bold text-xs text-gh-ink">{milestone.title}</h5>
                        <p className="text-[10px] text-text-secondary">{milestone.deliverableDesc}</p>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 border-t border-border flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDateModal(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-sans font-bold rounded-lg transition cursor-pointer"
                >
                  Close Workspace
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
