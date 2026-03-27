import { v } from 'convex/values';
import type { Doc } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { authedAction, authedQuery } from './helpers';

function buildInsightPrompt(data: {
	profile: {
		name: string;
		goals: string[];
		injuries: string[];
	};
	date: string;
	healthLog: Record<string, unknown> | null;
	journalEntry: Record<string, unknown> | null;
}) {
	return [
		'You are Health Jarvis, an AI health and habit analyst.',
		'Return strict JSON with keys summary, body, recommendations.',
		'Keep summary to one sentence.',
		'Keep recommendations as an array of 2 to 4 concise strings.',
		'Ground every point in the provided data and avoid medical diagnosis.',
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
			: 'Daily health briefing generated.';
	const body =
		typeof parsed.body === 'string' && parsed.body.trim().length > 0 ? parsed.body.trim() : summary;
	const recommendations = Array.isArray(parsed.recommendations)
		? parsed.recommendations
				.filter((value: unknown): value is string => typeof value === 'string')
				.map((value: string) => value.trim())
				.filter((value: string) => value.length > 0)
		: [];

	return {
		summary,
		body,
		recommendations
	};
}

/**
 * Returns the AI insight for a specific date, or null if not yet generated.
 * Use with useQuery() for reactive polling after requestInsight is called.
 */
export const getInsightForDay = authedQuery({
	args: {
		date: v.string() // "YYYY-MM-DD"
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
			.withIndex('by_user_and_date', (q) => q.eq('userId', user._id).eq('date', args.date))
			.unique();
	}
});

/**
 * Triggers AI generation of a daily insight by calling Claude.
 * This is an authedAction (not a mutation) because it makes an external HTTP
 * call to the Anthropic API, then schedules a mutation to persist the result.
 *
 * Frontend pattern: fire this action, then poll getInsightForDay reactively.
 *
 * Requires ANTHROPIC_API_KEY set in Convex env:
 *   npx convex env set ANTHROPIC_API_KEY sk-ant-...
 */
export const requestInsight = authedAction({
	args: {
		date: v.string() // "YYYY-MM-DD"
	},
	handler: async (ctx, args): Promise<Doc<'insights'> | null> => {
		const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;

		if (!apiKey) {
			throw new Error('Missing Anthropic API key');
		}

		const generationContext = await ctx.runQuery(
			internal.insightsInternal.getInsightGenerationContext,
			{
				clerkId: ctx.identity.subject,
				date: args.date
			}
		);

		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: process.env.CLAUDE_MODEL ?? 'claude-3-5-haiku-latest',
				max_tokens: 700,
				messages: [
					{
						role: 'user',
						content: buildInsightPrompt({
							profile: {
								name: generationContext.user.name,
								goals: generationContext.user.goals,
								injuries: generationContext.user.injuries
							},
							date: args.date,
							healthLog: generationContext.healthLog,
							journalEntry: generationContext.journalEntry
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

		return ctx.runMutation(internal.insightsInternal.saveInsightForUser, {
			clerkId: ctx.identity.subject,
			date: args.date,
			summary: parsed.summary,
			body: parsed.body,
			recommendations: parsed.recommendations,
			modelVersion: payload.model
		});
	}
});
