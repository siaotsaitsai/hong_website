import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  deployment: {appId: 'wza9ke4ozcxt64lhi0v7fd8v'},
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
})
