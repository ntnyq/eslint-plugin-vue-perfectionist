import packageJson from '../../package.json' with { type: 'json' }

const { description, name, version } = packageJson

/**
 * Shared documentation site metadata.
 */
export const packageName: string = name

export const appTitle: string = 'Vue Perfectionist'
export const appVersion: string = version
export const appDescription: string = description

export const repositoryUrl: string = `https://github.com/ntnyq/${packageName}`
