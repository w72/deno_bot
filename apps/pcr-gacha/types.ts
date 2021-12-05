export interface Pool {
  up_prob: number;
  s3_prob: number;
  s2_prob: number;
  up: number[];
  star3: number[];
  star2: number[];
  star1: number[];
}

export type Pools = Record<string, Pool>;

export type Names = Record<number, string[]>;

export interface Assets {
  ver: string;
  pools: string;
  names: string;
}
