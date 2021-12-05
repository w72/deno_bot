import { Pools, Names, Assets } from "./types.ts";

export const urls = {
  ver: "https://api.redive.lolikon.icu/gacha/gacha_ver.json",
  pools: "https://api.redive.lolikon.icu/gacha/default_gacha.json",
  names: "https://api.redive.lolikon.icu/gacha/unitdata.py",
};

export async function fetchNames() {
  const res = await fetch(urls.names).then((r) => r.text());
  const ctx: { CHARA_NAME: Names } = { CHARA_NAME: {} };
  eval(`ctx.${res}`);
  return ctx.CHARA_NAME;
}

export async function ensurePcrFiles(asset: Assets): Promise<{
  ver: string;
  pools: Pools;
  names: Names;
}> {
  let verText = "";
  try {
    verText = await Deno.readTextFile(asset.ver);
  } catch {
    verText = await fetch(urls.ver).then((r) => r.text());
    await Deno.writeTextFile(asset.ver, verText);
  }
  const ver = JSON.parse(verText).ver;

  let poolsText = "";
  try {
    poolsText = await Deno.readTextFile(asset.pools);
  } catch {
    poolsText = await fetch(urls.pools).then((r) => r.text());
    await Deno.writeTextFile(asset.pools, poolsText);
  }
  const pools = JSON.parse(poolsText);

  let namesText = "";
  try {
    namesText = await Deno.readTextFile(asset.names);
  } catch {
    const namesJson = await fetchNames();
    namesText = JSON.stringify(namesJson);
    await Deno.writeTextFile(asset.names, namesText);
  }
  const names = JSON.parse(namesText);

  return { ver, pools, names };
}

export async function updatePool(
  assets: Assets,
  force = false
): Promise<string> {
  const remote = await fetch(urls.ver)
    .then((r) => r.json())
    .catch(() => null);
  if (!remote) throw new Error("读取远程版本号失败");

  const local = await Deno.readTextFile(assets.ver)
    .then((r) => JSON.parse(r))
    .catch(() => null);
  if (!local) throw new Error("读取本地版本号失败");

  if (!force && remote.ver === local.ver)
    return `无需更新卡池，当前版本${local.ver}`;

  try {
    await Deno.writeTextFile(assets.ver, JSON.stringify(remote));

    const poolsText = await fetch(urls.pools).then((r) => r.text());
    await Deno.writeTextFile(assets.pools, poolsText);

    const namesJson = await fetchNames();
    const namesText = JSON.stringify(namesJson);
    await Deno.writeTextFile(assets.names, namesText);
  } catch {
    throw new Error("更新过程中出现错误，已停止更新");
  }
  return `更新卡池成功，当前版本${remote.ver}`;
}
