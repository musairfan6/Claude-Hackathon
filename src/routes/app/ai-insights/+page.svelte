<script lang="ts">
	import { getClerkContext } from '$lib/stores/clerk.svelte';
	import { api } from '../../../convex/_generated/api';
	import { useConvexClient, useQuery } from 'convex-svelte';

	const clerkContext = getClerkContext();
	const client = useConvexClient();
	const profile = useQuery(api.authed.users.getCurrentUser, {});
	const latestHealthHistory = useQuery(api.authed.health.getHealthHistory, { limit: 1 });

	const todayInDublin = () =>
		new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Europe/Dublin',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(new Date());

	const formatLongDate = (value: string) =>
		new Intl.DateTimeFormat('en-IE', {
			timeZone: 'Europe/Dublin',
			dateStyle: 'medium'
		}).format(new Date(`${value}T00:00:00`));

	const formatTimestamp = (value: number) =>
		new Intl.DateTimeFormat('en-IE', {
			timeZone: 'Europe/Dublin',
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));

	let selectedEndDate = $state(todayInDublin());
	let hasInitializedEndDate = $state(false);
	let insightBusy = $state(false);
	let insightError = $state<string | null>(null);
	let insightMessage = $state<string | null>(null);

	$effect(() => {
		if (hasInitializedEndDate) {
			return;
		}

		const latestHealthDate = latestHealthHistory.data?.[0]?.date;
		if (latestHealthDate) {
			selectedEndDate = latestHealthDate;
			hasInitializedEndDate = true;
			return;
		}

		if (!latestHealthHistory.isLoading) {
			selectedEndDate = todayInDublin();
			hasInitializedEndDate = true;
		}
	});

	const selectedInsight = useQuery(api.authed.insights.getWeeklyInsight, () => ({
		endDate: selectedEndDate
	}));
	const insightCoverage = useQuery(api.authed.insights.getWeeklyInsightCoverage, () => ({
		endDate: selectedEndDate
	}));
	const recentInsights = useQuery(api.authed.insights.getRecentWeeklyInsights, {
		limit: 8
	});

	const canGenerateInsight = $derived.by(() => insightCoverage.data?.hasAnyData === true);
	const coverageSummary = $derived.by(() => {
		if (!insightCoverage.data) {
			return 'Loading weekly coverage...';
		}

		const { healthLogDays, journalEntryDays } = insightCoverage.data;
		if (healthLogDays === 0 && journalEntryDays === 0) {
			return 'No health logs or journal entries were found in this 7-day window.';
		}

		if (healthLogDays < 7 || journalEntryDays < 7) {
			return `Sparse coverage: ${healthLogDays}/7 health-log days and ${journalEntryDays}/7 journal days are available.`;
		}

		return 'Full 7-day coverage is available from both Health Logs and Daily Journal.';
	});
	const insightBodyParagraphs = $derived.by(() =>
		(selectedInsight.data?.body ?? '')
			.split(/\n{2,}/)
			.map((paragraph) => paragraph.trim())
			.filter((paragraph) => paragraph.length > 0)
	);

	function selectEndDate(date: string) {
		selectedEndDate = date;
		insightError = null;
		insightMessage = null;
	}

	async function generateInsight() {
		insightBusy = true;
		insightError = null;
		insightMessage = null;

		try {
			await client.action(api.authed.insights.requestWeeklyInsight, {
				endDate: selectedEndDate
			});
			insightMessage = `Weekly insight saved for the period ending ${formatLongDate(selectedEndDate)}.`;
		} catch (error) {
			insightError = error instanceof Error ? error.message : String(error);
		} finally {
			insightBusy = false;
		}
	}
</script>

{#if !clerkContext.clerk.user}
	<div class="flex min-h-screen items-center justify-center bg-surface">
		<div
			{@attach (el) => {
				clerkContext.clerk.mountSignIn(el, {});
			}}
		></div>
	</div>
{:else}
	<div class="min-h-screen bg-surface font-sans text-foreground">
		<header class="border-b border-border bg-white">
			<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
				<div class="flex items-center gap-4">
					<a
						href="/app"
						class="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-brand-light hover:text-foreground"
					>
						Back
					</a>
					<div>
						<h1 class="text-lg font-semibold tracking-tight">AI Insights</h1>
						<p class="mt-1 text-sm text-muted">
							Weekly Claude briefings grounded in your wearable metrics and journal entries.
						</p>
					</div>
				</div>
				<div
					{@attach (el) => {
						clerkContext.clerk.mountUserButton(el);
					}}
				></div>
			</div>
		</header>

		<main class="mx-auto max-w-6xl px-6 py-8">
			<section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
				<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div class="max-w-3xl">
						<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">
							Weekly briefing
						</p>
						<h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">
							Claude trend analysis for the last 7 days
						</h2>
						<p class="mt-3 text-sm leading-6 text-muted">
							Select an end date to analyze the trailing week. The insight uses both imported
							wearable data and Daily Journal notes when they are available.
						</p>
					</div>

					<div class="w-full max-w-sm rounded-2xl border border-border bg-brand-light p-4">
						<label class="block">
							<span class="text-sm font-medium text-foreground">Week ending</span>
							<input
								type="date"
								bind:value={selectedEndDate}
								class="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm transition outline-none focus:border-brand"
							/>
						</label>

						{#if insightCoverage.data}
							<div class="mt-4 space-y-2 text-sm text-muted">
								<p>
									Range: <span class="font-medium text-foreground">
										{formatLongDate(insightCoverage.data.startDate)} to
										{formatLongDate(insightCoverage.data.endDate)}
									</span>
								</p>
								<p>{coverageSummary}</p>
							</div>
						{/if}

						<div class="mt-4 flex flex-wrap gap-2">
							<button
								type="button"
								class="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
								disabled={insightBusy || !canGenerateInsight}
								onclick={generateInsight}
							>
								{insightBusy ? 'Generating...' : 'Generate weekly insight'}
							</button>
							<button
								type="button"
								class="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
								disabled={insightBusy || !canGenerateInsight || !selectedInsight.data}
								onclick={generateInsight}
							>
								Refresh insight
							</button>
						</div>
					</div>
				</div>

				{#if insightMessage}
					<p
						class="mt-6 rounded-xl border border-success/25 bg-success/5 px-4 py-3 text-sm text-success"
					>
						{insightMessage}
					</p>
				{/if}

				{#if insightError}
					<p
						class="mt-6 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
					>
						{insightError}
					</p>
				{/if}
			</section>

			<div class="mt-8 grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
				<section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">Insight</p>
							<h3 class="mt-2 text-2xl font-semibold tracking-tight text-foreground">
								{insightCoverage.data
									? `${formatLongDate(insightCoverage.data.startDate)} to ${formatLongDate(insightCoverage.data.endDate)}`
									: 'Selected week'}
							</h3>
						</div>
						<span
							class={`rounded-full px-3 py-1 text-xs font-medium ${
								profile.data?.wearableImportCompletedAt
									? 'bg-success/10 text-success'
									: 'bg-warning/10 text-warning'
							}`}
						>
							{profile.data?.wearableImportCompletedAt ? 'ready' : 'waiting for upload'}
						</span>
					</div>

					{#if selectedInsight.isLoading}
						<p class="mt-6 text-sm text-muted">Loading saved insight...</p>
					{:else if selectedInsight.data}
						<div class="mt-6">
							<p class="text-lg font-semibold text-foreground">{selectedInsight.data.summary}</p>
							<div class="mt-2 flex flex-wrap gap-3 text-xs text-muted">
								<span>Generated {formatTimestamp(selectedInsight.data.generatedAt)}</span>
								{#if selectedInsight.data.modelVersion}
									<span>Model {selectedInsight.data.modelVersion}</span>
								{/if}
							</div>

							<div class="mt-6 space-y-4 text-sm leading-7 text-muted">
								{#each insightBodyParagraphs as paragraph (paragraph)}
									<p class="whitespace-pre-wrap">{paragraph}</p>
								{/each}
							</div>

							{#if selectedInsight.data.recommendations.length > 0}
								<div class="mt-8 rounded-2xl border border-border bg-brand-light p-4">
									<h4 class="text-sm font-semibold text-foreground">Recommended next steps</h4>
									<ul class="mt-3 space-y-2 text-sm text-muted">
										{#each selectedInsight.data.recommendations as recommendation (recommendation)}
											<li class="flex gap-3">
												<span class="mt-1 h-1.5 w-1.5 rounded-full bg-brand-accent"></span>
												<span>{recommendation}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{:else}
						<div
							class="mt-6 rounded-2xl border border-dashed border-border bg-brand-light px-5 py-10 text-sm text-muted"
						>
							{#if canGenerateInsight}
								Generate a weekly insight to see the Claude briefing for this 7-day period.
							{:else}
								Choose a week with health logs or journal entries to generate an insight.
							{/if}
						</div>
					{/if}
				</section>

				<div class="space-y-6">
					<section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
						<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">Coverage</p>
						<h3 class="mt-2 text-xl font-semibold tracking-tight text-foreground">
							Week input coverage
						</h3>

						{#if insightCoverage.data}
							<div class="mt-5 grid gap-3">
								<div class="rounded-2xl bg-brand-light p-4 ring-1 ring-border">
									<p class="text-xs text-muted">Health Logs</p>
									<p class="mt-1 text-2xl font-semibold text-foreground">
										{insightCoverage.data.healthLogDays}/7
									</p>
									<p class="mt-1 text-sm text-muted">
										Days with wearable metrics in the selected week.
									</p>
								</div>
								<div class="rounded-2xl bg-brand-light p-4 ring-1 ring-border">
									<p class="text-xs text-muted">Daily Journal</p>
									<p class="mt-1 text-2xl font-semibold text-foreground">
										{insightCoverage.data.journalEntryDays}/7
									</p>
									<p class="mt-1 text-sm text-muted">
										Days with journal context in the selected week.
									</p>
								</div>
							</div>
							<p class="mt-4 text-sm leading-6 text-muted">{coverageSummary}</p>
						{:else}
							<p class="mt-4 text-sm text-muted">Loading week coverage...</p>
						{/if}
					</section>

					<section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
						<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">History</p>
						<h3 class="mt-2 text-xl font-semibold tracking-tight text-foreground">
							Recent weekly insights
						</h3>

						{#if recentInsights.isLoading}
							<p class="mt-4 text-sm text-muted">Loading saved insights...</p>
						{:else if recentInsights.data && recentInsights.data.length > 0}
							<ul class="mt-4 space-y-3">
								{#each recentInsights.data as insight (insight._id)}
									<li>
										<button
											type="button"
											onclick={() => selectEndDate(insight.endDate)}
											class={`w-full rounded-2xl border px-4 py-3 text-left transition ${
												insight.endDate === selectedEndDate
													? 'border-brand bg-brand text-white'
													: 'border-border bg-brand-light text-foreground hover:border-brand/30'
											}`}
										>
											<p class="text-sm font-semibold">
												{formatLongDate(insight.startDate)} to {formatLongDate(insight.endDate)}
											</p>
											<p
												class={`mt-2 line-clamp-3 text-sm ${
													insight.endDate === selectedEndDate ? 'text-brand-light' : 'text-muted'
												}`}
											>
												{insight.summary}
											</p>
										</button>
									</li>
								{/each}
							</ul>
						{:else}
							<div
								class="mt-4 rounded-2xl border border-dashed border-border bg-brand-light px-5 py-8 text-sm text-muted"
							>
								Generated weekly insights will appear here.
							</div>
						{/if}
					</section>
				</div>
			</div>
		</main>
	</div>
{/if}
