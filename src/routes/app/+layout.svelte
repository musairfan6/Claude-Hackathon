<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';
	import ClerkWrapper from '$lib/wrappers/ClerkWrapper.svelte';
	import ConvexWrapper from '$lib/wrappers/ConvexWrapper.svelte';

	const { children } = $props();
</script>

<svelte:head>
	<title>Health Jarvis</title>
</svelte:head>

<ClerkWrapper>
	<ConvexWrapper>
		<AppShell>
			{@render children()}
		</AppShell>
	</ConvexWrapper>
</ClerkWrapper>
