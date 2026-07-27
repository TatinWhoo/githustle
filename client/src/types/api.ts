export interface ApiError {
  message: string;
  code?: string;
  requestId?: string;
  fields?: Record<string, string>;
}
