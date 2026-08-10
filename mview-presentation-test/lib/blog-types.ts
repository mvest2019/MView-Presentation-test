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

/** A category and how many articles carry it, both derived from the API. */
export interface CategoryFacet {
  category: string;
  count: number;
}
