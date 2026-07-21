import { visit } from 'unist-util-visit'
import {
  hasSubtextMarker,
  isSubtextLine,
  stripSubtextPrefix,
} from '@edems-dev/md-discord-syntax-core'

export interface UnistNode {
  type: string
  name?: string
  value?: string
  children?: UnistNode[]
  attributes?: Array<{ type: string; name: string; value: string }>
  data?: Record<string, unknown>
}

function normalizeChildren(nodes?: UnistNode[]): UnistNode[] {
  if (!nodes || !Array.isArray(nodes)) return []
  const result: UnistNode[] = []
  for (const child of nodes) {
    if (!child) continue
    if (child.type === 'text') {
      if (!child.value) continue
      if (result.length > 0 && result[result.length - 1].type === 'text') {
        result[result.length - 1].value += child.value
        continue
      }
    }
    result.push(child)
  }
  return result
}

export function remarkMdDiscordSyntax() {
  return (tree: UnistNode) => {
    // 1. Spoilers
    visit(tree, (node: UnistNode) => {
      if (!node.children || !Array.isArray(node.children) || node.children.length === 0) return
      if (node.type === 'code' || node.type === 'inlineCode' || node.name === 'Spoiler' || (node.data && node.data._isGenerated)) return

      const expanded: UnistNode[] = []
      let hasMarker = false

      for (const child of node.children) {
        if (child.type === 'text' && child.value && child.value.includes('||')) {
          let text = child.value
          let idx = text.indexOf('||')
          while (idx !== -1) {
            const before = text.slice(0, idx)
            if (before) expanded.push({ type: 'text', value: before })
            expanded.push({ type: 'spoiler-marker' })
            hasMarker = true
            text = text.slice(idx + 2)
            idx = text.indexOf('||')
          }
          if (text) expanded.push({ type: 'text', value: text })
        } else {
          expanded.push(child)
        }
      }

      if (!hasMarker) return

      const markerIndices: number[] = []
      for (let i = 0; i < expanded.length; i++) {
        if (expanded[i].type === 'spoiler-marker') {
          markerIndices.push(i)
        }
      }

      if (markerIndices.length < 2) {
        const restored = expanded.map((n) =>
          n.type === 'spoiler-marker' ? { type: 'text', value: '||' } : n
        )
        node.children = normalizeChildren(restored)
        return
      }

      const pairs: Array<{ start: number; end: number }> = []
      for (let k = 0; k < markerIndices.length - 1; k += 2) {
        pairs.push({ start: markerIndices[k], end: markerIndices[k + 1] })
      }

      const result: UnistNode[] = []
      let currentIndex = 0

      for (const pair of pairs) {
        while (currentIndex < pair.start) {
          const n = expanded[currentIndex]
          result.push(n.type === 'spoiler-marker' ? { type: 'text', value: '||' } : n)
          currentIndex++
        }

        const rawInside = expanded.slice(pair.start + 1, pair.end)
        const inside = rawInside.map((n) =>
          n.type === 'spoiler-marker' ? { type: 'text', value: '||' } : n
        )
        const normalizedInside = normalizeChildren(inside)

        result.push({
          type: 'mdxJsxTextElement',
          name: 'Spoiler',
          attributes: [],
          children: normalizedInside,
          data: { _isGenerated: true },
        })

        currentIndex = pair.end + 1
      }

      while (currentIndex < expanded.length) {
        const n = expanded[currentIndex]
        result.push(n.type === 'spoiler-marker' ? { type: 'text', value: '||' } : n)
        currentIndex++
      }

      node.children = normalizeChildren(result)
    })

    // 2. Subtext
    visit(tree, 'paragraph', (node: UnistNode) => {
      if (!node.children) return

      let mightHaveSubtext = false
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        if (child.type === 'text' && child.value && hasSubtextMarker(child.value)) {
          mightHaveSubtext = true
          break
        }
        if (child.type === 'break' && i + 1 < node.children.length) {
          const next = node.children[i + 1]
          if (next.type === 'text' && next.value && isSubtextLine(next.value)) {
            mightHaveSubtext = true
            break
          }
        }
      }
      if (!mightHaveSubtext) return

      const lines: UnistNode[][] = []
      let currentLine: UnistNode[] = []
      lines.push(currentLine)

      for (const child of node.children) {
        if (child.type === 'break') {
          currentLine.push(child)
          currentLine = []
          lines.push(currentLine)
        } else if (child.type === 'text' && child.value !== undefined) {
          const parts = child.value.split('\n')
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].length > 0) {
              currentLine.push({ type: 'text', value: parts[i] })
            }
            if (i < parts.length - 1) {
              currentLine = []
              lines.push(currentLine)
            }
          }
        } else {
          currentLine.push(child)
        }
      }

      const newChildren: UnistNode[] = []
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li]
        if (line.length === 0) continue

        let firstTextIndex = -1
        for (let i = 0; i < line.length; i++) {
          if (line[i].type === 'text') {
            if (line[i].value !== '') {
              firstTextIndex = i
              break
            }
          } else {
            break
          }
        }

        let isSubtext = false
        if (firstTextIndex !== -1) {
          const val = line[firstTextIndex].value
          if (val && isSubtextLine(val)) {
            isSubtext = true
            line[firstTextIndex].value = stripSubtextPrefix(val)
          }
        }

        if (isSubtext) {
          const filteredLine = line.filter((n) => !(n.type === 'text' && n.value === ''))
          if (filteredLine.length > 0) {
            newChildren.push({
              type: 'mdxJsxTextElement',
              name: 'span',
              attributes: [{ type: 'mdxJsxAttribute', name: 'data-subtext', value: 'true' }],
              children: filteredLine,
              data: { _isGenerated: true },
            })
          }
        } else {
          newChildren.push(...line)
        }

        if (li < lines.length - 1) {
          newChildren.push({ type: 'text', value: '\n' })
        }
      }
      node.children = newChildren
    })
  }
}

export default remarkMdDiscordSyntax
