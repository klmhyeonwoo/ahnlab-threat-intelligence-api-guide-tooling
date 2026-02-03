import DOMPurify from "isomorphic-dompurify"

const ALLOWED_TAGS = [
  "a",
  "b",
  "br",
  "code",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "p",
  "pre",
  "s",
  "section",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]

const ALLOWED_ATTR = ["class", "colspan", "href", "id", "language", "rel", "rowspan", "target"]

export const sanitizeHtml = (value: string) =>
  DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  })
