chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-palette') {
        console.log("hi lol");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id!, { action: 'toggle-palette' })
        })
    }
})

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'request-tabs') {
        console.log("yaya")
        chrome.tabs.query({}, (tabs) => {
            sendResponse({ tabs })
        });

        return true;
    }
})



// chrome.tabs.query({}, (tabs) => {
//     for (const tab of tabs) {
//         console.log(tab.url);
//     }
// })