/// <reference types="npm:@types/chrome" />

const palette = h("div", ["cp-palette", "cp-hidden"], h("input", ["cp-palette-input"]), h("div", ["cp-palette-suggestions"]));
const paletteInput = palette.querySelector(".cp-palette-input") as HTMLInputElement;
paletteInput.placeholder = "Search...";
const paletteSuggestions = palette.querySelector(".cp-palette-suggestions") as HTMLDivElement;

document.body.appendChild(palette);

let openTabs: chrome.tabs.Tab[] = [];
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

paletteInput.addEventListener("input", () => {
    const query = paletteInput.value;
    const filteredSuggestions = filterSuggestions(query);
    paletteSuggestions.innerHTML = "";
    filteredSuggestions.forEach(suggestion => addSuggestionToPalette(suggestion.title || "no title", suggestion.url || ""));
    if (query.trim() != "") {
        const googleSearch = h("div", ["cp-suggestion"], h("span", ["cp-suggestion-title"], document.createTextNode(`Google ${query}`)));
        googleSearch.dataset.url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        paletteSuggestions.append(googleSearch);
    }
    const suggestions = Array.from(paletteSuggestions.children) as HTMLDivElement[];
    if (query.trim() != "" && suggestions.length > 0) {
        activeIndex = 0;
        suggestions.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
    }
})

document.addEventListener("keydown", (e) => {
    if (palette.classList.contains("cp-hidden")) return;
    const suggestions = Array.from(paletteSuggestions.children) as HTMLDivElement[];
    if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % suggestions.length;
        suggestions.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
        paletteInput.value = suggestions[activeIndex]?.dataset.url || "";
        paletteInput.focus();

    }
    else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
        suggestions.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
        paletteInput.value = suggestions[activeIndex]?.dataset.url || "";
        paletteInput.focus();
    }
})

document.addEventListener("keydown", (e) => {
    if (palette.classList.contains("cp-hidden")) return;
    if (e.key === "Enter") {
        e.preventDefault();
        const suggestions = Array.from(paletteSuggestions.children) as HTMLDivElement[];
        const selectedSuggestion = suggestions[activeIndex];
        if (selectedSuggestion) {
            const url = selectedSuggestion.dataset.url;
            const id = parseInt(selectedSuggestion.dataset.id || "-1");
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
        fetchTabs().then(tabs => {
            openTabs = tabs;
            tabs.forEach(tab => addSuggestionToPalette(tab.title || "no title", tab.url || "", tab.id || -1));
        });
        // fetchHistory("", 10).then(history => {
        //     console.log(history);
        // })
        palette.classList.remove("cp-hidden");
        paletteInput.focus();
    } else {
        palette.classList.add("cp-hidden");
        paletteInput.value = "";
        paletteSuggestions.innerHTML = "";
        activeIndex = -1;
        const suggestions = Array.from(paletteSuggestions.children) as HTMLDivElement[];
        suggestions.forEach(s => s.classList.remove("cp-active"));
    }
}

function filterSuggestions(query: string) {
    const currentSuggestions = openTabs.map(tab => ({
        title: tab.title || "",
        url: tab.url || "",
        id: tab.id || -1
    }));
    const filteredSuggestions = currentSuggestions.filter(suggestion => suggestion.title?.toLowerCase().includes(query.toLowerCase().trim() || "") || suggestion.url?.toLowerCase().includes(query.toLowerCase().trim() || ""));
    return filteredSuggestions;
}

function addSuggestionToPalette(title: string, url: string, id: number = -1) {
    const urlObj = new URL(url);
    const displayUrl = urlObj.protocol == "http:" || urlObj.protocol == "https:" ? urlObj.hostname + urlObj.port + urlObj.pathname + urlObj.search + urlObj.hash : url;
    const suggestionEl = h("div", ["cp-suggestion"], h("span", ["cp-suggestion-title"], document.createTextNode(title)), h("span", ["cp-suggestion-url"], document.createTextNode(displayUrl)));
    suggestionEl.dataset.title = title;
    suggestionEl.dataset.url = displayUrl;
    suggestionEl.dataset.id = id.toString();
    paletteSuggestions.appendChild(suggestionEl);
}

const fetchTabs = (): Promise<chrome.tabs.Tab[]> => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'request-tabs' }, (res) => {
            resolve(res.tabs);
        });
    })
}

// const fetchHistory = (query: string, count: number): Promise<{ title?: string, url?: string }[]> => {
//     return new Promise((resolve) => {
//         chrome.runtime.sendMessage({ action: 'request-history', count, query}, (res) => {
//             resolve(res.history);
//         });
//     })
// }

function h(tag: string, classNames?: string[], ...children: (HTMLElement | Text)[]): HTMLElement {
    const el = document.createElement(tag);
    if (classNames) el.classList.add(...classNames);
    children.forEach(child => el.appendChild(child));
    return el;
}