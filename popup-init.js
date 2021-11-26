function init() {
    chrome.runtime.sendMessage({message: 'is_user_login'}, (response) => {
        if(response.message === 'success' && response.payload){
            window.location.replace('./main.html')
        }
    })
}

init();
