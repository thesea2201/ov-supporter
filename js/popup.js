const DEFAULT_TAG = 'vietnam';
const defaultOptions = {
    "credential": '',
    "hide-notification": false,
    "smart-hide-rooms": false,
    "hide-rooms": false,
    "except-room": "",
    "auto-join-room": false,
    "auto-join-room-name": "",
    "delay-auto-join": 5,
    "keep-background": true,
    "tags": DEFAULT_TAG,
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
let importBtn = document.getElementById('import-setting');
let exportBtn = document.getElementById('export-setting');
let resetBtn = document.getElementById('reset-setting');
let notificationIpt = document.getElementById('hide-notification');

let roomsIpt = document.getElementById('hide-rooms');
let smartHideRoomsIpt = document.getElementById('smart-hide-rooms');
let exceptRoomIpt = document.getElementById('except-room');
let clearRoomsBtn = document.getElementById('clear-rooms');

let autoJoinRoomIpt = document.getElementById('auto-join-room');
let autoJoinRoomNameIpt = document.getElementById('auto-join-room-name');
let delayAutoJoinIpt = document.getElementById('delay-auto-join');
let countdownElm = document.getElementById('countdown');
// let pauseCounterBtn = document.getElementById('pause-counter');
// let restartCounterBtn = document.getElementById('restart-counter');
let countdownTimeOutEvent;

let unsplashAPIKeyIpt = document.getElementById('set-unsplash-key');
let unsplashFeatureElm = document.getElementById('unsplash-feature');
let tagIpt = document.getElementById('tags');
let changeImgBtn = document.getElementById('change-bg');

let moreOptionsBtn = document.getElementById('more-options');
let bgOptionsElm = document.getElementById('bg-options');

let uploadBGIpt = document.getElementById('upload-bg');
let bgLinkIpt = document.getElementById('bg-link');
let keepBGIpt = document.getElementById('keep-bg');


// Asynchronously retrieve data from storage.local, then cache it.
const initStorageCacheLocal = chrome.storage.local.get().then((items) => {
    // Copy the data retrieved from storage into storageCache.
    init(items);

});

// Action
chrome.action.onClicked.addListener(async (tab) => {
    try {
        await initStorageCacheLocal;
    } catch (e) {
        console.error(e);
    }
});

// JS events

notificationIpt.addEventListener('change', (e) => {
    let isChecked = e.currentTarget.checked;


    setStatus('hide-notification', isChecked);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'notification', text: isChecked ? 'hide' : 'show' }, (response) => {
            console.log('message sent', response);
        })
    })
});


importBtn.addEventListener('click', async (e) => {
    let uploadIpt = document.createElement('input');
    uploadIpt.type = 'file';
    uploadIpt.accept = '.txt';
    uploadIpt.click();
    uploadIpt.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const key = prompt('Please enter your secret key:');
            const result = importSetting(text, key);
            if (result) {
                const setting = JSON.parse(result);
                init(setting);
            } else {
                alert('Wrong key or wrong setting file. please try again.');
            }
        };
        reader.readAsText(file);
    };
});


exportBtn.addEventListener('click', async (e) => {
    const key = prompt('Please enter your secret key:');
    const settingContent = exportSetting(JSON.stringify(options), key);
    let downloadElm = document.createElement('a');

    downloadElm.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(settingContent));
    downloadElm.setAttribute('download', 'ov-supporter-setting.txt');
    downloadElm.click();
});

resetBtn.addEventListener('click', async (e) => {
    resetOptionsToDefault();
    init(options);
});

roomsIpt.addEventListener('change', (e) => {
    let isChecked = e.currentTarget.checked;

    setStatus('hide-rooms', isChecked);
    if (isChecked) {
        setStatus('smart-hide-rooms', !isChecked);
        smartHideRoomsIpt.checked = !isChecked;
    }

    hideRooms();
});

smartHideRoomsIpt.addEventListener('change', (e) => {
    let isChecked = e.currentTarget.checked;

    setStatus('smart-hide-rooms', isChecked);

    hideRooms();
});

['keypress', 'focusout'].forEach((event) => {
    exceptRoomIpt.addEventListener(event, (e) => {
        setStatus('except-room', exceptRoomIpt.value);
        hideRooms();
    })
})

clearRoomsBtn.addEventListener('click', (e) => {
    exceptRoomIpt.value = '';
    setStatus('except-room', '');
    hideRooms();
});

autoJoinRoomIpt.addEventListener('click', (e) => {
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
        setStatus('auto-join-room-name', autoJoinRoomNameIpt.value);
        if (
            options["auto-join-room"] &&
            (e.key == 'Enter' || event == 'focusout') &&
            options["auto-join-room-name"]
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

unsplashAPIKeyIpt.addEventListener('click', async (e) => {
    const key = prompt('Please enter your unsplash API key:').trim();
    if (key) {
        const credential = `client_id=${key}`;
        const imageUrl = await getUnsplashImagesFromTags(credential, 'beach');
        if (!imageUrl) {
            alert('Unsplash API key is wrong. Please try again!');
        } else {
            setStatus('credential', credential);
            enableOrDisableUnsplashFeature(checkCredential());
        }
    }

});

tagIpt.addEventListener('keyup', (e) => {
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
    smartHideRoomsIpt.checked = options['smart-hide-rooms'];

    exceptRoomIpt.value = options['except-room'];

    autoJoinRoomIpt.checked = options['auto-join-room'];
    autoJoinRoomNameIpt.value = options['auto-join-room-name'];
    delayAutoJoinIpt.value = options['delay-auto-join'];

    if (options['auto-join-room'] && options['delay-auto-join'] > 0) {
        countdownElm.classList.remove('hide');
        // pauseCounterBtn.classList.remove('hide');
        // restartCounterBtn.classList.add('hide');
    }

    tagIpt.value = options['tags'] ? options['tags'].replaceAll(' ', '') : DEFAULT_TAG;
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

let setStatus = (name, value, storageType = 'local') => {
    if (name) {
        options[name] = value;
    }

    chrome.storage[storageType].set(options);
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
    if (options['smart-hide-rooms'] == true) {
        text = `hide-smart:${options['except-room']}`;
    } else if (options['except-room']) {
        text = `hide-except:${options['except-room']}`;
    }
    if (options['hide-rooms'] == false && options['smart-hide-rooms'] == false) {
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
    countdownElm.classList.remove('hide');
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
    initAutoJoinRoom();
}

let changeBG = async (background) => {
    if (background) {
        sendMessageChangeBG(background);
    } else {
        let tags = options['tags'];
        const credential = getStatus('credential', '');

        setStatus('tags', tags);
        const imageUrl = await getUnsplashImagesFromTags(credential, tags);

        if (imageUrl) {
            setStatus('background', imageUrl);
            sendMessageChangeBG(imageUrl);
        } else {
            alert('Can not get image from unsplash. Unsplash API key is wrong or can not find any image with these tags. Please try again!');
        }
    }
}

const checkCredential = () => {
    const credential = getStatus('credential', '');
    if (credential) {
        return true;
    } else {
        return false;
    }
}

const enableOrDisableUnsplashFeature = (isEnable) => {
    if (isEnable) {
        unsplashFeatureElm.classList.remove('disabled-div');
    } else {
        unsplashFeatureElm.classList.add('disabled-div');
    }
}


const getUnsplashImagesFromTags = async (credential, tags) => {
    let imageUrl = null;
    try {
        showLoading();
        const preUrl = `https://api.unsplash.com/photos/random?${credential}&orientation=landscape&query=${tags}`;
        const result = await makeRequest("GET", preUrl);

        const data = JSON.parse(result);
        imageUrl = data['urls']['regular'];
    } catch (error) {
        console.error(error);
    } finally {
        hideLoading();

        return imageUrl;
    }
}

function makeRequest(method, url) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
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
            if (response) {
                setStatus('width', response.width);
                setStatus('height', response.height);
                setStatus('origin-bg', getStatus('origin-bg') || response.origin_bg);
            }

            spaceSizeP.innerText = `Space size: ${options.width}x${options.height}px`
        })
    })
}

const _encrypt = (text, key) => {
    let result = '';
    try {
        result = CryptoJS.AES.encrypt(text, key).toString();
    } catch (error) {
        console.error(error);
    }

    return result;
}

const _decrypt = (text, key) => {
    let result = '';
    try {
        result = CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error(error);
    }

    return result;
}

const exportSetting = (text, key) => {
    return _encrypt(text, key);
}

const importSetting = (text, key) => {
    return _decrypt(text, key);
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
                if (response.error_action === 'deleteAutoJoinRoomTimeoutEvent') {
                    countdownElm.classList.add('hide');
                    clearTimeout(countdownTimeOutEvent);
                }
            } else {
                console.log('message sent', response);
            }
        })
    })
}