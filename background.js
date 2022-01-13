let isUserAuthorized = !!localStorage.userData;

// Regex-pattern to check URLs against.
// It matches URLs like: http[s]://[...]facebook.com[...]
// let urlRegex = /^https?:\/\/(?:[^.?#]+\.)?facebook\.com\/notifications/;

let pingParser,
    notifyOnce;

chrome.runtime.onInstalled.addListener(details => {
    switch (details.reason) {
        case chrome.runtime.OnInstalledReason.INSTALL:
            console.log('installed')
            localStorage.draft = JSON.stringify([])
            localStorage.ETL = 0
            break
        case chrome.runtime.OnInstalledReason.UPDATE:
            notifyOnce = 0
            localStorage.ETL = 0
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

Array.prototype.diff = function (a) {
    return this.filter(i => a.indexOf(i) < 0)
}

//Sending links to Excel

function sendLinksToExcel(links = []) {
    if (links.length < 1) {
        return true
    } else {
        let ETL = localStorage.ETL
        if(parseInt(ETL) < 2000){
            let myHeaders = new Headers();
            myHeaders.append("Cookie", "NID=220=Krsm92-rZeTv8BjGz2QKt82Pm3HmA74lhl5fG6ksJiPp1NvDU20TuFZwae_1o3FYDlK3cEt9GcLZfxMJ4Nm6IE9LMgjrmxVqMsB3kkdxfJ_idenUjczr5Fwc7CMH16-2ytL02RN_OqMwmHxZfJzAZT5vKp4IyhX-r3jdxILWe20");

            let raw = "";

            let requestOptions = {
                method: 'POST',
                headers: myHeaders,
                body: raw,
                redirect: 'manual'
            };

            links.forEach(el => {
                let link = el.replaceAll('&', '%26')
                fetch(`https://script.google.com/macros/s/AKfycbzb24HrYjMrhCnU3iXL4iI2-BZyH7d8F0DCbTp8spzp8n5GLEoVIsG8ZMPLEDijbDk75w/exec?links=${link}`, requestOptions)
                    .then(response => response.text())
                    .then(() => console.log('sending links...'))
                    .catch(error => console.log('Error\n', error));
            })
        }else{
            console.warn('More than 2.0000 links in your Excel document!')
            return false
        }
    }

}


pingParser = setInterval(() => {
    chrome.storage.sync.get(['isParserStarted'], response => {
        if (response.isParserStarted) {
            chrome.tabs.query(
                //find facebook notification tab opened
                {url: 'https://*.facebook.com/notifications/*'},
                result => {
                    try {
                        if (result.length < 1) {
                            notifyOnce < 1 ? chrome.notifications.create('notify1', notifOpt) : false
                            ++notifyOnce
                            chrome.browserAction.setBadgeText({text: ''})
                            chrome.browserAction.setBadgeBackgroundColor({color: '#0000'})
                            chrome.storage.sync.set({isParserStarted: false})
                            return true
                        } else {
                            chrome.tabs.executeScript(result[0].id, {
                                code: '(' + modifyDOM + ')();'
                            }, results => {
                                void async function () {
                                    localStorage.links = JSON.stringify(
                                        Object.assign({}, liveVideoLinkParse(results[0]))
                                    )
                                }().then(() => {
                                    try {
                                        const _lslToArr = Object.assign([], JSON.parse(localStorage.links))
                                        let _draft = Object.assign([], JSON.parse(localStorage.draft))

                                        if (_draft.length < 1) {
                                            void async function () {
                                                localStorage.draft = JSON.stringify(_lslToArr)
                                            }().then(() => sendLinksToExcel(_lslToArr))
                                            return true
                                        } else {
                                            void async function () {
                                                sendLinksToExcel(_lslToArr.diff(_draft))
                                            }().then(() => localStorage.draft = JSON.stringify(_lslToArr))
                                            return false
                                        }
                                    } catch (e) {
                                        throw new Error(e)
                                    }
                                })
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

//that's the heart of the parser
function liveVideoLinkParse(linksArr = []) {

    let newArr = linksArr.map(l => l.includes("live_video") ? l : null).filter(el => el != null)
    // const linksFromExcl = JSON.parse(localStorage.linksFromExcel)
    if (newArr.length < 1) {
        return []
    } else {
        return newArr.map((_l) => {
            if (_l !== null) {
                const _cut = _l.split('?')[0]
                let videoCode = _cut.replace(/\D/g, "")
                let channelName = _cut.replace("https://www.facebook.com/", "").split('/').splice(0)[0]
                return `https://www.facebook.com/plugins/video.php?height=314&href=https://www.facebook.com/${channelName}/videos/${videoCode}/&show_text=false&width=560&t=0`
            } else {
                return null
            }
        })
    }

}

function modifyDOM() {
    let arr = [];
    let linksWrapper = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]>div[role="gridcell"]>a')
    linksWrapper.forEach(el => {
        arr.push(el.href)
    })
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
    }else if(request.message === 'refresh-data') {
        sendResponse({message: 'success'})
    }

    return true
})
