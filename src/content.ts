/// <reference types="npm:@types/chrome" />
import { ItemTypes, Mode, Modes } from "./constants.ts";

const palette = h("div", ["cp-palette", "cp-hidden"], h("input", ["cp-palette-input"]), h("div", ["cp-palette-items"]));
const paletteInput = palette.querySelector(".cp-palette-input") as HTMLInputElement;
paletteInput.placeholder = "Search...";
const paletteItems = palette.querySelector(".cp-palette-items") as HTMLDivElement;

document.body.appendChild(palette);

let activeIndex = -1;

let currentMode: Mode = Modes.NORMAL

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
    const searchRes = await search(query)
    paletteItems.innerHTML = "";

    console.log(searchRes)

    searchRes.forEach(item => {
        addItemToPalette(item.type, item.title, item.url, item.id)
    })

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
        paletteInput.value = items[activeIndex]?.dataset.url || "";
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
            } else if (type === ItemTypes.HISTORY) {
                chrome.runtime.sendMessage({ action: 'open-url', url });
            } else if (type === ItemTypes.BANG) {
                currentMode = Modes.BANG
            }
            togglePalette();
        }
    }
})

async function togglePalette() {
    if (palette.classList.contains("cp-hidden")) {
        currentMode = Modes.NORMAL
        const searchRes = await search("")
        paletteItems.innerHTML = "";
        searchRes.forEach(item => {
            addItemToPalette(item.type, item.title, item.url, item.id)
        })
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

function addItemToPalette(type: string, title: string, url?: string, id?: number) {
    let itemEl: HTMLElement = h("div", ["cp-item"], h("img", ["cp-item-favicon"]), h("div", ["cp-item-content"], h("div", ["cp-item-title"], document.createTextNode(title)), h("div", ["cp-item-url"], document.createTextNode(url!))));
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
            break;
        }
        case "search": {
            break;
        }
    }

    paletteItems.appendChild(itemEl)
}

const search = (query: string): Promise<{ type: string; title: string; url?: string; id?: number }[]> => {
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