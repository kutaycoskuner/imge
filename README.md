<h1 align="center">
    Project Imge
</h1>
<h3 align="center">
    Study project: Web based node editor / matrix calculators
</h3>
<!-- <p align="center">
    <a href="#">Docs</a> |
    <a href="#">Report an Issue</a> 
</p> -->

<p align="center">
    <img alt="SvelteKit 2" src="https://img.shields.io/badge/SvelteKit-2-orange?logo=svelte&logoColor=white" />
    <img alt="Svelte 5" src="https://img.shields.io/badge/Svelte-5-orange?logo=svelte&logoColor=white" />
    <img alt="Version" src="https://img.shields.io/badge/Version-0.6.0-blue" />
    <img alt="Project Start" src="https://img.shields.io/badge/project_start-21_Aug_2024-green" />
    <img alt="Last Update" src="https://img.shields.io/github/last-commit/kutaycoskuner/imge" />
</p>

<p align="center">

![first frame](_display/0.4.1-matrix_sum.png)
<figcaption>v0.22 Node and link display</figcaption>

</p>

# Installation and Use

### Prerequisites
- **Node.js 18+**: [Install Node.js](https://nodejs.org/en/download/package-manager)

### Install and run
```bash
# 1. Clone the repository and go into it
git clone https://github.com/kutaycoskuner/imge.git
cd imge

# 2. Install packages
npm install

# 3. Start the development server (opens on http://localhost:5173)
npm run dev

# optional: run the unit tests
npm run test:unit -- --run
```

# Features

### Features
- [x] basic ui buttons
- [x] assistance message
- [x] settings interface
- [x] color mode
- [x] endless 2d canvas: one camera for pan and zoom, nodes / dots / coordinates always in sync
- [x] pan by dragging empty space, follows the mouse at any zoom
- [x] zoom toward cursor (mouse wheel) and screen center (buttons)
- [x] faint dot grid that follows the canvas (spacing doubles when zoomed out)
- [x] origin marker: red / green L at (0, 0) toward +x / +y (Blender axis colors)
- [x] coordinates tracker (world coordinates, x right, y up)
- [x] node rendering
- [x] rendering from json content
- [x] node movement
- [x] export data as json
- [x] versioned graph format, older files upgraded on load
- [ ] link rendering
- [ ] node linking
- [ ] vertical / horizontal frameworks
- [ ] node content / color editing

# Docs
- [Graph editor canvas](docs/graph-editor-canvas.md): current feature set, camera, coordinate system, zoom, dot grid
- [Graph file format](docs/graph-format.md): JSON structure, format versions, adapters that upgrade older files

# Roadmap
- [ ] Accessibility buttons: Import / Export
- [x] Export data
- [ ] Adding links on ui