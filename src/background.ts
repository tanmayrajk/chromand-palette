/// <reference types="npm:@types/chrome" />
import Fuse from "fuse.js";
import { historyItem, tabItem, bangItem, searchItem } from "./types.ts";
import { ItemTypes } from "./constants.ts";

let historyMap = new Map<string, historyItem>();
const tabMap = new Map<number, tabItem>();

let initPromise: Promise<void> | null = null

const fuse = new Fuse([] as (historyItem | tabItem)[], {
  includeScore: true,
  keys: ["title", "url"],
});

const bangsFuse = new Fuse([] as (bangItem)[], {
  keys: ["name", "url"]
})

let searchItems: (historyItem | tabItem)[] = []

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-palette") {
    console.log("hi lol");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { action: "toggle-palette" });
    });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "change-tab") {
    const tabId = msg.tabId;
    chrome.tabs.update(tabId, { active: true });
  } else if (msg.action === "open-url") {
    const url = msg.url;
    chrome.tabs.create({ url });
  } 
  if (msg.action === "search") {
    (async () => {
        await ensureInit();
        const res = await searchIndex((msg.query as string).trim(), 25);
        sendResponse({ res })
    })();
    return true;
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureInit();
});

chrome.runtime.onInstalled.addListener(async () => {
  await ensureInit();
});

chrome.history.onVisited.addListener((r) => {
  if (!r.url) return;
  if (historyMap.has(r.url)) {
    const item = historyMap.get(r.url);
    if (!item) return;
    item.visitCount += 1;
  } else {
    historyMap.set(r.url, {
      title: r.title ?? "",
      url: r.url,
      visitCount: r.visitCount ?? 1,
      lastVisitTime: r.lastVisitTime ?? NaN,
      type: ItemTypes.HISTORY
    });
  }
  rebuildIndex()
});

chrome.tabs.onUpdated.addListener(async (id, changeInfo) => {
    if (!changeInfo.url && !changeInfo.title) return;
    try {
        const fullTab = await chrome.tabs.get(id);
        if (!fullTab.url || !fullTab.title) return;
        tabMap.set(id, {
            id,
            title: fullTab.title,
            url: fullTab.url,
            type: ItemTypes.TAB
        })
        rebuildIndex();
    } catch (e) {
        console.error(e)
    }
});

chrome.tabs.onRemoved.addListener((id) => {
  tabMap.delete(id);
  rebuildIndex()
});

async function getAllBookmarks() {
  const bookmarks = await chrome.bookmarks.search({})
  return bookmarks.map(b => b.url)
}

function getHistoryMap(count: number) {
  const historyMap = new Map<string, historyItem>();
  return new Promise<Map<string, historyItem>>((resolve) => {
    chrome.history.search(
      { text: "", startTime: 0, maxResults: count },
      (res) => {
        res.forEach((r) => {
          if (!r.url) return;

          historyMap.set(r.url, {
            title: r.title ?? "",
            url: r.url,
            visitCount: r.visitCount ?? 1,
            lastVisitTime: r.lastVisitTime ?? NaN,
            type: ItemTypes.HISTORY
          });
        });
        resolve(historyMap);
      },
    );
  });
}

async function searchIndex(
  query: string,
  count: number,
) {
  const bookmarks = await getAllBookmarks()
  const res = fuse.search(query);
  res.sort((a, b) => {
    const bookmarkBoostA = (bookmarks.includes(a.item.url)) ? 0.267 : 0;
    const bookmarkBoostB = (bookmarks.includes(b.item.url)) ? 0.267 : 0;
    const tabBoostA = ("id" in a.item) ? 0.2 : 0;
    const tabBoostB = ("id" in b.item) ? 0.2 : 0;
    const visitBoostA = ("visitCount" in a.item)
      ? a.item.visitCount * 0.001
      : 0;

    const visitBoostB = ("visitCount" in b.item)
      ? b.item.visitCount * 0.001
      : 0;

    const finalA = (a.score ?? 1) -
      bookmarkBoostA -
      tabBoostA -
      visitBoostA;

    const finalB = (b.score ?? 1) -
      bookmarkBoostB -
      tabBoostB -
      visitBoostB;

    return finalA - finalB;
  });
  const initialRes = res.map((r) => r.item).slice(0, count);
  let finalRes :(historyItem | bangItem | tabItem | searchItem)[] = []
  finalRes = [...initialRes]
  if (query.trim()[0] === "/") {
    const { bangs } = await chrome.storage.local.get<{ bangs: bangItem[] }>("bangs")
    bangs.forEach(bang => bang.type = ItemTypes.BANG)
    bangsFuse.setCollection(bangs)
    const bangsRes = bangsFuse.search(query.trim().slice(1)).map(b => b.item).slice(0, 5)
    console.log(bangsRes)
    finalRes = [...bangsRes, ...finalRes]
  }
  return finalRes
}

async function init() {
  historyMap = await getHistoryMap(999999999);
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id) continue;

    const tabInfo = (!tab.url || !tab.title)
      ? await chrome.tabs.get(tab.id)
      : tab;

    if (!tabInfo.url || !tabInfo.title) continue;

    tabMap.set(tab.id, {
      id: tab.id,
      title: tabInfo.title,
      url: tabInfo.url,
      type: ItemTypes.TAB
    });
  }
  const { bangs } = await chrome.storage.local.get("bangs");
  if (!bangs) {
    await chrome.storage.local.set({
      bangs: []
    })
  }
  // const { searchEngine } = await chrome.storage.local.get("searchEngine")
  // if (!searchEngine) {
  //   await chrome.storage.local.set({
  //     searchEngine: "Google"
  //   })
  // }
  rebuildIndex();
}

function ensureInit() {
    if (!initPromise) {
        initPromise = init();
    }
    return initPromise
}

function rebuildIndex() {
    searchItems = [...historyMap.values(), ...tabMap.values()]
    fuse.setCollection(searchItems)
}