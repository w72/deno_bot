export enum NewsItemType {
  text,
  image,
  video,
}

export interface NewsItem {
  type: NewsItemType;
  value: string;
}
