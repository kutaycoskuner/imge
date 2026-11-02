<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-02
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section "Image" for an image node (type "image"): its name (for lists and
	// link ends), the picture (a part from the library in static/images/parts/index.json, or an
	// uploaded file), and its scale (also the node's corner handle).
	// An uploaded picture is stored in the graph file itself as a data: URL, so the file stays
	// complete wherever it goes; its size at scale 1 is the picture's own, at most UPLOAD_MAX
	// world units on its longer side. Pictures over UPLOAD_WARN bytes ask first.
	import PropText from './PropText.svelte';
	import { graph, renameNode, setNodeContent, setNodeScale } from '$lib/graph/store';
	import { nodeName, nodeScale, imageOf, SCALE_MIN, SCALE_MAX } from '$lib/graph/node-types';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];
	$: image = imageOf(node);

	const UPLOAD_MAX = 320; // longer side of an uploaded picture at scale 1, world units
	const UPLOAD_WARN = 1_000_000; // bytes of the data: URL before asking

	// the library, loaded once per page
	type Part = { file: string; name: string; width: number; height: number };
	let parts: Part[] = [];
	let library: Promise<void> | null = null;
	$: if (!library)
		library = fetch('images/parts/index.json')
			.then((r) => r.json())
			.then((data) => void (parts = data.parts ?? []))
			.catch(() => void (parts = []));

	$: embedded = image.src.startsWith('data:');
	$: chosen = parts.some((p) => p.file === image.src) ? image.src : '';
	let problem = '';

	// the name follows the picture unless it was given one of its own: a default name (of this
	// or an earlier type, e.g. "Node"), a part's name or the last uploaded file's name isn't
	const DEFAULT_NAMES = ['Image', 'Node', 'Group', 'Class'];
	let uploadedName = '';
	$: ownName = !!nodeName(node) && ![...DEFAULT_NAMES, uploadedName, ...parts.map((p) => p.name)].includes(nodeName(node));

	function choosePart(event: Event): void {
		const part = parts.find((p) => p.file === (event.currentTarget as HTMLSelectElement).value);
		if (!part) return;
		const id = node.id;
		const name = ownName ? {} : { name: part.name };
		graph.update((g) => setNodeContent(g, id, { src: part.file, width: part.width, height: part.height, ...name }));
	}

	let fileInput: HTMLInputElement;

	async function upload(event: Event): Promise<void> {
		problem = '';
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		(event.currentTarget as HTMLInputElement).value = ''; // the same file can be chosen again
		if (!file) return;
		if (!file.type.startsWith('image/')) return void (problem = `${file.name} is not an image`);
		const src = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
		if (src.length > UPLOAD_WARN && !confirm(`${file.name} adds ${(src.length / 1e6).toFixed(1)} MB to the graph file. Use it anyway?`)) return;
		const picture = new Image();
		picture.src = src;
		try {
			await picture.decode();
		} catch {
			return void (problem = `The browser could not read ${file.name}`);
		}
		// an SVG without a size of its own reads as 0 x 0: a square then
		let w = picture.naturalWidth || 96;
		let h = picture.naturalHeight || 96;
		const fit = Math.min(1, UPLOAD_MAX / Math.max(w, h));
		w = Math.round(w * fit);
		h = Math.round(h * fit);
		const id = node.id;
		const name = ownName ? {} : { name: (uploadedName = file.name.replace(/\.[^.]+$/, '')) };
		graph.update((g) => setNodeContent(g, id, { src, width: w, height: h, ...name }));
	}
</script>

<dl class="props">
	<dt>Name</dt>
	<dd>
		<PropText label="Image name" value={nodeName(node)} onCommit={(name) => graph.update((g) => renameNode(g, node.id, name))} />
	</dd>

	<dt class="prop-top"><label for="prop-image-part">Picture</label></dt>
	<dd>
		<select id="prop-image-part" class="prop-input" value={chosen} on:change={choosePart}>
			<option value="" disabled>{embedded ? 'uploaded picture' : 'other picture'}</option>
			{#each parts as part (part.file)}<option value={part.file}>{part.name}</option>{/each}
		</select>
		<button class="prop-button" on:click={() => fileInput.click()}>Upload image…</button>
		<input bind:this={fileInput} type="file" accept="image/*" hidden on:change={upload} />
		{#if problem}<div class="prop-faint">{problem}</div>{/if}
		<div class="prop-faint">
			{Math.round(image.w / nodeScale(node))} × {Math.round(image.h / nodeScale(node))} at scale 1{embedded
				? ` · stored in the graph file (${Math.max(1, Math.round(image.src.length / 1024))} KB)`
				: ''}
		</div>
	</dd>

	<dt>Scale</dt>
	<dd>
		<PropText
			type="number"
			step={0.25}
			min={SCALE_MIN}
			max={SCALE_MAX}
			label="Scale"
			value={nodeScale(node)}
			onCommit={(typed) => graph.update((g) => setNodeScale(g, node.id, Number(typed)))}
		/>
		<div class="prop-faint">drawn {Math.round(image.w)} × {Math.round(image.h)}; also the corner handle</div>
	</dd>
</dl>
