import { v } from 'convex/values';
import { authedMutation, authedQuery, definedPatch, requireUserByClerkId } from './helpers';

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
		const user = await requireUserByClerkId(ctx.db, ctx.identity.subject);
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
		const user = await requireUserByClerkId(ctx.db, ctx.identity.subject);

		return ctx.db
			.query('healthLogs')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.order('desc')
			.take(args.limit ?? 30);
	}
});
