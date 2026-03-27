import { v } from 'convex/values';
import { getTrailingDateRange, isDateInRange } from './lib/dateRange';
import { internalMutation, internalQuery } from './_generated/server';

export const getWeeklyInsightGenerationContext = internalQuery({
	args: {
		clerkId: v.string(),
		endDate: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
			.unique();

		if (user === null) {
			throw new Error('User profile not found');
		}

		const { startDate, endDate, dates } = getTrailingDateRange(args.endDate, 7);
		const [healthLogs, journalEntries, existingInsight] = await Promise.all([
			ctx.db
				.query('healthLogs')
				.withIndex('by_user_id', (q) => q.eq('userId', user._id))
				.collect(),
			ctx.db
				.query('journalEntries')
				.withIndex('by_user_id', (q) => q.eq('userId', user._id))
				.collect(),
			ctx.db
				.query('insights')
				.withIndex('by_user_and_end_date', (q) => q.eq('userId', user._id).eq('endDate', endDate))
				.unique()
		]);

		const weekHealthLogs = healthLogs
			.filter((entry) => isDateInRange(entry.date, startDate, endDate))
			.sort((left, right) => left.date.localeCompare(right.date));
		const weekJournalEntries = journalEntries
			.filter((entry) => isDateInRange(entry.date, startDate, endDate))
			.sort((left, right) => left.date.localeCompare(right.date));

		return {
			user,
			week: {
				startDate,
				endDate,
				dates
			},
			healthLogs: weekHealthLogs,
			journalEntries: weekJournalEntries,
			coverage: {
				healthLogDays: weekHealthLogs.length,
				journalEntryDays: weekJournalEntries.length,
				hasAnyData: weekHealthLogs.length > 0 || weekJournalEntries.length > 0
			},
			existingInsight
		};
	}
});

export const saveWeeklyInsightForUser = internalMutation({
	args: {
		clerkId: v.string(),
		startDate: v.string(),
		endDate: v.string(),
		summary: v.string(),
		body: v.string(),
		recommendations: v.array(v.string()),
		modelVersion: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
			.unique();

		if (user === null) {
			throw new Error('User profile not found');
		}

		const existingInsight = await ctx.db
			.query('insights')
			.withIndex('by_user_and_end_date', (q) =>
				q.eq('userId', user._id).eq('endDate', args.endDate)
			)
			.unique();
		const payload = {
			startDate: args.startDate,
			endDate: args.endDate,
			summary: args.summary,
			body: args.body,
			recommendations: args.recommendations,
			modelVersion: args.modelVersion,
			generatedAt: Date.now()
		};

		if (existingInsight !== null) {
			await ctx.db.patch(existingInsight._id, payload);
			return ctx.db.get(existingInsight._id);
		}

		const insightId = await ctx.db.insert('insights', {
			userId: user._id,
			...payload
		});

		return ctx.db.get(insightId);
	}
});
