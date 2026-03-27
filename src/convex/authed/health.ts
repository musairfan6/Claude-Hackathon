import { v } from 'convex/values';
import {
	authedMutation,
	authedQuery,
	definedPatch,
	getUserByClerkId,
	getOrCreateUserByIdentity
} from './helpers';

const wearableImportRow = v.object({
	date: v.string(),
	hrv: v.optional(v.number()),
	restingHr: v.optional(v.number()),
	steps: v.optional(v.number()),
	activeCalories: v.optional(v.number()),
	exerciseMinutes: v.optional(v.number()),
	source: v.optional(v.string())
});

const WEARABLE_IMPORT_ORIGIN = 'wearable_csv';

/**
 * Upserts a health log for a given date. Idempotent by userId + date.
 * Calling twice on the same date replaces the previous entry.
 */
export const submitHealthLog = authedMutation({
	args: {
		date: v.string(), // "YYYY-MM-DD"
		hrv: v.optional(v.number()),
		restingHr: v.optional(v.number()),
		sleepDeep: v.optional(v.number()),
		sleepRem: v.optional(v.number()),
		sleepLight: v.optional(v.number()),
		sleepAwake: v.optional(v.number()),
		sleepTotalMinutes: v.optional(v.number()),
		steps: v.optional(v.number()),
		activeCalories: v.optional(v.number()),
		exerciseMinutes: v.optional(v.number()),
		source: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const user = await getOrCreateUserByIdentity(ctx.db, ctx.identity);
		const existingLog = await ctx.db
			.query('healthLogs')
			.withIndex('by_user_and_date', (q) => q.eq('userId', user._id).eq('date', args.date))
			.unique();

		if (existingLog !== null) {
			await ctx.db.patch(existingLog._id, definedPatch(args));
			return ctx.db.get(existingLog._id);
		}

		const logId = await ctx.db.insert('healthLogs', {
			userId: user._id,
			date: args.date,
			createdAt: Date.now(),
			...definedPatch({
				hrv: args.hrv,
				restingHr: args.restingHr,
				sleepDeep: args.sleepDeep,
				sleepRem: args.sleepRem,
				sleepLight: args.sleepLight,
				sleepAwake: args.sleepAwake,
				sleepTotalMinutes: args.sleepTotalMinutes,
				steps: args.steps,
				activeCalories: args.activeCalories,
				exerciseMinutes: args.exerciseMinutes,
				source: args.source
			})
		});

		return ctx.db.get(logId);
	}
});

/**
 * Returns health logs for the authenticated user, ordered newest-first.
 * Defaults to the last 30 days.
 */
export const getHealthHistory = authedQuery({
	args: {
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const user = await getUserByClerkId(ctx.db, ctx.identity.subject);

		if (user === null) {
			return [];
		}

		return ctx.db
			.query('healthLogs')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.order('desc')
			.take(args.limit ?? 30);
	}
});

export const importWearableData = authedMutation({
	args: {
		rows: v.array(wearableImportRow),
		source: v.string()
	},
	handler: async (ctx, args) => {
		const user = await getOrCreateUserByIdentity(ctx.db, ctx.identity);

		if (args.rows.length === 0) {
			throw new Error('No wearable rows provided');
		}

		const sortedRows = [...args.rows].sort((left, right) => left.date.localeCompare(right.date));
		const importedDates = new Set(sortedRows.map((row) => row.date));
		const existingLogs = await ctx.db
			.query('healthLogs')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.collect();

		for (const row of sortedRows) {
			const existingLog = existingLogs.find((entry) => entry.date === row.date) ?? null;

			const payload = definedPatch({
				date: row.date,
				hrv: row.hrv,
				restingHr: row.restingHr,
				steps: row.steps,
				activeCalories: row.activeCalories,
				exerciseMinutes: row.exerciseMinutes,
				source: row.source ?? args.source,
				importOrigin: WEARABLE_IMPORT_ORIGIN
			});

			if (existingLog !== null) {
				await ctx.db.patch(existingLog._id, payload);
				continue;
			}

			await ctx.db.insert('healthLogs', {
				userId: user._id,
				date: row.date,
				createdAt: Date.now(),
				...payload
			});
		}

		for (const existingLog of existingLogs) {
			if (
				existingLog.importOrigin === WEARABLE_IMPORT_ORIGIN &&
				!importedDates.has(existingLog.date)
			) {
				await ctx.db.delete(existingLog._id);
			}
		}

		await ctx.db.patch(user._id, {
			wearableImportCompletedAt: Date.now(),
			wearableImportSource: args.source,
			wearableImportDateRange: {
				start: sortedRows[0].date,
				end: sortedRows[sortedRows.length - 1].date
			},
			updatedAt: Date.now()
		});

		return {
			importedCount: sortedRows.length,
			dateRange: {
				start: sortedRows[0].date,
				end: sortedRows[sortedRows.length - 1].date
			}
		};
	}
});
