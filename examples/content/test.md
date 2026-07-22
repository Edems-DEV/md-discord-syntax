# Discord Syntax Test Suite (`test.md`)

This note contains edge cases for testing **Discord Syntax** rendering across Obsidian, Next.js / MDX, and future Quartz setups.

---

## 1. Spoiler Syntax (`||spoiler text||`)

### 1.1 Basic Spoilers
- Standard inline spoiler: ||This is a secret spoiler||.
- Multiple spoilers on one line: First ||secret 1|| and second ||secret 2||.
- Adjacent spoilers: ||First secret||||Second secret||.

### 1.2 Spoilers with Nested Formatting
- Bold inside spoiler: ||This is **bold secret** text||.
- Italic inside spoiler: ||This is *italic secret* text||.
- Inline code inside spoiler: ||Code `const x = 42;` inside spoiler||.
- Complex mixed formatting: ||**Bold**, *Italics*, ~~Strikethrough~~, and `code` inside||.

### 1.3 Delimiters inside Code (Should NOT render as spoiler)
- Fenced code block:
```ts
const isOk = val1 || val2;
if (a || b) {
  console.log("||Not a spoiler||");
}
```
- Inline code with `||`: Use `a || b` or `||code||` safely.

### 1.4 Structural Containers & Edge Cases
- Spoiler in list item:
  - Item 1: ||Secret list item payload||
  - Item 2: Regular item with ||hidden|| text.
- Spoiler inside blockquote:
  > ||Top secret classified line||
- Unmatched delimiter edge case (should remain raw text):
  This line has || an incomplete spoiler marker.

---

## 2. Subtext Syntax (`-# subtext`)

### 2.1 Basic Subtext Lines
-# This is a single subtext line (small & muted font).
-# Second subtext line right after the first.

### 2.2 Subtext with Formatting & Spoilers
-# Subtext containing **bold text**, *italic text*, and a ||spoiler inside subtext||.

### 2.3 Paragraph & Line Start Behavior
Normal paragraph line 1.
-# Subtext on physical line 2 of paragraph.
Normal paragraph line 3.

### 2.4 Distinguishing Subtext from Headings & Non-subtext
# Heading 1 (Not subtext)
## Heading 2 (Not subtext)
-# This IS subtext (starts with "-# ")
-#not-subtext (No space after dash-hash, should render normally)

---

## 3. Combined Edge Cases
-# Subtext containing ||a secret spoiler|| and `code`.
> Quote containing:
> -# Subtext inside blockquote with ||spoiler||.
