const bangsFormEl = document.getElementById("bang-form") as HTMLFormElement
const bangsListEl = document.getElementById("bangs-list") as HTMLDivElement
const searchFormEl = document.getElementById("search-form") as HTMLFormElement
const searchEngineSelectEl = document.getElementById("search-engine") as HTMLSelectElement
const searchEngineInfoEl = document.getElementById("search-engine-info") as HTMLDivElement
const searchEngineDeleteBtn = searchEngineInfoEl.querySelector("button#search-engine-delete-btn") as HTMLButtonElement;

const regex = new RegExp(
    "^[a-zA-Z][a-zA-Z0-9+.-]*:\\/\\/[^\\/\\s]+.*%s.*$"
);

interface bang {
    title: string,
    shorthand: string;
    url: string,
}

interface searchEngine {
    title: string;
    url: string;
    id: number;
}

searchEngineDeleteBtn.addEventListener("click", e => {
    deleteSearchEngine(parseInt(searchEngineSelectEl.value))
    searchEngineSelectEl.querySelector(`[data-id="${parseInt(searchEngineSelectEl.value)}"]`)?.remove();
    searchEngineSelectEl.value = "0";
})

bangsFormEl?.addEventListener('submit', async e => {
    e.preventDefault()

    const nameInput = (bangsFormEl.querySelector('input#bang-name-input') as HTMLInputElement);
    const shortHandInput = (bangsFormEl.querySelector('input#bang-shorthand-input') as HTMLInputElement);
    const urlInput = (bangsFormEl.querySelector('input#bang-url-input') as HTMLInputElement);

    if (await doesBangExist(shortHandInput.value)) {
        alert("a bang with that name already exists, use some other name")
        return
    }

    if (!bangsListEl) {
        alert("something's weird going on, try refreshing")
        return
    }

    if (!regex.test(urlInput.value.trim())) {
        alert("something's wrong with the url, try again after fixing it")
        return
    }

    await addBang(nameInput.value, shortHandInput.value, urlInput.value)
    bangsListEl.prepend(createBangEl(nameInput.value, shortHandInput.value, urlInput.value))

    nameInput.value = "";
    urlInput.value = "";
    shortHandInput.value = "";

})

searchFormEl?.addEventListener('submit', async e => {
    e.preventDefault();

    const nameInput = (searchFormEl.querySelector('input#search-name-input') as HTMLInputElement);
    const urlInput = (searchFormEl.querySelector('input#search-url-input') as HTMLInputElement);

    if (!regex.test(urlInput.value.trim())) {
        alert("something's wrong with the uri, try again after fixing it")
        return;
    }

    const id = await addSearchEngine(nameInput.value, urlInput.value)
    searchEngineSelectEl?.prepend(createSearchEngineEl(nameInput.value, urlInput.value, id))

    nameInput.value = "";
    urlInput.value = "";
})

searchEngineSelectEl?.addEventListener("change", (e) => {
    const id = (e.target as HTMLSelectElement).value
    const selectedOption = searchEngineSelectEl.querySelector(`[data-id="${id}"]`) as HTMLOptionElement | null;
    const urlEl = searchEngineInfoEl.querySelector("span#search-engine-url") as HTMLSpanElement;
    if (!selectedOption) {
        urlEl.innerText = "no search engine selected";
        return
    }
    urlEl.innerText = selectedOption.dataset.url!;
})

async function getAllSearchEngines() {
    const { searchEngines } = await chrome.storage.local.get("searchEngines")
    return searchEngines as searchEngine[]
}

async function addSearchEngine(name: string, url: string) {
    const searchEngines = await getAllSearchEngines();
    const id = Date.now()
    const searchEngine: searchEngine = { title: name.trim(), url: url.trim(), id }
    const newSearchEngines = [searchEngine, ...searchEngines]
    await chrome.storage.local.set({ "searchEngines": newSearchEngines })
    return id;
}

function createSearchEngineEl(name: string, url: string, id: number) {
    const searchOptionEl = h("option", ["search-option"]) as HTMLOptionElement;
    searchOptionEl.innerText = name
    searchOptionEl.value = id.toString();
    searchOptionEl.dataset.id = id.toString();
    searchOptionEl.dataset.name = name;
    searchOptionEl.dataset.url = url;
    return searchOptionEl;
}

async function deleteSearchEngine(id: number) {
    let searchEngines = await getAllSearchEngines();
    if (searchEngines.some(s => s.id === id)) {
        searchEngines = searchEngines.filter(e => e.id != id)
        await chrome.storage.local.set( { searchEngines } )
    }
}

async function doesBangExist(shorthand: string) {
    const bangs = await getAllBangs();
    const isBangAlreadyThere = bangs.some(bang => bang.shorthand === shorthand.trim())
    return isBangAlreadyThere
}

async function getAllBangs() {
    const res = await chrome.storage.local.get("bangs")
    return res.bangs as bang[]
}

async function addBang(name: string, shorthand: string, url: string) {
    const bangs = await getAllBangs();
    const bang = { title: name.trim(), shorthand: shorthand.trim(), url: url.trim() }
    const newBangs = [bang, ...bangs]
    await chrome.storage.local.set({ "bangs": newBangs })
}

async function deleteBang(shorthand: string) {
    let bangs = await getAllBangs();
    if (await doesBangExist(shorthand)) {
        bangs = bangs.filter(bang => bang.shorthand != shorthand)
        await chrome.storage.local.set({ "bangs": bangs })
    }
}

function createBangEl(name: string, shorthand: string, url: string) {
    const bangItemEl = h("div", ["bang-item", "item"])
    const bangContentEl = h("div", ["bang-content", "item-content"])
    const bangNameEl = h("span", ["bang-name", "item-name"], document.createTextNode(`${name.trim()} (${shorthand.trim()})`))
    const bangUrlEl = h("span", ["bang-url", "item-url"], document.createTextNode(url.trim()))
    const bangDeleteBtnEl = h("button", ["bang-delete-btn", "item-delete-btn"], document.createTextNode("delete"))
    bangDeleteBtnEl.addEventListener("click", e => {
        e.preventDefault()
        deleteBang(shorthand.trim())
        bangItemEl.remove()
    })
    bangContentEl.append(bangNameEl, bangUrlEl)
    bangItemEl.append(bangContentEl, bangDeleteBtnEl)
    return bangItemEl
}

function h(tag: string, classNames?: string[], ...children: (HTMLElement | Text)[]): HTMLElement {
    const el = document.createElement(tag);
    if (classNames) el.classList.add(...classNames);
    children.forEach(child => el.appendChild(child));
    return el;
}


(async () => {
    (await getAllBangs()).forEach(bang => {
        bangsListEl?.prepend(createBangEl(bang.title, bang.shorthand, bang.url))
    });
    (await getAllSearchEngines()).forEach(searchEngine => {
        searchEngineSelectEl?.prepend(createSearchEngineEl(searchEngine.title, searchEngine.url, searchEngine.id))
    });
})()


const id = parseInt(searchEngineSelectEl.value)
const urlEl = searchEngineInfoEl.querySelector("span#search-engine-url") as HTMLSpanElement;
if (id === 0) {
    urlEl.innerText = "no search engine selected";
}