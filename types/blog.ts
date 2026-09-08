export interface KeyTakeaway {
  takeaway: string;
  _heading?: string;
}

export interface Article {
  id: string;
  slug: string;
  language_code: string;
  language_name?: string | null;
  title: string;
  content: string;
  cover_image?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  secondary_keywords?: string[] | null;
  key_takeaways?: KeyTakeaway[] | null;
  word_count?: number | null;
  reading_time_minutes?: number | null;
  internal_link_slugs?: string[] | null;
  website_domain?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  status: "published" | "draft";
  created_at: string;
  updated_at: string;
}
