/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as authed_demo from '../authed/demo.js';
import type * as authed_health from '../authed/health.js';
import type * as authed_helpers from '../authed/helpers.js';
import type * as authed_insights from '../authed/insights.js';
import type * as authed_journal from '../authed/journal.js';
import type * as authed_users from '../authed/users.js';
import type * as insightsInternal from '../insightsInternal.js';
import type * as lib_dateRange from '../lib/dateRange.js';
import type * as private_demo from '../private/demo.js';
import type * as private_helpers from '../private/helpers.js';
import type * as private_journalDemo from '../private/journalDemo.js';

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server';

declare const fullApi: ApiFromModules<{
	'authed/demo': typeof authed_demo;
	'authed/health': typeof authed_health;
	'authed/helpers': typeof authed_helpers;
	'authed/insights': typeof authed_insights;
	'authed/journal': typeof authed_journal;
	'authed/users': typeof authed_users;
	insightsInternal: typeof insightsInternal;
	'lib/dateRange': typeof lib_dateRange;
	'private/demo': typeof private_demo;
	'private/helpers': typeof private_helpers;
	'private/journalDemo': typeof private_journalDemo;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>>;

export declare const components: {};
