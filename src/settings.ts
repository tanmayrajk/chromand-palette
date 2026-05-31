const bangsFormEl = document.getElementById("bang-form")
const bangsListEl = document.getElementById("bangs-list")
const regex = new RegExp(
    "^[a-zA-Z][a-zA-Z0-9+.-]*:\\/\\/[^\\/\\s]+.*%s.*$"
);

interface bang {
    title: string,
    shorthand: string;
    url: string,
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
    })
})()