import { Socket, io } from 'socket.io-client';

interface NotificationData {
  _id: string;
  type: 'follow' | 'like' | 'comment' | 'mention' | 'post';
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  message: string;
  entityId?: string;
  entityType?: 'post' | 'comment' | 'user';
  read: boolean;
  createdAt: string;
}

interface PostUpdateData {
  postId: string;
  userId?: string;
  liked?: boolean;
  likesCount?: number;
  comment?: {
    _id: string;
    content: string;
    user: {
      _id: string;
      username: string;
      avatar?: string;
    };
    createdAt: string;
  };
  commentsCount?: number;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 5;
  private token: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    console.log('🔌 SOCKET: Initializing connection...');
    this.token = token;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('🔌 SOCKET: Connecting to:', API_URL);

    this.socket = io(API_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'], // FALLBACK ENABLED
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      withCredentials: true,
    });

    // COMPREHENSIVE ERROR HANDLING
    this.socket.on('connect', () => {
      console.log('✅ SOCKET: Connected successfully', this.socket?.id);
      this.reconnectAttempt = 0; // Reset counter on successful connection
      this.emit('socketConnected', null);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ SOCKET: Connection error:', error.message);
      console.error('❌ SOCKET: Error details:', error);
      this.handleConnectionError(error);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('⚠️ SOCKET: Disconnected -', reason);
      this.emit('socketDisconnected', reason);

      if (reason === 'io server disconnect') {
        console.log('🔄 SOCKET: Server disconnected, attempting manual reconnect...');
        this.attemptReconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 SOCKET: Reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempt = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('🔄 SOCKET: Reconnection attempt', attemptNumber);
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.error('❌ SOCKET: Reconnection error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💀 SOCKET: All reconnection attempts failed');
      this.emit('socketDisconnected', 'reconnection failed');
    });

    this.socket.on('notification', (data: NotificationData) => {
      console.log('🔔 SOCKET: New notification:', data);
      this.emit('newNotification', data);
    });

    this.socket.on('post:like', (data: PostUpdateData) => {
      console.log('👍 SOCKET: Post like update:', data);
      this.emit('postLikeUpdate', data);
    });

    this.socket.on('post:comment', (data: PostUpdateData) => {
      console.log('💬 SOCKET: Post comment update:', data);
      this.emit('postCommentUpdate', data);
    });

    this.socket.on('newPost', (data: PostUpdateData) => {
      console.log('📝 SOCKET: New post from followed user:', data);
      this.emit('newPostFromFollowing', data);
    });

    this.socket.on('error', (error: Error) => {
      console.error('❌ SOCKET: Socket error:', error);
    });
  }

  private handleConnectionError(_error: Error) {
    this.reconnectAttempt++;

    if (this.reconnectAttempt > this.maxReconnectAttempts) {
      console.error('💀 SOCKET: Max reconnection attempts reached');
      this.emit('socketDisconnected', 'max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * this.reconnectAttempt, 5000);
    console.log(`🔄 SOCKET: Retrying connection in ${delay}ms (attempt ${this.reconnectAttempt})`);

    setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  private attemptReconnect() {
    if (this.token) {
      console.log('🔄 SOCKET: Manual reconnection attempt...');
      this.disconnect();
      this.connect(this.token);
    }
  }

  // HARDCORE FIX: Reconnect specifically for block operations
  reconnectOnBlock(tempToken?: string) {
    console.log('🔧 SOCKET_BLOCK: Stable reconnect during block operation');

    if (this.socket?.connected) {
      const preservedToken = tempToken || this.token;
      console.log('🔧 SOCKET_BLOCK: Preserving auth token during reconnect');

      // Clean disconnect without triggering error handlers
      this.socket.removeAllListeners();
      this.socket.disconnect();

      // Immediate reconnect with preserved auth
      if (preservedToken) {
        this.socket = null; // Force new connection
        this.connect(preservedToken);
        console.log('✅ SOCKET_BLOCK: Reconnection completed with preserved auth');
      }
    }
  }

  // Get current token for preservation
  getCurrentToken(): string | null {
    return this.token;
  }

  // Check if socket is healthy during block operations
  isHealthyDuringBlock(): boolean {
    return Boolean(this.socket?.connected && !this.socket?.disconnected);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private emit(event: string, data: unknown) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  on(event: string, handler: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: (data: unknown) => void) {
    this.listeners.get(event)?.delete(handler);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Send a message to the server
  sendMessage(event: string, data: unknown) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
