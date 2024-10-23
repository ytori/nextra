'use client'

import {
  MenuItem as _MenuItem,
  Menu,
  MenuButton,
  MenuItems
} from '@headlessui/react'
import cn from 'clsx'
import { Button } from 'nextra/components'
import { useFSRoute } from 'nextra/hooks'
import { ArrowRightIcon, MenuIcon } from 'nextra/icons'
import type { MenuItem } from 'nextra/normalize-pages'
import type { FC, ReactNode } from 'react'
import { setMenu, useConfig, useMenu, useThemeConfig } from '../../stores'
import { Anchor } from '../anchor'

const classes = {
  link: cn(
    '_text-sm contrast-more:_text-gray-700 contrast-more:dark:_text-gray-100 max-md:_hidden _whitespace-nowrap _ring-inset'
  ),
  inactive: cn(
    '_text-gray-600 hover:_text-gray-800 dark:_text-gray-400 dark:hover:_text-gray-200'
  )
}

const NavbarMenu: FC<{
  menu: MenuItem
  children: ReactNode
}> = ({ menu, children }) => {
  const routes = Object.fromEntries(
    (menu.children || []).map(route => [route.name, route])
  )
  return (
    <Menu>
      <MenuButton
        className={({ focus }) =>
          cn(
            classes.link,
            classes.inactive,
            '_items-center _flex _gap-1.5',
            focus && 'nextra-focus'
          )
        }
      >
        {children}
        <ArrowRightIcon
          height="14"
          className="*:_origin-center *:_transition-transform *:_rotate-90"
        />
      </MenuButton>
      <MenuItems
        transition
        className={({ open }) =>
          cn(
            'focus-visible:nextra-focus',
            open ? '_opacity-100' : '_opacity-0',
            'nextra-scrollbar _transition-opacity motion-reduce:_transition-none',
            '_border _border-black/5 dark:_border-white/20',
            '_backdrop-blur-md _bg-[rgba(var(--nextra-bg),.7)]',
            '_z-20 _rounded-md _py-1 _text-sm _shadow-lg',
            // headlessui adds max-height as style, use !important to override
            '!_max-h-[min(calc(100vh-5rem),256px)]'
          )
        }
        anchor={{ to: 'top end', gap: 10, padding: 16 }}
      >
        {Object.entries(menu.items || {}).map(([key, item]) => (
          <_MenuItem
            key={key}
            as={Anchor}
            href={item.href || routes[key]?.route}
            className={({ focus }) =>
              cn(
                '_block _py-1.5 _transition-colors _ps-3 _pe-9',
                focus
                  ? '_text-gray-900 dark:_text-gray-100'
                  : '_text-gray-600 dark:_text-gray-400'
              )
            }
            newWindow={item.newWindow}
          >
            {item.title}
          </_MenuItem>
        ))}
      </MenuItems>
    </Menu>
  )
}

const isMenu = (page: any): page is MenuItem => page.type === 'menu'

export const ClientNavbar: FC<{
  children: ReactNode
}> = ({ children }) => {
  const items = useConfig().normalizePagesResult.topLevelNavbarItems
  const themeConfig = useThemeConfig()

  const activeRoute = useFSRoute()
  const menu = useMenu()

  return (
    <>
      <div className="_flex _gap-4 _overflow-x-auto nextra-scrollbar _py-1.5">
        {items.map(page => {
          if (page.display === 'hidden') return
          if (isMenu(page)) {
            return (
              <NavbarMenu key={page.title} menu={page}>
                {page.title}
              </NavbarMenu>
            )
          }
          let href = page.href || page.route || '#'

          // If it's a directory
          if (page.children) {
            href =
              ('frontMatter' in page ? page.route : page.firstChildRoute) ||
              href
          }

          const isActive =
            page.route === activeRoute ||
            activeRoute.startsWith(page.route + '/')

          return (
            <Anchor
              href={href}
              key={href}
              className={cn(
                classes.link,
                !isActive || page.newWindow
                  ? classes.inactive
                  : '_font-medium _subpixel-antialiased'
              )}
              newWindow={page.newWindow}
              aria-current={!page.newWindow && isActive}
            >
              {page.title}
            </Anchor>
          )
        })}
      </div>
      {themeConfig.search && (
        <div className="max-md:_hidden">{themeConfig.search}</div>
      )}

      {children}

      <Button
        aria-label="Menu"
        className={({ active }) =>
          cn(
            'nextra-hamburger _rounded md:_hidden',
            active && '_bg-gray-400/20'
          )
        }
        onClick={() => setMenu(prev => !prev)}
      >
        <MenuIcon height="24" className={cn({ open: menu })} />
      </Button>
    </>
  )
}
