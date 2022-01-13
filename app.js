'use strict'

const extId = chrome.runtime.id
const baseAppUrl = `chrome-extension://${extId}/`


if (window.location.href === baseAppUrl + 'main.html') {
    const popover = document.querySelector('#show-popover')
    changeStatus({
        'active': 'none',
        'count-loader': 'none'
    })
    document.addEventListener('click', e => {
        if(e.target.id === 'more-btn' || e.target.classList.contains('is-open')){
            return true
        }else{
            popover.classList.remove('is-open')
            e.stopPropagation()
        }
    })
    document.querySelector('#more-btn').addEventListener('click', e => {
        if (popover.classList.contains('is-open')) {
            popover.classList.remove('is-open')
            e.stopPropagation()
            e.preventDefault()
        } else {
            popover.classList.add('is-open')
        }
    })
    document.querySelector('#logout').addEventListener('click', () => {
        chrome.runtime.sendMessage({message: 'user_logout'}, (response) => {
            if (response.message === 'success') {
                //logic here
                localStorage.clear();
                toggleParser(false)
                window.location.replace("./popup.html")
                console.log('redirecting...')
            }
        })
    })

    document.querySelector('#refresh').addEventListener('click', () => {
        chrome.runtime.sendMessage({message: 'refresh-data'}, (response) => {
            if (response.message === 'success') {
                getLinks({refresh: true})
            } else {
                console.error("ERROR: Couldn't refresh data...")
            }
        })
    })
}

const output = document.querySelector('#count'),
    collectedLinksAmount = document.querySelector('#added'),
    toggleStart = document.querySelector('#toggleStart');

function loaded(isLoaded){
    if (isLoaded) {
        changeStatus({
            'collectedLinksWrapper': 'none',
            'loader': 'none'
        })
    } else {
        changeStatus({
            'collectedLinksWrapper': 'inline-block',
            'loader': 'inline-flex'
        })
    }
}

function totalLoaded(isLoaded){
    if(isLoaded){
        changeStatus({
            'count-loader': 'none',
            'count': 'inline-block'
        })
        toggleStart.removeAttribute('disabled')
    }else{
        changeStatus({
            'count-loader': 'inline-block',
            'count': 'none'
        })
        toggleStart.setAttribute('disabled', '')
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
        changeStatus({
            'inactive': 'none',
            'active': 'block'
        })
        toggleStart.checked = true
    } else {
        loaded(true)
        changeStatus({
            'inactive': 'block',
            'active': 'none'
        })
        toggleStart.checked = false
    }
})

//Fetching links from real-time database
function getLinks(r) {
    let {refresh} = r ?? {},
        refreshed = refresh ?? false;

    chrome.storage.sync.get(['isParserStarted'], result => {
        totalLoaded(false)
        const url = "https://script.google.com/macros/s/AKfycbzb24HrYjMrhCnU3iXL4iI2-BZyH7d8F0DCbTp8spzp8n5GLEoVIsG8ZMPLEDijbDk75w/exec?links"
        try {
            fetch(url, {
                method: 'GET',
                redirect: 'follow'
            })
                .then(response => response.json())
                .then(result => {
                    let {data} = result
                    return data.filter(el => el !== "")
                })
                .then(filterData => {
                    const fdl = filterData.length
                    fdl !== localStorage.ETL ? localStorage.ETL = fdl : false
                    if (fdl > 0) {
                        // if(fdl < 500) {
                        //     localStorage.linksFromExcel = JSON.stringify(filterData)
                        // }else{
                        //     localStorage.linksFromExcel ? localStorage.removeItem(linksFromExcel) : null
                        // }
                        output.textContent = new Intl.NumberFormat('en-IN').format(fdl)
                        totalLoaded(true)
                        if (refreshed || result.isParserStarted) {
                            changeStatus('loader', 'inline-flex')
                        } else {
                            changeStatus('loader', 'none')
                        }
                        return true
                    } else {
                        output.textContent = "0"
                        // localStorage.linksFromExcel = JSON.stringify([]);
                        console.log('no links in database')
                        totalLoaded(true)
                        if (refreshed || result.isParserStarted) {
                            changeStatus('loader', 'inline-flex')
                        } else {
                            changeStatus('loader', 'none')
                        }
                        return true
                    }
                })
                .catch(err => {
                    console.log(err)
                })
        } catch (err) {
            throw new Error(err)
        }
    })
}

getLinks()

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
            localStorage.draft = JSON.stringify([])
            let localLinksToObj = async () => JSON.parse(localStorage.links)
            localLinksToObj().then(result => {
                if(Object.values(result).length < 1){
                    return false
                }else{
                    localStorage.links = JSON.stringify({})
                    collectedLinksAmount.textContent = '0'
                    return true
                }
            })

        }

        clearInterval(pingParser)
        getLinks()
        return true
    }
}

//flexible function that changes visibility of specific element that was provided in object callback by Id
function changeStatus(obj){
    if(!obj) return false;
    try {
        for( let key in obj){
            document.querySelector(`#${key}`).style.display = obj[key]
        }
    }catch (e) {
        console.warn(e)
    }

}

document.addEventListener('DOMContentLoaded', () => {
    changeStatus({
        'error-alert': 'none'
    })
    toggleStart.addEventListener('click', e => {
        const toggler = e.target;
        //Parser has been started
        if (toggler.checked) {
            //should add some logic here
            chrome.runtime.sendMessage({message: 'get_fb_tab'}, response => {
                if (response.data.length < 1) {
                    //facebook notification tab is NOT opened
                    toggler.checked = false
                    changeStatus({
                        'error-alert': 'none'
                    })
                    setTimeout(() => {
                        changeStatus({
                            'error-alert': 'block'
                        })
                    }, 500)
                    return true
                }else {
                    //facebook notification tab is opened
                    changeStatus({
                        'active': 'block',
                        'inactive': 'none',
                        'loader': 'inline-flex'
                    })
                    chrome.storage.sync.set({isParserStarted: true})
                    loaded(false)
                    //this function is used in the specific app with it was started on, not in your chrome extension popup
                    toggleParser(true)
                    chrome.runtime.sendMessage({message: 'on'})
                    return false
                }
            })

            return true;
        }
        //Parser has been stopped
        else {
            //have to add some logic here
            try{
                chrome.storage.sync.set({isParserStarted: false})
                changeStatus({
                    'inactive': 'block',
                    'active': 'none',
                    'loader': 'none'
                })
                chrome.runtime.sendMessage({message: 'off'})
                loaded(true)
                toggleParser(false)
            }catch (e) {
                throw new Error(e)
            }
            return false;
        }
    })
})
