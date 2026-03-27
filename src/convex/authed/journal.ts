import { v } from 'convex/values';
import {
	authedMutation,
	authedQuery,
	definedPatch,
	getUserByClerkId,
	getOrCreateUserByIdentity
} from './helpers';

/**
 * Upserts a journal entry for a given date. Idempotent by userId + date.
 */
export const submitJournalEntry = authedMutation({
	args: {
		date: v.string(), // "YYYY-MM-DD"
		moodScore: v.optional(v.number()), // 1-10
		energyScore: v.optional(v.number()), // 1-10
		meals: v.optional(v.string()),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const user = await getOrCreateUserByIdentity(ctx.db, ctx.identity);
		const existingEntry = await ctx.db
			.query('journalEntries')
			.withIndex('by_user_and_date', (q) => q.eq('userId', user._id).eq('date', args.date))
			.unique();
		const now = Date.now();

		if (existingEntry !== null) {
			await ctx.db.patch(existingEntry._id, definedPatch({ ...args, updatedAt: now }));
			return ctx.db.get(existingEntry._id);
		}

		const entryId = await ctx.db.insert('journalEntries', {
			userId: user._id,
			date: args.date,
			createdAt: now,
			updatedAt: now,
			...definedPatch({
				moodScore: args.moodScore,
				energyScore: args.energyScore,
				meals: args.meals,
				notes: args.notes
			})
		});

		return ctx.db.get(entryId);
	}
});

/**
 * Returns journal entries for the authenticated user, ordered newest-first.
 */
export const getJournalHistory = authedQuery({
	args: {
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const user = await getUserByClerkId(ctx.db, ctx.identity.subject);

		if (user === null) {
			return [];
		}

		return ctx.db
			.query('journalEntries')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.order('desc')
			.take(args.limit ?? 30);
	}
});
