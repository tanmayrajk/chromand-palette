/// <reference types="npm:@types/chrome" />
import Fuse from "fuse.js"

interface historyItem {
    title: string,
    url: string,
    visitCount: number,
}

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
    }
})

chrome.runtime.onInstalled.addListener(async () => {
    const history = await getHistory(999999999);
    console.log(history.length)
    await storeInIndexedDB(history)
})


function getHistory(count: number) {
    return new Promise<historyItem[]>(resolve => {
        chrome.history.search({ text: "", startTime: 0, maxResults: count }, (res) => {
            resolve(res.map(r => ({ title: r.title ?? "", url: r.url ?? "", visitCount: r.visitCount ?? 1 })))
        })
    })
}

function loadFromIndexedDB() {
    return new Promise<historyItem[]>((resolve, reject) => {
        const request = indexedDB.open("browserHistory", 1);

        request.onerror = () => reject(request.error)

        request.onsuccess = () => {
            const db = request.result
            const tx = db.transaction("history", "readonly")
            const store = tx.objectStore("history")

            const getAllRequest = store.getAll()

            getAllRequest.onerror = () => reject(getAllRequest.error)

            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result as historyItem[])
            }
        }
    })
}

function storeInIndexedDB(history: historyItem[]) {
    return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("browserHistory", 1);
        
        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains("history")) {
                db.createObjectStore("history", {
                    keyPath: "url"
                })
            }
        }

        request.onerror = () => reject(request.error)

        request.onsuccess = () => {
            const db = request.result
            const tx = db.transaction("history", "readwrite")
            const store = tx.objectStore("history");

            history.forEach(item => {
                store.put(item)
            })

            tx.oncomplete = () => {
                console.log("history stored");
                resolve();
            }

            tx.onerror = () => reject(tx.error)
        }
    })
}