import { QuizState, SyncAction, WinnerHistoryItem } from '../types';
import { INITIAL_QUIZ_STATE } from '../constants/defaultData';
import { supabaseService } from './supabase';

const CHANNEL_NAME = 'quiz_master_sync_channel_v1';
const STORAGE_KEY = 'quiz_master_state_v1';
const HISTORY_KEY = 'quiz_master_history_v1';

class SyncService {
  private channel: BroadcastChannel | null = null;
  private actionListeners: ((action: SyncAction) => void)[] = [];
  private stateListeners: ((state: QuizState) => void)[] = [];
  private isDisplayConnected: boolean = false;
  private displayConnectionListeners: ((connected: boolean) => void)[] = [];
  private heartbeatInterval: number | null = null;
  private lastPongReceived: number = 0;
  private lastProcessedActionTime: number = 0;
  private saveDebounceTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<SyncAction>) => {
          this.handleIncomingAction(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported, relying on storage/cloud events', err);
      }

      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY && event.newValue) {
          try {
            const newState = JSON.parse(event.newValue) as QuizState;
            this.notifyStateListeners(newState);
          } catch (e) {
            console.error('Error parsing storage state', e);
          }
        }
      });

      // Initialize Supabase realtime subscription for cross-device support
      this.initSupabaseSync();
    }
  }

  private async initSupabaseSync() {
    // Attempt initial pull from Supabase
    const { state: cloudState } = await supabaseService.loadSession();
    if (cloudState && cloudState.lastUpdated > (this.loadState()?.lastUpdated || 0)) {
      this.saveLocalState(cloudState);
      this.notifyStateListeners(cloudState);
    }

    // Subscribe to remote updates via Supabase WebSockets
    supabaseService.subscribeToSession((remoteState, remoteAction) => {
      const localState = this.loadState();
      if (!localState || remoteState.lastUpdated >= localState.lastUpdated) {
        this.saveLocalState(remoteState);
        this.notifyStateListeners(remoteState);
      }

      if (remoteAction) {
        const actionTime = (remoteAction as any)._action_time || 0;
        if (actionTime > this.lastProcessedActionTime) {
          this.lastProcessedActionTime = actionTime;
          this.actionListeners.forEach((l) => l(remoteAction));
        }
      }
    });
  }

  private handleIncomingAction(action: SyncAction) {
    if (action.type === 'STATE_UPDATE') {
      this.notifyStateListeners(action.payload);
    } else if (action.type === 'PING') {
      this.sendRawAction({ type: 'PONG' });
    } else if (action.type === 'PONG') {
      this.lastPongReceived = Date.now();
      this.setConnected(true);
    }

    this.actionListeners.forEach((listener) => listener(action));
  }

  private setConnected(connected: boolean) {
    if (this.isDisplayConnected !== connected) {
      this.isDisplayConnected = connected;
      this.displayConnectionListeners.forEach((l) => l(connected));
    }
  }

  public startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.sendRawAction({ type: 'PING' });
    this.heartbeatInterval = window.setInterval(() => {
      this.sendRawAction({ type: 'PING' });
      if (Date.now() - this.lastPongReceived > 3500) {
        this.setConnected(false);
      }
    }, 2000);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public onDisplayConnectionChange(callback: (connected: boolean) => void): () => void {
    this.displayConnectionListeners.push(callback);
    callback(this.isDisplayConnected);
    return () => {
      this.displayConnectionListeners = this.displayConnectionListeners.filter((l) => l !== callback);
    };
  }

  public onAction(callback: (action: SyncAction) => void): () => void {
    this.actionListeners.push(callback);
    return () => {
      this.actionListeners = this.actionListeners.filter((l) => l !== callback);
    };
  }

  public onState(callback: (state: QuizState) => void): () => void {
    this.stateListeners.push(callback);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== callback);
    };
  }

  private notifyStateListeners(state: QuizState) {
    this.stateListeners.forEach((l) => l(state));
  }

  public loadState(): QuizState {
    if (typeof window === 'undefined') return INITIAL_QUIZ_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...INITIAL_QUIZ_STATE, ...parsed };
      }
    } catch (e) {
      console.error('Error loading state from localStorage', e);
    }
    return INITIAL_QUIZ_STATE;
  }

  private saveLocalState(state: QuizState) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error writing state to localStorage', e);
    }
  }

  public saveState(state: QuizState, action?: SyncAction) {
    if (typeof window === 'undefined') return;
    const enriched = { ...state, lastUpdated: Date.now() };
    this.saveLocalState(enriched);
    this.sendRawAction({ type: 'STATE_UPDATE', payload: enriched });

    // Sync to Supabase cloud in background with small debounce
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = window.setTimeout(() => {
      supabaseService.saveSession(enriched, action);
    }, 150);
  }

  public sendAction(action: SyncAction) {
    this.sendRawAction(action);
    // Also push action to Supabase for multi-device sync
    const currentState = this.loadState();
    supabaseService.saveSession(currentState, action);
  }

  private sendRawAction(action: SyncAction) {
    if (this.channel) {
      try {
        this.channel.postMessage(action);
      } catch (err) {
        console.warn('Error posting message to channel', err);
      }
    }
  }

  // History storage (local + cloud)
  public loadHistory(): WinnerHistoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  public saveHistory(history: WinnerHistoryItem[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error writing history to localStorage', e);
    }

    if (history.length > 0) {
      supabaseService.saveHistoryItem(history[0]);
    }
  }
}

export const syncService = new SyncService();
