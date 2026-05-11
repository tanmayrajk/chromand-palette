// src/content.ts
var palette = h("div", [
  "palette",
  "hidden"
], h("input", [
  "palette-input"
]), h("div", [
  "palette-suggestions"
]));
var paletteInput = palette.querySelector(".palette-input");
var paletteSuggestions = palette.querySelector(".palette-suggestions");
document.body.appendChild(palette);
var currentTabs = [];
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggle-palette") {
    togglePalette();
  }
});
paletteInput.addEventListener("input", () => {
  const query = paletteInput.value.toLowerCase();
  const filteredSuggestions = filterSuggestions(query);
  paletteSuggestions.innerHTML = "";
  filteredSuggestions.forEach((tab) => addSuggestion(tab.title || "no title"));
});
function togglePalette() {
  const a = palette.classList.toggle("hidden");
  if (a) {
    paletteInput.value = "";
    paletteSuggestions.innerHTML = "";
  } else {
    paletteInput.focus();
    fetchTabs().then((tabs) => {
      currentTabs = tabs;
      tabs.forEach((tab) => addSuggestion(tab.title || "no title"));
    });
  }
}
function filterSuggestions(query) {
  const filteredSuggestions = currentTabs.filter((tab) => tab.title?.toLowerCase().includes(query.toLowerCase()));
  return filteredSuggestions;
}
function addSuggestion(suggestion) {
  const suggestionEl = h("div", [
    "suggestion"
  ], document.createTextNode(suggestion));
  paletteSuggestions.appendChild(suggestionEl);
}
var fetchTabs = () => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: "request-tabs"
    }, (res) => {
      resolve(res.tabs);
    });
  });
};
function h(tag, classNames, ...children) {
  const el = document.createElement(tag);
  el.classList.add(...classNames);
  children.forEach((child) => el.appendChild(child));
  return el;
}
