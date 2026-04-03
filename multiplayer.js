// ===== Multiplayer Module — PeerJS Networking Layer =====

class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.roomCode = '';
    this.isHost = false;
    this.isConnected = false;
    this.onMessage = null;       // callback(data)
    this.onConnected = null;     // callback()
    this.onDisconnected = null;  // callback(reason)
    this.onError = null;         // callback(errorMsg)
    this.onRemoteStream = null;  // callback(stream)
  }

  // Generate a random 6-char alphanumeric code
  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // Get the PeerJS ID from a room code
  _peerId(code) {
    return 'HANDSOFFATE-' + code.toUpperCase();
  }

  // ===== CREATE ROOM (Host) =====
  createRoom() {
    return new Promise((resolve, reject) => {
      this.roomCode = this._generateCode();
      this.isHost = true;

      this.peer = new Peer(this._peerId(this.roomCode), {
        debug: 0,
      });

      this.peer.on('open', (id) => {
        console.log('[MP] Room created. Peer ID:', id, '| Code:', this.roomCode);
        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        console.log('[MP] Player 2 connected!');
        this.conn = conn;
        this._setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[MP] Peer error:', err);
        if (err.type === 'unavailable-id') {
          // Room code collision — try again
          this.destroy();
          this.createRoom().then(resolve).catch(reject);
        } else {
          const msg = this._friendlyError(err);
          if (this.onError) this.onError(msg);
          reject(msg);
        }
      });

      this.peer.on('disconnected', () => {
        console.log('[MP] Peer disconnected from signaling server');
      });

      this.peer.on('call', (call) => {
        console.log('[MP] Incoming video call from guest');
        // Answer with our local stream if available
        call.answer(window.localStream);
        call.on('stream', (remoteStream) => {
          console.log('[MP] Received guest video stream');
          if (this.onRemoteStream) this.onRemoteStream(remoteStream);
        });
      });
    });
  }

  // ===== JOIN ROOM (Guest) =====
  joinRoom(code) {
    return new Promise((resolve, reject) => {
      this.roomCode = code.toUpperCase().trim();
      this.isHost = false;

      this.peer = new Peer(undefined, {
        debug: 0,
      });

      this.peer.on('open', () => {
        console.log('[MP] Connecting to room:', this.roomCode);
        const conn = this.peer.connect(this._peerId(this.roomCode), {
          reliable: true,
        });

        conn.on('open', () => {
          console.log('[MP] Connected to host!');
          this.conn = conn;
          this._setupConnection(conn);
          resolve();
        });

        conn.on('error', (err) => {
          console.error('[MP] Connection error:', err);
          reject('Failed to connect to room. Check the room code.');
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject('Connection timed out. Room may not exist.');
            this.destroy();
          }
        }, 10000);

        // Initiate video call to host
        if (window.localStream) {
          const call = this.peer.call(this._peerId(this.roomCode), window.localStream);
          call.on('stream', (remoteStream) => {
            console.log('[MP] Received host video stream');
            if (this.onRemoteStream) this.onRemoteStream(remoteStream);
          });
        }
      });

      this.peer.on('error', (err) => {
        console.error('[MP] Peer error:', err);
        const msg = this._friendlyError(err);
        if (this.onError) this.onError(msg);
        reject(msg);
      });
    });
  }

  // ===== SETUP CONNECTION =====
  _setupConnection(conn) {
    this.isConnected = true;

    conn.on('data', (data) => {
      if (this.onMessage) this.onMessage(data);
    });

    conn.on('close', () => {
      console.log('[MP] Connection closed');
      this.isConnected = false;
      if (this.onDisconnected) this.onDisconnected('Opponent disconnected');
    });

    conn.on('error', (err) => {
      console.error('[MP] Connection error:', err);
      this.isConnected = false;
      if (this.onDisconnected) this.onDisconnected('Connection error');
    });

    if (this.onConnected) this.onConnected();
  }

  // ===== SEND MESSAGE =====
  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    } else {
      console.warn('[MP] Cannot send — no active connection');
    }
  }

  // ===== GET SHAREABLE LINK =====
  getShareLink() {
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${this.roomCode}`;
  }

  // ===== CHECK URL FOR ROOM CODE =====
  static getRoomFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || null;
  }

  // ===== DESTROY / LEAVE =====
  destroy() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isConnected = false;
    this.isHost = false;
    this.roomCode = '';
  }

  // ===== FRIENDLY ERROR MESSAGES =====
  _friendlyError(err) {
    switch (err.type) {
      case 'peer-unavailable':
        return 'Room not found. Check the code and try again.';
      case 'network':
        return 'Network error. Check your internet connection.';
      case 'server-error':
        return 'Signaling server error. Please try again later.';
      case 'unavailable-id':
        return 'Room code already taken. Trying another...';
      default:
        return 'Connection error: ' + (err.message || err.type);
    }
  }
}

// Export singleton
window.multiplayer = new MultiplayerManager();
