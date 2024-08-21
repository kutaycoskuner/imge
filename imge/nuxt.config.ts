// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ["@pinia/nuxt"],
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
    baseURL: '',
    buildAssetsDir: 'assets'
  },
  pinia: {
    storesDirs: ['./stores/**'],
  },
  imports: {
    dirs: ['utils'], // Automatically imports functions from this directory
  }
})