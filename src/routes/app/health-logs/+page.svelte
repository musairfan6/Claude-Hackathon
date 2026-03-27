<script lang="ts">
	import WearableImportModal from '$lib/components/WearableImportModal.svelte';
	import {
		mergeWearableRows,
		parseActivityFile,
		parseVitalsFile,
		type ParsedActivityRow,
		type ParsedVitalsRow
	} from '$lib/features/wearableImport';
	import { getClerkContext } from '$lib/stores/clerk.svelte';
	import { api } from '../../../convex/_generated/api';
	import { useConvexClient, useQuery } from 'convex-svelte';

	interface FileUploadState<T> {
		fileName: string | null;
		error: string | null;
		ready: boolean;
		rows: T[];
	}

	const clerkContext = getClerkContext();
	const client = useConvexClient();
	const profile = useQuery(api.authed.users.getCurrentUser, {});
	const healthHistory = useQuery(api.authed.health.getHealthHistory, { limit: 30 });

	const createFileUploadState = <T,>(): FileUploadState<T> => ({
		fileName: null,
		error: null,
		ready: false,
		rows: []
	});

	const formatLongDate = (value: string) =>
		new Intl.DateTimeFormat('en-IE', {
			timeZone: 'Europe/Dublin',
			dateStyle: 'medium'
		}).format(new Date(`${value}T00:00:00`));

	const formatDecimal = (value: number | undefined) =>
		new Intl.NumberFormat('en-IE', {
			maximumFractionDigits: 1
		}).format(value ?? 0);

	const formatImportTimestamp = (value: number) =>
		new Intl.DateTimeFormat('en-IE', {
			timeZone: 'Europe/Dublin',
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));

	let vitalsUpload = $state<FileUploadState<ParsedVitalsRow>>(createFileUploadState());
	let activityUpload = $state<FileUploadState<ParsedActivityRow>>(createFileUploadState());
	let updateBusy = $state(false);
	let updateErrorMessage = $state<string | null>(null);
	let isUpdateModalOpen = $state(false);

	const canSubmitUpdate = $derived.by(() => vitalsUpload.ready && activityUpload.ready);

	function openUpdateModal() {
		updateErrorMessage = null;
		isUpdateModalOpen = true;
	}

	function closeUpdateModal() {
		isUpdateModalOpen = false;
		updateErrorMessage = null;
		vitalsUpload = createFileUploadState();
		activityUpload = createFileUploadState();
	}

	async function handleVitalsChange(file: File | null) {
		if (file === null) {
			vitalsUpload = createFileUploadState();
			return;
		}

		const parsedFile = await parseVitalsFile(file);
		if (!parsedFile.ok) {
			vitalsUpload = {
				fileName: file.name,
				error: parsedFile.error,
				ready: false,
				rows: []
			};
			return;
		}

		vitalsUpload = {
			fileName: file.name,
			error: null,
			ready: true,
			rows: parsedFile.rows
		};
		updateErrorMessage = null;
	}

	async function handleActivityChange(file: File | null) {
		if (file === null) {
			activityUpload = createFileUploadState();
			return;
		}

		const parsedFile = await parseActivityFile(file);
		if (!parsedFile.ok) {
			activityUpload = {
				fileName: file.name,
				error: parsedFile.error,
				ready: false,
				rows: []
			};
			return;
		}

		activityUpload = {
			fileName: file.name,
			error: null,
			ready: true,
			rows: parsedFile.rows
		};
		updateErrorMessage = null;
	}

	async function submitUpdatedCsvs() {
		updateErrorMessage = null;

		if (!canSubmitUpdate) {
			updateErrorMessage = 'Upload both CSV files before updating.';
			return;
		}

		updateBusy = true;

		try {
			await client.mutation(api.authed.health.importWearableData, {
				rows: mergeWearableRows(vitalsUpload.rows, activityUpload.rows),
				source: 'csv_upload'
			});
			closeUpdateModal();
		} catch (error) {
			updateErrorMessage = error instanceof Error ? error.message : String(error);
		} finally {
			updateBusy = false;
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
						<h1 class="text-lg font-semibold tracking-tight">Health Logs</h1>
						<p class="mt-1 text-sm text-muted">
							Daily wearable metrics from your imported CSV files.
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
						<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">Overview</p>
						<h2 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">
							Wearable history
						</h2>
						<p class="mt-3 max-w-2xl text-sm leading-6 text-muted">
							Review the imported values for HRV, resting heart rate, steps, active calories, and
							exercise minutes.
						</p>
						{#if profile.data?.wearableImportCompletedAt}
							<p class="mt-3 text-sm text-muted">
								Last updated {formatImportTimestamp(profile.data.wearableImportCompletedAt)}.
							</p>
						{/if}
					</div>
					<div class="flex flex-col items-end gap-3">
						<span
							class={`rounded-full px-3 py-1 text-xs font-medium ${
								profile.data?.wearableImportCompletedAt
									? 'bg-success/10 text-success'
									: 'bg-warning/10 text-warning'
							}`}
						>
							{profile.data?.wearableImportCompletedAt ? 'ready' : 'waiting for upload'}
						</span>
						{#if profile.data?.wearableImportCompletedAt}
							<button
								type="button"
								class="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-foreground"
								onclick={openUpdateModal}
							>
								Update CSVs
							</button>
						{/if}
					</div>
				</div>

				{#if healthHistory.isLoading}
					<p class="mt-8 text-sm text-muted">Loading health logs...</p>
				{:else if healthHistory.data && healthHistory.data.length > 0}
					<ul class="mt-8 space-y-4">
						{#each healthHistory.data as entry (entry._id)}
							<li class="rounded-2xl border border-border bg-brand-light p-4">
								<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div>
										<p class="text-base font-semibold text-foreground">
											{formatLongDate(entry.date)}
										</p>
										<p class="mt-1 text-sm text-muted">
											Source: {entry.source ?? profile.data?.wearableImportSource ?? 'csv_upload'}
										</p>
									</div>

									<div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:min-w-[34rem]">
										<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-border">
											<p class="text-xs text-muted">HRV</p>
											<p class="mt-1 text-sm font-semibold text-foreground">
												{entry.hrv !== undefined ? `${formatDecimal(entry.hrv)} ms` : '\u2014'}
											</p>
										</div>
										<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-border">
											<p class="text-xs text-muted">Resting HR</p>
											<p class="mt-1 text-sm font-semibold text-foreground">
												{entry.restingHr !== undefined
													? `${formatDecimal(entry.restingHr)} bpm`
													: '\u2014'}
											</p>
										</div>
										<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-border">
											<p class="text-xs text-muted">Steps</p>
											<p class="mt-1 text-sm font-semibold text-foreground">
												{entry.steps !== undefined ? formatDecimal(entry.steps) : '\u2014'}
											</p>
										</div>
										<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-border">
											<p class="text-xs text-muted">Active Calories</p>
											<p class="mt-1 text-sm font-semibold text-foreground">
												{entry.activeCalories !== undefined
													? `${formatDecimal(entry.activeCalories)} kcal`
													: '\u2014'}
											</p>
										</div>
										<div class="rounded-xl bg-white px-3 py-2 ring-1 ring-border">
											<p class="text-xs text-muted">Exercise</p>
											<p class="mt-1 text-sm font-semibold text-foreground">
												{entry.exerciseMinutes !== undefined
													? `${formatDecimal(entry.exerciseMinutes)} min`
													: '\u2014'}
											</p>
										</div>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<div
						class="mt-8 rounded-2xl border border-dashed border-border bg-brand-light px-5 py-8 text-sm text-muted"
					>
						Your imported wearable days will appear here after the first upload.
					</div>
				{/if}
			</section>
		</main>
	</div>

	<WearableImportModal
		open={isUpdateModalOpen}
		mode="update"
		busy={updateBusy}
		errorMessage={updateErrorMessage}
		canSubmit={canSubmitUpdate}
		vitalsStatus={vitalsUpload}
		activityStatus={activityUpload}
		onVitalsChange={handleVitalsChange}
		onActivityChange={handleActivityChange}
		onSubmit={submitUpdatedCsvs}
		onClose={closeUpdateModal}
	/>
{/if}
