import { v } from 'convex/values';
import { authedMutation, definedPatch, getUserByClerkId } from './helpers';

/**
 * Returns the current user's profile, creating it if it doesn't exist yet.
 * Call once on app mount. Must be a mutation because it may insert on first call.
 */
export const getOrCreateUser = authedMutation({
	args: {
		name: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const existingUser = await getUserByClerkId(ctx.db, ctx.identity.subject);

		if (existingUser !== null) {
			return existingUser;
		}

		const now = Date.now();
		const userId = await ctx.db.insert('users', {
			clerkId: ctx.identity.subject,
			name: args.name ?? ctx.identity.name ?? ctx.identity.email ?? 'Anonymous User',
			goals: [],
			injuries: [],
			onboardedAt: now,
			updatedAt: now
		});

		return ctx.db.get(userId);
	}
});

/**
 * Updates the authenticated user's profile (goals, injuries, name).
 */
export const updateProfile = authedMutation({
	args: {
		name: v.optional(v.string()),
		goals: v.optional(v.array(v.string())),
		injuries: v.optional(v.array(v.string()))
	},
	handler: async (ctx, args) => {
		const existingUser = await getUserByClerkId(ctx.db, ctx.identity.subject);
		const now = Date.now();

		if (existingUser === null) {
			const userId = await ctx.db.insert('users', {
				clerkId: ctx.identity.subject,
				name: args.name ?? ctx.identity.name ?? ctx.identity.email ?? 'Anonymous User',
				goals: args.goals ?? [],
				injuries: args.injuries ?? [],
				onboardedAt: now,
				updatedAt: now
			});

			return ctx.db.get(userId);
		}

		await ctx.db.patch(
			existingUser._id,
			definedPatch({
				name: args.name,
				goals: args.goals,
				injuries: args.injuries,
				updatedAt: now
			})
		);

		return ctx.db.get(existingUser._id);
	}
});
