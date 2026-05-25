export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: number
          name: string
          code: string
          flag_url: string | null
          group_name: string | null
        }
        Insert: {
          id?: number
          name: string
          code: string
          flag_url?: string | null
          group_name?: string | null
        }
        Update: {
          id?: number
          name?: string
          code?: string
          flag_url?: string | null
          group_name?: string | null
        }
      }
      matches: {
        Row: {
          id: number
          stage: string
          stage_order: number
          match_date: string
          home_team_id: number | null
          away_team_id: number | null
          home_score: number | null
          away_score: number | null
          status: string
          external_id: string | null
          venue: string | null
          lock_time: string
        }
        Insert: {
          id?: number
          stage: string
          stage_order?: number
          match_date: string
          home_team_id?: number | null
          away_team_id?: number | null
          home_score?: number | null
          away_score?: number | null
          status?: string
          external_id?: string | null
          venue?: string | null
          lock_time: string
        }
        Update: {
          id?: number
          stage?: string
          stage_order?: number
          match_date?: string
          home_team_id?: number | null
          away_team_id?: number | null
          home_score?: number | null
          away_score?: number | null
          status?: string
          external_id?: string | null
          venue?: string | null
          lock_time?: string
        }
      }
      stage_locks: {
        Row: {
          stage: string
          locks_at: string
          locked: boolean
        }
        Insert: {
          stage: string
          locks_at: string
          locked?: boolean
        }
        Update: {
          stage?: string
          locks_at?: string
          locked?: boolean
        }
      }
      predictions: {
        Row: {
          id: number
          user_id: string
          match_id: number
          home_score_pred: number
          away_score_pred: number
          points_awarded: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          match_id: number
          home_score_pred: number
          away_score_pred: number
          points_awarded?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          match_id?: number
          home_score_pred?: number
          away_score_pred?: number
          points_awarded?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      draft_rooms: {
        Row: {
          id: string
          status: string
          pick_order: string[]
          current_pick_index: number
          pick_timer_seconds: number
          created_at: string
          started_at: string | null
        }
        Insert: {
          id?: string
          status?: string
          pick_order?: string[]
          current_pick_index?: number
          pick_timer_seconds?: number
          created_at?: string
          started_at?: string | null
        }
        Update: {
          id?: string
          status?: string
          pick_order?: string[]
          current_pick_index?: number
          pick_timer_seconds?: number
          created_at?: string
          started_at?: string | null
        }
      }
      draft_picks: {
        Row: {
          id: number
          room_id: string
          user_id: string
          team_id: number
          pick_number: number
          snake_round: number
          created_at: string
        }
        Insert: {
          id?: number
          room_id: string
          user_id: string
          team_id: number
          pick_number: number
          snake_round: number
          created_at?: string
        }
        Update: {
          id?: number
          room_id?: string
          user_id?: string
          team_id?: number
          pick_number?: number
          snake_round?: number
          created_at?: string
        }
      }
      draft_points: {
        Row: {
          id: number
          user_id: string
          team_id: number
          match_id: number
          points: number
          reason: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          team_id: number
          match_id: number
          points: number
          reason: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          team_id?: number
          match_id?: number
          points?: number
          reason?: string
          created_at?: string
        }
      }
    }
    Views: {
      leaderboard: {
        Row: {
          user_id: string
          username: string
          predictor_points: number
          draft_points: number
          total_points: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
