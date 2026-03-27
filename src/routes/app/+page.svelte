<script lang="ts">
	import { getClerkContext } from '$lib/stores/clerk.svelte';

	const clerkContext = getClerkContext();

	const features = [
		{
			title: 'Health Logs',
			description: 'Sync wearable data — HRV, sleep phases, steps, and resting heart rate.',
			status: 'coming soon'
		},
		{
			title: 'Daily Journal',
			description: 'Log mood, energy levels, meals, and daily notes.',
			status: 'coming soon'
		},
		{
			title: 'AI Insights',
			description: 'Daily briefings powered by Claude, tailored to your goals and physiology.',
			status: 'coming soon'
		},
		{
			title: 'Profile & Goals',
			description: 'Set your health goals and note any injuries or chronic conditions.',
			status: 'coming soon'
		}
	];
</script>

{#if !clerkContext.clerk.user}
	<div class="flex min-h-screen items-center justify-center bg-stone-50">
		<div
			{@attach (el) => {
				clerkContext.clerk.mountSignIn(el, {});
			}}
		></div>
	</div>
{:else}
	<div class="min-h-screen bg-stone-50 font-sans text-stone-900">
		<header class="border-b border-stone-200 bg-white">
			<div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
				<h1 class="text-lg font-semibold tracking-tight">Health Jarvis</h1>
				<div class="flex items-center gap-3">
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href="/app/references"
						class="rounded-md px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
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

		<main class="mx-auto max-w-3xl px-6 py-8">
			<div class="mb-8">
				<h2 class="text-2xl font-semibold tracking-tight">
					Good day, {clerkContext.clerk.user.firstName ?? 'there'}
				</h2>
				<p class="mt-1 text-sm text-stone-500">Your AI health & habit analyst.</p>
			</div>

			<ul class="grid gap-4 sm:grid-cols-2">
				{#each features as feature (feature.title)}
					<li class="rounded-lg border border-stone-200 bg-white p-5">
						<div class="flex items-start justify-between gap-2">
							<h3 class="text-sm font-semibold">{feature.title}</h3>
							<span
								class="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500"
							>
								{feature.status}
							</span>
						</div>
						<p class="mt-1.5 text-sm text-stone-500">{feature.description}</p>
					</li>
				{/each}
			</ul>
		</main>
	</div>
{/if}
