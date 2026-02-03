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
  "body",
  "head",
  "html",
  "meta",
  "section",
  "title",
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

const ALLOWED_ATTR = [
  "charset",
  "class",
  "colspan",
  "content",
  "href",
  "http-equiv",
  "id",
  "language",
  "name",
  "rel",
  "rowspan",
]
const FORBID_TAGS = ["script", "style", "iframe", "object", "embed", "link"]
const FORBID_ATTR = [
  "style",
  "onblur",
  "onchange",
  "onclick",
  "onerror",
  "onfocus",
  "oninput",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onmouseenter",
  "onmouseleave",
  "onmouseover",
]

/**
 * Sanitizes user-authored HTML before rendering in the editor/preview.
 * We allow only the subset of tags/attributes needed by the guide template
 * and explicitly forbid script-related tags and event handler attributes.
 * SAFE_FOR_TEMPLATES is disabled to avoid template injection patterns.
 */
export const sanitizeHtml = (value: string) =>
  DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS,
    FORBID_ATTR,
    SAFE_FOR_TEMPLATES: false,
  })
