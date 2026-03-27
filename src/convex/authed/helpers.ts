// "authed" queries/mutations/actions are ones that get called from the client, protected by the clerk auth token

import { customAction, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import type { Doc } from '../_generated/dataModel';
import type { DatabaseReader, DatabaseWriter } from '../_generated/server';
import { action, mutation, query } from '../_generated/server';

export const authedQuery = customQuery(query, {
	args: {},
	input: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error('Unauthorized');
		}

		return { ctx: { ...ctx, identity }, args: {} };
	}
});

export const authedMutation = customMutation(mutation, {
	args: {},
	input: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error('Unauthorized');
		}

		return { ctx: { ...ctx, identity }, args: {} };
	}
});

export const authedAction = customAction(action, {
	args: {},
	input: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			throw new Error('Unauthorized');
		}

		return { ctx: { ...ctx, identity }, args: {} };
	}
});

type UserStore = DatabaseReader | DatabaseWriter;

export async function getUserByClerkId(
	db: UserStore,
	clerkId: string
): Promise<Doc<'users'> | null> {
	return db
		.query('users')
		.withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
		.unique();
}

export async function requireUserByClerkId(db: UserStore, clerkId: string): Promise<Doc<'users'>> {
	const user = await getUserByClerkId(db, clerkId);

	if (user === null) {
		throw new Error('User profile not found');
	}

	return user;
}

export async function getOrCreateUserByIdentity(
	db: DatabaseWriter,
	identity: {
		subject: string;
		name?: string | null;
		email?: string | null;
	}
): Promise<Doc<'users'>> {
	const existingUser = await getUserByClerkId(db, identity.subject);

	if (existingUser !== null) {
		return existingUser;
	}

	const now = Date.now();
	const userId = await db.insert('users', {
		clerkId: identity.subject,
		name: identity.name ?? identity.email ?? 'Anonymous User',
		goals: [],
		injuries: [],
		onboardedAt: now,
		updatedAt: now
	});

	const createdUser = await db.get(userId);

	if (createdUser === null) {
		throw new Error('User profile could not be created');
	}

	return createdUser;
}

export function definedPatch<T extends Record<string, unknown>>(values: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(values).filter(([, value]) => value !== undefined)
	) as Partial<T>;
}
