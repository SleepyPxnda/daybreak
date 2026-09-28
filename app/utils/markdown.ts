import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

// Reines Markdown (Obsidian-kompatibel, Plan §3.7): kein Roh-HTML, Zeilenumbrüche wie in Obsidian
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

// Links in neuem Tab öffnen
const standardLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]!.attrSet('target', '_blank')
  tokens[idx]!.attrSet('rel', 'noopener noreferrer')
  return standardLink(tokens, idx, options, env, self)
}

/** Markdown → sicheres HTML. Nur im Browser aufrufen (DOMPurify braucht ein DOM). */
export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(md.render(text), { ADD_ATTR: ['target'] })
}
