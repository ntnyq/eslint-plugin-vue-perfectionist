import { readFile, writeFile } from 'node:fs/promises'
import {
  getGeneratedSections,
  replaceGeneratedSection,
} from '../docs/.vitepress/config/rule-docs.ts'

const root = new URL('../', import.meta.url)
for (const { file, marker, content } of getGeneratedSections()) {
  const filename = new URL(file, root)
  const source = await readFile(filename, 'utf8')
  const updated = replaceGeneratedSection(source, marker, content)
  if (source !== updated) {
    await writeFile(filename, updated)
  }
}
