# Icons

One Svelte component per icon, named `icon-<what it shows>.svelte` (e.g. `icon-chevron-up`, not `icon-open-graph`), so any page can reuse it.

- markup only: no click handlers, stores or hover text; those stay in the component that uses the icon
- colour from `currentColor`, so the icon takes the text colour of where it sits
- extra attributes go to the `<svg>` (`{...$$restProps}`), e.g. `<IconUpload width="21" height="21" />`
- an icon that shows a state takes it as a prop (`<IconSnap on={false} />`, `<IconTranspose direction="top-to-bottom" />`)
- a comment on the first line says what the icon looks like
