/// <reference types="npm:@types/chrome" />

const palette = h("div", ["palette", "hidden"], h("input", ["palette-input"]), h("div", ["palette-suggestions"]));
const paletteInput = palette.querySelector(".palette-input") as HTMLInputElement;
const paletteSuggestions = palette.querySelector(".palette-suggestions") as HTMLDivElement;

document.body.appendChild(palette);

let currentTabs: chrome.tabs.Tab[] = [];

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'toggle-palette') {
        togglePalette();
    }
})

paletteInput.addEventListener("input", () => {
    const query = paletteInput.value.toLowerCase();
    const filteredSuggestions = filterSuggestions(query);
    paletteSuggestions.innerHTML = "";
    filteredSuggestions.forEach(tab => addSuggestion(tab.title || "no title"));
})


function togglePalette() {
    const a = palette.classList.toggle("hidden");
    if (a) {
        paletteInput.value = "";
        paletteSuggestions.innerHTML = "";
    } else {
        paletteInput.focus();
        fetchTabs().then(tabs => {
            currentTabs = tabs;
            tabs.forEach(tab => addSuggestion(tab.title || "no title"));
        });
    }
}

function filterSuggestions(query: string) {
    const filteredSuggestions = currentTabs.filter(tab => tab.title?.toLowerCase().includes(query.toLowerCase()));
    return filteredSuggestions;
}

function addSuggestion(suggestion: string) {
    const suggestionEl = h("div", ["suggestion"], document.createTextNode(suggestion));
    paletteSuggestions.appendChild(suggestionEl);
}

const fetchTabs = (): Promise<chrome.tabs.Tab[]> => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'request-tabs' }, (res) => {
            resolve(res.tabs);
        });
    })
}

function h(tag: string, classNames: string[], ...children: (HTMLElement | Text)[]): HTMLElement {
    const el = document.createElement(tag);
    el.classList.add(...classNames);
    children.forEach(child => el.appendChild(child));
    return el;
}