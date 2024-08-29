// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", '@nuxtjs/color-mode'],
  ssr: false, // disable server side rendering spa: single page application?
  css: [
    '@/assets/stylesheets/main.css',
    '@/assets/stylesheets/out_normalize.css',
  ],

  app: {
    head: {
      title: 'Imge',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicons/favicon_default_32.ico' }, // Default favicon
        // { rel: 'icon', type: 'image/png', href: '/favicon-32x32.png', sizes: '32x32' }, // 32x32 PNG
        // { rel: 'icon', type: 'image/png', href: '/favicon-16x16.png', sizes: '16x16' }, // 16x16 PNG
        // { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }, // Apple devices
        // { rel: 'manifest', href: '/site.webmanifest' }, // Web app manifest
      ],
    },
    baseURL: '/imge/',
    buildAssetsDir: 'assets'
  },
  imports: {
    dirs: ['utils'], // Automatically imports functions from this directory
  },
  pinia: {
    storesDirs: ['./stores/**'],
  },
  colorMode: {
    preference: 'system', // default value of $colorMode.preference
    fallback: 'light', // fallback value if not system preference found
    hid: 'nuxt-color-mode-script',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '-mode',
    storageKey: 'nuxt-color-mode'
  },
  nitro: {
    output: {
      publicDir: '../docs'
    }
  },
})