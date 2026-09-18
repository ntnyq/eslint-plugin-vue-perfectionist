import pkg from '../package.json' with { type: 'json' }

const { name, version } = pkg

export const meta = { name, version }
