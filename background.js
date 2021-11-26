let isUserAuthorized = true;

// chrome.browserAction.onClicked.addListener(() => {
//     chrome.windows.create({
//         url: './popup.html',
//         width: 300,
//         height: 600,
//         focused: true
//     });
// })
chrome.runtime.onInstalled.addListener((reason) => {
    if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'is_user_login') {
        sendResponse({
            message: 'success',
            payload: isUserAuthorized
        })
    } else if (request.message === 'user_logout') {
        isUserAuthorized = false
        sendResponse({message: 'success'})
    } else if (request.message === 'user_login') {
        isUserAuthorized = true;
        sendResponse({message: 'success'})
    } else if (request.user_data) {
        let parsedData = JSON.parse(request.user_data);
        localStorage.token = parsedData.user.stsTokenManager.accessToken
        localStorage.userData = request.user_data;
        sendResponse({message: 'success'})
    } else if (request.message === 'start_parser') {

        // var urlRegex = /^https?:\/\/(?:[^./?#]+\.)?facebook\.com/;

        // A function to use as callback
        function doStuffWithDom(domContent) {
            console.log('I received the following DOM content:\n' + domContent);
        }

        // When the browser-action button is clicked...
        chrome.browserAction.onClicked.addListener(function (tab) {
            // ...check the URL of the active tab against our pattern and...
            chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, doStuffWithDom);
        });
    }

    return true
})
