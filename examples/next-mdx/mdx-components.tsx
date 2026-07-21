import type { MDXComponents } from 'mdx/types'
import React from 'react'

function Spoiler({ children }: { children?: React.ReactNode }) {
  return (
    <span
      className="discord-spoiler"
      style={{
        backgroundColor: '#202225',
        color: '#202225',
        borderRadius: '3px',
        padding: '0 2px',
        cursor: 'pointer',
      }}
    >
      {children}
    </span>
  )
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Spoiler,
    span: (props: React.HTMLAttributes<HTMLSpanElement> & { 'data-subtext'?: string }) => {
      if (props['data-subtext'] === 'true') {
        return <span style={{ fontSize: '0.85em', color: '#888' }} {...props} />
      }
      return <span {...props} />
    },
    ...components,
  }
}
