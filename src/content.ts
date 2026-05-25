/// <reference types="npm:@types/chrome" />

const palette = h("div", ["cp-palette", "cp-hidden"], h("input", ["cp-palette-input"]), h("div", ["cp-palette-items"]));
const paletteInput = palette.querySelector(".cp-palette-input") as HTMLInputElement;
paletteInput.placeholder = "Search...";
const paletteItems = palette.querySelector(".cp-palette-items") as HTMLDivElement;

document.body.appendChild(palette);

let activeIndex = -1;

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
    console.log(searchRes)
    paletteItems.innerHTML = "";
    searchRes.forEach(item => {
        const id = item.id ? item.id : -1
        addItemToPalette(item.title ?? "", item.url ?? "", id)
    })
    // filteredSuggestions.forEach(suggestion => addSuggestionToPalette(suggestion.title || "no title", suggestion.url || "", suggestion.id || -1));
    // if (query.trim() != "") {
    //     const googleSearch = h("div", ["cp-suggestion"], h("div", ["cp-suggestion-content"], h("div", ["cp-suggestion-title"], document.createTextNode(`Google ${query}`))));
    //     googleSearch.dataset.url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    //     paletteSuggestions.prepend(googleSearch);

    //     searchHistory(query).then(d => {
    //         console.log(d)
    //         d.forEach(suggestion => addSuggestionToPalette(suggestion.title || "no title", suggestion.url || "", -1));
    //     })
    // }
    const items = Array.from(paletteItems.children) as HTMLDivElement[];
    if (query.trim() != "" && items.length > 0) {
        activeIndex = 0;
        items.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
    }
})

document.addEventListener("keydown", (e) => {
    if (palette.classList.contains("cp-hidden")) return;
    const items = Array.from(paletteItems.children) as HTMLDivElement[];
    if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        items.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
        items[activeIndex]?.scrollIntoView({
            block: "nearest",
        });
        paletteInput.value = items[activeIndex]?.dataset.url || "";
        paletteInput.focus();

    }
    else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
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
            const url = selectedItem.dataset.url;
            const id = parseInt(selectedItem.dataset.id || "-1");
            togglePalette();
            if (id !== -1) {
                chrome.runtime.sendMessage({ action: 'change-tab', tabId: id });
            } else if (url) {
                chrome.runtime.sendMessage({ action: 'open-url', url });
            }
        }
    }
})

function togglePalette() {
    if (palette.classList.contains("cp-hidden")) {
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

function addItemToPalette(title: string, url: string, id: number = -1) {
    const faviconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
    const itemEl = h("div", ["cp-item"], h("img", ["cp-item-favicon"]), h("div", ["cp-item-content"], h("div", ["cp-item-title"], document.createTextNode(title)), h("div", ["cp-item-url"], document.createTextNode(url))));
    if (id !== -1) {
        const switchToTabEl = h("div", ["cp-switch-to-tab"])
        switchToTabEl.innerHTML = 'switch to tab'
        itemEl.append(switchToTabEl)
    }
    itemEl.getElementsByTagName("img")[0].src = faviconUrl;
    itemEl.dataset.title = title;
    itemEl.dataset.url = url;
    itemEl.dataset.id = id.toString();
    paletteItems.appendChild(itemEl);
}

const search = (query: string): Promise<{ title?: string; url?: string; id: number }[]> => {
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