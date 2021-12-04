'use strict'

//https://www.facebook.com/NovitalsAU/videos/266031965575071/
//transform FROM:
//https://www.facebook.com/NovitalsAU/videos/266031965575071/?notif_id=1637655624284971&notif_t=live_video&ref=notif
//transform TO:
//https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2FNovitalsAU%2Fvideos%2F266031965575071%2F&show_text=false&width=560&t=0

const extId = chrome.runtime.id
const baseAppUrl = `chrome-extension://${extId}/`

if (window.location.href === baseAppUrl + 'main.html') {
    document.querySelector('#logout').addEventListener('click', () => {
        chrome.runtime.sendMessage({message: 'user_logout'}, (response) => {
            if (response.message === 'success') {
                //logic here
                localStorage.clear();
                window.location.replace("./popup.html")
                console.log('redirecting...')
            }
        })
    })
}

const output = document.querySelector('#count'),
    loader = document.querySelector('.loading'),
    collectedLinksAmount = document.querySelector('h3>strong>mark'),
    collectedLinksWrapper = document.querySelector('strong'),
    exportButton = document.querySelector('#export');




chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // If the received message has the expected format...
    if (msg.text === 'report_back') {
        // Call the specified callback, passing
        // the web-page's DOM content as argument
        sendResponse(document.innerHTML);
    }
});

const loaded = isLoaded => {
    if (isLoaded) {
        loader.style.display = 'none'
        output.style.display = 'inline'
        collectedLinksWrapper.style.display = 'none'
    } else {
        loader.style.display = 'inline-block'
        output.style.display = 'none'
        collectedLinksWrapper.style.display = 'inline'
    }
}


//this function could be useful because it gets a video code to compare from parsed links
const getVideoCode = (link = '') => link.split("?")[1].split("&")[1].split("%")[6].slice(2)

const data =
    localStorage.getItem('userData') ? JSON.parse(localStorage.userData) : null
const user = data ? data.user : undefined

if(user) document.querySelector('h3 span').textContent = user.displayName


const baseImgPath = 'assets/img/'
const startBtn = document.querySelector('#start')

chrome.storage.sync.get(['isParserStarted'], result => {
    if (result.isParserStarted) {
        startBtn.setAttribute('src', baseImgPath + 'pause48.png')
        loaded(false)
        collectedLinksAmount.textContent = Object.values(JSON.parse(localStorage.links)).length
    } else {
        startBtn.setAttribute('src', baseImgPath + 'start48.png')
        loaded(true)
    }
})

//Fetching links from real-time database
function getLinks(){
    chrome.storage.sync.get(['isParserStarted'], result => {
        if(result.isParserStarted){
            return true
        }else{
            fetch("https://fb-notifext-3878d-default-rtdb.europe-west1.firebasedatabase.app/links.json", {
                method: 'GET',
                redirect: 'follow'
            })
                .then(response => response.json())
                .then(result => {
                    let newArr = []
                    for(const property in result){
                        let tr = typeof result[property].href === 'string' ? JSON.parse(result[property].href) : result[property].href
                        if(Array.isArray(tr) || Object.values(tr).length > 1){
                            //if array transform here
                            tr.forEach(_ll => {
                                newArr.push(_ll)
                            })
                        }else{
                            //if not array return link
                            newArr.push(JSON.parse(result[property].href)[0])
                        }
                    }
                    if(newArr.length > 0){
                        loaded(true)
                        localStorage.linksFromDatabase = JSON.stringify(newArr)
                        output.textContent = JSON.stringify(newArr.length)
                    }else{
                        output.textContent = "0"
                        localStorage.linksFromDatabase = JSON.stringify([]);
                        console.log('no links in database')
                        return true
                    }
                })
                .catch(err => console.log(err))
        }
    })
}

getLinks()

//Sending links to the database
function sendLinks(links = {}) {
    const parsedToObj = JSON.parse(links)
    const data = JSON.stringify({
        href: parsedToObj
    })
    if (Object.values(parsedToObj).length < 1) {
        console.warn("Links hasn't been sent cause no links were collected")
        return true
    } else {
        fetch('https://fb-notifext-3878d-default-rtdb.europe-west1.firebasedatabase.app/links.json', {
            method: 'POST',
            redirect: 'follow',
            body: data
        })
            .then(response => response)
            .then(result => getLinks())
            .catch(err => console.error(err))
    }
}

let pingParser;

function toggleParser(isStarted) {
    if (isStarted) {
        pingParser = setInterval(() => {
            collectedLinksAmount.textContent = Object.values(JSON.parse(localStorage.links)).length
        }, 4000)
    } else {
        if(localStorage.links === null || undefined){
            throw new Error('no such item in Local Storage!')
        }else{
            let localLinksToObj = async () => JSON.parse(localStorage.links);
            localLinksToObj().then(result => {
                if(Object.values(result).length < 1){
                    return false
                }else{
                    sendLinks(localStorage.links)
                    localStorage.links = JSON.stringify({})
                    collectedLinksAmount.textContent = '0'
                    return true
                }
            })

        }

        clearInterval(pingParser)
        getLinks()
        console.log('parser has been stopped...')
        return true
    }
}

document.addEventListener('DOMContentLoaded', () => {
    startBtn.addEventListener('click', () => {
        const startImgSrc = startBtn.getAttribute('src')

        //Parser has been started
        if (startImgSrc === baseImgPath + 'start48.png') {
            //should add some logic here
            chrome.runtime.sendMessage({message: 'get_fb_tab'}, response => {
                if(response.data.length < 1){
                    //facebook notification tab is NOT opened
                    document.querySelector('.notifs>p').textContent = ''
                    setTimeout(() => {
                        document.querySelector('.notifs>p').textContent = 'Cannot start parsing. Facebook' +
                            ' notifications' +
                            ' tab is not opened!'
                    }, 500)
                }else{
                    //facebook notification tab is opened
                    startBtn.setAttribute('src', baseImgPath + 'pause48.png')
                    chrome.storage.sync.set({isParserStarted: true})
                    loaded(false)
                    //this function is used in the specific app with it was started on, not in your chrome extension popup
                    toggleParser(true)
                    exportButton.style.cursor = 'not-allowed'
                    chrome.runtime.sendMessage({message: 'on'})
                }
            })

            //Background script
            return true
        }

        //Parser has been stopped
        if (startImgSrc === baseImgPath + 'pause48.png') {
            //should add some logic here
            chrome.storage.sync.set({isParserStarted: false})
            startBtn.setAttribute('src', baseImgPath + 'start48.png')

            chrome.runtime.sendMessage({message: 'off'})

            loaded(true)
            toggleParser(false)
            exportButton.style.cursor = 'pointer'

            return false
        }
    })
})


