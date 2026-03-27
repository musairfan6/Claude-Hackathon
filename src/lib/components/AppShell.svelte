<script lang="ts">
	import WearableImportModal from '$lib/components/WearableImportModal.svelte';
	import {
		mergeWearableRows,
		parseActivityFile,
		parseVitalsFile,
		type ParsedActivityRow,
		type ParsedVitalsRow
	} from '$lib/features/wearableImport';
	import { api } from '../../convex/_generated/api';
	import { useConvexClient, useQuery } from 'convex-svelte';

	interface FileUploadState<T> {
		fileName: string | null;
		error: string | null;
		ready: boolean;
		rows: T[];
	}

	const createFileUploadState = <T,>(): FileUploadState<T> => ({
		fileName: null,
		error: null,
		ready: false,
		rows: []
	});

	const { children } = $props();
	const client = useConvexClient();
	const profile = useQuery(api.authed.users.getCurrentUser, {});

	let vitalsUpload = $state<FileUploadState<ParsedVitalsRow>>(createFileUploadState());
	let activityUpload = $state<FileUploadState<ParsedActivityRow>>(createFileUploadState());
	let importBusy = $state(false);
	let importErrorMessage = $state<string | null>(null);

	const shouldShowImportModal = $derived.by(
		() => profile.data === undefined || profile.data?.wearableImportCompletedAt === undefined
	);

	const canSubmitImport = $derived.by(() => vitalsUpload.ready && activityUpload.ready);

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
		importErrorMessage = null;
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
		importErrorMessage = null;
	}

	async function submitWearableImport() {
		importErrorMessage = null;

		if (!canSubmitImport) {
			importErrorMessage = 'Upload both CSV files before importing.';
			return;
		}

		importBusy = true;

		try {
			await client.mutation(api.authed.health.importWearableData, {
				rows: mergeWearableRows(vitalsUpload.rows, activityUpload.rows),
				source: 'csv_upload'
			});
			vitalsUpload = createFileUploadState();
			activityUpload = createFileUploadState();
		} catch (error) {
			importErrorMessage = error instanceof Error ? error.message : String(error);
		} finally {
			importBusy = false;
		}
	}
</script>

{@render children()}

<WearableImportModal
	open={shouldShowImportModal}
	mode="initial"
	busy={importBusy}
	errorMessage={importErrorMessage}
	canSubmit={canSubmitImport}
	vitalsStatus={vitalsUpload}
	activityStatus={activityUpload}
	onVitalsChange={handleVitalsChange}
	onActivityChange={handleActivityChange}
	onSubmit={submitWearableImport}
/>
