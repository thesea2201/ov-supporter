let autoJoinTimeOutEvent;
let smartHideRoomEvent;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let result = {
        status: 'success',
        action: request.action,
        text: request.text
    };
    if (request.action === 'notification') {
        if (request.text == 'hide') {
            hideNotification(true);
        } else {
            hideNotification(false);
        }
        sendResponse(result);
    }

    if (request.action === 'rooms') {
        clearInterval(smartHideRoomEvent);
        hideRoomElements(request.text);
        sendResponse(result);
    }

    if (request.action === 'change-img') {
        changeBG(request.text);
        sendResponse(result);
    }

    if (request.action === 'openspace') {
        let result = initSetting();
        sendResponse(result);
    }

    if (request.action === 'test-auto-join-room') {
        let result = c_joinRoom(request.text, true);
        sendResponse(result);
    }

    if (request.action === 'auto-join-room') {
        let result = c_joinRoom(request.text);
        sendResponse(result);
    }

    if (request.action === 'auto-join-room-with-delay') {
        let result = joinRoomWithDelay(request.text, request.delay);
        sendResponse(result);
    }

    if (request.action === 'pause-auto-join-room') {
        clearTimeout(autoJoinTimeOutEvent);
        sendResponse(result);
    }

})

function initSetting() {
    let openSpace = document.getElementById('openspace');

    return {
        width: openSpace.querySelector('div:nth-child(2)').offsetWidth,
        height: openSpace.querySelector('div:nth-child(2)').offsetHeight,
        origin_bg: document.getElementById('openspace_scrollable').querySelector('img').src
    };
}

function hideNotification(isHide) {
    let body = document.body;
    let notifyIframe = body.querySelector('iframe.ql-video');

    if (notifyIframe) {
        notifyIframe.parentElement.parentElement.parentElement.parentElement.style.width = isHide ? '0px' : '1200px';
    } else {
        console.log('iframe not found');
    }
}

function hideRoomElements(status) {
    let body = document.body;
    let rooms = body.querySelectorAll('.MuiGrid-container');

    let isHide = (
        status == 'hideAll' ||
        status == 'hide-smart' ||
        status.includes('hide-except:')
    ) ? true : false;


    rooms.forEach(room => {
        room.parentElement.style.display = isHide ? 'none' : 'inherit';
    })

    if (status.includes('hide-smart:')) {
        let roomStr = status.replace('hide-except:', '');
        showRoomHasPeople(rooms);
        showExceptRoom(rooms, roomStr);

        smartHideRoomEvent = setInterval(() => {
            showRoomHasPeople(rooms);
            showExceptRoom(rooms, roomStr);
        }, 5000)
    }


    if (status.includes('hide-except:')) {
        let roomStr = status.replace('hide-except:', '');

        showExceptRoom(rooms, roomStr);
    }

}

const showRoomHasPeople = (rooms) => {
    rooms.forEach(room => {
        let slotElm = room.parentElement.firstElementChild;
        const roomIsHide = room.parentElement.style.display === 'none';

        if (slotElm.querySelector('img') !== null && roomIsHide) {
            room.parentElement.style.display = 'inherit';
        } else if (slotElm.querySelector('img') == null && !roomIsHide) {
            room.parentElement.style.display = 'none';
        }
    })
}

const showExceptRoom = (rooms, roomStr) => {
    if (roomStr.trim() == '') {
        return;
    }

    rooms.forEach(r => {
        roomStr.split(',').forEach(roomName => {
            if (r.parentElement.textContent.toLowerCase().includes(roomName.toLowerCase())) {
                r.parentElement.style.display = 'inherit';
            }
        })
    })
}

let c_joinRoom = (roomName, isTestFirst) => {
    let result = {
        status: 'success',
        action: 'auto-join-room',
        text: roomName,
        error_action: '',
    };
    let body = document.body;
    let rooms = body.querySelectorAll('.MuiGrid-container');
    let filteredRoom = [];

    rooms.forEach(r => {
        if (r.parentElement.textContent.toLowerCase().includes(roomName.toLowerCase())) {
            r.parentElement.style.display = 'inherit';
            filteredRoom.push(r.parentElement);
        }
    })

    if (!filteredRoom.length) {
        result.status = 'fail';
        result.action = 'auto-join-room';
        result.text = 'Auto-join room failed. Room not found';
        result.error_action = 'deleteAutoJoinRoomTimeoutEvent';
    } else if (filteredRoom.length == 1) {
        if (!isTestFirst) {
            filteredRoom[0].style.display = 'inherit';
            filteredRoom[0].click();

            setTimeout(() => {
                body = document.body;
                let disableMicBtn = body.querySelector('#disableMic');
                if (disableMicBtn) {
                    disableMicBtn.click();
                }
            }, 1000);
        }

    } else {
        result.status = 'fail';
        result.action = 'auto-join-room';
        result.text = 'Auto-join room failed. More than 1 room found';
        result.error_action = 'deleteAutoJoinRoomTimeoutEvent';
    }

    return result;
}

let joinRoomWithDelay = (roomName, delay) => {
    autoJoinTimeOutEvent = setTimeout(() => {
        let result = c_joinRoom(roomName);
        return result;
    }, delay * 1000);
}

function changeBG(url) {
    let imgElm = document.getElementById('openspace_scrollable').querySelector('img');
    imgElm.src = url;
    imgElm.style.objectFit = 'fill';
    imgElm.style.height = 'auto';
}


// Function to extract content from the first span tag within the iframe
function extractContent() {
    const iframe = document.body.querySelector('iframe.ql-video');
    if (iframe) {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        const firstSpan = iframeDocument.querySelector('span');

        if (firstSpan) {
            const content = firstSpan.textContent.trim();
            return content;
        }
    }
    return null;
}

// Send the extracted content to the background script
chrome.runtime.sendMessage({ content: extractContent() });
