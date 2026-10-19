/** Provider contract; no credentials or arbitrary URL fields are accepted from UI. */
export type Localized = { en: string; ar: string };
export type Image = { url: string; alt: Localized; width: number; height: number };
export type MediaSource = {
  id: string; url: string; format: 'mp4' | 'hls' | 'dash';
  mime: string; license: string; demo: boolean;
  live?: boolean; hdr?: 'HDR10' | 'HDR10+' | 'HLG'; width?: number; height?: number;
};
export type Episode = { id: string; number: number; title: Localized; duration: number; source: MediaSource };
export type Season = { id: string; number: number; episodes: Episode[] };
export type Title = {
  id: string; kind: 'movie' | 'series' | 'anime'; title: Localized;
  description: Localized; year: number; rating: string; genres: Localized;
  artwork: Image; tags: ('trending' | 'popular' | 'recent')[];
  source?: MediaSource; seasons?: Season[]; demo: boolean;
};
export interface Provider {
  readonly id: string;
  readonly enabled: boolean;
  list(): Promise<Title[]>;
  details(id: string): Promise<Title>;
  search(query: string, language: 'en' | 'ar'): Promise<Title[]>;
  recommendations(id: string): Promise<Title[]>;
  resolve(titleId: string, episodeId?: string): Promise<MediaSource>;
}
export type Progress = { titleId: string; episodeId?: string; position: number; duration: number; updated: number; completed: boolean };
export type Settings = { language: 'en' | 'ar'; autoplay: boolean; aspect: 'fit' | 'fill' };
