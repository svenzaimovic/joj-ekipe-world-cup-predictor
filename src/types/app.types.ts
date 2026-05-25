export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'

export const STAGE_LABELS: Record<Stage, string> = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Finals',
  sf: 'Semi-Finals',
  final: 'Final',
}

export const STAGE_ORDER: Stage[] = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
}

export interface Team {
  id: number
  name: string
  code: string
  flag_url: string | null
  group_name: string | null
}

export interface Match {
  id: number
  stage: Stage
  stage_order: number
  match_date: string
  home_team_id: number | null
  away_team_id: number | null
  home_team?: Team | null
  away_team?: Team | null
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'live' | 'finished'
  external_id: string | null
  venue: string | null
  lock_time: string
}

export interface StageLock {
  stage: Stage
  locks_at: string
  locked: boolean
}

export interface Prediction {
  id: number
  user_id: string
  match_id: number
  home_score_pred: number
  away_score_pred: number
  points_awarded: number | null
  created_at: string
  updated_at: string
}

export interface DraftRoom {
  id: string
  status: 'waiting' | 'active' | 'completed'
  pick_order: string[]
  current_pick_index: number
  pick_timer_seconds: number
  created_at: string
  started_at: string | null
}

export interface DraftPick {
  id: number
  room_id: string
  user_id: string
  team_id: number
  pick_number: number
  snake_round: number
  created_at: string
  team?: Team
  profile?: Profile
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  predictor_points: number
  draft_points: number
  total_points: number
}

export type MatchResult = 'home' | 'draw' | 'away'

export function getMatchResult(homeScore: number, awayScore: number): MatchResult {
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

export function calculatePredictorPoints(
  homeScorePred: number,
  awayScorePred: number,
  homeScoreActual: number,
  awayScoreActual: number,
): number {
  if (homeScorePred === homeScoreActual && awayScorePred === awayScoreActual) return 5
  const predResult = getMatchResult(homeScorePred, awayScorePred)
  const actualResult = getMatchResult(homeScoreActual, awayScoreActual)
  if (predResult !== actualResult) return 0
  const predDiff = homeScorePred - awayScorePred
  const actualDiff = homeScoreActual - awayScoreActual
  if (predDiff === actualDiff) return 3
  return 2
}
