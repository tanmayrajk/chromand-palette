/// <reference types="npm:@types/chrome" />
import Fuse from "fuse.js"

interface historyItem {
    title: string,
    url: string,
    visitCount: number
    lastVisitTime: number
}

interface tabItem {
    title?: string,
    url?: string,
    id: number
}

let historyMap = new Map<string, historyItem>()
const tabMap = new Map<number, tabItem>()

const fuse = new Fuse([] as (historyItem | tabItem)[], {
    includeScore: true,
    keys: ["title", "url"]
})

chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-palette') {
        console.log("hi lol");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id!, { action: 'toggle-palette' })
        })
    }
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'change-tab') {
        const tabId = msg.tabId;
        chrome.tabs.update(tabId, { active: true });
        return true;
    } else if (msg.action === 'open-url') {
        const url = msg.url;
        chrome.tabs.create({ url });
        return true;
    } else if (msg.action === 'search') {
        const query = msg.query as string
        const res = searchIndex(query, 20, historyMap, tabMap, fuse)
        sendResponse({ res })
    }
})

chrome.runtime.onInstalled.addListener(async () => {
    historyMap = await getHistoryMap(999999999)
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
        if (!tab.id) continue

        const tabInfo = (!tab.url || !tab.title) ? await chrome.tabs.get(tab.id) : tab

        tabMap.set(tab.id, {
            id: tab.id,
            title: tabInfo.title,
            url: tabInfo.url
        })
    }
    console.log(historyMap)
    console.log(tabMap)
})

chrome.history.onVisited.addListener((r) => {
    if (!r.url) return
    if (historyMap.has(r.url)) {
        const item = historyMap.get(r.url)
        if (!item) return
        item.visitCount += 1
    } else {
        historyMap.set(r.url, {
            title: r.title ?? "",
            url: r.url,
            visitCount: r.visitCount ?? 1,
            lastVisitTime: r.lastVisitTime ?? NaN
        })
    }
})

chrome.tabs.onUpdated.addListener((id, tab) => {
    const tabItemInMap = tabMap.get(id)
    if (!tabItemInMap) {
        tabMap.set(id, {
            id,
            title: tab.title,
            url: tab.url
        })
    } else {
        tabItemInMap.title = tab.title
        tabItemInMap.url = tab.url
    }
})

chrome.tabs.onRemoved.addListener((id) => {
    tabMap.delete(id)
})

function getHistoryMap(count: number) {
    const historyMap = new Map<string, historyItem>()
    return new Promise<Map<string, historyItem>>(resolve => {
        chrome.history.search({ text: "", startTime: 0, maxResults: count }, res => {
            res.forEach(r => {
                if (!r.url) return

                historyMap.set(r.url, {
                    title: r.title ?? "",
                    url: r.url,
                    visitCount: r.visitCount ?? 1,
                    lastVisitTime: r.lastVisitTime ?? NaN
                })
            })
            resolve(historyMap)
        })
    })
}

function searchIndex(query: string, count: number, hMap: Map<string, historyItem>, tMap: Map<number, tabItem>, f: Fuse<historyItem | tabItem>) {
    const items = [...hMap.values(), ...tMap.values()]
    f.setCollection(items)
    const res = f.search(query, { limit: count })
    res.sort((a, b) => {
        const scoreA = (a.score ?? 1) - (("visitCount" in a.item ? a.item.visitCount : 0) * 0.001)
        const scoreB = (b.score ?? 1) - (("visitCount" in b.item ? b.item.visitCount : 0) * 0.001)
        return scoreA - scoreB
    })
    return res.map(r => r.item)
}