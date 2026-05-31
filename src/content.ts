/// <reference types="npm:@types/chrome" />
import { ItemType, ItemTypes, Mode, Modes } from "./constants.ts";
import { activeBangType } from "./types.ts";

const host = h("div")
host.id = "cp-host";

const shadow = host.attachShadow({ mode: "open" })

const palette = h("div", ["cp-palette", "cp-hidden"], h("div", ["cp-palette-input-container"], h("span", ["cp-palette-input-mode"]), h("input", ["cp-palette-input"])), h("div", ["cp-palette-items"]));
const paletteInput = palette.querySelector(".cp-palette-input") as HTMLInputElement;
const paletteInputMode = palette.querySelector(".cp-palette-input-mode") as HTMLDivElement;
paletteInput.placeholder = "Search...";
const paletteItems = palette.querySelector(".cp-palette-items") as HTMLDivElement;

shadow.appendChild(palette)
document.documentElement.appendChild(host)

let activeIndex = -1;

let currentMode: Mode = Modes.NORMAL
let activeBang: activeBangType | null =  null

const regularWoff = chrome.runtime.getURL("fonts/Inter28pt-Regular.woff");
const regularWoff2 = chrome.runtime.getURL("fonts/Inter28pt-Regular.woff2");
const mediumWoff = chrome.runtime.getURL("fonts/Inter28pt-Medium.woff");
const mediumWoff2 = chrome.runtime.getURL("fonts/Inter28pt-Medium.woff2");
const semiBoldWoff = chrome.runtime.getURL("fonts/Inter28pt-SemiBold.woff");
const semiBoldWoff2 = chrome.runtime.getURL("fonts/Inter28pt-SemiBold.woff2");
const boldWoff = chrome.runtime.getURL("fonts/Inter28pt-Bold.woff");
const boldWoff2 = chrome.runtime.getURL("fonts/Inter28pt-Bold.woff2");

const style = document.createElement('style');
style.textContent = `
@font-face {
    font-family: 'Inter';
    src: url("${regularWoff2}") format('woff2'),
        url("${regularWoff}") format('woff');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Inter';
    src: url("${mediumWoff2}") format('woff2'),
        url("${mediumWoff}") format('woff');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Inter';
    src: url("${semiBoldWoff2}") format('woff2'),
        url("${semiBoldWoff}") format('woff');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Inter';
    src: url("${boldWoff2}") format('woff2'),
        url("${boldWoff}") format('woff');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
}`

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("content.css")

shadow.appendChild(style);
shadow.appendChild(link)

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggle-palette') {
        togglePalette();
    }
})

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !palette.classList.contains("cp-hidden")) {
        togglePalette();
    }
});

document.addEventListener("click", (e) => {
    const target = e.target as Node;
    if (!palette.contains(target) && !palette.classList.contains("cp-hidden")) {
        togglePalette();
    }
})

paletteInput.addEventListener("input", async () => {
    const query = paletteInput.value;

    if (currentMode === Modes.BANG) {
        paletteItems.innerHTML = "";
        addItemToPalette(ItemTypes.HISTORY, `search ${query.trim()} on ${activeBang?.title}`, activeBang?.url.replace("%s", query.trim()))
    } else {
        const searchRes = await search(query)
        paletteItems.innerHTML = "";
        searchRes.forEach(item => {
            if (item.type === ItemTypes.BANG) {
                addItemToPalette(item.type, item.title, item.url, item.id, item.shorthand)
                return;
            }
            addItemToPalette(item.type, item.title, item.url, item.id)
        })
    }

    const items = Array.from(paletteItems.children) as HTMLDivElement[];
    if (query.trim() != "" && items.length > 0) {
        activeIndex = 0;
        items.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
    }
    items[activeIndex]?.scrollIntoView({
            block: "nearest",
    });
    if (query.trim() === "") {
        activeIndex = -1;
        paletteItems.scrollTo(0, 0)
    }
})

document.addEventListener("keydown", (e) => {
    if (palette.classList.contains("cp-hidden")) return;
    const items = Array.from(paletteItems.children) as HTMLDivElement[];
    if (items.length === 0) return;
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault()
        activeIndex = (activeIndex + 1) % items.length;
    }
    else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault()
        activeIndex = (activeIndex - 1 + items.length) % items.length;
    }

    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey) || e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        items.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
        items[activeIndex]?.scrollIntoView({
            block: "nearest",
        });
        if (!activeBang) {
            paletteInput.value = items[activeIndex]?.dataset.url || "";
        }
        paletteInput.focus();
    }
})

document.addEventListener("keydown", (e) => {
    if (palette.classList.contains("cp-hidden")) return;
    if (e.key === "Enter") {
        e.preventDefault();
        const items = Array.from(paletteItems.children) as HTMLDivElement[];
        const selectedItem = items[activeIndex];
        if (selectedItem) {
            const type = selectedItem.dataset.type
            const url = selectedItem.dataset.url;
            if (type === ItemTypes.TAB) {
                const id = parseInt(selectedItem.dataset.id!);
                chrome.runtime.sendMessage({ action: 'change-tab', tabId: id });
                togglePalette();
            } else if (type === ItemTypes.HISTORY) {
                if (e.shiftKey) {
                    chrome.runtime.sendMessage({ action: 'open-url-in-current-tab', url });
                } else {
                    chrome.runtime.sendMessage({ action: 'open-url-in-new-tab', url });
                }
                togglePalette();
            } else if (type === ItemTypes.BANG) {
                bangMode(selectedItem.dataset.title!, selectedItem.dataset.shorthand!, selectedItem.dataset.url!)
            }
        }
    }
})

document.addEventListener("keydown", (e) => {
    if (palette.classList.contains("cp-hidden")) return;
    if (e.key === "Backspace" && currentMode === Modes.BANG && paletteInput.value === "") {
        normalMode();
    }
})

async function togglePalette() {
    if (palette.classList.contains("cp-hidden")) {
        await normalMode()
        palette.classList.remove("cp-hidden");
        paletteInput.focus();
    } else {
        palette.classList.add("cp-hidden");
        paletteInput.value = "";
        paletteItems.innerHTML = "";
        activeIndex = -1;
        const suggestions = Array.from(paletteItems.children) as HTMLDivElement[];
        suggestions.forEach(s => s.classList.remove("cp-active"));
    }
}

function bangMode(title: string, shorthand: string, url: string) {
    currentMode = Modes.BANG
    paletteInputMode.innerText = title;
    paletteInputMode.style.display = "inline"
    activeBang = {
        shorthand, title, url
    }
    paletteItems.innerHTML = "";
    paletteInput.value = "";
    addItemToPalette(ItemTypes.HISTORY, `Search ${paletteInput.value.trim()} on ${activeBang?.title}`, activeBang?.url.replace("%s", paletteInput.value.trim()))
    console.log(Modes.BANG)
}

async function normalMode() {
    currentMode = Modes.NORMAL
    paletteInputMode.innerText = ""
    paletteInputMode.style.display = "none"
    activeBang = null;
    activeIndex = -1;
    const searchRes = await search("")
    paletteItems.innerHTML = "";
    searchRes.forEach(item => {
        addItemToPalette(item.type, item.title, item.url, item.id)
    })
    console.log(Modes.NORMAL)
}

function addItemToPalette(type: ItemType, title: string, url?: string, id?: number, shorthand?: string) {
    let itemEl: HTMLElement = h("div", ["cp-item"], h("img", ["cp-item-favicon"]), h("div", ["cp-item-content"], h("div", ["cp-item-title"], document.createTextNode(title)), h("div", ["cp-item-desc"], document.createTextNode(url!))));
    itemEl.dataset.type = type
    
    if (["tab", "history", "bang", "search"].includes(type)) {
        if (!title || !url) return

        itemEl.dataset.title = title;
        itemEl.dataset.url = url;

        if (["tab", "history"].includes(type)) {
            itemEl.getElementsByTagName("img")[0].src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`
        }
    }
    
    switch (type) {
        case "tab": {
            if (!id) return;
            const switchToTabEl = h("div", ["cp-switch-to-tab"]);
            switchToTabEl.innerHTML = 'switch to tab';
            itemEl.append(switchToTabEl);
            itemEl.dataset.id = String(id)
            break;
        }
        case "history": {
            break;
        }
        case "bang": {
            itemEl = h("div", ["cp-item"], h("img", ["cp-item-favicon"]), h("div", ["cp-item-content"], h("div", ["cp-item-title"], document.createTextNode(shorthand!)), h("div", ["cp-item-desc"], document.createTextNode(title))));
            itemEl.dataset.shorthand = shorthand;
            itemEl.dataset.title = title;
            itemEl.dataset.url = url;
            itemEl.dataset.type = type
            break;
        }
        case "search": {
            break;
        }
    }

    paletteItems.appendChild(itemEl)
}

const search = (query: string): Promise<{ type: ItemType; title: string; shorthand?: string; url: string; id?: number }[]> => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "search", query }, (res) => {
            resolve(res.res)
        })
    })
}

function h(tag: string, classNames?: string[], ...children: (HTMLElement | Text)[]): HTMLElement {
    const el = document.createElement(tag);
    if (classNames) el.classList.add(...classNames);
    children.forEach(child => el.appendChild(child));
    return el;
}