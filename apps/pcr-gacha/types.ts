import { Image } from "canvas";

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

export interface DataPaths {
  ver: string;
  pools: string;
  names: string;
}

export interface Character {
  id: number;
  star: number;
  name: string;
  avatar: string;
}

export interface Props {
  pool: string;
}

export interface State {
  ver: string;
  assets: Record<string, Image>;
  pool: Pool;
  names: Names;
  dataPaths: DataPaths;
}

export interface Dimension {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}
