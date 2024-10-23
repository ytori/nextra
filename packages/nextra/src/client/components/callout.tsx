import cn from 'clsx'
import type { FC, ReactElement, ReactNode } from 'react'
import { InformationCircleIcon } from '../icons/index.js'

const TypeToEmoji = {
  default: '💡',
  error: '🚫',
  info: <InformationCircleIcon height="20" className="_mt-1" />,
  warning: '⚠️'
}

type CalloutType = keyof typeof TypeToEmoji

const classes: Record<CalloutType, string> = {
  default: cn(
    '_border-orange-100 _bg-orange-50 _text-orange-800 dark:_border-orange-400/30 dark:_bg-orange-400/20 dark:_text-orange-300'
  ),
  error: cn(
    '_border-red-200 _bg-red-100 _text-red-900 dark:_border-red-200/30 dark:_bg-red-900/30 dark:_text-red-200'
  ),
  info: cn(
    '_border-blue-200 _bg-blue-100 _text-blue-900 dark:_border-blue-200/30 dark:_bg-blue-900/30 dark:_text-blue-200'
  ),
  warning: cn(
    '_border-yellow-100 _bg-yellow-50 _text-yellow-900 dark:_border-yellow-200/30 dark:_bg-yellow-700/30 dark:_text-yellow-200'
  )
}

type CalloutProps = {
  type?: CalloutType
  emoji?: string | ReactElement
  children: ReactNode
}

export const Callout: FC<CalloutProps> = ({
  children,
  type = 'default',
  emoji = TypeToEmoji[type]
}) => {
  return (
    <div
      className={cn(
        'nextra-callout _overflow-x-auto _mt-6 _flex _rounded-lg _border _py-2 _pe-4',
        'contrast-more:_border-current contrast-more:dark:_border-current',
        classes[type]
      )}
    >
      <div
        className="_select-none _text-xl _ps-3 _pe-2"
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
        }}
        data-pagefind-ignore="all"
      >
        {emoji}
      </div>
      <div className="_w-full _min-w-0 _leading-7">{children}</div>
    </div>
  )
}
