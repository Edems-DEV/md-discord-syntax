import createMDX from '@next/mdx'
import remarkMdDiscordSyntax from 'remark-md-discord-syntax'

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkMdDiscordSyntax],
    rehypePlugins: [],
  },
})

export default withMDX(nextConfig)
