<script lang="ts">
	import { getClerkContext } from '$lib/stores/clerk.svelte';
	import { api } from '../../convex/_generated/api';
	import { useQuery } from 'convex-svelte';

	const clerkContext = getClerkContext();
	const profile = useQuery(api.authed.users.getCurrentUser, {});

	const featureCards = [
		{
			title: 'Health Logs',
			description:
				'Sync wearable data, review daily metrics, and inspect HRV, steps, and resting heart rate.',
			status: 'live',
			href: '/app/health-logs'
		},
		{
			title: 'Daily Journal',
			description: 'Log mood, energy levels, meals, and daily notes for each day.',
			status: 'live',
			href: '/app/daily-journal'
		},
		{
			title: 'AI Insights',
			description:
				'Weekly trend briefings powered by Claude using your wearable metrics and journal entries.',
			status: 'live',
			href: '/app/ai-insights'
		},
		{
			title: 'Profile & Goals',
			description: 'Set your health goals and note any injuries or chronic conditions.',
			status: 'coming soon',
			href: null
		}
	] as const;

	const formatImportTimestamp = (value: number) =>
		new Intl.DateTimeFormat('en-IE', {
			timeZone: 'Europe/Dublin',
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
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
			<div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
				<div class="flex items-center gap-3">
					<img src="/logo.png" alt="HealthPilot" class="h-9 w-9" />
					<div>
						<h1 class="text-lg font-semibold tracking-tight text-brand">HealthPilot</h1>
						<p class="mt-0.5 text-sm text-muted">Your AI health and habit analyst.</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<a
						href="/app/references"
						class="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-brand-light hover:text-foreground"
					>
						References
					</a>
					<div
						{@attach (el) => {
							clerkContext.clerk.mountUserButton(el);
						}}
					></div>
				</div>
			</div>
		</header>

		<main class="mx-auto max-w-5xl px-6 py-8">
			<section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
				<p class="text-sm font-medium text-muted">
					Hello, {clerkContext.clerk.user.firstName ?? 'there'}
				</p>
				<h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">
					Choose your next health workflow
				</h2>
				<p class="mt-3 max-w-2xl text-sm leading-6 text-muted">
					Health Logs and Daily Journal are available now. The first wearable import unlocks both
					features for your profile.
				</p>

				<div class="mt-5 flex flex-wrap gap-3 text-sm">
					{#if profile.data?.wearableImportCompletedAt}
						<div
							class="rounded-full bg-success/10 px-4 py-2 font-medium text-success ring-1 ring-success/25"
						>
							Wearable import complete
						</div>
						<div class="rounded-full bg-brand-light px-4 py-2 text-muted">
							Imported on {formatImportTimestamp(profile.data.wearableImportCompletedAt)}
						</div>
					{:else}
						<div
							class="rounded-full bg-warning/10 px-4 py-2 font-medium text-warning ring-1 ring-warning/25"
						>
							Upload both CSV files to unlock the live features
						</div>
					{/if}
				</div>
			</section>

			<ul class="mt-8 grid gap-5 md:grid-cols-2">
				{#each featureCards as feature (feature.title)}
					<li>
						{#if feature.href}
							<a
								href={feature.href}
								class="group block h-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand/30"
							>
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">
											{feature.title}
										</p>
										<h3 class="mt-3 text-2xl font-semibold tracking-tight text-foreground">
											{feature.title}
										</h3>
									</div>
									<span
										class={`rounded-full px-3 py-1 text-xs font-medium ${
											feature.status === 'live'
												? 'bg-success/10 text-success'
												: 'bg-surface text-muted'
										}`}
									>
										{feature.status}
									</span>
								</div>
								<p class="mt-4 text-sm leading-6 text-muted">{feature.description}</p>
								<p
									class="mt-8 text-sm font-medium text-brand transition group-hover:text-brand-dark"
								>
									Open feature &rarr;
								</p>
							</a>
						{:else}
							<div class="h-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">
											{feature.title}
										</p>
										<h3 class="mt-3 text-2xl font-semibold tracking-tight text-foreground">
											{feature.title}
										</h3>
									</div>
									<span class="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted">
										{feature.status}
									</span>
								</div>
								<p class="mt-4 text-sm leading-6 text-muted">{feature.description}</p>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</main>
	</div>
{/if}
