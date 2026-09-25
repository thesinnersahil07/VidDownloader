export type LoadingStage = 
  | 'Fetching page'
  | 'Inspecting player'
  | 'Finding media'
  | 'Validating stream'
  | 'Preparing result';

export interface PageInfo {
  url: string;
  title: string;
  domain: string;
}

export interface MediaSource {
  type: 'hls' | 'mp4' | 'webm';
  url: string;
  quality: string;
  verified: boolean;
  variants?: HlsVariant[];
}

export interface HlsVariant {
  url: string;
  resolution?: string;
  bandwidth?: number;
  codecs?: string;
  frameRate?: number;
  label?: string;
}

export interface ExtractionResult {
  page: PageInfo;
  media: MediaSource[];
}

export interface ExtractionError {
  code: string;
  message: string;
}

export interface ApiResponse {
  success: boolean;
  data?: ExtractionResult;
  error?: ExtractionError;
}
