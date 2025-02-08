# Notebook

# Installation and Use
- svelte
    - prerequisites
        - node.js
    - install
        - npx sv create imge
            - sv@0.6.18
            - sveltekit minimal
            - typescript syntax
            - prettier, eslint, vitest, playwright, sveltekit-adapter, drizzle, mdsvex
            - static
            - postgresql, postgres.js
            - drizzle local docker compose y
            - pnpm
    - start development 
        - cd imge
        - pnpm run dev --open
    - build

- nuxt 3
    - prerequisites
        - install
        -   Prerequisites
            - Node.js v18 or upper
            - Text editor. Recommendation: Visual Studio Code
            - Terminal to run nuxt commandss

        -   Install
            - npx nuxi@3.12 init imge | npx nuxi@latest init <project-name>
                - npm y (will download dependencies)
                - initialize git repository? no 
            - packages > "overrides": {"vue": "latest"}
                - npm install pinia @pinia/nuxt
            - npx nuxi@latest module add pinia
            - npm install --save-dev @nuxtjs/color-mode

        -   Start development program
            - cd imge
            - npm run dev

        - Build
            - nuxt.config
                - app > baseURL: '',
                - ssr: false
                - buildAssetsDir: 'assets'
            - npm run generate
                - should not contain file / dir with starting _


# Links
- badges / shields
    - https://shields.io/badges/static-badge
    - https://simpleicons.org/?q=discord
    - https://github.com/simple-icons/simple-icons/blob/master/slugs.md

- flaticon pngs
    - https://www.flaticon.com/

- w3 svgs (html graphics)
    - https://stackoverflow.com/questions/60460422/how-to-use-w3-orgs-svg-icons-on-my-website
    - w3.org/TR/SVG2/
    - https://iconsvg.xyz/
    - https://flowbite.com/icons/
    - https://themesberg.com/blog/open-source/10-open-source-free-svg-icon-libraries



# Keywords

# Structure

# Blackboard
- <function descriptions>
    - aadding links
        - hovering on top of node will appear point on edges.
        - if you click on edges you will add i/o link node on parent node
        - io has directional reference, left = input, right = output or top = input, bottom = output

# How to
- <centering css div>
	.centered {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

- <adding color mode>
    - https://color-mode.nuxtjs.org/
    - install color mode
        - npm install --save-dev @nuxtjs/color-mode
    - add nuxt.config.ts 
    export default defineNuxtConfig({
        modules: ['@nuxtjs/color-mode']
        })

- <call function of host app from a component>
    - component
        - import defineemits from vue
        - const emit  = defineemits(['test'])
        - in function emit('test')
    - host
        - with component add @test="handleTest"
        - add function called handleTest

# migration
- accessibility ui
- assistance message
- settingsoverlay full screen
- polka dots


# Problems
- <problem>

