import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';

export const getInsightGenerationContext = internalQuery({
	args: {
		clerkId: v.string(),
		date: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
			.unique();

		if (user === null) {
			throw new Error('User profile not found');
		}

		const [healthLog, journalEntry, existingInsight] = await Promise.all([
			ctx.db
				.query('healthLogs')
				.withIndex('by_user_and_date', (q) => q.eq('userId', user._id).eq('date', args.date))
				.unique(),
			ctx.db
				.query('journalEntries')
				.withIndex('by_user_and_date', (q) => q.eq('userId', user._id).eq('date', args.date))
				.unique(),
			ctx.db
				.query('insights')
				.withIndex('by_user_and_date', (q) => q.eq('userId', user._id).eq('date', args.date))
				.unique()
		]);

		return {
			user,
			healthLog,
			journalEntry,
			existingInsight
		};
	}
});

export const saveInsightForUser = internalMutation({
	args: {
		clerkId: v.string(),
		date: v.string(),
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
			.withIndex('by_user_and_date', (q) => q.eq('userId', user._id).eq('date', args.date))
			.unique();
		const payload = {
			date: args.date,
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
