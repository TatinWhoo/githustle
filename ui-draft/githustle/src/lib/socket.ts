// Client-side mock socket implementation representing VITE_SOCKET_URL
type SocketCallback = (data: any) => void;

class MockSocket {
  private listeners: { [event: string]: SocketCallback[] } = {};
  public connected = true;

  constructor() {
    // Automatically trigger mock background notifications periodically to simulate live events
    setInterval(() => {
      this.triggerRandomNotification();
    }, 25000);
  }

  on(event: string, callback: SocketCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: SocketCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, data: any) {
    // Dispatch to any local listeners for testing
    this.dispatch(event, data);

    // Simulate server side behaviors
    if (event === 'join_project') {
      setTimeout(() => {
        this.dispatch('new_message', {
          id: `msg_system_${Date.now()}`,
          senderName: 'System Agent',
          senderRole: 'client',
          text: `Secure Escrow handshake initialized for project ID ${data.projectId}. SSL channel validated.`,
          timestamp: new Date().toISOString()
        });
      }, 1000);
    }

    if (event === 'send_message') {
      // Confirm message sent
      setTimeout(() => {
        this.dispatch('message_status_update', {
          id: data.id,
          status: 'sent'
        });
      }, 800);

      // Simulate a response typing indicator
      setTimeout(() => {
        this.dispatch('typing_start', { projectId: data.projectId });
      }, 2000);

      setTimeout(() => {
        this.dispatch('typing_stop', { projectId: data.projectId });
        this.dispatch('new_message', {
          id: `msg_reply_${Date.now()}`,
          senderName: 'System Auditor Partner',
          senderRole: 'client',
          text: `Auto-ack: Received payload. Analyzing contract SLA compliance metrics under guidelines...`,
          timestamp: new Date().toISOString()
        });
      }, 4200);
    }
  }

  public dispatch(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  private triggerRandomNotification() {
    const notifications = [
      {
        id: `notif_${Date.now()}_1`,
        title: 'New Escrow Deposit Secured',
        message: '₱24,500.00 locked securely for milestone 1 of Pasig project.',
        timestamp: new Date().toISOString()
      },
      {
        id: `notif_${Date.now()}_2`,
        title: 'Milestone Submission Approved',
        message: 'Milestone wireframes approved by client Juan Reyes.',
        timestamp: new Date().toISOString()
      },
      {
        id: `notif_${Date.now()}_3`,
        title: 'Secure SLA Audit Warning',
        message: 'System audit logs scan: connection speed matches 100% compliance SLA.',
        timestamp: new Date().toISOString()
      }
    ];

    const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];
    this.dispatch('notification', randomNotif);
  }
}

// Global single instance of MockSocket
export const mockSocket = new MockSocket();

export function getSocket(token: string) {
  return mockSocket;
}
