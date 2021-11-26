'use strict'

//https://www.facebook.com/NovitalsAU/videos/266031965575071/
//transform FROM:
//https://www.facebook.com/NovitalsAU/videos/266031965575071/?notif_id=1637655624284971&notif_t=live_video&ref=notif
//transform TO:
//https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2FNovitalsAU%2Fvideos%2F266031965575071%2F&show_text=false&width=560&t=0

const baseAppUrl = 'chrome-extension://djghdfbojnlcjfjoeipfgdkpngildnmb/'

if(window.location.href === baseAppUrl + 'main.html'){
    document.querySelector('#logout').addEventListener('click', () => {
        chrome.runtime.sendMessage({message: 'user_logout'}, (response) => {
            if (response.message === 'success') {
                //logic here
                window.location.replace("./popup.html")
                console.log('redirecting...')
            }
        })
    })
}

const output = document.querySelector('#count'),
    loader = document.querySelector('.loading'),
    collectedLinksAmount = document.querySelector('h3>strong>mark'),
    collectedLinksWrapper = document.querySelector('strong')


const loaded = isLoaded => {
    if(isLoaded){
        loader.style.display = 'none'
        output.style.display = 'inline'
        collectedLinksWrapper.style.display = 'none'
    }else{
        loader.style.display = 'inline-block'
        output.style.display = 'none'
        collectedLinksWrapper.style.display = 'inline'
    }
}

const checkLinkForUnique = async (linksArr = []) => {
    const linksFromDatabase = localStorage.linksFromDatabase;
}

const getVideoCode = (link = '') => link.split("?")[1].split("&")[1].split("%")[6].slice(2)

const data = JSON.parse(localStorage.userData),
    user = data.user;

if (!user) {
    throw new Error("User not found!")
} else {
    document.querySelector('h3 span').textContent = user.displayName
}

const baseImgPath = 'assets/img/'
const startBtn = document.querySelector('#start')

chrome.storage.sync.get(['isParserStarted'], result => {
    if(result.isParserStarted){
        startBtn.setAttribute('src', baseImgPath + 'pause48.png')
        loaded(false)
        collectedLinksAmount.textContent = Object.values(JSON.parse(localStorage.links)).length
    }else{
        startBtn.setAttribute('src', baseImgPath + 'start48.png')
        loaded(true)
    }
});

Array.prototype.diff = function(a) {
    return this.filter(function(i){return a.indexOf(i) < 0;});
};

function liveVideoLinkParse(linksArr = []) {
    let newArr = linksArr.map(l => l.includes("live_video") ? l : null).filter(el => el != null)
    const linksFromDB = JSON.parse(localStorage.linksFromDatabase)
    if(newArr.length === 0){
        console.log('no links to parse')
        return []
    }else{
        const transformatedLinks = newArr.map((_l) => {
            if (_l !== null) {
                const _cut = _l.split('?')[0]
                let videoCode = _cut.replace(/\D/g, "")
                let channelName = _cut.replace("https://www.facebook.com/", "").split('/').splice(0)[0]

                return `https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2F${channelName}%2Fvideos%2F${videoCode}%2F&show_text=false&width=560&t=0`
            } else {
                console.log("null")
                return null;
            }
        })
        return linksFromDB.length < 1 ? transformatedLinks : linksFromDB.diff(transformatedLinks)
    }

}

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

                        // newArr.push(result[property].href)
                    }
                    if(newArr.length > 0){
                        loaded(true)
                        localStorage.linksFromDatabase = JSON.stringify(newArr)
                        output.textContent = JSON.stringify(newArr.length)
                        console.log("result of getting links from database: ", result)
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
getLinks();

function sendLinks(links = {}){
    const parsedToObj = JSON.parse(links)
    const data = JSON.stringify({
        href: parsedToObj
    })
    if(Object.values(parsedToObj).length < 1){
        console.warn("Links hasn't been sent cause no links's been collected")
        return true
    }else{
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

function modifyDOM() {
    //You can play with your DOM here or check URL against your regex
    // console.log('Tab script:');
    // console.log(document.body);
    let arr = [];
    let linksWrapper = document.querySelectorAll('div[data-visualcompletion="ignore-dynamic"]>div[role="gridcell"]>a')
    linksWrapper.forEach(el => {
        arr.push(el.href)
    })
    return arr
}

let pingParser;
function toggleParser(isStarted) {
    if(isStarted){
        pingParser = setInterval(() => {
            chrome.tabs.executeScript({
                code: '(' + modifyDOM + ')();' //argument here is a string but function.toString() returns function's code
            }, (results) => {
                //Here we have just the innerHTML and not DOM structure
                localStorage.links = JSON.stringify(
                    Object.assign({}, liveVideoLinkParse(results[0]))
                )

                collectedLinksAmount.textContent = Object.values(JSON.parse(localStorage.links)).length

                // let links = JSON.parse(localStorage.links)
                // const totalLinksAmount = Object.values(links).length
                // output.textContent = JSON.stringify(totalLinksAmount)
                // let parser = new DOMParser();
                // let doc = parser.parseFromString(results, "application/xml");
            });
        }, 4000)
    }else{
        if(localStorage.links === null || undefined){
            throw new Error('no such item in Local Storage!')
        }else{
            let localLinksToObj = async () => JSON.parse(localStorage.links);
            localLinksToObj().then(result => {
                if(Object.values(result).length < 1){
                    return false;
                }else{
                    sendLinks(localStorage.links)
                    console.log('clear local storage links here')
                    localStorage.links = JSON.stringify({})
                    collectedLinksAmount.textContent = '0'
                    return true
                }
            })

        }

        clearInterval(pingParser)
        console.log('parser has been stopped...')
        return true;
    }
}

void function () {
    startBtn.addEventListener('click', () => {
        const startImgSrc = startBtn.getAttribute('src')

        //Parser has been started
        if (startImgSrc === baseImgPath + 'start48.png') {
            //should add some logic here
            startBtn.setAttribute('src', baseImgPath + 'pause48.png')
            chrome.storage.sync.set({isParserStarted: true});
            loaded(false)
            //this function is used in the specific app with it was started on, not in your chrome extension popup
            toggleParser(true)

            return true;
        }
        //Parser has been stopped
        if (startImgSrc === baseImgPath + 'pause48.png') {
            //should add some logic here
            chrome.storage.sync.set({isParserStarted: false});
            startBtn.setAttribute('src', baseImgPath + 'start48.png')
            loaded(true)
            toggleParser(false)
            return true;
        }
    })
}()


