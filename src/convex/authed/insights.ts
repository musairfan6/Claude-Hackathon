import { v } from 'convex/values';
import type { Doc } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { getTrailingDateRange, isDateInRange } from '../lib/dateRange';
import { authedAction, authedQuery } from './helpers';

function buildInsightPrompt(data: {
	profile: {
		name: string;
		goals: string[];
		injuries: string[];
	};
	week: {
		startDate: string;
		endDate: string;
		dates: string[];
	};
	coverage: {
		healthLogDays: number;
		journalEntryDays: number;
		hasAnyData: boolean;
	};
	healthLogs: Array<Record<string, unknown>>;
	journalEntries: Array<Record<string, unknown>>;
}) {
	return [
		'You are Health Jarvis, an AI health and habit analyst.',
		'Analyze the trailing 7-day window using only the provided wearable and journal data.',
		'Return strict JSON with keys summary, body, recommendations.',
		'Keep summary to one sentence.',
		'Keep body to 2 to 4 short paragraphs that explain the main weekly trends.',
		'Keep recommendations as an array of 3 to 5 concise strings.',
		'Ground every point in the provided records.',
		'Mention missing days or sparse coverage when relevant.',
		'Avoid diagnosis, treatment claims, and unsupported certainty.',
		JSON.stringify(data, null, 2)
	].join('\n\n');
}

function parseInsightResponse(text: string) {
	const trimmed = text.trim();
	const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
	const parsed = (jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(trimmed)) as {
		summary?: unknown;
		body?: unknown;
		recommendations?: unknown;
	};

	const summary =
		typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
			? parsed.summary.trim()
			: 'Weekly insight generated.';
	const body =
		typeof parsed.body === 'string' && parsed.body.trim().length > 0 ? parsed.body.trim() : summary;
	const recommendations = Array.isArray(parsed.recommendations)
		? parsed.recommendations
				.filter((value: unknown): value is string => typeof value === 'string')
				.map((value: string) => value.trim())
				.filter((value: string) => value.length > 0)
				.slice(0, 5)
		: [];

	return {
		summary,
		body,
		recommendations
	};
}

export const getWeeklyInsight = authedQuery({
	args: {
		endDate: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerk_id', (q) => q.eq('clerkId', ctx.identity.subject))
			.unique();

		if (user === null) {
			return null;
		}

		return ctx.db
			.query('insights')
			.withIndex('by_user_and_end_date', (q) =>
				q.eq('userId', user._id).eq('endDate', args.endDate)
			)
			.unique();
	}
});

export const getRecentWeeklyInsights = authedQuery({
	args: {
		limit: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerk_id', (q) => q.eq('clerkId', ctx.identity.subject))
			.unique();

		if (user === null) {
			return [];
		}

		const insights = await ctx.db
			.query('insights')
			.withIndex('by_user_id', (q) => q.eq('userId', user._id))
			.collect();

		return insights
			.filter(
				(
					insight
				): insight is typeof insight & {
					startDate: string;
					endDate: string;
				} => typeof insight.startDate === 'string' && typeof insight.endDate === 'string'
			)
			.sort((left, right) => right.endDate.localeCompare(left.endDate))
			.slice(0, args.limit ?? 8);
	}
});

export const getWeeklyInsightCoverage = authedQuery({
	args: {
		endDate: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_clerk_id', (q) => q.eq('clerkId', ctx.identity.subject))
			.unique();

		const { startDate, endDate, dates } = getTrailingDateRange(args.endDate, 7);

		if (user === null) {
			return {
				startDate,
				endDate,
				dates,
				healthLogDays: 0,
				journalEntryDays: 0,
				hasAnyData: false
			};
		}

		const [healthLogs, journalEntries] = await Promise.all([
			ctx.db
				.query('healthLogs')
				.withIndex('by_user_id', (q) => q.eq('userId', user._id))
				.collect(),
			ctx.db
				.query('journalEntries')
				.withIndex('by_user_id', (q) => q.eq('userId', user._id))
				.collect()
		]);

		const healthLogDays = healthLogs.filter((entry) =>
			isDateInRange(entry.date, startDate, endDate)
		).length;
		const journalEntryDays = journalEntries.filter((entry) =>
			isDateInRange(entry.date, startDate, endDate)
		).length;

		return {
			startDate,
			endDate,
			dates,
			healthLogDays,
			journalEntryDays,
			hasAnyData: healthLogDays > 0 || journalEntryDays > 0
		};
	}
});

export const requestWeeklyInsight = authedAction({
	args: {
		endDate: v.string()
	},
	handler: async (ctx, args): Promise<Doc<'insights'> | null> => {
		const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;

		if (!apiKey) {
			throw new Error('Missing Anthropic API key');
		}

		const generationContext = await ctx.runQuery(
			internal.insightsInternal.getWeeklyInsightGenerationContext,
			{
				clerkId: ctx.identity.subject,
				endDate: args.endDate
			}
		);

		if (!generationContext.coverage.hasAnyData) {
			throw new Error('No health logs or journal entries were found in the selected 7-day window.');
		}

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5',
				max_tokens: 900,
				messages: [
					{
						role: 'user',
						content: buildInsightPrompt({
							profile: {
								name: generationContext.user.name,
								goals: generationContext.user.goals,
								injuries: generationContext.user.injuries
							},
							week: generationContext.week,
							coverage: generationContext.coverage,
							healthLogs: generationContext.healthLogs,
							journalEntries: generationContext.journalEntries
						})
					}
				]
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Anthropic request failed: ${response.status} ${errorText}`);
		}

		const payload = (await response.json()) as {
			content?: Array<{ type?: string; text?: string }>;
			model?: string;
		};
		const responseText = payload.content
			?.filter((block) => block.type === 'text' && typeof block.text === 'string')
			.map((block) => block.text)
			.join('\n')
			.trim();

		if (!responseText) {
			throw new Error('Anthropic response did not include text content');
		}

		const parsed = parseInsightResponse(responseText);

		return ctx.runMutation(internal.insightsInternal.saveWeeklyInsightForUser, {
			clerkId: ctx.identity.subject,
			startDate: generationContext.week.startDate,
			endDate: generationContext.week.endDate,
			summary: parsed.summary,
			body: parsed.body,
			recommendations: parsed.recommendations,
			modelVersion: payload.model
		});
	}
});
