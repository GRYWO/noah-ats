import DOMPurify from "isomorphic-dompurify";

const MAIL_CONFIG = {
  ALLOWED_TAGS: [
    "p", "div", "span", "br", "hr",
    "strong", "b", "em", "i", "u", "s",
    "a",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tr", "td", "th",
    "img",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel", "title",
    "src", "alt", "width", "height",
    "style",
    "colspan", "rowspan", "align", "valign",
    "cellpadding", "cellspacing", "border", "role",
    "data-handtekening", "data-noah-sig",
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "link", "meta", "base"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

export function saneerMailHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, MAIL_CONFIG);
}

export function bevatHtmlTags(s: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(s);
}
