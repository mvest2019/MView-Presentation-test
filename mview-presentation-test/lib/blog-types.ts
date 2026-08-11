/**
 * Shapes returned by the NewsFramework blog endpoints.
 *
 * Ported from the production repo (`Mview-Presentation-Next`):
 * `types/blogTypes.ts` (HomePageBlogsInterface) and `types/types.ts`
 * (BlogDetails / Details). Fields the list endpoint returns but those types
 * omitted — `type`, `organization`, `schemaDescription`, `updated_date` — are
 * included here because the listing needs `type` to tell Blog from News.
 */

/** One article as returned by `POST /NewsFramework/Blog_data`. */
export interface BlogListItem {
  _id: string;
  Category: string;
  Created_date: string;
  Created_by: string;
  /** Truncated HTML excerpt in the list response; full body in the details response. */
  blog: string;
  isActive: boolean;
  isPublished: boolean;
  blog_header_img: string;
  blog_title: string;
  search_key: number;
  metaDescription: string;
  metaTitle: string;
  /** Space-separated slug source — see `slugFromUrlTitle` in `blog-api.ts`. */
  urlTitle: string;
  type?: string;
  organization?: string;
  schemaDescription?: string;
  updated_date?: string;
}

/** `data` from `POST /NewsFramework/Blog_datadetails` on a hit. */
export interface BlogDetails {
  /** Spelling is the API's, not a typo on our side. */
  realetedArray: BlogListItem[];
  details: BlogListItem;
  TableOfContents: string[];
}

/**
 * The `type` discriminator the API stores on every article. These two strings
 * are the complete set the endpoint recognises — confirmed against the live
 * corpus, where `type: "News"` returns zero records and these two account for
 * all 129. They are API enum values, not content.
 */
export const BLOG_TYPES = {
  blog: "Blog",
  news: "Oil & Gas News",
} as const;

export type BlogMode = keyof typeof BLOG_TYPES;

export function isBlogMode(value: string | undefined): value is BlogMode {
  return value === "blog" || value === "news";
}

/**
 * The API `type` string mapped back to our mode key. Anything unrecognised —
 * including a record with no `type` at all — is treated as Blog, so a stray
 * value costs an article its News tab rather than making it unreachable.
 */
export function modeFromApiType(type: string | undefined): BlogMode {
  return type === BLOG_TYPES.news ? "news" : "blog";
}

/**
 * Blog and News are separate sections with their own routes and tabs.
 *
 * The prototype puts both behind one `#/blog` route with an in-page view
 * switch. Splitting them gives each its own URL, its own tab in the library row
 * and its own metadata, at the cost of the design's combined "Blog & News" tab
 * and its shared standfirst.
 *
 * Headings and ledes are the live site's own copy, supplied by Ryan — not the
 * prototype's and not written here. Change them only against that source.
 */
export const SECTIONS = {
  blog: {
    path: "/blog",
    tab: "Blog",
    kicker: "Blog",
    heading: "Blogs",
    lede: "Get the latest updates, tips, and insights on mineral rights, oil, and gas.",
    searchLabel: "Search articles",
    searchPlaceholder: "Search articles… (title or topic)",
    noun: { one: "article", many: "articles" },
    backLabel: "← Blogs",
  },
  news: {
    path: "/news",
    tab: "News",
    kicker: "News",
    heading: "Oil & Gas Industry News",
    lede: "Get real-time updates and insights on the oil and gas sector & mineral rights.",
    searchLabel: "Search news",
    searchPlaceholder: "Search news… (headline or topic)",
    noun: { one: "story", many: "stories" },
    backLabel: "← News",
  },
} as const satisfies Record<BlogMode, unknown>;

/** The listing path an article belongs to, from its API `type`. */
export function sectionPath(type: string | undefined): string {
  return SECTIONS[modeFromApiType(type)].path;
}

/** A category and how many articles carry it, both derived from the API. */
export interface CategoryFacet {
  category: string;
  count: number;
}
