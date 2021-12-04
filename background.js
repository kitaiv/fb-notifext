let isUserAuthorized = true;

// Regex-pattern to check URLs against.
// It matches URLs like: http[s]://[...]facebook.com[...]
// let urlRegex = /^https?:\/\/(?:[^.?#]+\.)?facebook\.com\/notifications/;

let pingParser,
    notifyOnce;

chrome.runtime.onInstalled.addListener(details => {
    switch (details.reason) {
        case chrome.runtime.OnInstalledReason.INSTALL:
            console.log('installed')
            break
        case chrome.runtime.OnInstalledReason.UPDATE:
            notifyOnce = 0
            break
        default:
            console.log('[onInstalled] default')
    }
});

const notifOpt = {
    iconUrl: "assets/img/logo64.png",
    title: "Parser has been stopped",
    message: "Parser stopped because facebook notifications tab has been closed!",
    priority: 2,
    type: "basic"
}

notifyOnce = 0

pingParser = setInterval(() => {
    chrome.storage.sync.get(['isParserStarted'], response => {
        if (response.isParserStarted)    {
            chrome.tabs.query(
                {url: 'https://*.facebook.com/notifications/*'},
                    result => {
                try {
                    if (result.length < 1) {
                        notifyOnce < 1 ? chrome.notifications.create('notify1', notifOpt) : false
                        ++notifyOnce
                        chrome.browserAction.setBadgeText({text: ''})
                        chrome.browserAction.setBadgeBackgroundColor({color: '#0000'})
                        chrome.storage.sync.set({isParserStarted: false})
                        console.log('tab has been closed')
                        return true
                    } else {
                        chrome.tabs.executeScript(result[0].id, {
                            code: '(' + modifyDOM + ')();'
                        }, results => {
                            localStorage.links = JSON.stringify(
                                Object.assign({}, liveVideoLinkParse(results[0]))
                            )
                        })
                    }
                } catch (err) {
                    console.error('[background.js] ERROR: \n', err)
                }
            })
        } else {
            return false
        }
    })
}, 3000)

Array.prototype.diff = function (a) {
    return this.filter(i => a.indexOf(i) < 0)
}

function liveVideoLinkParse(linksArr = []) {
    let newArr = linksArr.map(l => l.includes("live_video") ? l : null).filter(el => el != null)
    const linksFromDB = JSON.parse(localStorage.linksFromDatabase)
    if (newArr.length < 1) {
        console.log('no links to parse')
        return []
    } else {
        const transformatedLinks = newArr.map((_l) => {
            if (_l !== null) {
                const _cut = _l.split('?')[0]
                let videoCode = _cut.replace(/\D/g, "")
                let channelName = _cut.replace("https://www.facebook.com/", "").split('/').splice(0)[0]

                return `https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2F${channelName}%2Fvideos%2F${videoCode}%2F&show_text=false&width=560&t=0`
            } else {
                console.log("null")
                return null
            }
        })
        if (transformatedLinks.diff(linksFromDB).length < 1) {
            console.log('no available links to parse...')
        } else {
            console.log('the are new links to parse...')
        }
        return transformatedLinks.diff(linksFromDB)
    }

}

function modifyDOM() {
    let arr = [];
    let linksWrapper = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]>div[role="gridcell"]>a')
    linksWrapper.forEach(el => {
        arr.push(el.href)
    })
    console.log('got array: ', arr)
    return arr
}

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
        let parsedData = JSON.parse(request.user_data)
        localStorage.token = parsedData.user.stsTokenManager.accessToken
        localStorage.userData = request.user_data
        sendResponse({message: 'success'})
    } else if (request.message === 'on') {
        chrome.browserAction.setBadgeText({text: 'ON'})
        chrome.browserAction.setBadgeBackgroundColor({color: '#4688F1'})
    } else if (request.message === 'off') {
        chrome.browserAction.setBadgeText({text: ''})
        chrome.browserAction.setBadgeBackgroundColor({color: '#0000'})
    } else if (request.message === 'get_fb_tab') {
        chrome.tabs.query({
            url: 'https://www.facebook.com/notifications'
        }, tabs => {
            sendResponse({message: 'success', data: tabs})
        })
    }

    return true
})
