const defaultOptions = {
    "hide-notification": false,
    "hide-rooms": false,
    "except-room": "admin",
    "auto-join-room": false,
    "auto-join-room-name": "",
    "keep-background": true,
    "tags": "beach",
    "origin-bg": "",
    "background": "",
    "width": 1200,
    "height": 640
};
const options = { ...defaultOptions };

let loading = document.getElementById('loading');
let errorElm = document.getElementById('error');

let spaceSizeP = document.getElementById('space-size');
let resetBtn = document.getElementById('reset');
let notificationIpt = document.getElementById('hide-notification');

let roomsIpt = document.getElementById('hide-rooms');
let exceptRoomIpt = document.getElementById('except-room');

let autoJoinRoomIpt = document.getElementById('auto-join-room');
let autoJoinRoomNameIpt = document.getElementById('auto-join-room-name');

let tagIpt = document.getElementById('tags');
let changeImgBtn = document.getElementById('change-bg');

let moreOptionsBtn = document.getElementById('more-options');
let bgOptionsElm = document.getElementById('bg-options');

let uploadBGIpt = document.getElementById('upload-bg');
let bgLinkIpt = document.getElementById('bg-link');
let keepBGIpt = document.getElementById('keep-bg');


// Asynchronously retrieve data from storage.sync, then cache it.
const initStorageCache = chrome.storage.local.get().then((items) => {
    // Copy the data retrieved from storage into storageCache.
    init(items);

});

// Action
chrome.action.onClicked.addListener(async (tab) => {
    try {
        await initStorageCache;
    } catch (e) {
        console.log(e);
    }
});

// JS events

notificationIpt.addEventListener('change', (e) => {
    let isChecked = e.currentTarget.checked;


    setStatus('hide-notification', isChecked);
    console.log('hide-notification:' + isChecked);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'notification', text: isChecked ? 'hide' : 'show' }, (response) => {
            console.log('message sent', response);
        })
    })
});

resetBtn.addEventListener('click', async (e) => {
    console.log('reset');
    resetOptionsToDefault();
    init(options);
});

roomsIpt.addEventListener('change', (e) => {
    let isChecked = e.currentTarget.checked;

    setStatus('hide-rooms', isChecked);

    hideRooms();
});

['keypress', 'focusout'].forEach((event) => {
    exceptRoomIpt.addEventListener(event, (e) => {
        setStatus('except-room', exceptRoomIpt.value);
        if (e.key == 'Enter' || event == 'focusout') {
            hideRooms();
        }
    })
})

autoJoinRoomIpt.addEventListener('change', (e) => {
    let isChecked = e.currentTarget.checked;

    setStatus('auto-join-room', isChecked);

    if (isChecked) {
        joinRoom(options["auto-join-room-name"]);
    }


});

['keypress', 'focusout'].forEach((event) => {
    autoJoinRoomNameIpt.addEventListener(event, (e) => {
        setStatus('auto-join-room-name', autoJoinRoomNameIpt.value);
        if (
            options["auto-join-room"] &&
            (e.key == 'Enter' || event == 'focusout')
        ) {
            joinRoom(options["auto-join-room-name"]);
        }
    })
});

tagIpt.addEventListener('keypress', (e) => {
    setStatus('tags', tagIpt.value.replaceAll(' ', ''));
    if (e.key == 'Enter') {
        changeBG();
    }
});

changeImgBtn.addEventListener('click', (e) => {
    changeBG();
});

moreOptionsBtn.addEventListener('click', (e) => {
    let lessMsg = 'Or (click me again to show less)';
    let moreMsg = 'Or click for more options ↵';
    e.currentTarget.innerText = e.currentTarget.innerText == lessMsg ? moreMsg : lessMsg;
    bgOptionsElm.classList.toggle('show');
});

uploadBGIpt.addEventListener('change', (e) => {
    let file = e.currentTarget.files[0];

    let reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = function () {
        let url = reader.result;
        setStatus('background', url);
        changeBG(url);
    }
});

bgLinkIpt.addEventListener('keypress', (e) => {
    if (e.key == 'Enter') {
        setStatus('background', bgLinkIpt.value);
        changeBG(bgLinkIpt.value);
    }
});

keepBGIpt.addEventListener('change', (e) => {
    let isChecked = e.currentTarget.checked;

    setStatus('keep-background', isChecked);
    if (isChecked) {
        changeBG(getStatus('background'));
    }
});

// Functions

function init(items) {
    console.log(items);
    Object.assign(options, items);

    let isDelay = options['origin-bg'] ? false : true;

    initElm();

    getWindowSize();

    initNotification();

    initRoom();

    initAutoJoinRoom();

    initBackground(isDelay);
}

function initElm() {
    notificationIpt.checked = options['hide-notification'];
    roomsIpt.checked = options['hide-rooms'];

    exceptRoomIpt.value = options['except-room'];

    autoJoinRoomIpt.checked = options['auto-join-room'];
    autoJoinRoomNameIpt.value = options['auto-join-room-name'];

    tagIpt.value = options['tags'];
    keepBGIpt.checked = options['keep-background'];
}

function initNotification() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'notification', text: options['hide-notification'] ? 'hide' : 'show' }, (response) => {
            console.log('message sent', response);
        })
    })
}

function initRoom() {
    hideRooms();
}

function initAutoJoinRoom() {
    if (options['auto-join-room']) {
        setTimeout(() => {
            joinRoom(options["auto-join-room-name"]);
        }, 200);
    }
}
function initBackground(isDelay) {
    let delayInMiliSec = 200;
    if (options['keep-background']) {
        if (isDelay) {
            // We need to get the origin background first
            setTimeout(() => {
                changeBG(options['origin-bg']);
            }, delayInMiliSec);

        } else {
            // After reset and click icon again
            changeBG(options['background']);
        }
    } else {
        changeBG();
    }
}

function setStatus(name, value) {
    if (name) {
        options[name] = value;
    }
    console.log(options);
    chrome.storage.local.set(options);
}

function getStatus(name, value) {
    return options[name] ? options[name] : value;
}

function hideRooms() {
    let text = 'hideAll';
    if (options['except-room']) {
        text = `hide-except:${options['except-room']}`;
    }
    if (options['hide-rooms'] == false) {
        text = 'show';
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'rooms', text: text }, (response) => {
            console.log('message sent', response);
        })
    })
}

function joinRoom(text) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'auto-join-room', text: text }, (response) => {
            if (response.status == 'fail') {
                errorElm.innerText = response.text;
            } else {
                console.log('message sent', response);
            }
        })
    })
}

function changeBG(background) {
    if (background) {
        sendMessageChangeBG(background);
    } else {
        showLoading();

        let tags = tagIpt.value ? tagIpt.value : 'beach,motivation';
        setStatus('tags', tags);
        let width = options['width'];
        let height = options['height'];

        let preUrl = `https://source.unsplash.com/random/${width}x${height}/?${tags}`;
        let request = new XMLHttpRequest();
        request.open('GET', preUrl, true);
        request.onload = function () {
            let url = request.responseURL;
            setStatus('background', url);
            sendMessageChangeBG(url);

            hideLoading();
        }
        request.send(null);
    }

}

function sendMessageChangeBG(url) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'change-img', text: url }, (response) => {
            console.log('message sent', response);
        })
    })
}

function hideLoading() {
    loading.style.display = 'none';
}

function showLoading() {
    loading.style.display = 'inherit';
}

function getWindowSize() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'openspace', text: 'windowSize' }, (response) => {
            console.log(response);
            if (response) {
                setStatus('width', response.width);
                setStatus('height', response.height);
                if (!options['origin-bg']) {
                    setStatus('origin-bg', response.origin_bg);
                }
            }

            spaceSizeP.innerText = `Space size: ${options.width}x${options.height}px`
        })
    })
}

function resetOptionsToDefault() {
    let originBG = options['origin-bg'];
    Object.assign(options, defaultOptions);
    options['origin-bg'] = originBG;
    options['background'] = originBG;
    setStatus();
}