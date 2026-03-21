/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_meetinghelpers from "../lib/meetinghelpers.js";
import type * as meetings from "../meetings.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as organization from "../organization.js";
import type * as participants from "../participants.js";
import type * as signals from "../signals.js";
import type * as tasks from "../tasks.js";
import type * as transcripts from "../transcripts.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  dashboard: typeof dashboard;
  http: typeof http;
  insights: typeof insights;
  "lib/auth": typeof lib_auth;
  "lib/meetinghelpers": typeof lib_meetinghelpers;
  meetings: typeof meetings;
  messages: typeof messages;
  notifications: typeof notifications;
  organization: typeof organization;
  participants: typeof participants;
  signals: typeof signals;
  tasks: typeof tasks;
  transcripts: typeof transcripts;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
