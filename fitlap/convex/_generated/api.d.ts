/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_drafts from "../admin/drafts.js";
import type * as admin_laptops from "../admin/laptops.js";
import type * as admin_photos from "../admin/photos.js";
import type * as catalog from "../catalog.js";
import type * as devSeed from "../devSeed.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_catalogDb from "../lib/catalogDb.js";
import type * as lib_draftChecks from "../lib/draftChecks.js";
import type * as lib_export from "../lib/export.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/drafts": typeof admin_drafts;
  "admin/laptops": typeof admin_laptops;
  "admin/photos": typeof admin_photos;
  catalog: typeof catalog;
  devSeed: typeof devSeed;
  "lib/admin": typeof lib_admin;
  "lib/catalogDb": typeof lib_catalogDb;
  "lib/draftChecks": typeof lib_draftChecks;
  "lib/export": typeof lib_export;
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
