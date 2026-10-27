<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-17
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// A text or number field of the Properties panel that changes the graph only when the
	// edit is done (Enter or leaving the field), so one edit is one undo step, not one per
	// key. Esc puts the old value back (and keeps the Esc menu closed). While the field isn't
	// focused it follows `value`, so undo and other edits show up in it.
	export let value: string | number;
	export let type: 'text' | 'number' = 'text';
	export let step: number | 'any' = 'any';
	export let min: number | undefined = undefined;
	export let max: number | undefined = undefined;
	export let placeholder = '';
	export let label = ''; // for screen readers when the field has no visible <label>
	export let onCommit: (value: string) => void;

	let draft = String(value);
	let focused = false;
	let cancelled = false;
	let committed: string | null = null; // last value sent, so change + blur don't send it twice
	$: if (!focused) draft = String(value);

	function commit(): void {
		if (cancelled || draft === String(value) || draft === committed) return;
		committed = draft;
		onCommit(draft);
	}

	function handleKey(event: KeyboardEvent): void {
		const field = event.target as HTMLInputElement;
		if (event.key === 'Enter') field.blur();
		else if (event.key === 'Escape') {
			event.preventDefault(); // only cancels the edit; the Esc menu stays closed
			cancelled = true;
			field.blur();
		}
	}

	function handleBlur(): void {
		commit();
		focused = false;
		cancelled = false;
		draft = String(value);
	}
</script>

<!-- the draft is read as text (no bind:value, which would make it a number for type=number);
     a number field also applies on `change`, so its spinner arrows move things right away -->
<input
	class="prop-input"
	{type}
	{step}
	{min}
	{max}
	{placeholder}
	aria-label={label || undefined}
	value={draft}
	on:input={(event) => (draft = event.currentTarget.value)}
	on:change={() => type === 'number' && commit()}
	on:focus={() => {
		focused = true;
		committed = null;
	}}
	on:keydown={handleKey}
	on:blur={handleBlur}
/>
