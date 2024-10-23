import path from 'node:path'
import type { ProcessorOptions } from '@mdx-js/mdx'
import { createProcessor } from '@mdx-js/mdx'
import { remarkMermaid } from '@theguild/remark-mermaid'
import { remarkNpm2Yarn } from '@theguild/remark-npm2yarn'
import type { Program } from 'estree'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeRaw from 'rehype-raw'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkReadingTime from 'remark-reading-time'
import remarkSmartypants from 'remark-smartypants'
import type { Pluggable, Plugin } from 'unified'
import type { FrontMatter, LoaderOptions, ReadingTime } from '../types'
import { CWD, MARKDOWN_URL_EXTENSION_RE } from './constants.js'
import {
  recmaRewriteFunctionBody,
  recmaRewriteJsx
} from './recma-plugins/index.js'
import {
  DEFAULT_REHYPE_PRETTY_CODE_OPTIONS,
  rehypeAttachCodeMeta,
  rehypeBetterReactMathjax,
  rehypeExtractTocContent,
  rehypeParseCodeMeta
} from './rehype-plugins/index.js'
import {
  remarkCustomHeadingId,
  remarkHeadings,
  remarkLinkRewrite,
  remarkMdxDisableExplicitJsx,
  remarkMdxFrontMatter,
  remarkMdxTitle,
  remarkRemoveImports,
  remarkStaticImage
} from './remark-plugins/index.js'
import { logger } from './utils.js'

type Processor = ReturnType<typeof createProcessor>

const cachedCompilerForFormat: Record<
  NonNullable<ProcessorOptions['format']>,
  Processor
> = Object.create(null)

type MdxOptions = LoaderOptions['mdxOptions'] &
  Pick<ProcessorOptions, 'jsx' | 'outputFormat'>

type CompileMdxOptions = Pick<
  LoaderOptions,
  | 'staticImage'
  | 'search'
  | 'defaultShowCopyCode'
  | 'readingTime'
  | 'latex'
  | 'codeHighlight'
> & {
  mdxOptions?: MdxOptions
  filePath?: string
  useCachedCompiler?: boolean
  isPageImport?: boolean
}

export async function compileMdx(
  source: string,
  {
    staticImage,
    search,
    readingTime,
    latex,
    codeHighlight,
    defaultShowCopyCode,
    mdxOptions = {},
    filePath = '',
    useCachedCompiler,
    isPageImport = true
  }: Partial<CompileMdxOptions> = {}
): Promise<{
  result: string
  title?: string
  readingTime?: ReadingTime
  frontMatter: FrontMatter
}> {
  const {
    jsx = false,
    format: _format = 'mdx',
    outputFormat = 'function-body',
    remarkPlugins,
    rehypePlugins,
    recmaPlugins,
    rehypePrettyCodeOptions
  } = mdxOptions

  const format =
    _format === 'detect' ? (filePath.endsWith('.mdx') ? 'mdx' : 'md') : _format

  const fileCompatible = filePath ? { value: source, path: filePath } : source

  // https://github.com/shuding/nextra/issues/1303
  const isFileOutsideCWD =
    !isPageImport && path.relative(CWD, filePath).startsWith('..')

  if (isFileOutsideCWD) {
    throw new Error(
      `Unexpected import of "${filePath}" that is outside of working directory, use symlinks instead`
    )
  }

  const isRemoteContent = outputFormat === 'function-body'

  const compiler =
    !useCachedCompiler || isRemoteContent
      ? createCompiler()
      : (cachedCompilerForFormat[format] ??= createCompiler())
  const processor = compiler()

  try {
    const vFile = await processor.process(fileCompatible)

    const data = vFile.data as {
      readingTime?: ReadingTime
      title?: string
      frontMatter: FrontMatter
    }

    const { readingTime, title, frontMatter } = data
    // https://github.com/shuding/nextra/issues/1032
    const result = String(vFile).replaceAll('__esModule', '_\\_esModule')

    if (typeof title !== 'string') {
      logger.error('`title` is not defined')
    }
    if (!frontMatter) {
      logger.error('`frontMatter` is not defined')
    }

    if (frontMatter.mdxOptions) {
      throw new Error('`frontMatter.mdxOptions` is no longer supported')
    }

    return {
      result,
      title,
      ...(readingTime && { readingTime }),
      frontMatter
    }
  } catch (error) {
    console.error(`[nextra] Error compiling ${filePath}.`)
    throw error
  }

  function createCompiler(): Processor {
    return createProcessor({
      jsx,
      format,
      outputFormat,
      providerImportSource: 'next-mdx-import-source-file',
      // Fix TypeError: _jsx is not a function for remote content
      development: process.env.NODE_ENV === 'development',
      remarkPlugins: [
        ...(remarkPlugins || []),
        remarkMermaid, // should be before remarkRemoveImports because contains `import { Mermaid } from ...`
        [
          remarkNpm2Yarn, // should be before remarkRemoveImports because contains `import { Tabs as $Tabs, Tab as $Tab } from ...`
          {
            packageName: 'nextra/components',
            tabNamesProp: 'items',
            storageKey: 'selectedPackageManager'
          }
        ] satisfies Pluggable,
        isRemoteContent && remarkRemoveImports,
        remarkFrontmatter, // parse and attach yaml node
        remarkMdxFrontMatter,
        remarkGfm,
        format !== 'md' &&
          ([
            remarkMdxDisableExplicitJsx,
            // Replace the <summary> and <details> with customized components
            { whiteList: ['details', 'summary'] }
          ] satisfies Pluggable),
        remarkCustomHeadingId,
        remarkMdxTitle,
        [remarkHeadings, { isRemoteContent }] satisfies Pluggable,
        staticImage && remarkStaticImage,
        readingTime && remarkReadingTime,
        latex && remarkMath,
        // Remove the markdown file extension from links
        [
          remarkLinkRewrite,
          {
            pattern: MARKDOWN_URL_EXTENSION_RE,
            replace: '',
            excludeExternalLinks: true
          }
        ] satisfies Pluggable,
        remarkSmartypants
      ].filter(v => !!v),
      rehypePlugins: [
        ...(rehypePlugins || []),
        format === 'md' && [
          // To render `<details>` and `<summary>` correctly
          rehypeRaw,
          // fix Error: Cannot compile `mdxjsEsm` node for npm2yarn and mermaid
          {
            passThrough: ['mdxjsEsm', 'mdxJsxFlowElement', 'mdxTextExpression']
          }
        ],
        [rehypeParseCodeMeta, { defaultShowCopyCode }],
        // Should be before `rehypePrettyCode`
        latex &&
          (typeof latex === 'object'
            ? latex.renderer === 'mathjax'
              ? [rehypeBetterReactMathjax, latex.options, isRemoteContent]
              : [rehypeKatex, latex.options]
            : rehypeKatex),
        ...(codeHighlight === false
          ? []
          : [
              [
                rehypePrettyCode,
                {
                  ...DEFAULT_REHYPE_PRETTY_CODE_OPTIONS,
                  ...rehypePrettyCodeOptions
                }
              ] as any,
              [rehypeAttachCodeMeta, { search }]
            ]),
        [rehypeExtractTocContent, { isRemoteContent }]
      ].filter(v => !!v),
      recmaPlugins: [
        ...(recmaPlugins || []),
        (() => (ast: Program, file) => {
          const mdxContentIndex = ast.body.findIndex(node => {
            if (node.type === 'ExportDefaultDeclaration') {
              return (node.declaration as any).id.name === 'MDXContent'
            }
            if (node.type === 'FunctionDeclaration') {
              return node.id.name === 'MDXContent'
            }
          })

          // Remove `MDXContent` since we use custom HOC_MDXContent
          let [mdxContent] = ast.body.splice(mdxContentIndex, 1) as any

          // In MDX3 MDXContent is directly exported as export default when `outputFormat: 'program'` is specified
          if (mdxContent.type === 'ExportDefaultDeclaration') {
            mdxContent = mdxContent.declaration
          }

          const mdxContentArgument = mdxContent.body.body[0].argument

          file.data.hasMdxLayout =
            !!mdxContentArgument &&
            mdxContentArgument.openingElement.name.name === 'MDXLayout'

          // const localExports = new Set(['title', 'metadata', 'useTOC'])
          //
          // for (const node of ast.body) {
          //   if (node.type === 'ExportNamedDeclaration') {
          //     let varName: string
          //     const { declaration } = node
          //     if (!declaration) {
          //       // skip for `export ... from '...'` declaration
          //       continue
          //     } else if (declaration.type === 'VariableDeclaration') {
          //       const [{ id }] = declaration.declarations
          //       varName = (id as any).name
          //     } else if (declaration.type === 'FunctionDeclaration') {
          //       varName = declaration.id.name
          //     } else {
          //       throw new Error(`\`${declaration.type}\` unsupported.`)
          //     }
          //
          //     if (localExports.has(varName)) {
          //       Object.assign(node, node.declaration)
          //     }
          //   }
          // }
        }) satisfies Plugin<[], Program>,
        isRemoteContent ? recmaRewriteFunctionBody : recmaRewriteJsx
      ].filter(v => !!v)
    })
  }
}
