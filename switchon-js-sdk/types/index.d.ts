/**
 * SwitchOn JavaScript SDK — TypeScript definitions
 */

// ── Shared types ──────────────────────────────────────────────────────────────

export type FlagValue = boolean | string | number | object | null;

export type FlagsMap = Record<string, FlagValue>;

export type EvaluationReason =
  | 'FLAG_DISABLED'
  | 'RULE_MATCH'
  | 'FULL_ROLLOUT'
  | 'ZERO_ROLLOUT'
  | 'IN_ROLLOUT'
  | 'OUT_OF_ROLLOUT';

export interface EvaluationResult {
  enabled:        boolean;
  value:          FlagValue;
  bucket:         number | null;
  reason:         EvaluationReason;
  variationIndex: number | null;
  ruleDescription?: string;
}

export interface FlagDocument {
  _id:               string;
  name:              string;
  description:       string;
  type:              'boolean' | 'string' | 'number' | 'json';
  enabled:           boolean;
  rolloutPercentage: number;
  environment:       'development' | 'staging' | 'production';
  rules:             TargetingRule[];
  variations:        Variation[];
  defaultVariation:  number;
  tags:              string[];
  projectId:         string | null;
  archived:          boolean;
  version:           number;
}

export interface Variation {
  name:        string;
  value:       FlagValue;
  description: string;
}

export interface TargetingRule {
  description: string;
  conditions:  RuleCondition[];
  serve:       number;
  rollout:     number;
}

export interface RuleCondition {
  attribute: string;
  operator:  'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith'
            | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value:     string | number | string[];
}

export type UserAttributes = Record<string, string | number | boolean>;

// ── SwitchOnClient (Browser SDK) ─────────────────────────────────────────────

export interface SwitchOnClientOptions {
  /** Base URL of your SwitchOn API server. E.g. https://flags.yourapp.com */
  apiUrl: string;
  /** SDK key from the SwitchOn dashboard (Settings → SDK Keys). */
  sdkKey: string;
  /** Environment to evaluate flags in. Defaults to 'production'. */
  environment?: 'development' | 'staging' | 'production';
  /** Enable verbose console logging. Defaults to false. */
  debug?: boolean;
}

export type SwitchOnEvent =
  | 'ready'
  | 'change'
  | 'snapshot'
  | 'connected'
  | 'disconnected'
  | 'flagUpdate';

declare class SwitchOnClient {
  constructor(options: SwitchOnClientOptions);

  /**
   * Initialise the SDK for a specific user. Fetches all flag configs, evaluates
   * them in a single batch call, then opens an SSE stream for live updates.
   */
  init(userId: string, userAttributes?: UserAttributes): Promise<SwitchOnClient>;

  /**
   * Returns a promise that resolves (with the flags map) once init() completes.
   * Safe to call before init() is invoked.
   */
  waitUntilReady(): Promise<FlagsMap>;

  /**
   * Returns the current evaluated value for flagName, or defaultValue if the
   * flag is not found or the SDK is not yet initialised.
   */
  variation<T extends FlagValue = boolean>(flagName: string, defaultValue?: T): T;

  /** Convenience wrapper — returns true/false for boolean flags. */
  isEnabled(flagName: string): boolean;

  /** Returns a copy of all currently evaluated flags. */
  allFlags(): FlagsMap;

  /**
   * Re-evaluate all flags for a different user (e.g. after login / logout).
   * Emits a 'ready' event when complete.
   */
  identify(userId: string, userAttributes?: UserAttributes): Promise<FlagsMap>;

  on(event: 'ready',       listener: (flags: FlagsMap) => void): this;
  on(event: 'change',      listener: (flagName: string, newValue: FlagValue, oldValue: FlagValue) => void): this;
  on(event: 'snapshot',    listener: (flags: FlagsMap) => void): this;
  on(event: 'connected',   listener: () => void): this;
  on(event: 'disconnected',listener: () => void): this;
  on(event: 'flagUpdate',  listener: (flag: FlagDocument, event: string) => void): this;
  on(event: string,        listener: (...args: unknown[]) => void): this;

  off(event: string, listener: (...args: unknown[]) => void): void;

  /** Close the SSE connection and clean up. */
  destroy(): void;
}

export { SwitchOnClient };
export default SwitchOnClient;

// ── SwitchOnServer (Node.js SDK) ─────────────────────────────────────────────

export interface SwitchOnServerOptions {
  /** Base URL of your SwitchOn API server. */
  apiUrl: string;
  /** SDK key from the SwitchOn dashboard. */
  sdkKey: string;
  /** Environment to evaluate flags in. Defaults to 'production'. */
  environment?: 'development' | 'staging' | 'production';
  /**
   * How often to re-fetch flag configs from the server (milliseconds).
   * Defaults to 30 000 (30 seconds).
   */
  pollInterval?: number;
  /** Enable verbose console logging. Defaults to false. */
  debug?: boolean;
}

export interface RequestFlags {
  isEnabled(flagName: string): boolean;
  variation<T extends FlagValue = boolean>(flagName: string, defaultValue?: T): T;
  evaluateAll(): FlagsMap;
  userId:     string;
  attributes: UserAttributes;
}

export interface MiddlewareOptions {
  /** Extract the user ID from the request. */
  getUserId?:     (req: object) => string;
  /** Extract user attributes from the request for targeting rules. */
  getAttributes?: (req: object) => UserAttributes;
}

declare class SwitchOnServer {
  constructor(options: SwitchOnServerOptions);

  /**
   * Load all flag configs and start background polling.
   * Await this before serving any requests.
   */
  init(): Promise<SwitchOnServer>;

  /**
   * Evaluate a flag for a specific user. Evaluation is local (no HTTP call).
   * Returns defaultValue if the flag is not found.
   */
  variation<T extends FlagValue = boolean>(
    flagName:       string,
    userId:         string,
    userAttributes?: UserAttributes,
    defaultValue?:  T,
  ): T;

  /** Convenience wrapper — returns true/false for boolean flags. */
  isEnabled(flagName: string, userId: string, userAttributes?: UserAttributes): boolean;

  /** Evaluate every known flag for a user. Returns a plain { name: value } map. */
  evaluateAll(userId: string, userAttributes?: UserAttributes): FlagsMap;

  /** All flag names currently loaded. */
  flagNames(): string[];

  /**
   * Returns an Express/Connect middleware that attaches `req.flags` to every
   * request. `req.flags` exposes isEnabled(), variation(), and evaluateAll().
   */
  middleware(opts?: MiddlewareOptions): (req: object, res: object, next: () => void) => void;

  /** Stop polling and release resources. */
  close(): void;
}

export { SwitchOnServer };

// ── React hooks ──────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';

export interface SwitchOnProviderProps {
  /** The SwitchOnClient instance. */
  client: SwitchOnClient;
  /** Current user's stable ID. */
  userId?: string;
  /** Targeting attributes for this user. */
  userAttributes?: UserAttributes;
  children: ReactNode;
  /**
   * Rendered while the initial flag load is in progress.
   * If omitted, children are rendered immediately with default values.
   */
  loadingFallback?: ReactNode;
}

/** Place near the root of your app. Manages SDK lifecycle and re-renders on changes. */
export function SwitchOnProvider(props: SwitchOnProviderProps): JSX.Element;

/** Returns the raw context: { client, flags, ready }. */
export function useSwitchOn(): { client: SwitchOnClient; flags: FlagsMap; ready: boolean };

/**
 * Returns the evaluated value for a flag. Re-renders the component when the
 * flag changes. Returns defaultValue if the flag is not found.
 */
export function useFlag<T extends FlagValue = boolean>(flagName: string, defaultValue?: T): T;

/** Alias for useFlag — preferred for multivariate flags. */
export function useVariation<T extends FlagValue = boolean>(flagName: string, defaultValue?: T): T;

/** Returns the entire evaluated-flags map. Triggers a re-render on any change. */
export function useFlags(): FlagsMap;

/** Returns true once the initial flag load completes. */
export function useIsReady(): boolean;
