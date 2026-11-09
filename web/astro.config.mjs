import {defineConfig} from 'astro/config';
export default defineConfig({output: 'static', build: {inlineStylesheets: 'always'}, base: process.env.BASE_PATH || '/'});
