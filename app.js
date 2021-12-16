'use strict'

const extId = chrome.runtime.id
const baseAppUrl = `chrome-extension://${extId}/`


if (window.location.href === baseAppUrl + 'main.html') {
    const popover = document.querySelector('#show-popover')
    changeStatus({
        'active': 'none'
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
                window.location.replace("./popup.html")
                console.log('redirecting...')
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
            'count': 'inline',
            'collectedLinksWrapper': 'none',
            'loader': 'none'
        })
    } else {
        changeStatus({
            'count': 'none',
            'collectedLinksWrapper': 'inline-block',
            'loader': 'block'
        })
    }
}

function totalLoaded(isLoaded){
    if(isLoaded){
        changeStatus({
            'count': 'inline',
            'loader': 'none'
        })
        toggleStart.removeAttribute('disabled')
    }else{
        changeStatus({
            'count': 'none',
            'loader': 'block'
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
function getLinks(){
    chrome.storage.sync.get(['isParserStarted'], result => {
        if(result.isParserStarted){
            return true
        }else{
            totalLoaded(false)
            const url = "https://script.google.com/macros/s/AKfycbwYfeFIu2cBxmRnbsGmEnV2WUrr6R2Z4jMbLpMfyMhw9l6vEZnZJnbAAVLjkN0nsPvuJg/exec?links"
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
                    if(filterData.length > 0){
                        localStorage.linksFromExcel = JSON.stringify(filterData)
                        output.textContent = JSON.stringify(filterData.length)
                        totalLoaded(true)
                    }else{
                        output.textContent = "0"
                        localStorage.linksFromExcel = JSON.stringify([]);
                        console.log('no links in database')
                        totalLoaded(true)
                        return true
                    }
                })
                .catch(err => console.log(err))
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
                        'loader': 'block'
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


