const bangsFormEl = document.getElementById("bang-form")
const bangsListEl = document.getElementById("bangs-list")
const regex = new RegExp(
    "^[a-zA-Z][a-zA-Z0-9+.-]*:\\/\\/[^\\/\\s]+.*%s.*$"
);

interface bang {
    title: string,
    url: string,
    timeCreated: number
}

bangsFormEl?.addEventListener('submit', async e => {
    e.preventDefault()

    const nameInput = (bangsFormEl.querySelector('input#bang-name-input') as HTMLInputElement);
    const urlInput = (bangsFormEl.querySelector('input#bang-url-input') as HTMLInputElement);

    if (await doesBangExist(nameInput.value)) {
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

    await addBang(nameInput.value, urlInput.value)
    bangsListEl.prepend(createBangEl(nameInput.value, urlInput.value))

    nameInput.value = "";
    urlInput.value = "";

})

async function doesBangExist(name: string) {
    const bangs = await getAllBangs();
    const isBangAlreadyThere = bangs.some(bang => bang.title === name.trim())
    return isBangAlreadyThere
}

async function getAllBangs() {
    const res = await chrome.storage.local.get("bangs")
    return res.bangs as bang[]
}

async function addBang(name: string, url: string) {
    const bangs = await getAllBangs();
    const bang = { title: name.trim(), url: url.trim(), timeCreated: Date.now() }
    const newBangs = [bang, ...bangs]
    await chrome.storage.local.set({ "bangs": newBangs })
}

async function deleteBang(name: string) {
    let bangs = await getAllBangs();
    if (await doesBangExist(name)) {
        bangs = bangs.filter(bang => bang.title != name)
        await chrome.storage.local.set({ "bangs": bangs })
    }
}

function createBangEl(name: string, url: string) {
    const bangItemEl = h("div", ["bang-item"])
    const bangContentEl = h("div", ["bang-content"])
    const bangNameEl = h("span", ["bang-name"], document.createTextNode(name.trim()))
    const bangUrlEl = h("span", ["bang-url"], document.createTextNode(url.trim()))
    const bangDeleteBtnEl = h("button", ["bang-delete-btn"], document.createTextNode("delete"))
    bangDeleteBtnEl.addEventListener("click", e => {
        e.preventDefault()
        deleteBang(name.trim())
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
    ((await getAllBangs()).sort((a, b) => b.timeCreated - a.timeCreated)).forEach(bang => {
        bangsListEl?.prepend(createBangEl(bang.title, bang.url))
    })
})()