import { Pools, Names, DataPaths } from "./types.ts";

export const urls = {
  ver: "https://api.redive.lolikon.icu/gacha/gacha_ver.json",
  pools: "https://api.redive.lolikon.icu/gacha/default_gacha.json",
  names: "https://api.redive.lolikon.icu/gacha/unitdata.py",
};

export function parseNames(text: string): Names {
  const matches = text.matchAll(/^\s{4}(\d+):\[(.+)\]/gm);
  const res: Names = {};
  for (const [, id, namesText] of matches) {
    const names = namesText.replaceAll("'", "").replaceAll(" ", "").split(",");
    res[id] = names;
  }
  return res;
}

export async function ensurePcrFiles(paths: DataPaths): Promise<{
  ver: string;
  pools: Pools;
  names: Names;
}> {
  let verText = "";
  try {
    verText = await Deno.readTextFile(paths.ver);
  } catch {
    verText = await fetch(urls.ver).then((r) => r.text());
    await Deno.writeTextFile(paths.ver, verText);
  }
  const ver = JSON.parse(verText).ver;

  let poolsText = "";
  try {
    poolsText = await Deno.readTextFile(paths.pools);
  } catch {
    poolsText = await fetch(urls.pools).then((r) => r.text());
    await Deno.writeTextFile(paths.pools, poolsText);
  }
  const pools = JSON.parse(poolsText);

  let namesText = "";
  try {
    namesText = await Deno.readTextFile(paths.names);
  } catch {
    const resPyText = await fetch(urls.names).then((r) => r.text());
    const namesJson = parseNames(resPyText);
    namesText = JSON.stringify(namesJson);
    await Deno.writeTextFile(paths.names, namesText);
  }
  const names = JSON.parse(namesText);

  return { ver, pools, names };
}

export async function updatePool(
  paths: DataPaths,
  force = false
): Promise<string> {
  const remote = await fetch(urls.ver)
    .then((r) => r.json())
    .catch(() => null);
  if (!remote) throw new Error("读取远程版本号失败");

  const local = await Deno.readTextFile(paths.ver)
    .then((r) => JSON.parse(r))
    .catch(() => null);
  if (!local) throw new Error("读取本地版本号失败");

  if (!force && remote.ver === local.ver)
    return `无需更新卡池，当前版本${local.ver}`;

  try {
    await Deno.writeTextFile(paths.ver, JSON.stringify(remote));

    const poolsText = await fetch(urls.pools).then((r) => r.text());
    await Deno.writeTextFile(paths.pools, poolsText);

    const resPyText = await fetch(urls.names).then((r) => r.text());
    const namesJson = parseNames(resPyText);
    const namesText = JSON.stringify(namesJson);
    await Deno.writeTextFile(paths.names, namesText);
  } catch {
    throw new Error("更新过程中出现错误，已停止更新");
  }
  return `更新卡池成功，当前版本${remote.ver}`;
}

export function weightedRandom<T = unknown>(pair: [T, number][]): T {
  const total = pair.reduce((a, v) => a + v[1], 0);
  const rand = total * Math.random();
  for (let i = 0; i < pair.length; i++)
    if (rand <= pair.slice(0, i + 1).reduce((a, v) => a + v[1], 0))
      return pair[i][0];
  return pair[0][0];
}
