/// sync storage:
///sync:{
///  installed:bool,
///  sites: {
///      <url.hostname>: {
///          <pathname>: {
///              increment: number,
///              nextWarning: number in ms (Date.getTime())
///          }
///      }
///  }
///}

// use env for browser-apis, that are same for chrome and firefox
var env = (chrome !== undefined) ? chrome : browser;

// strUrl : string
// returns: URL // undefined if invalid
function parseUrlStringToURL(strUrl) {
    try {
        return new URL(strUrl);
    } catch (error) { }
    try {
        return new URL("https://" + strUrl);
    }
    catch (error) {
        return undefined;
    }
}

// takes a URL and returns the string that will be safed in storage to represent the site
// objURL : URL
// returns: string
function storageSiteString(objURL) {
    var strSite = objURL.hostname + objURL.pathname;
    if (!strSite.endsWith("/")) {
        strSite += "/";
    }
    return strSite;
}

function addSiteToObjStorageSites(objStorageSites, urlString, increment, nextWarning) {
    var objURL = parseUrlStringToURL(urlString);

    if (!objStorageSites.hasOwnProperty(objURL.hostname)) {
        objStorageSites[objURL.hostname] = {};
    }
    if (!objStorageSites[objURL.hostname].hasOwnProperty(objURL.pathname)) {
        objStorageSites[objURL.hostname][objURL.pathname] =
        {
            increment: 5,
            nextWarning: 0
        }
    }
    if (increment !== undefined) {
        objStorageSites[objURL.hostname][objURL.pathname].increment = increment;
    }
    if (nextWarning !== undefined) {
        objStorageSites[objURL.hostname][objURL.pathname].nextWarning = nextWarning;
    }
}

function onStart() {
    env.alarms.onAlarm.addListener(onAlarm);
    env.runtime.onMessage.addListener(onRuntimeMessage);

    env.storage.sync.get({ 
        installed: false,
        enterPageButtonDelay: 5,
        sites: {}
    })
    .then((storageData) => {
        if (!storageData.installed) {
            // add default sites to storage
            storageData.sites = {};
            addSiteToObjStorageSites(storageData.sites, "www.youtube.com/shorts/");
            addSiteToObjStorageSites(storageData.sites, "www.reddit.com/");
            addSiteToObjStorageSites(storageData.sites, "www.twitter.com/");
            addSiteToObjStorageSites(storageData.sites, "www.facebook.com/");
            addSiteToObjStorageSites(storageData.sites, "www.instagram.com/");
            addSiteToObjStorageSites(storageData.sites, "www.tiktok.com/");
            addSiteToObjStorageSites(storageData.sites, "bsky.app/");
            addSiteToObjStorageSites(storageData.sites, "x.com/");

            storageData.installed = true;
            env.storage.sync.set({
                installed: true,
                sites: objStorageSites
            })
                .then(addContentScriptToOpenTabs); // add contentscript to open tabs, to add extension to open tabs when extension is installed
        }
    });
}

// add contentscripts to already opened tabs
function addContentScriptToOpenTabs() {
    env.tabs.query({}).then((tabs) => {
        tabs.forEach(tab => {
            env.scripting.executeScript(
                {
                    target: { tabId: tab.id },
                    files: ["contentscript.js"],
                })
                .then(() => console.log("script executed in open tab: " + tab.url))
                .catch((err) => console.warn("unexpected error while registering Script", err));
        });
    });
}

// makes all contentscripts send the updateWarningDisplay message
function updateContentscripts() {
    env.tabs.query({}).then((tabs) => {
        tabs.forEach(tab => {
            env.tabs.sendMessage(tab.id,
                    { action: "doUpdateWarningDisplay" }
                )
                //.then(()=>{console.log("tab connection success: ", tab.url);})
                .catch(() => { console.warn("tab connection failed!", tab.url); });
        });
    });
}

function onUpdateWarningDisplay(urlString, sendResponse) {
    var objURL = parseUrlStringToURL(urlString);
    var objResponse = {
        increment: 5,
        enterPageButtonDelay: 5,
        showWarning: false
    };

    env.storage.sync.get({ sites: {}, enterPageButtonDelay: 5 })
        .then((storageSync) => {
            objResponse.enterPageButtonDelay = storageSync.enterPageButtonDelay;
            if (storageSync.sites[objURL.hostname] === undefined) {
                sendResponse(objResponse);
                return;
            }
            var strPathname = undefined;
            Object.keys(storageSync.sites[objURL.hostname]).forEach((pathname) => {
                if (objURL.pathname.startsWith(pathname)) {
                    strPathname = pathname;
                }
            })

            if (strPathname !== undefined) {
                //console.log("urlMatch for ", urlString);
                objResponse.increment = storageSync.sites[objURL.hostname][strPathname].increment;
                objResponse.showWarning = storageSync.sites[objURL.hostname][strPathname].nextWarning < Date.now();
            }
            sendResponse(objResponse);
        })
        .catch(() => {
            console.warn("storage lookup during warning display request failed!");
            sendResponse(objResponse);
        });
}

function addTimeIncrement(strUrl, nmrIncrement) {
    var objURL = parseUrlStringToURL(strUrl);

    return env.storage.sync.get({ sites: {} })
        .then((storageSync) => {
            if (!storageSync.sites.hasOwnProperty(objURL.hostname)) {
                return;
            }
            var strPathname = undefined;
            Object.keys(storageSync.sites[objURL.hostname]).forEach((pathname) => {
                if (objURL.pathname.startsWith(pathname)) {
                    strPathname = pathname;
                }
            })
            if (strPathname !== undefined) {
                storageSync.sites[objURL.hostname][strPathname].increment = nmrIncrement;

                var nextAlarm = Date.now() + nmrIncrement * 60000;
                storageSync.sites[objURL.hostname][strPathname].nextWarning = nextAlarm;

                //start alarm. if alarm with strUrl already exists the previous is cleared
                env.alarms.create(objURL.hostname + strPathname,
                    { when: (nextAlarm + 1) });
                return env.storage.sync.set(storageSync);
            }
        });
}

function onAlarm() {
    updateContentscripts();
}

function onUrlAdded(strUrl, sendResponse) {
    env.storage.sync.get({ sites: {} })
        .then((storageSync) => {
            addSiteToObjStorageSites(storageSync.sites, strUrl);

            env.storage.sync.set(storageSync)
                .catch(() => {
                    console.warn("storage set during add-url-request failed!");
                })
                .finally(() => {
                    sendResponse({});
                    updateContentscripts();
                });
        })
        .catch(() => {
            console.warn("storage get during add-url-request failed!");
            sendResponse({});
        });
}

function onUrlRemoved(strUrl, sendResponse) {
    env.storage.sync.get({ sites: {} })
        .then((storageSync) => {

            var objURL = parseUrlStringToURL(strUrl);

            if (!storageSync.sites.hasOwnProperty(objURL.hostname)) {
                sendResponse({});
                return;
            }

            if (storageSync.sites[objURL.hostname].hasOwnProperty(objURL.pathname)) {
                delete storageSync.sites[objURL.hostname][objURL.pathname];
            }

            if (Object.keys(storageSync.sites[objURL.hostname]).length == 0) {
                delete storageSync.sites[objURL.hostname];
            }

            env.storage.sync.set(storageSync)
                .catch(() => {
                    console.warn("storage set during remove-url-request failed!");
                })
                .finally(() => {
                    sendResponse({});
                    updateContentscripts();
                });
        })
        .catch(() => {
            console.warn("storage lookup during remove-url-request failed!");
            sendResponse({});
        });
}

function onRuntimeMessage(request, sender, sendResponse) {
    //return true; // makes it so sendResponse also works if response is send in async part.

    if (request.action === "urlAdded") {
        onUrlAdded(request.url, sendResponse);
        return true;
    }
    else if (request.action === "urlRemoved") {
        onUrlRemoved(request.url, sendResponse);
        return true;
    }
    else if (request.action === "updateWarningDisplay") {
        onUpdateWarningDisplay(request.urlString, sendResponse);
        return true;
    }
    else if (request.action === "timeIncrement") {
        addTimeIncrement(request.urlString, request.increment)
            .finally(updateContentscripts);
    }
}

onStart();
// reset storage
//env.storage.sync.set({ installed: false, sites: {}}}).then( () => {onStart();});