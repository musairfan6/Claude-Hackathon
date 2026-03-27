<script lang="ts">
	import { getClerkContext } from '$lib/stores/clerk.svelte';
	import { api } from '../../../convex/_generated/api';
	import { useConvexClient, useQuery } from 'convex-svelte';

	const clerkContext = getClerkContext();
	const client = useConvexClient();
	const profile = useQuery(api.authed.users.getCurrentUser, {});
	const journalHistory = useQuery(api.authed.journal.getJournalHistory, { limit: 30 });

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

	let selectedJournalDate = $state(todayInDublin());
	let moodScore = $state('');
	let energyScore = $state('');
	let meals = $state('');
	let notes = $state('');
	let journalBusy = $state(false);
	let journalMessage = $state<string | null>(null);
	let journalError = $state<string | null>(null);

	const selectedJournalEntry = $derived.by(
		() => journalHistory.data?.find((entry) => entry.date === selectedJournalDate) ?? null
	);

	$effect(() => {
		const entry = selectedJournalEntry;
		moodScore = entry?.moodScore?.toString() ?? '';
		energyScore = entry?.energyScore?.toString() ?? '';
		meals = entry?.meals ?? '';
		notes = entry?.notes ?? '';
		journalMessage = null;
		journalError = null;
	});

	function selectJournalDate(date: string) {
		selectedJournalDate = date;
	}

	function parseScore(value: string, label: string) {
		if (value.trim().length === 0) {
			return undefined;
		}

		const parsedValue = Number.parseInt(value, 10);
		if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 10) {
			throw new Error(`${label} must be a whole number between 1 and 10.`);
		}

		return parsedValue;
	}

	async function saveJournalEntry() {
		journalBusy = true;
		journalMessage = null;
		journalError = null;

		try {
			await client.mutation(api.authed.journal.submitJournalEntry, {
				date: selectedJournalDate,
				moodScore: parseScore(moodScore, 'Mood score'),
				energyScore: parseScore(energyScore, 'Energy score'),
				meals: meals.trim().length > 0 ? meals.trim() : undefined,
				notes: notes.trim().length > 0 ? notes.trim() : undefined
			});
			journalMessage = `Saved entry for ${formatLongDate(selectedJournalDate)}.`;
		} catch (error) {
			journalError = error instanceof Error ? error.message : String(error);
		} finally {
			journalBusy = false;
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
			<div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
				<div class="flex items-center gap-4">
					<a
						href="/app"
						class="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-brand-light hover:text-foreground"
					>
						Back
					</a>
					<div>
						<h1 class="text-lg font-semibold tracking-tight">Daily Journal</h1>
						<p class="mt-1 text-sm text-muted">
							Manual daily notes for mood, energy, meals, and recovery.
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

		<main class="mx-auto max-w-5xl px-6 py-8">
			<section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">
							Daily Journal
						</p>
						<h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">
							Manual daily check-in
						</h2>
						<p class="mt-3 max-w-2xl text-sm leading-6 text-muted">
							Record mood, energy, meals, and notes. Entries are saved by day and can be revisited
							any time.
						</p>
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

				<div class="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
					<div class="space-y-4">
						<label class="block">
							<span class="text-sm font-medium text-foreground">Entry date</span>
							<input
								type="date"
								bind:value={selectedJournalDate}
								class="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm transition outline-none focus:border-brand"
							/>
						</label>

						<div class="grid gap-4 sm:grid-cols-2">
							<label class="block">
								<span class="text-sm font-medium text-foreground">Mood score</span>
								<input
									type="number"
									min="1"
									max="10"
									step="1"
									placeholder="1-10"
									bind:value={moodScore}
									class="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm transition outline-none focus:border-brand"
								/>
							</label>

							<label class="block">
								<span class="text-sm font-medium text-foreground">Energy score</span>
								<input
									type="number"
									min="1"
									max="10"
									step="1"
									placeholder="1-10"
									bind:value={energyScore}
									class="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm transition outline-none focus:border-brand"
								/>
							</label>
						</div>

						<label class="block">
							<span class="text-sm font-medium text-foreground">Meals</span>
							<textarea
								rows="3"
								placeholder="Breakfast, lunch, dinner, snacks, hydration"
								bind:value={meals}
								class="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm transition outline-none focus:border-brand"
							></textarea>
						</label>

						<label class="block">
							<span class="text-sm font-medium text-foreground">Notes</span>
							<textarea
								rows="6"
								placeholder="Training quality, stress, sleep context, recovery observations"
								bind:value={notes}
								class="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm transition outline-none focus:border-brand"
							></textarea>
						</label>

						{#if journalMessage}
							<p
								class="rounded-xl border border-success/25 bg-success/5 px-4 py-3 text-sm text-success"
							>
								{journalMessage}
							</p>
						{/if}

						{#if journalError}
							<p
								class="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
							>
								{journalError}
							</p>
						{/if}

						<button
							type="button"
							onclick={saveJournalEntry}
							disabled={journalBusy || !profile.data?.wearableImportCompletedAt}
							class="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
						>
							{journalBusy ? 'Saving...' : 'Save journal entry'}
						</button>
					</div>

					<div>
						<h3 class="text-sm font-semibold text-foreground">Recent entries</h3>
						{#if journalHistory.isLoading}
							<p class="mt-4 text-sm text-muted">Loading journal history...</p>
						{:else if journalHistory.data && journalHistory.data.length > 0}
							<ul class="mt-4 space-y-3">
								{#each journalHistory.data as entry (entry._id)}
									<li>
										<button
											type="button"
											onclick={() => selectJournalDate(entry.date)}
											class={`w-full rounded-2xl border px-4 py-3 text-left transition ${
												entry.date === selectedJournalDate
													? 'border-brand bg-brand text-white'
													: 'border-border bg-brand-light text-foreground hover:border-brand/30'
											}`}
										>
											<div class="flex items-center justify-between gap-3">
												<p class="text-sm font-semibold">{formatLongDate(entry.date)}</p>
												<p
													class={`text-xs ${
														entry.date === selectedJournalDate ? 'text-brand-light' : 'text-muted'
													}`}
												>
													{entry.moodScore !== undefined
														? `Mood ${entry.moodScore}`
														: 'Mood pending'}
												</p>
											</div>
											{#if entry.notes}
												<p
													class={`mt-2 line-clamp-3 text-sm ${
														entry.date === selectedJournalDate ? 'text-brand-light' : 'text-muted'
													}`}
												>
													{entry.notes}
												</p>
											{:else}
												<p
													class={`mt-2 text-sm ${
														entry.date === selectedJournalDate ? 'text-brand-light' : 'text-muted'
													}`}
												>
													Open this day to add notes.
												</p>
											{/if}
										</button>
									</li>
								{/each}
							</ul>
						{:else}
							<div
								class="mt-4 rounded-2xl border border-dashed border-border bg-brand-light px-5 py-8 text-sm text-muted"
							>
								Save your first journal entry to build a daily history.
							</div>
						{/if}
					</div>
				</div>
			</section>
		</main>
	</div>
{/if}
