import packageJson from '../package.json' with { type: 'json' }

const { name, version } = packageJson

export const meta = { name, version }
