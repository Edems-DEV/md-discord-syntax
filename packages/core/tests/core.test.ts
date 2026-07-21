import test from 'node:test'
import assert from 'node:assert'
import {
  findSpoilerRanges,
  findCodeRanges,
  isPosInCode,
  isSubtextLine,
  stripSubtextPrefix,
  hasSubtextMarker,
} from '../src/index.js'

test('Core Spoiler & Subtext Syntax Rules', async (t) => {
  await t.test('detects basic spoiler range', () => {
    const text = 'Hello ||secret|| world'
    const spoilers = findSpoilerRanges(text)
    assert.strictEqual(spoilers.length, 1)
    assert.strictEqual(spoilers[0].from, 6)
    assert.strictEqual(spoilers[0].to, 16)
    assert.strictEqual(spoilers[0].contentFrom, 8)
    assert.strictEqual(spoilers[0].contentTo, 14)
  })

  await t.test('excludes inline code delimiters', () => {
    const text = 'Here is `||` code and ||real spoiler||'
    const spoilers = findSpoilerRanges(text)
    assert.strictEqual(spoilers.length, 1)
    assert.strictEqual(spoilers[0].from, 22)
    assert.strictEqual(spoilers[0].to, 38)
  })

  await t.test('excludes fenced code blocks', () => {
    const text = '```ts\nconst x = ||not a spoiler||;\n```\n||actual spoiler||'
    const spoilers = findSpoilerRanges(text)
    assert.strictEqual(spoilers.length, 1)
    assert.strictEqual(text.slice(spoilers[0].from, spoilers[0].to), '||actual spoiler||')
  })

  await t.test('ignores unclosed delimiters and empty spoilers', () => {
    assert.strictEqual(findSpoilerRanges('||unclosed text').length, 0)
    assert.strictEqual(findSpoilerRanges('||||').length, 0)
  })

  await t.test('detects spoiler containing inline code', () => {
    const text = 'Here is ||secret `inline code` message||.'
    const spoilers = findSpoilerRanges(text)
    assert.strictEqual(spoilers.length, 1)
    assert.strictEqual(text.slice(spoilers[0].from, spoilers[0].to), '||secret `inline code` message||')
  })

  await t.test('subtext detection and prefix stripping', () => {
    assert.strictEqual(isSubtextLine('-# Subtext line'), true)
    assert.strictEqual(isSubtextLine('-#not subtext'), false)
    assert.strictEqual(isSubtextLine(' -# leading space not subtext'), false)
    assert.strictEqual(isSubtextLine('Normal text'), false)

    assert.strictEqual(stripSubtextPrefix('-# Hello'), 'Hello')
    assert.strictEqual(stripSubtextPrefix('Normal text'), 'Normal text')

    assert.strictEqual(hasSubtextMarker('First line\n-# Second line'), true)
    assert.strictEqual(hasSubtextMarker('First line\n-# Line 2\n-# Line 3'), true)
    assert.strictEqual(hasSubtextMarker('First line\nSecond line'), false)
  })
})
