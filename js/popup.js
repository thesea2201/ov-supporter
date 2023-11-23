const defaultOptions = {
    "hide-notification": false,
    "hide-rooms": false,
    "except-room": "",
    "auto-join-room": false,
    "auto-join-room-name": "",
    "delay-auto-join": 5,
    "keep-background": true,
    "tags": "",
    "origin-bg": "",
    "background": "",
    "width": 1200,
    "height": 640
};
const options = { ...defaultOptions };

let loading = document.getElementById('loading');
let errorElm = document.getElementById('error');
let errorTimeoutEvent;

let spaceSizeP = document.getElementById('space-size');
let resetBtn = document.getElementById('reset');
let notificationIpt = document.getElementById('hide-notification');

let roomsIpt = document.getElementById('hide-rooms');
let exceptRoomIpt = document.getElementById('except-room');

let autoJoinRoomIpt = document.getElementById('auto-join-room');
let autoJoinRoomNameIpt = document.getElementById('auto-join-room-name');
let delayAutoJoinIpt = document.getElementById('delay-auto-join');
let countdownElm = document.getElementById('countdown');
// let pauseCounterBtn = document.getElementById('pause-counter');
// let restartCounterBtn = document.getElementById('restart-counter');
let countdownTimeOutEvent;

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

autoJoinRoomIpt.addEventListener('click', (e) => {
    console.log('auto-join-room:' + e.currentTarget.checked);
    let isChecked = e.currentTarget.checked;

    setStatus('auto-join-room', isChecked);

    if (isChecked) {
        restartJoinRoom();
    } else {
        pauseJoinRoom();
    }


});

['keypress', 'focusout'].forEach((event) => {
    autoJoinRoomNameIpt.addEventListener(event, (e) => {
        console.log('auto-join-room-name:' + event + autoJoinRoomNameIpt.value);
        setStatus('auto-join-room-name', autoJoinRoomNameIpt.value);
        if (
            options["auto-join-room"] &&
            (e.key == 'Enter' || event == 'focusout')
        ) {
            joinRoom(options["auto-join-room-name"]);
        }
    })
});

['keypress', 'focusout'].forEach((event) => {
    delayAutoJoinIpt.addEventListener(event, (e) => {
        setStatus('delay-auto-join', delayAutoJoinIpt.value);
    })
});

// pauseCounterBtn.addEventListener('click', (e) => {
//     pauseJoinRoom();
// });

// restartCounterBtn.addEventListener('click', (e) => {
//     restartJoinRoom();
// });

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

let init = (items) => {
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

let initElm = () => {
    notificationIpt.checked = options['hide-notification'];
    roomsIpt.checked = options['hide-rooms'];

    exceptRoomIpt.value = options['except-room'];

    autoJoinRoomIpt.checked = options['auto-join-room'];
    autoJoinRoomNameIpt.value = options['auto-join-room-name'];
    delayAutoJoinIpt.value = options['delay-auto-join'];

    if (options['auto-join-room'] && options['delay-auto-join'] > 0) {
        countdownElm.classList.remove('hide');
        // pauseCounterBtn.classList.remove('hide');
        // restartCounterBtn.classList.add('hide');
    }

    tagIpt.value = options['tags'];
    keepBGIpt.checked = options['keep-background'];
}

let initNotification = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'notification', text: options['hide-notification'] ? 'hide' : 'show' }, (response) => {
            console.log('message sent', response);
        })
    })
}

let initRoom = () => {
    hideRooms();
}

let initAutoJoinRoom = () => {
    let roomName = options["auto-join-room-name"];

    if (roomName) {
        testJoinRoom(roomName);

        if (options['auto-join-room']) {
            let delay = options['delay-auto-join'];
            initJoinCounter(delay);
            joinRoomWithDelay(roomName, delay);
        }
    }
}
let initBackground = (isDelay) => {
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

let setStatus = (name, value) => {
    if (name) {
        options[name] = value;
    }
    console.log(options);
    chrome.storage.local.set(options);
}

let getStatus = (name, value) => {
    return options[name] ? options[name] : value;
}

let showError = (text, timeOutInSeconds) => {
    timeOutInSeconds = timeOutInSeconds ? timeOutInSeconds : 5;
    errorElm.innerText = text;

    if (errorTimeoutEvent) {
        clearTimeout(errorTimeoutEvent);
    }

    errorTimeoutEvent = setTimeout(() => {
        errorElm.innerText = '';
    }, timeOutInSeconds * 1000);
}

let hideRooms = () => {
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

let joinRoom = (roomName) => {
    clearTimeout(countdownTimeOutEvent);
    initRoom();

    if (!roomName) {
        return;
    }

    let data = {
        action: 'auto-join-room',
        text: roomName
    };

    sendMessageChrome(data);
}

let testJoinRoom = (roomName) => {
    let data = {
        action: 'test-auto-join-room',
        text: roomName
    };

    sendMessageChrome(data);
}

let joinRoomWithDelay = (roomName, delay) => {
    if (!roomName) {
        return;
    }

    let data = {
        action: 'auto-join-room-with-delay',
        text: roomName,
        delay: delay
    }

    sendMessageChrome(data);
}

let initJoinCounter = (delay) => {
    countdownElm.innerText = delay;
    startCounter(delay);
};

let startCounter = (remaining) => {
    countdownTimeOutEvent = setTimeout(() => {
        if (remaining > 0) {
            remaining = remaining - 1;
            countdownElm.innerText = remaining;
            startCounter(remaining);
        } else {
            countdownElm.classList.add('hide');
        }
    }, 1000)
}


let pauseJoinRoom = () => {
    // pauseCounterBtn.classList.add('hide');
    // restartCounterBtn.classList.remove('hide');
    // countdownElm.classList.remove('hide');

    clearTimeout(countdownTimeOutEvent);
    let roomName = options['auto-join-room-name'];
    if (!roomName) {
        return;
    }

    let data = {
        action: 'pause-auto-join-room',
    };

    sendMessageChrome(data);
}

let restartJoinRoom = () => {
    // restartCounterBtn.classList.add('hide');
    // pauseCounterBtn.classList.remove('hide');
    countdownElm.classList.remove('hide');
    initAutoJoinRoom();
}

let changeBG = (background) => {
    if (background) {
        sendMessageChangeBG(background);
    } else {
        showLoading();

        let tags = options['tags'];
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

let sendMessageChangeBG = (url) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'change-img', text: url }, (response) => {
            console.log('message sent', response);
        })
    })
}

let hideLoading = () => {
    loading.style.display = 'none';
}

let showLoading = () => {
    loading.style.display = 'inherit';
}

let getWindowSize = () => {
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

let resetOptionsToDefault = () => {
    let originBG = options['origin-bg'];
    Object.assign(options, defaultOptions);
    options['origin-bg'] = originBG;
    options['background'] = originBG;
    setStatus();
}

let sendMessageChrome = async (data) => {
    await chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, data, (response) => {
            if (response && response.status === 'fail') {
                showError(response.text);
                console.log(response.error_action);
                if (response.error_action === 'deleteAutoJoinRoomTimeoutEvent') {
                    console.log('deleteAutoJoinRoomTimeoutEvent');
                    countdownElm.classList.add('hide');
                    clearTimeout(countdownTimeOutEvent);
                }
            } else {
                console.log('message sent', response);
            }
        })
    })
}