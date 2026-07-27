  import { Job, Project, Dispute, Invoice, Review, Notification, AdminUser, AuditLog, AnalyticsSummary } from './types';

  export const INITIAL_JOBS: Job[] = [
    {
      id: 'job_001',
      title: 'Laravel API + Vue 3 Client Dashboard',
      description: 'We require a senior developer to build a customer portal for our retail operations. It needs secure JWT login, clean tabular metrics with filtering, and BDO bank transfer verification hooks. Must be comfortable writing clean SQL and modular components.',
      budget: 65000,
      budgetType: 'fixed',
      skills: ['Laravel', 'Vue 3', 'PostgreSQL', 'BDO API'],
      field: 'Web Development',
      experienceLevel: 'senior',
      deadline: '2026-08-15',
      postedDate: '2026-07-18',
      client: {
        name: 'Juan Reyes',
        company: 'SariSari Connect',
        rating: 4.8,
        location: 'Pasig City, PH'
      },
      proposalsCount: 8
    },
    {
      id: 'job_002',
      title: 'React Native Mobile App - Motorcycle Logistics Tracker',
      description: 'Looking to build an MVP for motorcycle delivery tracking in Metro Manila. The app will capture GPS coordinates from the phone and stream them to an Express backend. We have complete Figma designs ready.',
      budget: 85000,
      budgetType: 'fixed',
      skills: ['React Native', 'Node.js', 'Google Maps Platform', 'Express'],
      field: 'Mobile Development',
      experienceLevel: 'mid',
      deadline: '2026-09-01',
      postedDate: '2026-07-19',
      client: {
        name: 'Mia Santos',
        company: 'KargoPH Express',
        rating: 4.9,
        location: 'Makati City, PH'
      },
      proposalsCount: 14
    },
    {
      id: 'job_003',
      title: 'Shopify Checkout customization with GCash & Maya Pay',
      description: 'We need to integrate local e-wallets GCash and Maya into our custom Shopify checkout flow. Must have experience with webhook handling, signature verification, and secure logging to prevent transaction fraud.',
      budget: 35000,
      budgetType: 'fixed',
      skills: ['Shopify Liquid', 'Node.js', 'GCash API', 'Maya SDK'],
      field: 'Web Development',
      experienceLevel: 'mid',
      deadline: '2026-08-05',
      postedDate: '2026-07-20',
      client: {
        name: 'Althea Cruz',
        company: 'Moda Manila Co.',
        rating: 4.5,
        location: 'Quezon City, PH'
      },
      proposalsCount: 5
    },
    {
      id: 'job_004',
      title: 'Database Performance Audit (PostgreSQL Optimization)',
      description: 'Our Postgres database on Cloud SQL is hitting 100 percent CPU during peak hours. We need an expert to analyze slow queries, construct appropriate composite indexes, configure connection pooling (PgBouncer), and recommend query rewrites.',
      budget: 1200,
      budgetType: 'hourly',
      skills: ['PostgreSQL', 'Cloud SQL', 'PgBouncer', 'Query Optimization'],
      field: 'Data & Infrastructure',
      experienceLevel: 'senior',
      deadline: '2026-08-10',
      postedDate: '2026-07-19',
      client: {
        name: 'David Tech-PH',
        company: 'Bayanihan Dev Group',
        rating: 5.0,
        location: 'Taguig City, PH'
      },
      proposalsCount: 3
    }
  ];

  export const INITIAL_PROJECTS: Project[] = [
    {
      id: 'proj_101',
      jobTitle: 'E-commerce Redesign & GCash Integration',
      clientId: 'client_001',
      clientName: 'Juan Reyes',
      freelancerId: 'free_001',
      freelancerName: 'Carlo Mendoza',
      totalBudget: 32000,
      status: 'disputed',
      milestones: [
        {
          id: 'ms_101_1',
          title: 'Initial wireframes & Tailwind setup',
          amount: 8000,
          dueDate: '2026-06-18',
          status: 'approved',
          deliverableDesc: 'High-fidelity dashboard layout built with Inter typography and clean CSS styles.',
          submittedFile: 'wireframes_draft_v1.zip',
          submittedAt: '2026-06-18T14:30:00Z'
        },
        {
          id: 'ms_101_2',
          title: 'GCash Webhook & Checkout flow build',
          amount: 16000,
          dueDate: '2026-06-24',
          status: 'submitted',
          deliverableDesc: 'Integration of GCash API webhooks, signature checking, and local transaction log creation.',
          submittedFile: 'gcash_integration_core.tar.gz',
          submittedAt: '2026-06-24T16:15:00Z'
        },
        {
          id: 'ms_101_3',
          title: 'Database Security Sweep & Policy Configs',
          amount: 5000,
          dueDate: '2026-07-10',
          status: 'pending',
          deliverableDesc: 'Security review on core SQL parameters and security policies check.',
          submittedFile: null,
          submittedAt: null
        },
        {
          id: 'ms_101_4',
          title: 'Final integration & end-to-end testing',
          amount: 8000,
          dueDate: '2026-07-15',
          status: 'pending',
          deliverableDesc: 'Staging environment deployment and end-to-end user path testing.',
          submittedFile: null,
          submittedAt: null
        }
      ],
      messages: [
        {
          id: 'msg_001',
          senderName: 'Juan Reyes',
          senderRole: 'client',
          text: 'The checkout screen doesn\'t render properly on mobile. The GCash button overlaps with the main terms checkbox. Let\'s fix this.',
          timestamp: '2026-06-24T14:14:00Z'
        },
        {
          id: 'msg_002',
          senderName: 'Carlo Mendoza',
          senderRole: 'freelancer',
          text: 'I tested on modern Chrome, and the grid handles mobile sizing. Did you clear your browser cache? Also, please check if you are using an older iOS safari build.',
          timestamp: '2026-06-24T16:02:00Z'
        },
        {
          id: 'msg_003',
          senderName: 'Juan Reyes',
          senderRole: 'client',
          text: 'It is broken on multiple mobile devices in our office. I am rejecting the milestone submission until the grid is replaced with a single-column layout.',
          timestamp: '2026-06-25T09:11:00Z'
        }
      ],
      documents: [
        {
          id: 'doc_1',
          title: 'Project Technical Specification',
          content: '# Technical Scope\n- Node.js/Express backend running on port 3000.\n- Tailwind CSS for clean off-white design layouts.\n- Strict signature verification for GCash API webhook bodies.',
          updatedAt: '2026-06-12T10:00:00Z',
          updatedBy: 'Carlo Mendoza'
        }
      ],
      boardElements: [
        { id: 'el_1', type: 'rectangle', x: 50, y: 50, width: 140, height: 60, label: 'User Checkout', color: '#1e2d3d' },
        { id: 'el_2', type: 'circle', x: 250, y: 50, width: 100, height: 100, label: 'GCash Gateway', color: '#0f766e' },
        { id: 'el_3', type: 'arrow', x: 190, y: 80, label: 'Post Webhook', color: '#4a5568' }
      ],
      stickyNotes: [
        { id: 'st_1', text: 'Important: Verify signature headers with GCash public key', color: '#fef3c7', x: 50, y: 150, isShared: true },
        { id: 'st_2', text: 'Ask client for sandbox API credentials before Tuesday', color: '#fef3c7', x: 220, y: 180, isShared: false }
      ],
      calls: [
        {
          id: 'call_1',
          startTime: '2026-06-12T09:00:00Z',
          durationSeconds: 1240,
          whiteboardSnapshots: []
        }
      ],
      auditLogs: [
        { id: 'log_1', timestamp: '22:15 - 2026-06-10', actor: 'Juan Reyes', action: 'Created project contract', details: 'Fixed budget ₱32,000 across 3 milestones.' },
        { id: 'log_2', timestamp: '14:30 - 2026-06-18', actor: 'Carlo Mendoza', action: 'Submitted Milestone 1', details: 'Completed wireframes and initial markup.' },
        { id: 'log_3', timestamp: '09:00 - 2026-06-19', actor: 'Juan Reyes', action: 'Approved Milestone 1', details: 'Released payment of ₱8,000.' },
        { id: 'log_4', timestamp: '16:15 - 2026-06-24', actor: 'Carlo Mendoza', action: 'Submitted Milestone 2', details: 'Completed GCash checkout flows & webhooks.' },
        { id: 'log_5', timestamp: '09:11 - 2026-06-25', actor: 'Juan Reyes', action: 'Rejected Milestone 2', details: 'Reason cited: mobile overlapping button layout.' },
        { id: 'log_6', timestamp: '09:12 - 2026-06-25', actor: 'Juan Reyes', action: 'Opened Dispute #47', details: 'Escalated milestone payment dispute to GitHustle Mediation.' }
      ],
      invoices: [
        {
          id: 'INV-2026-07-01',
          milestone_id: 'ms_101_1',
          milestone_title: 'Initial wireframes & Tailwind setup',
          project_id: 'proj_101',
          project_title: 'E-commerce Redesign & GCash Integration',
          amount: 8000,
          status: 'paid',
          notes: 'Completed according to responsive wireframe spec approvals.',
          due_date: '2026-06-25',
          paid_at: '2026-06-19T09:00:00Z',
          payment_method: 'gcash',
          created_at: '2026-06-18T14:30:00Z'
        },
        {
          id: 'INV-2026-07-02',
          milestone_id: 'ms_101_2',
          milestone_title: 'GCash Webhook & Checkout flow build',
          project_id: 'proj_101',
          project_title: 'E-commerce Redesign & GCash Integration',
          amount: 16000,
          status: 'disputed',
          notes: 'Awaiting mediation review regarding overlapping mobile design elements.',
          due_date: '2026-07-01',
          created_at: '2026-06-24T16:15:00Z'
        },
        {
          id: 'INV-2026-07-04',
          milestone_id: 'ms_101_3',
          milestone_title: 'Database Security Sweep & Policy Configs',
          project_id: 'proj_101',
          project_title: 'E-commerce Redesign & GCash Integration',
          amount: 5000,
          status: 'overdue',
          notes: 'Overdue milestone payment from early July integrations phase.',
          due_date: '2026-07-10',
          created_at: '2026-07-05T10:00:00Z'
        }
      ],
      sharedTables: []
    },
    {
      id: 'proj_102',
      jobTitle: 'Motorcycle Delivery MVP Tracker',
      clientId: 'client_002',
      clientName: 'Mia Santos',
      freelancerId: 'free_002',
      freelancerName: 'Althea Cruz',
      totalBudget: 85000,
      status: 'active',
      milestones: [
        {
          id: 'ms_102_1',
          title: 'Core DB Schema & Socket setup',
          amount: 30000,
          dueDate: '2026-07-28',
          status: 'pending',
          deliverableDesc: 'PostgreSQL schema with indexing on location coordinates and active Socket.io listeners.',
          submittedFile: null,
          submittedAt: null
        },
        {
          id: 'ms_102_2',
          title: 'Figma Assets Extraction & Theme Export',
          amount: 15000,
          dueDate: '2026-08-05',
          status: 'pending',
          deliverableDesc: 'Framer layouts and complete Figma design system extraction.',
          submittedFile: null,
          submittedAt: null
        },
        {
          id: 'ms_102_3',
          title: 'Deployment & CI/CD Pipeline Configuration',
          amount: 25000,
          dueDate: '2026-08-15',
          status: 'pending',
          deliverableDesc: 'CI/CD runner orchestration and staging setups on secure nodes.',
          submittedFile: null,
          submittedAt: null
        }
      ],
      messages: [
        {
          id: 'msg_102_1',
          senderName: 'Althea Cruz',
          senderRole: 'freelancer',
          text: 'The database models are designed. I have indexed coordinates and added a query optimization pass. Let\'s schedule a call tomorrow.',
          timestamp: '2026-07-20T08:00:00Z'
        }
      ],
      documents: [],
      boardElements: [],
      stickyNotes: [],
      calls: [],
      auditLogs: [
        { id: 'log_102_1', timestamp: '09:00 - 2026-07-19', actor: 'System', action: 'Project Initiated', details: 'Contract funded by Mia Santos.' }
      ],
      invoices: [
        {
          id: 'INV-2026-07-03',
          milestone_id: 'ms_102_1',
          milestone_title: 'Core DB Schema & Socket setup',
          project_id: 'proj_102',
          project_title: 'Motorcycle Delivery MVP Tracker',
          amount: 30000,
          status: 'pending',
          notes: 'Includes full coordinates indexing and active Socket connection setup.',
          due_date: '2026-07-30',
          created_at: '2026-07-19T09:00:00Z'
        },
        {
          id: 'INV-2026-07-05',
          milestone_id: 'ms_102_2',
          milestone_title: 'Figma Assets Extraction & Theme Export',
          project_id: 'proj_102',
          project_title: 'Motorcycle Delivery MVP Tracker',
          amount: 15000,
          status: 'overdue',
          notes: 'Please disburse the funds as design assets have been exported and verified.',
          due_date: '2026-07-12',
          created_at: '2026-07-06T11:00:00Z'
        }
      ],
      sharedTables: []
    }
  ];

  export const INITIAL_DISPUTES: Dispute[] = [
  {
    id: 'disp_001',
    projectId: 'proj_101',
    projectTitle: 'E-commerce Redesign & GCash Integration',
    clientName: 'Juan Reyes',
    freelancerName: 'Carlo Mendoza',
    reason: 'Milestone 2 Layout overlap on mobile. Client claims designs were provided; Freelancer claims scope creep.',
    amountDisputed: 16000,
    status: 'open',
    createdAt: '2026-06-25T09:12:00Z',
    milestoneTitle: 'GCash Webhook & Checkout flow build'
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-07-01',
    milestone_id: 'ms_101_1',
    milestone_title: 'Initial wireframes & Tailwind setup',
    project_id: 'proj_101',
    project_title: 'E-commerce Redesign & GCash Integration',
    amount: 8000,
    status: 'paid',
    notes: 'Completed according to responsive wireframe spec approvals.',
    due_date: '2026-06-25',
    paid_at: '2026-06-19T09:00:00Z',
    payment_method: 'gcash',
    created_at: '2026-06-18T14:30:00Z'
  },
  {
    id: 'INV-2026-07-02',
    milestone_id: 'ms_101_2',
    milestone_title: 'GCash Webhook & Checkout flow build',
    project_id: 'proj_101',
    project_title: 'E-commerce Redesign & GCash Integration',
    amount: 16000,
    status: 'disputed',
    notes: 'Awaiting mediation review regarding overlapping mobile design elements.',
    due_date: '2026-07-01',
    created_at: '2026-06-24T16:15:00Z'
  },
  {
    id: 'INV-2026-07-03',
    milestone_id: 'ms_102_1',
    milestone_title: 'Core DB Schema & Socket setup',
    project_id: 'proj_102',
    project_title: 'Motorcycle Delivery MVP Tracker',
    amount: 30000,
    status: 'pending',
    notes: 'Includes full coordinates indexing and active Socket connection setup.',
    due_date: '2026-07-30',
    created_at: '2026-07-19T09:00:00Z'
  },
  {
    id: 'INV-2026-07-04',
    milestone_id: 'ms_overdue_1',
    milestone_title: 'Database Security Sweep & Policy Configs',
    project_id: 'proj_101',
    project_title: 'E-commerce Redesign & GCash Integration',
    amount: 5000,
    status: 'overdue',
    notes: 'Overdue milestone payment from early July integrations phase.',
    due_date: '2026-07-10',
    created_at: '2026-07-05T10:00:00Z'
  },
  {
    id: 'INV-2026-07-05',
    milestone_id: 'ms_overdue_2',
    milestone_title: 'Figma Assets Extraction & Theme Export',
    project_id: 'proj_102',
    project_title: 'Motorcycle Delivery MVP Tracker',
    amount: 15000,
    status: 'overdue',
    notes: 'Please disburse the funds as design assets have been exported and verified.',
    due_date: '2026-07-12',
    created_at: '2026-07-06T11:00:00Z'
  },
  {
    id: 'INV-2026-07-06',
    milestone_id: 'ms_paid_2',
    milestone_title: 'Express Node Setup & Route Validation',
    project_id: 'proj_101',
    project_title: 'E-commerce Redesign & GCash Integration',
    amount: 12000,
    status: 'paid',
    notes: 'API route validation and middleware setup verified by Jest unit tests.',
    due_date: '2026-07-18',
    paid_at: '2026-07-17T15:00:00Z',
    payment_method: 'maya',
    created_at: '2026-07-15T09:00:00Z'
  },
  {
    id: 'INV-2026-07-07',
    milestone_id: 'ms_paid_3',
    milestone_title: 'Deployment & CI/CD Pipeline Configuration',
    project_id: 'proj_102',
    project_title: 'Motorcycle Delivery MVP Tracker',
    amount: 25000,
    status: 'paid',
    notes: 'Vite static build successfully piped to Cloud Run environment.',
    due_date: '2026-07-19',
    paid_at: '2026-07-18T18:30:00Z',
    payment_method: 'card',
    created_at: '2026-07-16T14:00:00Z'
  },
  {
    id: 'INV-2026-07-08',
    milestone_id: 'ms_pending_4',
    milestone_title: 'SMS OTP Integration (Twilio/Semaphore)',
    project_id: 'proj_101',
    project_title: 'E-commerce Redesign & GCash Integration',
    amount: 7500,
    status: 'pending',
    notes: 'Local mobile operator callbacks configured for PH sandbox numbers.',
    due_date: '2026-07-25',
    created_at: '2026-07-18T16:00:00Z'
  }
];

export const INITIAL_REVIEWS: Review[] = [
  // Freelancers reviewing clients
  {
    id: 'rev_001',
    project_id: 'proj_101',
    reviewer_id: 'free_001',
    reviewee_id: 'client_001',
    reviewer_role: 'freelancer',
    rating: 4,
    categories: { 'Payment timeliness': 5, 'Communication': 4, 'Scope clarity': 3, 'Would work with again': 4 },
    comment: 'Great client but scope expanded slightly during mobile review. Overall very professional and payments are swift.',
    created_at: '2026-07-01T10:00:00Z'
  },
  {
    id: 'rev_002',
    project_id: 'proj_102',
    reviewer_id: 'free_002',
    reviewee_id: 'client_002',
    reviewer_role: 'freelancer',
    rating: 5,
    categories: { 'Payment timeliness': 5, 'Communication': 5, 'Scope clarity': 5, 'Would work with again': 5 },
    comment: 'Outstanding engagement. Mia gave extremely precise technical specifications and provided Figma files instantly.',
    created_at: '2026-07-19T14:00:00Z'
  },
  {
    id: 'rev_003',
    project_id: 'proj_103',
    reviewer_id: 'free_001',
    reviewee_id: 'client_003',
    reviewer_role: 'freelancer',
    rating: 5,
    categories: { 'Payment timeliness': 5, 'Communication': 5, 'Scope clarity': 4, 'Would work with again': 5 },
    comment: 'Friendly and collaborative. Always fast on webhook authorization tests.',
    created_at: '2026-07-15T11:00:00Z'
  },
  {
    id: 'rev_004',
    project_id: 'proj_104',
    reviewer_id: 'free_002',
    reviewee_id: 'client_001',
    reviewer_role: 'freelancer',
    rating: 3,
    categories: { 'Payment timeliness': 3, 'Communication': 3, 'Scope clarity': 2, 'Would work with again': 3 },
    comment: 'Delayed payment approvals and ambiguous requirements on database scaling limits.',
    created_at: '2026-07-12T09:00:00Z'
  },
  // Clients reviewing freelancers
  {
    id: 'rev_005',
    project_id: 'proj_101',
    reviewer_id: 'client_001',
    reviewee_id: 'free_001',
    reviewer_role: 'client',
    rating: 4,
    categories: { 'Quality': 4, 'Communication': 5, 'Timeliness': 4, 'Would hire again': 4 },
    comment: 'Carlo is an exceptional Node.js engineer. Solved GCash webhook encryption issues with modular codes.',
    created_at: '2026-07-01T10:30:00Z'
  },
  {
    id: 'rev_006',
    project_id: 'proj_102',
    reviewer_id: 'client_002',
    reviewee_id: 'free_002',
    reviewer_role: 'client',
    rating: 5,
    categories: { 'Quality': 5, 'Communication': 5, 'Timeliness': 5, 'Would hire again': 5 },
    comment: 'Althea delivered the tracking algorithms ahead of deadline. Complete test logs provided.',
    created_at: '2026-07-19T14:15:00Z'
  },
  {
    id: 'rev_007',
    project_id: 'proj_103',
    reviewer_id: 'client_003',
    reviewee_id: 'free_001',
    reviewer_role: 'client',
    rating: 5,
    categories: { 'Quality': 5, 'Communication': 4, 'Timeliness': 5, 'Would hire again': 5 },
    comment: 'Perfect execution on Shopify checkout modifications.',
    created_at: '2026-07-15T11:30:00Z'
  },
  {
    id: 'rev_008',
    project_id: 'proj_104',
    reviewer_id: 'client_001',
    reviewee_id: 'free_002',
    reviewer_role: 'client',
    rating: 4,
    categories: { 'Quality': 4, 'Communication': 4, 'Timeliness': 4, 'Would hire again': 4 },
    comment: 'Solid Postgres audit. CPU utilization dropped from 100% to under 25%.',
    created_at: '2026-07-12T09:45:00Z'
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'not_001',
    type: 'proposal_received',
    title: 'New proposal received',
    body: 'Carlo Mendoza submitted a proposal for Laravel API + Vue 3 Client Dashboard (₱65,000.00)',
    is_read: false,
    entity_type: 'proposal',
    entity_id: 'prop_001',
    created_at: '2026-07-20T10:15:00Z'
  },
  {
    id: 'not_002',
    type: 'proposal_accepted',
    title: 'Proposal accepted!',
    body: 'Mia Santos accepted your proposal for Motorcycle Delivery MVP Tracker. Let\'s set up milestones.',
    is_read: false,
    entity_type: 'project',
    entity_id: 'proj_102',
    created_at: '2026-07-20T09:30:00Z'
  },
  {
    id: 'not_003',
    type: 'proposal_rejected',
    title: 'Proposal update',
    body: 'Moda Manila Co. declined your proposed rate for Shopify Checkout Customization.',
    is_read: true,
    entity_type: 'proposal',
    entity_id: 'prop_003',
    created_at: '2026-07-19T16:45:00Z'
  },
  {
    id: 'not_004',
    type: 'milestone_submitted',
    title: 'Milestone work submitted',
    body: 'Althea Cruz submitted deliverables for Core DB Schema & Socket setup.',
    is_read: false,
    entity_type: 'project',
    entity_id: 'proj_102',
    created_at: '2026-07-20T08:00:00Z'
  },
  {
    id: 'not_005',
    type: 'milestone_approved',
    title: 'Milestone payment approved',
    body: 'Juan Reyes approved wireframes milestone. ₱8,000.00 released to your balance.',
    is_read: true,
    entity_type: 'project',
    entity_id: 'proj_101',
    created_at: '2026-06-19T09:00:00Z'
  },
  {
    id: 'not_006',
    type: 'message_received',
    title: 'New chat message',
    body: 'Juan Reyes: "It is broken on multiple mobile devices in our office. Please check."',
    is_read: false,
    entity_type: 'chat',
    entity_id: 'proj_101',
    created_at: '2026-06-25T09:11:00Z'
  },
  {
    id: 'not_007',
    type: 'invoice_paid',
    title: 'Invoice paid successfully',
    body: 'Invoice INV-2026-07-01 (₱8,000.00) has been paid via GCash.',
    is_read: true,
    entity_type: 'invoice',
    entity_id: 'INV-2026-07-01',
    created_at: '2026-06-19T09:05:00Z'
  },
  {
    id: 'not_008',
    type: 'invoice_overdue',
    title: 'Invoice overdue warning',
    body: 'Invoice INV-2026-07-04 (₱5,000.00) is past its due date of 2026-07-10.',
    is_read: false,
    entity_type: 'invoice',
    entity_id: 'INV-2026-07-04',
    created_at: '2026-07-11T00:01:00Z'
  },
  {
    id: 'not_009',
    type: 'dispute_opened',
    title: 'Mediation file opened',
    body: 'Dispute #47 has been opened for E-commerce Redesign regarding Milestone 2.',
    is_read: false,
    entity_type: 'dispute',
    entity_id: 'disp_001',
    created_at: '2026-06-25T09:15:00Z'
  },
  {
    id: 'not_010',
    type: 'message_received',
    title: 'New brief message',
    body: 'Althea Cruz: "The database models are designed. I have indexed coordinates."',
    is_read: true,
    entity_type: 'chat',
    entity_id: 'proj_102',
    created_at: '2026-07-20T08:02:00Z'
  },
  {
    id: 'not_011',
    type: 'invoice_paid',
    title: 'Invoice disbursement',
    body: 'Invoice INV-2026-07-07 (₱25,000.00) has been marked paid via Bank Transfer.',
    is_read: true,
    entity_type: 'invoice',
    entity_id: 'INV-2026-07-07',
    created_at: '2026-07-18T18:35:00Z'
  },
  {
    id: 'not_012',
    type: 'invoice_overdue',
    title: 'Overdue payout notice',
    body: 'Invoice INV-2026-07-05 (₱15,000.00) is now 8 days overdue.',
    is_read: false,
    entity_type: 'invoice',
    entity_id: 'INV-2026-07-05',
    created_at: '2026-07-20T00:01:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_001',
    timestamp: '2026-07-20T11:00:00Z',
    level: 'info',
    actor: 'SuperAdmin',
    action: 'SYSTEM_BOOT',
    entity: 'Mediation Engine',
  },
  {
    id: 'aud_002',
    timestamp: '2026-07-20T10:45:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'INVOICE_CREATE',
    entity: 'INV-2026-07-08',
  },
  {
    id: 'aud_003',
    timestamp: '2026-07-20T10:15:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'PROPOSAL_SUBMIT',
    entity: 'Laravel API Dashboard',
  },
  {
    id: 'aud_004',
    timestamp: '2026-07-20T09:30:00Z',
    level: 'info',
    actor: 'Mia Santos',
    action: 'PROPOSAL_ACCEPT',
    entity: 'Motorcycle Delivery Tracker',
  },
  {
    id: 'aud_005',
    timestamp: '2026-07-20T08:00:00Z',
    level: 'info',
    actor: 'Althea Cruz',
    action: 'MILESTONE_SUBMIT',
    entity: 'ms_102_1',
  },
  {
    id: 'aud_006',
    timestamp: '2026-07-20T01:00:00Z',
    level: 'warn',
    actor: 'System Cron',
    action: 'INVOICE_OVERDUE_SCAN',
    entity: 'INV-2026-07-05',
  },
  {
    id: 'aud_007',
    timestamp: '2026-07-19T18:30:00Z',
    level: 'info',
    actor: 'Mia Santos',
    action: 'INVOICE_PAY',
    entity: 'INV-2026-07-07',
  },
  {
    id: 'aud_008',
    timestamp: '2026-07-19T16:45:00Z',
    level: 'info',
    actor: 'Althea Cruz',
    action: 'PROPOSAL_DECLINE',
    entity: 'Shopify Checkout customization',
  },
  {
    id: 'aud_009',
    timestamp: '2026-07-18T16:00:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'INVOICE_CREATE',
    entity: 'INV-2026-07-08',
  },
  {
    id: 'aud_010',
    timestamp: '2026-07-17T15:00:00Z',
    level: 'info',
    actor: 'Juan Reyes',
    action: 'INVOICE_PAY',
    entity: 'INV-2026-07-06',
  },
  {
    id: 'aud_011',
    timestamp: '2026-07-16T14:00:00Z',
    level: 'info',
    actor: 'Althea Cruz',
    action: 'INVOICE_CREATE',
    entity: 'INV-2026-07-07',
  },
  {
    id: 'aud_012',
    timestamp: '2026-07-15T09:00:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'INVOICE_CREATE',
    entity: 'INV-2026-07-06',
  },
  {
    id: 'aud_013',
    timestamp: '2026-07-12T09:45:00Z',
    level: 'info',
    actor: 'Juan Reyes',
    action: 'REVIEW_SUBMIT',
    entity: 'rev_005',
  },
  {
    id: 'aud_014',
    timestamp: '2026-07-11T00:01:00Z',
    level: 'warn',
    actor: 'System Cron',
    action: 'INVOICE_OVERDUE_SCAN',
    entity: 'INV-2026-07-04',
  },
  {
    id: 'aud_015',
    timestamp: '2026-07-10T11:00:00Z',
    level: 'info',
    actor: 'Mia Santos',
    action: 'REVIEW_SUBMIT',
    entity: 'rev_006',
  },
  {
    id: 'aud_016',
    timestamp: '2026-07-08T09:12:00Z',
    level: 'info',
    actor: 'Juan Reyes',
    action: 'DISPUTE_OPEN',
    entity: 'disp_001',
  },
  {
    id: 'aud_017',
    timestamp: '2026-07-07T14:20:00Z',
    level: 'error',
    actor: 'GCash Webhook',
    action: 'SIGNATURE_MISMATCH',
    entity: 'Escrow Route 3000',
    stack_trace: 'Error: HMAC SHA256 validation failed\n  at /app/server.js:45:18\n  at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)\n  at trim_prefix (/app/node_modules/express/lib/router/index.js:328:13)'
  },
  {
    id: 'aud_018',
    timestamp: '2026-07-06T15:45:00Z',
    level: 'info',
    actor: 'SuperAdmin',
    action: 'USER_WARN',
    entity: 'usr_03',
  },
  {
    id: 'aud_019',
    timestamp: '2026-07-05T10:00:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'INVOICE_CREATE',
    entity: 'INV-2026-07-04',
  },
  {
    id: 'aud_020',
    timestamp: '2026-07-04T08:30:00Z',
    level: 'info',
    actor: 'Althea Cruz',
    action: 'INVOICE_CREATE',
    entity: 'INV-2026-07-05',
  },
  {
    id: 'aud_021',
    timestamp: '2026-07-03T11:20:00Z',
    level: 'info',
    actor: 'SuperAdmin',
    action: 'ESCROW_RELEASE',
    entity: 'Milestone Wireframes proj_101',
  },
  {
    id: 'aud_022',
    timestamp: '2026-07-02T13:10:00Z',
    level: 'error',
    actor: 'PostgreSQL DB',
    action: 'CONNECTION_LIMIT_EXCEEDED',
    entity: 'Cloud SQL Postgres Pool',
    stack_trace: 'PGError: FATAL: remaining connection slots are reserved for non-replication superuser connections\n  at Connection.parseE (/app/node_modules/pg/lib/connection.js:526:11)\n  at Connection.parseMessage (/app/node_modules/pg/lib/connection.js:376:19)'
  },
  {
    id: 'aud_023',
    timestamp: '2026-07-01T09:00:00Z',
    level: 'info',
    actor: 'Juan Reyes',
    action: 'INVOICE_PAY',
    entity: 'INV-2026-07-01',
  },
  {
    id: 'aud_024',
    timestamp: '2026-06-28T16:40:00Z',
    level: 'warn',
    actor: 'System Monitor',
    action: 'CPU_SPIKE_DETECTED',
    entity: 'Vite Production Instance',
  },
  {
    id: 'aud_025',
    timestamp: '2026-06-26T14:15:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'DOCUMENT_UPDATE',
    entity: 'doc_1',
  },
  {
    id: 'aud_026',
    timestamp: '2026-06-25T11:00:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'INVOICE_CREATE',
    entity: 'INV-2026-07-02',
  },
  {
    id: 'aud_027',
    timestamp: '2026-06-25T09:12:00Z',
    level: 'info',
    actor: 'Juan Reyes',
    action: 'DISPUTE_OPEN',
    entity: 'disp_001',
  },
  {
    id: 'aud_028',
    timestamp: '2026-06-24T16:15:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'MILESTONE_SUBMIT',
    entity: 'ms_101_2',
  },
  {
    id: 'aud_029',
    timestamp: '2026-06-18T14:30:00Z',
    level: 'info',
    actor: 'Carlo Mendoza',
    action: 'MILESTONE_SUBMIT',
    entity: 'ms_101_1',
  },
  {
    id: 'aud_030',
    timestamp: '2026-06-12T09:00:00Z',
    level: 'info',
    actor: 'Mia Santos',
    action: 'PROJECT_INITIATE',
    entity: 'proj_102',
  }
];

export const MOCK_ANALYTICS_SUMMARY: AnalyticsSummary = {
  totalUsers: 1847,
  totalUsersWoW: 47,
  gmvThisMonth: 2300000,
  gmvWoW: 180000,
  totalDisputes: 14,
  openDisputes: 3,
  uptime: 97.3
};

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'usr_001',
    name: 'Carlo Mendoza',
    email: 'carlo@githustle.dev',
    role: 'freelancer',
    status: 'active',
    joined_at: '2026-01-15',
    proposals_submitted: 42,
    rating: 4.8
  },
  {
    id: 'usr_002',
    name: 'Mia Santos',
    email: 'mia@kargoph.express',
    role: 'client',
    status: 'active',
    joined_at: '2026-02-10',
    jobs_posted: 18,
    rating: 4.9
  },
  {
    id: 'usr_003',
    name: 'Juan Reyes',
    email: 'juan@sarisari.ph',
    role: 'client',
    status: 'active',
    joined_at: '2026-03-01',
    jobs_posted: 24,
    rating: 4.5
  },
  {
    id: 'usr_004',
    name: 'Althea Cruz',
    email: 'althea@devmanila.co',
    role: 'freelancer',
    status: 'active',
    joined_at: '2026-01-20',
    proposals_submitted: 35,
    rating: 4.6
  },
  {
    id: 'usr_005',
    name: 'Spammer Node',
    email: 'spam@botnet.xyz',
    role: 'freelancer',
    status: 'suspended',
    joined_at: '2026-07-15',
    proposals_submitted: 180,
    rating: 1.2
  },
  {
    id: 'usr_006',
    name: 'David Tech-PH',
    email: 'david@bayanihan.tech',
    role: 'client',
    status: 'warned',
    joined_at: '2026-04-18',
    jobs_posted: 8,
    rating: 4.2
  }
];

