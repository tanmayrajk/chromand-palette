/// <reference types="npm:@types/chrome" />

chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-palette') {
        console.log("hi lol");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id!, { action: 'toggle-palette' })
        })
    }
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'request-tabs') {
        console.log("yaya")
        chrome.tabs.query({}, (tabs) => {
            sendResponse({ tabs })
        });

        return true;
    } else if (msg.action === 'change-tab') {
        const tabId = msg.tabId;
        chrome.tabs.update(tabId, { active: true });
        return true;
    } else if (msg.action === 'open-url') {
        const url = msg.url;
        chrome.tabs.create({ url });
        return true;
    } else if (msg.action === 'search-history') {
        searchHistory(msg.query, 10).then(data => {
            sendResponse({ data })
        })
        return true
    }
})

function searchHistory(query: string, count: number) {
    return new Promise<{ title?: string, url?: string }[]>(resolve => {
        chrome.history.search({ text: query, maxResults: count }, (res) => {
            resolve(res.map(r => ({ title: r.title, url: r.url })))
        })
    })
}

// async function search(query: string, count: number) {
//     const openTabs = await new Promise<chrome.tabs.Tab[]>(resolve => {
//         chrome.tabs.query({}, (tabs) => {
//             resolve(tabs);
//         })
//     })
//     const history = await new Promise<{ title?: string, url?: string }[]>(resolve => {
//         chrome.history.search({ text: query, maxResults: count }, (res) => {
//             resolve(res.map(r => ({ title: r.title, url: r.url })))
//         })
//     })

//     const combinedResults = [...openTabs.map(tab => ({ title: tab.title || "", url: tab.url || "", id: tab.id || -1 })), ...history];
//     const filteredResults = combinedResults.filter(result => result.title?.toLowerCase().includes(query.toLowerCase().trim() || "") || result.url?.toLowerCase().includes(query.toLowerCase().trim() || ""));
//     return filteredResults;
// }

// async function allHistory() {
//     const t = new Date();
//     const history = await new Promise<{ title?: string, url?: string }[]>(resolve => {
//         chrome.history.search({ text: "", startTime: 0, maxResults: 999999999 }, (res) => {
//             resolve(res.map(r => ({ title: r.title, url: r.url })))
//         })
//     })
//     console.log((new Date().getTime() - t.getTime()) / 1000);
//     console.log(history.length);
// }

// allHistory();


// chrome.tabs.query({}, (tabs) => {
//     for (const tab of tabs) {
//         console.log(tab.url);
//     }
// })