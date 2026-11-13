import { SELECTORS } from '../sort-statements/constants.ts'
import { createOptionsSchema } from '../sort-statements/schema.ts'

/**
 * Setup statements include compiler macro selectors.
 */
export const OPTIONS_SCHEMA = createOptionsSchema(SELECTORS)
