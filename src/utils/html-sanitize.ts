import sanitizeHtml from "sanitize-html";

const TAGS = [
  "p", "div", "span", "br", "hr",
  "strong", "b", "em", "i", "u", "s",
  "a",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tr", "td", "th",
  "img",
];

const ATTRS_PER_TAG: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "name", "target", "rel", "title", "style"],
  img: ["src", "alt", "title", "width", "height", "style"],
  table: ["cellpadding", "cellspacing", "border", "role", "style", "width", "align"],
  tr: ["style", "align", "valign"],
  td: ["style", "align", "valign", "colspan", "rowspan", "width", "height"],
  th: ["style", "align", "valign", "colspan", "rowspan", "width", "height"],
  div: ["style", "data-handtekening", "data-noah-sig", "align"],
  span: ["style"],
  p: ["style", "align"],
  ul: ["style"],
  ol: ["style"],
  li: ["style"],
  blockquote: ["style"],
  pre: ["style"],
  code: ["style"],
  h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], h5: ["style"], h6: ["style"],
  strong: ["style"], b: ["style"], em: ["style"], i: ["style"], u: ["style"], s: ["style"],
  hr: ["style"],
};

const OPTIES: sanitizeHtml.IOptions = {
  allowedTags: TAGS,
  allowedAttributes: ATTRS_PER_TAG,
  allowedSchemes: ["http", "https", "mailto", "tel", "cid"],
  allowedSchemesByTag: { img: ["http", "https", "data", "cid"] },
  allowProtocolRelative: true,
  allowedStyles: {
    "*": {
      color: [/.*/],
      "background": [/.*/],
      "background-color": [/.*/],
      "background-image": [/.*/],
      "border": [/.*/],
      "border-collapse": [/.*/],
      "border-color": [/.*/],
      "border-radius": [/.*/],
      "border-right": [/.*/],
      "border-left": [/.*/],
      "border-top": [/.*/],
      "border-bottom": [/.*/],
      "box-shadow": [/.*/],
      "display": [/.*/],
      "font-family": [/.*/],
      "font-size": [/.*/],
      "font-weight": [/.*/],
      "font-style": [/.*/],
      "letter-spacing": [/.*/],
      "line-height": [/.*/],
      "margin": [/.*/],
      "margin-top": [/.*/],
      "margin-bottom": [/.*/],
      "margin-left": [/.*/],
      "margin-right": [/.*/],
      "padding": [/.*/],
      "padding-top": [/.*/],
      "padding-bottom": [/.*/],
      "padding-left": [/.*/],
      "padding-right": [/.*/],
      "text-align": [/.*/],
      "text-decoration": [/.*/],
      "text-transform": [/.*/],
      "vertical-align": [/.*/],
      "width": [/.*/],
      "max-width": [/.*/],
      "min-width": [/.*/],
      "height": [/.*/],
      "max-height": [/.*/],
      "min-height": [/.*/],
      "overflow": [/.*/],
    },
  },
  disallowedTagsMode: "discard",
};

export function saneerMailHtml(html: string): string {
  if (!html) return "";
  try {
    return sanitizeHtml(html, OPTIES);
  } catch {
    return "";
  }
}

export function bevatHtmlTags(s: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(s);
}
