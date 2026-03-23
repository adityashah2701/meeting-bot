/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dashboard_index from "../dashboard/index.js";
import type * as http from "../http.js";
import type * as insights_index from "../insights/index.js";
import type * as invitationEmailState from "../invitationEmailState.js";
import type * as invitations_index from "../invitations/index.js";
import type * as invitationsDelivery from "../invitationsDelivery.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_invitations from "../lib/invitations.js";
import type * as lib_meetingPermissions from "../lib/meetingPermissions.js";
import type * as lib_meetinghelpers from "../lib/meetinghelpers.js";
import type * as meetings_index from "../meetings/index.js";
import type * as meetings_summaryChunks from "../meetings/summaryChunks.js";
import type * as messages_index from "../messages/index.js";
import type * as notifications_index from "../notifications/index.js";
import type * as organization_index from "../organization/index.js";
import type * as participants_index from "../participants/index.js";
import type * as recordings_index from "../recordings/index.js";
import type * as signals_index from "../signals/index.js";
import type * as tasks_index from "../tasks/index.js";
import type * as transcripts_index from "../transcripts/index.js";
import type * as users_index from "../users/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "dashboard/index": typeof dashboard_index;
  http: typeof http;
  "insights/index": typeof insights_index;
  invitationEmailState: typeof invitationEmailState;
  "invitations/index": typeof invitations_index;
  invitationsDelivery: typeof invitationsDelivery;
  "lib/auth": typeof lib_auth;
  "lib/invitations": typeof lib_invitations;
  "lib/meetingPermissions": typeof lib_meetingPermissions;
  "lib/meetinghelpers": typeof lib_meetinghelpers;
  "meetings/index": typeof meetings_index;
  "meetings/summaryChunks": typeof meetings_summaryChunks;
  "messages/index": typeof messages_index;
  "notifications/index": typeof notifications_index;
  "organization/index": typeof organization_index;
  "participants/index": typeof participants_index;
  "recordings/index": typeof recordings_index;
  "signals/index": typeof signals_index;
  "tasks/index": typeof tasks_index;
  "transcripts/index": typeof transcripts_index;
  "users/index": typeof users_index;
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
