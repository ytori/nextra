import type { z } from 'zod'
import type {
  displaySchema,
  menuItemSchema,
  pageThemeSchema
} from '../server/schemas'
import type { Folder, FrontMatter, MdxFile, PageMapItem } from '../types'

const DEFAULT_PAGE_THEME: PageTheme = {
  breadcrumb: true,
  collapsed: false,
  footer: true,
  layout: 'default',
  navbar: true,
  pagination: true,
  sidebar: true,
  timestamp: true,
  toc: true,
  typesetting: 'default'
}

export type PageTheme = z.infer<typeof pageThemeSchema>

type Display = z.infer<typeof displaySchema>
type IMenuItem = z.infer<typeof menuItemSchema>
type MetaType = Record<string, any>

function extendMeta(
  _meta: MetaType = {},
  fallback: MetaType,
  metadata: MetaType = {}
): MetaType {
  const theme: PageTheme = {
    ...fallback.theme,
    ..._meta.theme,
    ...metadata.theme
  }
  return {
    ...fallback,
    ..._meta,
    display: metadata.display || _meta.display || fallback.display,
    theme
  }
}

type FolderWithoutChildren = Omit<Folder, 'children'>

export type Item = (MdxFile | FolderWithoutChildren) & {
  title: string
  type: string
  children: Item[]
  display?: Display
  theme?: PageTheme
  isUnderCurrentDocsTree?: boolean
}

export type PageItem = (MdxFile | FolderWithoutChildren) & {
  title: string
  type: string
  href?: string
  newWindow?: boolean
  children?: PageItem[]
  firstChildRoute?: string
  display?: Display
  isUnderCurrentDocsTree?: boolean
}

export type MenuItem = (MdxFile | FolderWithoutChildren) &
  IMenuItem & {
    children?: PageItem[]
  }

type DocsItem = (MdxFile | FolderWithoutChildren) & {
  title: string
  type: string
  children: DocsItem[]
  firstChildRoute?: string
  isUnderCurrentDocsTree?: boolean
}

function findFirstRoute(items: DocsItem[]): string | undefined {
  for (const item of items) {
    if (item.route) return item.route
    if (item.children) {
      const route = findFirstRoute(item.children)
      if (route) return route
    }
  }
}

type NormalizedResult = {
  activeType?: string
  activeIndex: number
  activeThemeContext: PageTheme
  activePath: Item[]
  directories: Item[]
  docsDirectories: DocsItem[]
  flatDocsDirectories: DocsItem[]
  topLevelNavbarItems: (PageItem | MenuItem)[]
}

export function normalizePages({
  list,
  route,
  docsRoot = '',
  underCurrentDocsRoot = false,
  pageThemeContext = DEFAULT_PAGE_THEME
}: {
  list: PageMapItem[]
  route: string
  docsRoot?: string
  underCurrentDocsRoot?: boolean
  pageThemeContext?: PageTheme
}): NormalizedResult {
  // All directories
  // - directories: all directories in the tree structure
  const directories: Item[] = []

  // Docs directories
  const docsDirectories: DocsItem[] = []
  const flatDocsDirectories: DocsItem[] = []

  // Page directories
  const topLevelNavbarItems: (PageItem | MenuItem)[] = []

  const meta = 'data' in list[0] ? (list[0].data as MetaType) : {}
  // Normalize items based on files and _meta.json.
  const items = ('data' in list[0] ? list.slice(1) : list) as (
    | (Folder & { frontMatter?: FrontMatter })
    | MdxFile
  )[]

  const fallbackMeta = meta['*'] || {}

  let activeType: string = fallbackMeta.type
  let activeIndex = 0
  let activeThemeContext = {
    ...pageThemeContext,
    ...fallbackMeta.theme
  }
  let activePath: Item[] = []

  for (const currentItem of items) {
    // Get the item's meta information.
    const extendedMeta = extendMeta(
      meta[currentItem.name],
      fallbackMeta,
      currentItem.frontMatter
    )
    const { display, type = 'doc' } = extendedMeta
    const extendedPageThemeContext = {
      ...pageThemeContext,
      ...extendedMeta.theme
    }

    // If the doc is under the active page root.
    const isCurrentDocsTree = route.startsWith(docsRoot)

    const normalizedChildren: false | NormalizedResult =
      'children' in currentItem &&
      normalizePages({
        list: currentItem.children,
        route,
        docsRoot:
          type === 'page' || type === 'menu' ? currentItem.route : docsRoot,
        underCurrentDocsRoot: underCurrentDocsRoot || isCurrentDocsTree,
        pageThemeContext: extendedPageThemeContext
      })

    const title =
      extendedMeta.title ||
      (type !== 'separator' &&
        (currentItem.frontMatter?.sidebarTitle ||
          currentItem.frontMatter?.title ||
          currentItem.name))

    const getItem = (): Item => ({
      ...currentItem,
      type,
      ...(title && { title }),
      ...(display && { display }),
      ...(normalizedChildren && { children: [] })
    })
    const item: Item = getItem()
    const docsItem: DocsItem = getItem()
    const pageItem: PageItem = getItem()

    docsItem.isUnderCurrentDocsTree = isCurrentDocsTree
    if (type === 'separator') {
      item.isUnderCurrentDocsTree = isCurrentDocsTree
    }

    // This item is currently active, we collect the active path etc.
    if (currentItem.route === route) {
      activePath = [item]
      activeType = type
      // There can be multiple matches.
      activeThemeContext = {
        ...activeThemeContext,
        ...extendedPageThemeContext
      }
      switch (type) {
        case 'page':
        case 'menu':
          // Active on the navbar
          activeIndex = topLevelNavbarItems.length
          break
        case 'doc':
          // Active in the docs tree
          activeIndex = flatDocsDirectories.length
      }
    }
    const isHidden = display === 'hidden'

    // If this item has children
    if (normalizedChildren) {
      // If the active item is in its children
      if (
        normalizedChildren.activeIndex !== undefined &&
        normalizedChildren.activeType !== undefined
      ) {
        activeThemeContext = normalizedChildren.activeThemeContext
        activeType = normalizedChildren.activeType
        if (isHidden) {
          continue
        }
        activePath = [
          item,
          // Do not include folder which shows only his children
          ...normalizedChildren.activePath.filter(
            item => item.display !== 'children'
          )
        ]

        switch (activeType) {
          case 'page':
          case 'menu':
            activeIndex =
              topLevelNavbarItems.length + normalizedChildren.activeIndex
            break
          case 'doc':
            activeIndex =
              flatDocsDirectories.length + normalizedChildren.activeIndex
            break
        }
        if ('frontMatter' in currentItem && type === 'doc') {
          activeIndex++
        }
      }

      switch (type) {
        case 'page':
        case 'menu':
          // @ts-expect-error normalizedChildren === true
          pageItem.children.push(...normalizedChildren.directories)
          docsDirectories.push(...normalizedChildren.docsDirectories)

          // If it's a page with children inside, we inject itself as a page too.
          if (normalizedChildren.flatDocsDirectories.length) {
            const route = findFirstRoute(normalizedChildren.flatDocsDirectories)
            if (route) pageItem.firstChildRoute = route
            topLevelNavbarItems.push(pageItem)
          } else if ('frontMatter' in pageItem) {
            topLevelNavbarItems.push(pageItem)
          }

          break
        case 'doc':
          docsItem.children.push(...normalizedChildren.docsDirectories)
          // Itself is a doc page.
          if ('frontMatter' in item && display !== 'children') {
            flatDocsDirectories.push(docsItem)
          }
      }

      flatDocsDirectories.push(...normalizedChildren.flatDocsDirectories)
      item.children.push(...normalizedChildren.directories)
    } else {
      if (isHidden) {
        continue
      }
      switch (type) {
        case 'page':
        case 'menu':
          topLevelNavbarItems.push(pageItem)
          break
        case 'doc': {
          const withHrefProp = 'href' in item
          // Do not include links with href in pagination
          if (!withHrefProp) {
            flatDocsDirectories.push(docsItem)
          }
        }
      }
    }

    if (isHidden) {
      continue
    }

    if (type === 'doc' && display === 'children') {
      // Hide the directory itself and treat all its children as pages
      if (docsItem.children) {
        directories.push(...docsItem.children)
        docsDirectories.push(...docsItem.children)
      }
    } else {
      directories.push(item)
    }

    switch (type) {
      case 'page':
      case 'menu':
        // @ts-expect-error -- fixme
        docsDirectories.push(pageItem)
        break
      case 'doc':
        if (display !== 'children') {
          docsDirectories.push(docsItem)
        }
        break
      case 'separator':
        docsDirectories.push(item)
    }
  }
  const result = {
    activeType,
    activeIndex,
    activeThemeContext,
    activePath,
    directories,
    docsDirectories,
    flatDocsDirectories,
    topLevelNavbarItems
  }

  return result
}
