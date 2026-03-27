import { v } from 'convex/values';
import type { Doc } from '../_generated/dataModel';
import { privateMutation, privateQuery } from './helpers';

const demoJournalEntry = v.object({
	date: v.string(),
	moodScore: v.number(),
	energyScore: v.number(),
	meals: v.string(),
	notes: v.string()
});

export const listUsers = privateQuery({
	args: {},
	handler: async (ctx) => {
		const users: Doc<'users'>[] = await ctx.db.query('users').collect();
		return users
			.sort((left, right) => right.updatedAt - left.updatedAt)
			.map((user) => ({
				_id: user._id,
				clerkId: user.clerkId,
				name: user.name,
				updatedAt: user.updatedAt,
				wearableImportCompletedAt: user.wearableImportCompletedAt
			}));
	}
});

export const seedDemoJournalEntries = privateMutation({
	args: {
		clerkId: v.string(),
		entries: v.array(demoJournalEntry)
	},
	handler: async (ctx, args) => {
		const users: Doc<'users'>[] = await ctx.db.query('users').collect();
		const user = users.find((entry) => entry.clerkId === args.clerkId) ?? null;

		if (user === null) {
			throw new Error('User profile not found');
		}

		const existingEntries: Doc<'journalEntries'>[] = await ctx.db.query('journalEntries').collect();
		let insertedOrUpdated = 0;

		for (const entry of args.entries) {
			const existingEntry =
				existingEntries.find(
					(journalEntry) => journalEntry.userId === user._id && journalEntry.date === entry.date
				) ?? null;

			const payload = {
				date: entry.date,
				moodScore: entry.moodScore,
				energyScore: entry.energyScore,
				meals: entry.meals,
				notes: entry.notes,
				updatedAt: Date.now()
			};

			if (existingEntry !== null) {
				await ctx.db.patch(existingEntry._id, payload);
			} else {
				const insertedId = await ctx.db.insert('journalEntries', {
					userId: user._id,
					createdAt: Date.now(),
					...payload
				});
				existingEntries.push({
					_id: insertedId,
					_creationTime: Date.now(),
					userId: user._id,
					createdAt: payload.updatedAt,
					date: entry.date,
					moodScore: entry.moodScore,
					energyScore: entry.energyScore,
					meals: entry.meals,
					notes: entry.notes,
					updatedAt: payload.updatedAt
				});
			}

			insertedOrUpdated += 1;
		}

		await ctx.db.patch(user._id, {
			updatedAt: Date.now()
		});

		return {
			clerkId: user.clerkId,
			insertedOrUpdated
		};
	}
});
