console.log('content started');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'notification') {
        if (request.text == 'hide') {
            hideNotification(true);
        } else {
            hideNotification(false);
        }
        sendResponse({ status: 'success', action: request.action, text: request.text });
    }

    if (request.action === 'rooms') {
        hideRoomElements(request.text);
        sendResponse({ status: 'success', action: request.action, text: request.text });
    }

    if (request.action === 'change-img') {
        console.log(request.text);
        changeBG(request.text);
        sendResponse({ status: 'success', action: request.action, text: request.text });
    }

    if (request.action === 'openspace') {
        if (request.text == 'windowSize') {
            let result = getWindowSize();
            console.log(result);
            sendResponse(result);
        }
    }

    if (request.action = 'auto-join-room') {
        let result = joinRoom(request.text);
        sendResponse(result);
    }

})

function getWindowSize() {
    let openSpace = document.getElementById('openspace');

    console.log(openSpace);
    return {
        width: openSpace.parentElement.offsetWidth,
        height: openSpace.parentElement.offsetHeight,
        origin_bg: document.getElementById('openspace_scrollable').querySelector('img').src
    };
}

function hideNotification(isHide) {
    let body = document.body;
    let notifyIframe = body.querySelector('iframe.ql-video');

    if (notifyIframe) {
        notifyIframe.parentElement.parentElement.parentElement.parentElement.style.width = isHide ? '0px' : '1200px';
    } else {
        alert('iframe not found');
    }
}

function hideRoomElements(status) {
    let body = document.body;
    let rooms = body.querySelectorAll('.MuiGrid-container');

    console.log(status);
    let isHide = (status == 'hideAll' || status.includes('hide-except:')) ? true : false;

    rooms.forEach(room => {
        room.parentElement.style.display = isHide ? 'none' : 'inherit';
    })

    if (status.includes('hide-except:')) {
        status = status.replace('hide-except:', '');

        rooms.forEach(r => {
            status.split(',').forEach(roomName => {
                if (r.parentElement.textContent.toLowerCase().includes(roomName.toLowerCase())) {
                    r.parentElement.style.display = 'inherit';
                }
            })
        })
    }

}

function joinRoom(roomName) {
    let result = {
        status: 'success',
        action: 'auto-join-room',
        text: roomName
    };
    let body = document.body;
    let rooms = body.querySelectorAll('.MuiGrid-container');
    let filteredRoom = [];

    console.log(roomName);

    rooms.forEach(r => {
        if (r.parentElement.textContent.toLowerCase().includes(roomName.toLowerCase())) {
            r.parentElement.style.display = 'inherit';
            filteredRoom.push(r.parentElement);
        }
    })

    if (!filteredRoom.length) {
        console.log('room not found');
        result.status = 'fail';
        result.action = 'auto-join-room';
        result.text = 'Auto-join room failed. Room not found';
    } else if (filteredRoom.length == 1) {
        console.log(filteredRoom[0]);
        filteredRoom[0].style.display = 'inherit';
        filteredRoom[0].click();

        setTimeout(() => {
            body = document.body;
            let disableMicBtn = body.querySelector('#disableMic');
            if (disableMicBtn) {
                disableMicBtn.click();
            }
        }, 1000);
    } else {
        console.log('more than 1 room');
        result.status = 'fail';
        result.action = 'auto-join-room';
        result.text = 'Auto-join room failed. More than 1 room found';
    }

    return result;
}

function changeBG(url) {
    document.getElementById('openspace_scrollable').querySelector('img').src = url;
}


// Function to extract content from the first span tag within the iframe
function extractContent() {
    const iframe = document.body.querySelector('iframe.ql-video');
    if (iframe) {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        console.log(iframeDocument);
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
