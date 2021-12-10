'use strict'

const extId = chrome.runtime.id
const baseAppUrl = `chrome-extension://${extId}/`

if (window.location.href === baseAppUrl + 'main.html') {
    const active = document.querySelector('#active')
    const popover = document.querySelector('#show-popover')
    active.style.display = 'none';
    document.querySelector('#more-btn').addEventListener('click', e => {
        if (popover.classList.contains('is-open')) {
            popover.classList.remove('is-open')
            e.stopPropagation()
        } else {
            popover.classList.add('is-open')
        }
    })
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
    collectedLinksAmount = document.querySelector('h3>strong>mark'),
    collectedLinksWrapper = document.querySelector('strong'),
    toggleStart = document.querySelector('#toggleStart');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // If the received message has the expected format...
    if (msg.text === 'report_back') {
        // Call the specified callback, passing
        // the web-page's DOM content as argument
        sendResponse(document.innerHTML);
    }
});

const changeStatus = (itemId, property) => document.querySelector(`#${itemId}`).style.display = property

const loaded = isLoaded => {
    if (isLoaded) {
        output.style.display = 'inline'
        collectedLinksWrapper.style.display = 'none'
        changeStatus('loader', 'none')
    } else {
        output.style.display = 'none'
        collectedLinksWrapper.style.display = 'inline'
        changeStatus('loader', 'block')
    }
}


//this function could be useful because it gets a video code
const getVideoCode = (link = '') => link.split("?")[1].split("&")[1].split("%")[6].slice(2)

const data =
    localStorage.getItem('userData') ? JSON.parse(localStorage.userData) : null
const user = data ? data.user : undefined

if (user) {
    document.querySelector('#displayName').textContent = user.displayName
    document.querySelector('#userPic').setAttribute('src', data.additionalUserInfo.profile.picture.data.url)
}

chrome.storage.sync.get(['isParserStarted'], result => {
    if (result.isParserStarted) {
        loaded(false)
        collectedLinksAmount.textContent = Object.values(JSON.parse(localStorage.links)).length
        changeStatus('inactive', 'none')
        changeStatus('active', 'block')
        toggleStart.checked = true
    } else {

        loaded(true)
        changeStatus('inactive', 'block')
        changeStatus('active', 'none')
        toggleStart.checked = false
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
            let localLinksToObj = async () => JSON.parse(localStorage.links)
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
    changeStatus('error-alert', 'none')
    localStorage.excelLinks = JSON.stringify([])
    toggleStart.addEventListener('click', e => {
        const toggler = e.target;
        //Parser has been started
        if (toggler.checked) {
            //should add some logic here
            chrome.runtime.sendMessage({message: 'get_fb_tab'}, response => {
                if (response.data.length < 1) {
                    //facebook notification tab is NOT opened
                    toggler.checked = false
                    changeStatus('error-alert', 'none')
                    setTimeout(() => {
                        changeStatus('error-alert', 'block')
                    }, 500)
                }else {
                    //facebook notification tab is opened
                    changeStatus('active', 'block')
                    changeStatus('inactive', 'none')
                    changeStatus('loader', 'block')

                    chrome.storage.sync.set({isParserStarted: true})
                    loaded(false)
                    //this function is used in the specific app with it was started on, not in your chrome extension popup
                    toggleParser(true)
                    chrome.runtime.sendMessage({message: 'on'})
                }
            })

            return true;
        }
        //Parser has been stopped
        else {
            //have to add some logic here
            chrome.storage.sync.set({isParserStarted: false})
            changeStatus('inactive', 'block')
            changeStatus('active', 'none')
            changeStatus('loader', 'none')

            chrome.runtime.sendMessage({message: 'off'})

            loaded(true)
            toggleParser(false)

            return false;
        }
    })
})


