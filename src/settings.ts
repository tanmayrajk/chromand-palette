const bangsFormEl = document.getElementById("bang-form")
const bangsListEl = document.getElementById("bangs-list")
const searchFormEl = document.getElementById("search-form")
const customEnginesListEl = document.getElementById("custom-engines-list")
// const searchEngineSelectEl = document.getElementById("search-engine")

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
    customEnginesListEl?.prepend(createSearchEngineEl(nameInput.value, urlInput.value, id))
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
    const searchItemEl = h("div", ["search-item", "item"]);
    const searchContentEl = h("div", ["search-content", "item-content"]);
    const searchNameEl = h("span", ["search-name", "item-name"], document.createTextNode(`${name.trim()}`))
    const searchUrlEl = h("span", ["search-urll", "item-url"], document.createTextNode(url.trim()));
    const searchDeleteBtnEl = h("button", ["search-delete-btn", "item-delete-btn"], document.createTextNode("delete"))
    searchDeleteBtnEl.addEventListener("click", e => {
        e.preventDefault();
        deleteSearchEngine(id);
        searchItemEl.remove();
    })
    searchContentEl.append(searchNameEl, searchUrlEl)
    searchItemEl.append(searchContentEl, searchDeleteBtnEl)
    return searchItemEl
}

async function deleteSearchEngine(id: number) {
    let searchEngines = await getAllSearchEngines();
    searchEngines = searchEngines.filter(e => e.id != id)
    await chrome.storage.local.set( { searchEngines } )
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
        customEnginesListEl?.prepend(createSearchEngineEl(searchEngine.title, searchEngine.url, searchEngine.id))
    })
})()