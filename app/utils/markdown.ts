import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

// Plain Markdown (Obsidian-compatible): no raw HTML, line breaks as in Obsidian
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

// Open links in a new tab
const standardLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]!.attrSet('target', '_blank')
  tokens[idx]!.attrSet('rel', 'noopener noreferrer')
  return standardLink(tokens, idx, options, env, self)
}

/** Markdown -> safe HTML. Call in the browser only (DOMPurify needs a DOM). */
export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(md.render(text), { ADD_ATTR: ['target'] })
}
