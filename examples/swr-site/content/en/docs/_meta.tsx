import { SwrIcon } from '@app/_icons'
import type { FC, ReactNode } from 'react'

export const Separator: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="flex items-center gap-2">
      <SwrIcon height="6" className="shrink-0" />
      {children}
    </div>
  )
}

export default {
  '--- hey': {
    title: <Separator>Getting Started</Separator>,
    type: 'separator'
  },
  'getting-started': '',
  options: '',
  'global-configuration': '',
  'data-fetching': '',
  'error-handling': {
    display: 'hidden'
  },
  revalidation: 'Auto Revalidation',
  'conditional-fetching': 'Conditional Data Fetching',
  arguments: '',
  mutation: '',
  pagination: '',
  '--- my_new_separator': {
    title: <Separator>Advanced</Separator>,
    type: 'separator'
  },
  prefetching: '',
  'with-nextjs': 'Next.js SSG and SSR',
  typescript: 'TypeScript :)',
  suspense: '',
  middleware: '',
  advanced: '',
  'change-log': {
    theme: {
      sidebar: false
    }
  },
  github_link: {
    title: 'GitHub 🐙',
    href: 'https://github.com/shuding/nextra',
    newWindow: true
  },
  'wrap-toc-items': 'Wrap Table of Content Items',
  'custom-header-ids': 'Custom Header IDs',
  '404-500': '404/500 Custom Error Pages'
}
