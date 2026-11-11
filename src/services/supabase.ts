import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { QuizState, SyncAction, WinnerHistoryItem } from '../types';

export const SUPABASE_URL = 'https://ncaahysqlobecigoaqna.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_6hUUh-63_B0cHYjhSBF-pQ_NEBJaV8m';

export const SESSIONS_TABLE = 'sessions_quiz';
export const HISTORY_TABLE = 'history_quiz';
export const DEFAULT_SESSION_ID = 'default';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

class SupabaseService {
  private channel: RealtimeChannel | null = null;
  private isConnected: boolean = false;
  private connectionListeners: ((connected: boolean) => void)[] = [];

  constructor() {
    this.checkConnection();
  }

  public onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener);
    listener(this.isConnected);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== listener);
    };
  }

  private setConnected(connected: boolean) {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      this.connectionListeners.forEach((l) => l(connected));
    }
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(SESSIONS_TABLE)
        .select('id, updated_at')
        .limit(1);

      if (error) {
        // Table may not exist yet or network issue
        this.setConnected(false);
        return false;
      }
      this.setConnected(true);
      return true;
    } catch {
      this.setConnected(false);
      return false;
    }
  }

  /**
   * Save current quiz state and optional action to Supabase
   */
  public async saveSession(state: QuizState, action?: SyncAction): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = {
        id: DEFAULT_SESSION_ID,
        state,
        updated_at: new Date().toISOString(),
      };

      if (action) {
        payload.last_action = {
          ...action,
          _action_time: Date.now(),
        };
      }

      const { error } = await supabase
        .from(SESSIONS_TABLE)
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[Supabase] Error saving session to', SESSIONS_TABLE, error.message);
        this.setConnected(false);
        return false;
      }

      this.setConnected(true);
      return true;
    } catch (err) {
      console.warn('[Supabase] Network exception saving session', err);
      this.setConnected(false);
      return false;
    }
  }

  /**
   * Fetch current session from Supabase
   */
  public async loadSession(): Promise<{ state: QuizState | null; lastAction: SyncAction | null }> {
    try {
      const { data, error } = await supabase
        .from(SESSIONS_TABLE)
        .select('state, last_action')
        .eq('id', DEFAULT_SESSION_ID)
        .maybeSingle();

      if (error || !data) {
        return { state: null, lastAction: null };
      }

      this.setConnected(true);
      return {
        state: (data.state as QuizState) || null,
        lastAction: (data.last_action as SyncAction) || null,
      };
    } catch {
      return { state: null, lastAction: null };
    }
  }

  /**
   * Realtime subscription for cross-device synchronization (e.g. phone controller -> TV display)
   */
  public subscribeToSession(
    onRemoteUpdate: (state: QuizState, action?: SyncAction) => void
  ): () => void {
    try {
      if (this.channel) {
        this.channel.unsubscribe();
      }

      this.channel = supabase
        .channel(`room_${SESSIONS_TABLE}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: SESSIONS_TABLE,
            filter: `id=eq.${DEFAULT_SESSION_ID}`,
          },
          (payload) => {
            const newRecord = payload.new as { state?: QuizState; last_action?: SyncAction };
            if (newRecord?.state) {
              onRemoteUpdate(newRecord.state, newRecord.last_action);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.setConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.setConnected(false);
          }
        });
    } catch (e) {
      console.warn('[Supabase] Subscription error', e);
    }

    return () => {
      if (this.channel) {
        this.channel.unsubscribe();
        this.channel = null;
      }
    };
  }

  /**
   * History methods
   */
  public async saveHistoryItem(item: WinnerHistoryItem): Promise<boolean> {
    try {
      const { error } = await supabase.from(HISTORY_TABLE).insert({
        id: item.id,
        timestamp: item.timestamp,
        formatted_time: item.formattedTime,
        round: item.round,
        winner_name: item.winnerName,
        winning_score: item.winningScore,
        event_title: item.eventTitle,
        players_summary: item.playersSummary,
      });
      return !error;
    } catch {
      return false;
    }
  }

  public async loadHistory(): Promise<WinnerHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from(HISTORY_TABLE)
        .select('*')
        .order('timestamp', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        formattedTime: row.formatted_time,
        round: row.round,
        winnerName: row.winner_name,
        winningScore: row.winning_score,
        eventTitle: row.event_title,
        playersSummary: row.players_summary,
      }));
    } catch {
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
