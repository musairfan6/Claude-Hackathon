<script lang="ts">
	interface FileStatus {
		fileName: string | null;
		error: string | null;
		ready: boolean;
	}

	interface Props {
		open: boolean;
		mode?: 'initial' | 'update';
		busy: boolean;
		errorMessage: string | null;
		canSubmit: boolean;
		vitalsStatus: FileStatus;
		activityStatus: FileStatus;
		onVitalsChange: (file: File | null) => void;
		onActivityChange: (file: File | null) => void;
		onSubmit: () => void;
		onClose?: () => void;
	}

	const {
		open,
		mode = 'initial',
		busy,
		errorMessage,
		canSubmit,
		vitalsStatus,
		activityStatus,
		onVitalsChange,
		onActivityChange,
		onSubmit,
		onClose
	}: Props = $props();

	const isUpdateMode = $derived(mode === 'update');

	function handleFileChange(
		event: Event & { currentTarget: EventTarget & HTMLInputElement },
		onChange: (file: File | null) => void
	) {
		onChange(event.currentTarget.files?.[0] ?? null);
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/55 p-6">
		<div class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl shadow-brand-dark/20">
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-2">
					<p class="text-xs font-semibold tracking-[0.24em] text-muted uppercase">
						{isUpdateMode ? 'Update wearable data' : 'One-time setup'}
					</p>
					<h2 class="text-2xl font-semibold tracking-tight text-foreground">
						{isUpdateMode ? 'Update your wearable exports' : 'Upload your wearable exports'}
					</h2>
					<p class="text-sm leading-6 text-muted">
						{#if isUpdateMode}
							Replace your current wearable import with updated
							<code class="rounded bg-brand-light px-1.5 py-0.5 text-xs">vitals.csv</code> and
							<code class="rounded bg-brand-light px-1.5 py-0.5 text-xs">activity.csv</code> files.
						{:else}
							Upload <code class="rounded bg-brand-light px-1.5 py-0.5 text-xs">vitals.csv</code> and
							<code class="rounded bg-brand-light px-1.5 py-0.5 text-xs">activity.csv</code> once to unlock
							Health Logs and Daily Journal for your profile.
						{/if}
					</p>
				</div>
				{#if isUpdateMode && onClose}
					<button
						type="button"
						class="rounded-full bg-brand-light px-3 py-1 text-sm font-medium text-muted transition-colors hover:bg-border hover:text-foreground"
						onclick={onClose}
					>
						Close
					</button>
				{/if}
			</div>

			<div class="mt-6 grid gap-4 md:grid-cols-2">
				<div class="rounded-2xl border border-border bg-brand-light p-4">
					<div class="flex items-center justify-between gap-3">
						<h3 class="text-sm font-semibold text-foreground">Vitals export</h3>
						{#if vitalsStatus.ready}
							<span
								class="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success"
							>
								Ready
							</span>
						{:else}
							<span
								class="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted"
							>
								Required
							</span>
						{/if}
					</div>
					<p class="mt-1 text-sm text-muted">
						We read HRV and resting heart rate from <code>vitals.csv</code>.
					</p>
					<label
						class="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-white px-4 py-5 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-foreground"
					>
						<input
							type="file"
							accept=".csv,text/csv"
							class="sr-only"
							onchange={(event) => handleFileChange(event, onVitalsChange)}
						/>
						{vitalsStatus.fileName ?? 'Choose vitals.csv'}
					</label>
					{#if vitalsStatus.error}
						<p class="mt-2 text-sm text-danger">{vitalsStatus.error}</p>
					{/if}
				</div>

				<div class="rounded-2xl border border-border bg-brand-light p-4">
					<div class="flex items-center justify-between gap-3">
						<h3 class="text-sm font-semibold text-foreground">Activity export</h3>
						{#if activityStatus.ready}
							<span
								class="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-medium text-success"
							>
								Ready
							</span>
						{:else}
							<span
								class="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted"
							>
								Required
							</span>
						{/if}
					</div>
					<p class="mt-1 text-sm text-muted">
						We read steps, active calories, and exercise minutes from
						<code>activity.csv</code>.
					</p>
					<label
						class="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-border bg-white px-4 py-5 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-foreground"
					>
						<input
							type="file"
							accept=".csv,text/csv"
							class="sr-only"
							onchange={(event) => handleFileChange(event, onActivityChange)}
						/>
						{activityStatus.fileName ?? 'Choose activity.csv'}
					</label>
					{#if activityStatus.error}
						<p class="mt-2 text-sm text-danger">{activityStatus.error}</p>
					{/if}
				</div>
			</div>

			{#if errorMessage}
				<p
					class="mt-4 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
				>
					{errorMessage}
				</p>
			{/if}

			<div class="mt-6 flex items-center justify-between gap-4">
				<p class="text-sm text-muted">
					{isUpdateMode
						? 'Updating will replace your current imported wearable history with these CSV files.'
						: 'This only needs to be done once for your profile.'}
				</p>
				<button
					type="button"
					class="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!canSubmit || busy}
					onclick={onSubmit}
				>
					{busy
						? isUpdateMode
							? 'Updating...'
							: 'Importing...'
						: isUpdateMode
							? 'Update CSVs'
							: 'Import wearable data'}
				</button>
			</div>
		</div>
	</div>
{/if}
