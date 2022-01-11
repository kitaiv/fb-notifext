const firebaseConfig = {
    apiKey: "AIzaSyBbZMBIgpVZYD6armlG2T2w8APlNpxRi84",
    authDomain: "fb-notifext-3878d.firebaseapp.com",
    projectId: "fb-notifext-3878d",
    storageBucket: "fb-notifext-3878d.appspot.com",
    messagingSenderId: "264619249766",
    appId: "1:264619249766:web:a6314cd62f00030bb95da7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

//Initialize Database

// Initialize the FirebaseUI Widget using Firebase.
const ui = new firebaseui.auth.AuthUI(firebase.auth());


const uiConfig = {
    callbacks: {
        signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            chrome.runtime.sendMessage({message: 'user_login'}, (response) => {
                switch(response.message){
                    case 'success':
                        window.location.replace('./popup.html')
                        localStorage.draft = JSON.stringify([])
                        chrome.tabs.create({ url: "https://www.facebook.com/notifications" });
                        return true
                    case 'error':
                        throw new Error('Some error occurred!')
                    default: break
                }
            })

            chrome.runtime.sendMessage({user_data: JSON.stringify(authResult)}, (response) => {
                switch(response.message){
                    case 'success':
                        return true
                    case 'error':
                        throw new Error('Some error occurred!')
                    default: break
                }
            })
            return false;
        },
        uiShown: function () {
            // The widget is rendered.
            // Hide the loader.
            document.getElementById('loader').style.display = 'none';
        }
    },
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    signInFlow: 'popup',
    //signInSuccessUrl: '<url-to-redirect-to-on-success>',
    signInOptions: [
        // Leave the lines as is for the providers you want to offer your users.
        firebase.auth.FacebookAuthProvider.PROVIDER_ID,
    ],
    // Terms of service url.
    // tosUrl: '<your-tos-url>',
    // Privacy policy url.
    // privacyPolicyUrl: '<your-privacy-policy-url>'
};
ui.start('#firebaseui-auth-container', uiConfig);
