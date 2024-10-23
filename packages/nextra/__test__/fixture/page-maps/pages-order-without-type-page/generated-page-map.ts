// @ts-nocheck
import { normalizePageMap } from 'nextra/page-map'
import meta from "./_meta.ts";
import docs_meta from "./docs/_meta.ts";
import {metadata as docs_bar} from "./docs/bar.md";
import {metadata as foo} from "./foo.md";
const _pageMap = [{
  data: meta
}, {
  name: "docs",
  route: "/docs",
  children: [{
    data: docs_meta
  }, {
    name: "bar",
    route: "/docs/bar",
    frontMatter: docs_bar
  }]
}, {
  name: "foo",
  route: "/foo",
  frontMatter: foo
}];

export const pageMap = normalizePageMap(_pageMap)

export const RouteToFilepath = {
  "docs/bar": "docs/bar.md",
  "foo": "foo.md"
}
