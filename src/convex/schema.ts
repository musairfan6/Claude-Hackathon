import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	// Onboarding profile — one document per Clerk user
	users: defineTable({
		clerkId: v.string(),
		name: v.string(),
		goals: v.array(v.string()),
		injuries: v.array(v.string()),
		wearableImportCompletedAt: v.optional(v.number()),
		wearableImportSource: v.optional(v.string()),
		wearableImportDateRange: v.optional(
			v.object({
				start: v.string(),
				end: v.string()
			})
		),
		onboardedAt: v.number(),
		updatedAt: v.number()
	}).index('by_clerk_id', ['clerkId']),

	// Daily wearable/device metrics — one document per user per day
	healthLogs: defineTable({
		userId: v.id('users'),
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
		source: v.optional(v.string()), // e.g. "apple_health", "garmin", "manual"
		importOrigin: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_user_id', ['userId'])
		.index('by_user_and_date', ['userId', 'date']),

	// Daily subjective journal — one document per user per day
	journalEntries: defineTable({
		userId: v.id('users'),
		date: v.string(), // "YYYY-MM-DD"
		moodScore: v.optional(v.number()), // 1-10
		energyScore: v.optional(v.number()), // 1-10
		meals: v.optional(v.string()),
		notes: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_user_id', ['userId'])
		.index('by_user_and_date', ['userId', 'date']),

	// AI-generated weekly briefings — legacy daily rows may still exist locally
	insights: defineTable({
		userId: v.id('users'),
		date: v.optional(v.string()), // legacy daily insight field
		startDate: v.optional(v.string()), // "YYYY-MM-DD"
		endDate: v.optional(v.string()), // "YYYY-MM-DD"
		summary: v.string(), // headline sentence
		body: v.string(), // full markdown briefing from Claude
		recommendations: v.array(v.string()), // bullet-point action items
		generatedAt: v.number(),
		modelVersion: v.optional(v.string())
	})
		.index('by_user_id', ['userId'])
		.index('by_user_and_end_date', ['userId', 'endDate'])
});
