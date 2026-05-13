/// <reference types="npm:@types/chrome" />

const palette = h("div", ["cp-palette", "cp-hidden"], h("input", ["cp-palette-input"]), h("div", ["cp-palette-suggestions"]));
const paletteInput = palette.querySelector(".cp-palette-input") as HTMLInputElement;
paletteInput.placeholder = "Search...";
const paletteSuggestions = palette.querySelector(".cp-palette-suggestions") as HTMLDivElement;

document.body.appendChild(palette);

// interface SuggestionInfo {
//     title: string;
//     url: string;
// }

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
    const query = paletteInput.value.toLowerCase().trim();
    const filteredSuggestions = filterSuggestions(query);
    paletteSuggestions.innerHTML = "";
    filteredSuggestions.forEach(suggestion => addSuggestionToPalette(suggestion.title || "no title", suggestion.url || ""));
})

document.addEventListener("keydown", (e) => {
    if (palette.classList.contains("cp-hidden")) return;
    const suggestions = Array.from(paletteSuggestions.children) as HTMLDivElement[];
    if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % suggestions.length;
        suggestions.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
    }
    else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
        suggestions.forEach((s, i) => s.classList.toggle("cp-active", i === activeIndex));
    }
    paletteInput.value = suggestions[activeIndex]?.dataset.url || "";
})

function togglePalette() {
    const a = palette.classList.toggle("cp-hidden");
    if (a) {
        paletteInput.value = "";
        paletteSuggestions.innerHTML = "";
    } else {
        paletteInput.focus();
        fetchTabs().then(tabs => {
            openTabs = tabs;
            tabs.forEach(tab => addSuggestionToPalette(tab.title || "no title", tab.url || "", tab.id || -1));
        });
    }
}

function filterSuggestions(query: string) {
    // const currentSuggestions = (Array.from(paletteSuggestions.children) as HTMLDivElement[]).map(suggestionEl => ({
    //     title: suggestionEl.dataset.title || "",
    //     url: suggestionEl.dataset.url || ""
    // }));
    const currentSuggestions = openTabs.map(tab => ({
        title: tab.title || "",
        url: tab.url || "",
        id: tab.id || -1
    }));
    const filteredSuggestions = currentSuggestions.filter(suggestion => suggestion.title?.toLowerCase().includes(query.toLowerCase().trim() || ""));
    return filteredSuggestions;
}

function addSuggestionToPalette(title: string, url: string, id: number = -1) {
    const suggestionEl = h("div", ["cp-suggestion"], document.createTextNode(title));
    suggestionEl.dataset.title = title;
    suggestionEl.dataset.url = url;
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

function h(tag: string, classNames?: string[], ...children: (HTMLElement | Text)[]): HTMLElement {
    const el = document.createElement(tag);
    if (classNames) el.classList.add(...classNames);
    children.forEach(child => el.appendChild(child));
    return el;
}