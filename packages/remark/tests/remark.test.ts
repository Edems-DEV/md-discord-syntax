import test from 'node:test'
import assert from 'node:assert'
import { remark } from 'remark'
import { remarkMdDiscordSyntax } from '../src/index.js'

interface TestNode {
  type: string
  name?: string
  value?: string
  children?: TestNode[]
  attributes?: Array<{ type: string; name: string; value: string }>
  data?: Record<string, unknown>
}

test('Remark Discord Syntax Plugin', async (t) => {
  const processor = remark().use(remarkMdDiscordSyntax)

  await t.test('transforms discord-style spoilers (plain)', async () => {
    const input = 'Here is a ||secret message||.'
    const tree = processor.parse(input)
    const newTree = (await processor.run(tree)) as unknown as TestNode

    const p = newTree.children![0]
    const spoiler = p.children![1]
    assert.strictEqual(spoiler.type, 'mdxJsxTextElement')
    assert.strictEqual(spoiler.name, 'Spoiler')
    assert.strictEqual(spoiler.children![0].value, 'secret message')
    assert.strictEqual(spoiler.data?._isGenerated, true)
  })

  await t.test('ignores delimiter text inside code', async () => {
    const input = 'Here is `||` some code `||secret||`.'
    const tree = processor.parse(input)
    const newTree = (await processor.run(tree)) as unknown as TestNode

    const p = newTree.children![0]
    assert.strictEqual(p.children!.length, 5)
    assert.strictEqual(p.children![1].type, 'inlineCode')
    assert.strictEqual(p.children![1].value, '||')
    assert.strictEqual(p.children![3].type, 'inlineCode')
    assert.strictEqual(p.children![3].value, '||secret||')
  })

  await t.test('handles multiple and unmatched spoilers', async () => {
    const input = '||one|| and ||two|| and unmatched || here.'
    const tree = processor.parse(input)
    const newTree = (await processor.run(tree)) as unknown as TestNode

    const p = newTree.children![0]
    assert.strictEqual(p.children![0].type, 'mdxJsxTextElement')
    assert.strictEqual(p.children![0].name, 'Spoiler')
    assert.strictEqual(p.children![2].type, 'mdxJsxTextElement')
    assert.strictEqual(p.children![2].name, 'Spoiler')
    assert.strictEqual(p.children![3].value, ' and unmatched || here.')
  })

  await t.test('transforms discord-style spoilers with nested formatting and inline code', async () => {
    const input = '|| hidden *italic*, `inline code`, **bold** ||'
    const tree = processor.parse(input)
    const newTree = (await processor.run(tree)) as unknown as TestNode

    const p = newTree.children![0]
    const spoiler = p.children![0]
    assert.strictEqual(spoiler.type, 'mdxJsxTextElement')
    assert.strictEqual(spoiler.name, 'Spoiler')
    assert.strictEqual(spoiler.children![0].value, ' hidden ')
    assert.strictEqual(spoiler.children![1].type, 'emphasis')
    assert.strictEqual(spoiler.children![3].type, 'inlineCode')
    assert.strictEqual(spoiler.children![3].value, 'inline code')
    assert.strictEqual(spoiler.children![5].type, 'strong')
  })

  await t.test('ignores fenced code blocks', async () => {
    const input = '```\nconst x = ||not a spoiler||;\n```'
    const tree = processor.parse(input)
    const newTree = (await processor.run(tree)) as unknown as TestNode

    const codeNode = newTree.children![0]
    assert.strictEqual(codeNode.type, 'code')
    assert.strictEqual(codeNode.value, 'const x = ||not a spoiler||;')
  })

  await t.test('transforms consecutive multiline Discord subtext lines', async () => {
    const input = '-# Subtext line 1\n-# Subtext line 2\n-# Subtext line 3'
    const tree = processor.parse(input)
    const newTree = (await processor.run(tree)) as unknown as TestNode

    const p = newTree.children![0]
    assert.strictEqual(p.type, 'paragraph')
    assert.strictEqual(p.children![0].name, 'span')
    assert.strictEqual(p.children![0].children![0].value, 'Subtext line 1')
    assert.strictEqual(p.children![1].value, '\n')
    assert.strictEqual(p.children![2].name, 'span')
    assert.strictEqual(p.children![2].children![0].value, 'Subtext line 2')
    assert.strictEqual(p.children![3].value, '\n')
    assert.strictEqual(p.children![4].name, 'span')
    assert.strictEqual(p.children![4].children![0].value, 'Subtext line 3')
  })

  await t.test('transforms Discord subtext at physical line starts', async () => {
    const input = '-# Subtext line 1\nNormal line\n-# Subtext line 2 with **bold**\n-#foo not subtext'
    const tree = processor.parse(input)
    const newTree = (await processor.run(tree)) as unknown as TestNode

    const p = newTree.children![0]
    assert.strictEqual(p.type, 'paragraph')
    const s1 = p.children![0]
    assert.strictEqual(s1.type, 'mdxJsxTextElement')
    assert.strictEqual(s1.name, 'span')
    assert.strictEqual(s1.data?._isGenerated, true)
    assert.strictEqual(s1.attributes?.find((a) => a.name === 'data-subtext')?.value, 'true')
    assert.strictEqual(s1.children![0].value, 'Subtext line 1')

    assert.strictEqual(p.children![1].value, '\n')
    assert.strictEqual(p.children![2].value, 'Normal line')
    assert.strictEqual(p.children![3].value, '\n')

    const s2 = p.children![4]
    assert.strictEqual(s2.type, 'mdxJsxTextElement')
    assert.strictEqual(s2.name, 'span')
    assert.strictEqual(s2.attributes?.find((a) => a.name === 'data-subtext')?.value, 'true')
    assert.strictEqual(s2.children![0].value, 'Subtext line 2 with ')
    assert.strictEqual(s2.children![1].type, 'strong')
    assert.strictEqual(s2.children![1].children![0].value, 'bold')

    assert.strictEqual(p.children![5].value, '\n')
    assert.strictEqual(p.children![6].value, '-#foo not subtext')
  })
})
