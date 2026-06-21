export type Platform = "pc" | "console";

export type GameMode = "competitive" | "quickplay";

export type ApiErrorCode =
  | "INVALID_BATTLETAG"
  | "RATE_LIMITED"
  | "PLAYER_NOT_FOUND"
  | "PROFILE_PRIVATE"
  | "OVERFAST_UNAVAILABLE"
  | "OVERSTATS_UNAVAILABLE"
  | "DEEPSEEK_UNAVAILABLE"
  | "RATE_LIMIT_UNAVAILABLE"
  | "UNKNOWN_ERROR";

export interface AnalyzeRequest {
  battleTag: string;
  gameMode: GameMode;
}

export interface AiAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
  heroFocus: string[];
  roast: string;
}

export interface HeroSnapshot {
  hero: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  timePlayedSeconds: number;
  winrate: number;
  kda: number;
  averageEliminations: number;
  averageDeaths: number;
  averageDamage: number;
  averageHealing: number;
}

export interface PlayerRank {
  role: "tank" | "damage" | "support" | "open";
  division: string;
  tier: number;
}

export interface PlayerSnapshot {
  player: {
    id: string;
    name: string;
    avatar: string | null;
    title: string | null;
    endorsementLevel: number | null;
    ranks: PlayerRank[];
    lastUpdatedAt: string | null;
  };
  query: {
    battleTag: string;
    platform: Platform;
    gameMode: GameMode;
  };
  general: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    timePlayedSeconds: number;
    winrate: number;
    kda: number;
    totalEliminations: number;
    totalAssists: number;
    totalDeaths: number;
    totalDamage: number;
    totalHealing: number;
    averageEliminations: number;
    averageAssists: number;
    averageDeaths: number;
    averageDamage: number;
    averageHealing: number;
  };
  roles: Record<string, PlayerSnapshot["general"]>;
  topHeroes: HeroSnapshot[];
}

export interface AnalyzeSuccessResponse {
  ok: true;
  snapshot: PlayerSnapshot;
  analysis: AiAnalysis | null;
  aiError: string | null;
  quota: {
    limit: number;
    used: number;
    remaining: number;
  };
}

export interface AnalyzeErrorResponse {
  ok: false;
  code: ApiErrorCode;
  message: string;
}

export type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse;
