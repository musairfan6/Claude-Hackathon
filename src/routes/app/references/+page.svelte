<script lang="ts">
	import { getClerkContext } from '$lib/stores/clerk.svelte';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import { remoteAuthedDemoQuery, remoteDemoQuery } from '$lib/remote/demo.remote';
	import PageError from '$lib/components/PageError.svelte';

	const clerkContext = getClerkContext();
	const client = useConvexClient();

	// -------------------------------------------------------
	// 1. Client-side authed Convex query (real-time reactive)
	// -------------------------------------------------------
	const authedDemo = useQuery(api.authed.demo.authedDemoQuery, {});

	// -------------------------------------------------------
	// 2. Client-side authed Convex mutation (via useConvexClient)
	// -------------------------------------------------------
	let mutationResult = $state<string | null>(null);
	let mutationLoading = $state(false);

	async function runClientMutation() {
		mutationLoading = true;
		mutationResult = null;
		try {
			await client.mutation(api.authed.users.getOrCreateUser, {});
			mutationResult = 'Called getOrCreateUser successfully';
		} catch (err) {
			mutationResult = `Error: ${err instanceof Error ? err.message : String(err)}`;
		} finally {
			mutationLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-surface font-sans text-foreground">
	<header class="border-b border-border bg-white">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
			<div class="flex items-center gap-3">
				<a href="/app" class="text-sm text-muted transition-colors hover:text-foreground">
					&larr; Back
				</a>
				<h1 class="text-lg font-semibold tracking-tight">Pattern References</h1>
			</div>
			{#if clerkContext.clerk.user}
				<div
					{@attach (el) => {
						clerkContext.clerk.mountUserButton(el);
					}}
				></div>
			{/if}
		</div>
	</header>

	<main class="mx-auto max-w-3xl space-y-6 px-6 py-8">
		<!-- Section 1: Client authed query -->
		<section class="rounded-lg border border-border bg-white p-5">
			<h2 class="text-xs font-semibold tracking-wide text-muted uppercase">
				1. Client Authed Query
			</h2>
			<p class="mt-1 text-sm text-muted">
				Real-time reactive query via <code class="rounded bg-brand-light px-1 py-0.5 text-xs"
					>useQuery(api.authed.demo.authedDemoQuery, {'{}'})</code
				>
			</p>
			<div class="mt-3 rounded-md bg-brand-light p-3">
				{#if authedDemo.isLoading}
					<p class="text-sm text-muted">Loading...</p>
				{:else if authedDemo.data}
					<pre class="text-sm text-foreground">{JSON.stringify(authedDemo.data, null, 2)}</pre>
				{:else}
					<p class="text-sm text-muted">No data (are you signed in?)</p>
				{/if}
			</div>
			<details class="mt-3">
				<summary class="cursor-pointer text-xs font-medium text-muted hover:text-foreground"
					>How it works</summary
				>
				<div class="mt-2 space-y-1 text-xs text-muted">
					<p>
						<code class="rounded bg-brand-light px-1 py-0.5">useQuery</code> from
						<code class="rounded bg-brand-light px-1 py-0.5">convex-svelte</code> subscribes to a Convex
						query over WebSocket.
					</p>
					<p>
						The Clerk JWT is passed automatically via <code
							class="rounded bg-brand-light px-1 py-0.5">ConvexWrapper</code
						>
						&rarr; <code class="rounded bg-brand-light px-1 py-0.5">convex.setAuth()</code>.
					</p>
					<p>
						The query handler uses <code class="rounded bg-brand-light px-1 py-0.5"
							>authedQuery</code
						>
						which calls
						<code class="rounded bg-brand-light px-1 py-0.5">ctx.auth.getUserIdentity()</code> and throws
						if null.
					</p>
				</div>
			</details>
		</section>

		<!-- Section 2: Client authed mutation -->
		<section class="rounded-lg border border-border bg-white p-5">
			<h2 class="text-xs font-semibold tracking-wide text-muted uppercase">
				2. Client Authed Mutation
			</h2>
			<p class="mt-1 text-sm text-muted">
				Imperative mutation via <code class="rounded bg-brand-light px-1 py-0.5 text-xs"
					>useConvexClient()</code
				>
				&rarr; <code class="rounded bg-brand-light px-1 py-0.5 text-xs">client.mutation()</code>
			</p>
			<div class="mt-3 flex items-center gap-3">
				<button
					onclick={runClientMutation}
					disabled={mutationLoading}
					class="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
				>
					{mutationLoading ? 'Calling...' : 'Call getOrCreateUser'}
				</button>
				{#if mutationResult}
					<p class="text-sm text-muted">{mutationResult}</p>
				{/if}
			</div>
			<details class="mt-3">
				<summary class="cursor-pointer text-xs font-medium text-muted hover:text-foreground"
					>How it works</summary
				>
				<div class="mt-2 space-y-1 text-xs text-muted">
					<p>
						<code class="rounded bg-brand-light px-1 py-0.5">useConvexClient()</code> returns the
						underlying <code class="rounded bg-brand-light px-1 py-0.5">ConvexClient</code> instance.
					</p>
					<p>
						Call <code class="rounded bg-brand-light px-1 py-0.5"
							>client.mutation(api.module.func, args)</code
						> to run a mutation imperatively.
					</p>
					<p>
						Auth is handled identically to queries &mdash; the Clerk JWT is attached automatically.
					</p>
				</div>
			</details>
		</section>

		<!-- Section 3: Server remote function (private backend query) -->
		<section class="rounded-lg border border-border bg-white p-5">
			<h2 class="text-xs font-semibold tracking-wide text-muted uppercase">
				3. Private Backend Query (Remote Function)
			</h2>
			<p class="mt-1 text-sm text-muted">
				Server-side Convex call via Effect &rarr; <code
					class="rounded bg-brand-light px-1 py-0.5 text-xs">ConvexPrivateService</code
				>
				&rarr; <code class="rounded bg-brand-light px-1 py-0.5 text-xs">remoteDemoQuery</code>
			</p>
			<div class="mt-3 rounded-md bg-brand-light p-3">
				<svelte:boundary>
					{@const result = await remoteDemoQuery()}
					<pre class="text-sm text-foreground">{JSON.stringify(result, null, 2)}</pre>
					{#snippet pending()}
						<p class="text-sm text-muted">Loading from server...</p>
					{/snippet}
					{#snippet failed(error, reset)}
						<div class="space-y-2">
							<PageError {error} />
							<button
								onclick={reset}
								class="text-xs font-medium text-muted underline underline-offset-2 hover:text-foreground"
							>
								Retry
							</button>
						</div>
					{/snippet}
				</svelte:boundary>
			</div>
			<details class="mt-3">
				<summary class="cursor-pointer text-xs font-medium text-muted hover:text-foreground"
					>How it works</summary
				>
				<div class="mt-2 space-y-1 text-xs text-muted">
					<p>
						Defined in <code class="rounded bg-brand-light px-1 py-0.5"
							>$lib/remote/demo.remote.ts</code
						>
						using SvelteKit's <code class="rounded bg-brand-light px-1 py-0.5">query()</code> from
						<code class="rounded bg-brand-light px-1 py-0.5">$app/server</code>.
					</p>
					<p>
						Uses an Effect generator to call <code class="rounded bg-brand-light px-1 py-0.5"
							>ConvexPrivateService.query()</code
						>
						which uses <code class="rounded bg-brand-light px-1 py-0.5">ConvexHttpClient</code> + API
						key auth.
					</p>
					<p>
						The private Convex function validates <code class="rounded bg-brand-light px-1 py-0.5"
							>apiKey</code
						>
						against
						<code class="rounded bg-brand-light px-1 py-0.5">CONVEX_PRIVATE_BRIDGE_KEY</code> env var
						&mdash; never exposed to the client.
					</p>
					<p>
						Errors are caught by <code class="rounded bg-brand-light px-1 py-0.5">effectRunner</code
						>
						and mapped to SvelteKit <code class="rounded bg-brand-light px-1 py-0.5">error()</code> responses
						with proper status codes.
					</p>
				</div>
			</details>
		</section>

		<!-- Section 4: Server authed remote function -->
		<section class="rounded-lg border border-border bg-white p-5">
			<h2 class="text-xs font-semibold tracking-wide text-muted uppercase">
				4. Authed Remote Function (Server-side Clerk Validation)
			</h2>
			<p class="mt-1 text-sm text-muted">
				Server-side auth via Effect &rarr; <code class="rounded bg-brand-light px-1 py-0.5 text-xs"
					>ClerkService.validateAuth()</code
				>
				&rarr; <code class="rounded bg-brand-light px-1 py-0.5 text-xs">remoteAuthedDemoQuery</code>
			</p>
			<div class="mt-3 rounded-md bg-brand-light p-3">
				<svelte:boundary>
					{@const result = await remoteAuthedDemoQuery()}
					<pre class="text-sm text-foreground">{JSON.stringify(result, null, 2)}</pre>
					{#snippet pending()}
						<p class="text-sm text-muted">Validating auth on server...</p>
					{/snippet}
					{#snippet failed(error, reset)}
						<div class="space-y-2">
							<PageError {error} />
							<button
								onclick={reset}
								class="text-xs font-medium text-muted underline underline-offset-2 hover:text-foreground"
							>
								Retry
							</button>
						</div>
					{/snippet}
				</svelte:boundary>
			</div>
			<details class="mt-3">
				<summary class="cursor-pointer text-xs font-medium text-muted hover:text-foreground"
					>How it works</summary
				>
				<div class="mt-2 space-y-1 text-xs text-muted">
					<p>
						Uses <code class="rounded bg-brand-light px-1 py-0.5">getRequestEvent()</code> to get
						the current request, then passes it to
						<code class="rounded bg-brand-light px-1 py-0.5">ClerkService.validateAuth()</code>.
					</p>
					<p>
						Clerk's <code class="rounded bg-brand-light px-1 py-0.5">authenticateRequest()</code> validates
						the session cookie/JWT server-side using the secret key.
					</p>
					<p>
						On failure, <code class="rounded bg-brand-light px-1 py-0.5">effectRunner</code> maps
						<code class="rounded bg-brand-light px-1 py-0.5">ClerkError</code> to a 401 response.
					</p>
				</div>
			</details>
		</section>

		<!-- Section 5: Error handling patterns -->
		<section class="rounded-lg border border-border bg-white p-5">
			<h2 class="text-xs font-semibold tracking-wide text-muted uppercase">
				5. Error Handling Patterns
			</h2>
			<p class="mt-1 text-sm text-muted">How errors flow through the stack.</p>
			<div class="mt-3 space-y-3 text-xs text-muted">
				<div class="rounded-md border border-border p-3">
					<h3 class="font-semibold text-foreground">Client-side (Convex)</h3>
					<p class="mt-1">
						Wrap <code class="rounded bg-brand-light px-1 py-0.5">client.mutation()</code> /
						<code class="rounded bg-brand-light px-1 py-0.5">client.action()</code> in try/catch. Convex
						throws standard JS errors.
					</p>
					<pre
						class="mt-2 overflow-x-auto rounded-md bg-brand-light p-2 text-[11px] leading-relaxed text-muted">try &#123;
  await client.mutation(api.module.func, args);
&#125; catch (err) &#123;
  // handle error
&#125;</pre>
				</div>
				<div class="rounded-md border border-border p-3">
					<h3 class="font-semibold text-foreground">Server-side (Effect + Remote Functions)</h3>
					<p class="mt-1">
						Errors are tagged: <code class="rounded bg-brand-light px-1 py-0.5">ConvexError</code>,
						<code class="rounded bg-brand-light px-1 py-0.5">ClerkError</code>,
						<code class="rounded bg-brand-light px-1 py-0.5">GenericError</code>.
					</p>
					<p class="mt-1">
						<code class="rounded bg-brand-light px-1 py-0.5">effectRunner</code> catches all
						failures, logs them, and maps to SvelteKit
						<code class="rounded bg-brand-light px-1 py-0.5">error(status, body)</code>:
					</p>
					<ul class="mt-1 list-inside list-disc space-y-0.5">
						<li><code class="rounded bg-brand-light px-1 py-0.5">ConvexError</code> &rarr; 500</li>
						<li><code class="rounded bg-brand-light px-1 py-0.5">ClerkError</code> &rarr; 401</li>
						<li>
							<code class="rounded bg-brand-light px-1 py-0.5">GenericError</code> &rarr; custom status
						</li>
					</ul>
				</div>
				<div class="rounded-md border border-border p-3">
					<h3 class="font-semibold text-foreground">UI (Svelte Boundary)</h3>
					<p class="mt-1">
						<code class="rounded bg-brand-light px-1 py-0.5">&lt;svelte:boundary&gt;</code> with
						<code class="rounded bg-brand-light px-1 py-0.5">pending</code> and
						<code class="rounded bg-brand-light px-1 py-0.5">failed</code> snippets catches async errors.
					</p>
					<p class="mt-1">
						<code class="rounded bg-brand-light px-1 py-0.5">PageError</code> parses
						<code class="rounded bg-brand-light px-1 py-0.5">isHttpError()</code>
						into the <code class="rounded bg-brand-light px-1 py-0.5">App.Error</code> shape: message,
						kind, timestamp, traceId.
					</p>
					<p class="mt-1">
						The <code class="rounded bg-brand-light px-1 py-0.5">reset</code> callback lets users retry
						failed operations.
					</p>
				</div>
			</div>
		</section>

		<!-- Section 6: Architecture overview -->
		<section class="rounded-lg border border-border bg-white p-5">
			<h2 class="text-xs font-semibold tracking-wide text-muted uppercase">
				6. Architecture Overview
			</h2>
			<div class="mt-3 space-y-2 text-xs text-muted">
				<div class="overflow-x-auto rounded-md bg-brand-light p-3">
					<pre class="text-[11px] leading-relaxed">Client (browser)
  &boxv;
  &boxvr;&horbar; useQuery()      &rarr; WebSocket &rarr; Convex (authed via Clerk JWT)
  &boxvr;&horbar; client.mutation() &rarr; WebSocket &rarr; Convex (authed via Clerk JWT)
  &boxur;&horbar; await remote()  &rarr; HTTP      &rarr; SvelteKit server
                                      &boxv;
                                      &boxvr;&horbar; ClerkService  &rarr; Clerk API (secret key)
                                      &boxur;&horbar; ConvexPrivateService &rarr; Convex (API key)

Convex functions:
  &boxvr;&horbar; authed/*   &rarr; Client-facing, protected by Clerk JWT
  &boxur;&horbar; private/*  &rarr; Backend-only, protected by API key</pre>
				</div>
			</div>
		</section>
	</main>
</div>
