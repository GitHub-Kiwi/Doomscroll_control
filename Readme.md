# Doomscroll Control

This browser extension aims to get you out of the state of **mindlessly scrolling** on those websites that are designed to get you to **scroll like a mindless zombie**.

When entering such a website, you will see a window, that will remind you to only stay on the website as long as you enjoy your stay.
You will estimate how long you would actually like to stay on this website and then proceed with your visit on the website as usual.
After the time is up, the reminding window will show again. This is the moment where you should ask yourself if you really still enjoy your time, or if you have already turned into a scrolling zombie. 

## skinner box

If you would like to learn more about how websites get you to mindlessly scroll, you can learn more about the topic of the so called **skinner box** in  
[this video (on youtube)](https://www.youtube.com/watch?v=bNOol5OTasw)


# ToDo

- create Git
- release in Firefox
- release in Chrome


# KnowHow:

- [exmaple extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Examples)
- [mdn web docs extension JavaScript APIs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/)
- [Chrome Extensions » develop docs](https://developer.chrome.com/docs/extensions/develop)

## How To Debug

No compiling/building is necessary, the ```./extension_files/``` folder works as is.  
Debugging can be done in Firefox by typing ```about:debugging#/runtime/this-firefox``` into the url-field.  
Then click the load temporary Add-on button and select the ```./extension_files/manifest.json```

## How To Build

To "build" the script, execute the ```/buildZip/buildExtensionZips.ps1```.  
It just zips the ```/extension_files/``` folder and adjusts the ```manifest.json``` to be fully compliant with Firefox and Chrome respectively.

### build details

All extension files are in ```./extension_files```, there is no folderhierarchy inside there.  
This way the files can be chugged into a zip, to build the extension.  
The same version can be used for chromium and firefox.

In since manifestV3, chrome wants the backgroundscript to be registered as ```background.service_worker``` and does no longer support the ```background.scripts``` manifest-key. However Firefox does not support ```background.service_worker``` but still wants ```background.scripts```. Simply defining both works, since they ignore the not supported option. However they display a warning in their extensions-installation pages. To get rid of the errors, the unsupported keys can be removed from the ```background``` when packaging the extension into a .zip-file.

## reasons for decisions made

**manifestV3 backgroundscript safes all its operaion data to env.storage and operates via events**  
because in backgroundscripts are heavily changed. They unload after a few seconds and are reloaded when a event they attached to is triggered.  
Because of this variables are not persistent, so the storage-api has to be used to store data.  
See https://developer.mozilla.org/de/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background.

Backgroundscript programmed to work as a service_worker in chrome.
**A chrome service_worker works as a backgroundscript in firefox too**.  
This is because backgroundscripts are no longer supported in manifestV3 in chrome, but in firefox service_worker is not supported.  
The difference is very small and a service_worker for manifestV3 in chrome will work as a backgroundscript.  
In the manifests background object both scripts and service_worker can be defined and both browsers will simply ignore the property which they dont support.

**contentscript is not injected with url-match registration. Instead a contentscript is injected on every page.**  
Because the url of a page can be changed with history.pushState(...) if done so, registered contentscripts that match the new pushed url will not be injected by the browser.  
So instead a script is on every page and keeps track, if the url changes. When this happenes it asks the backgroundscript if it should show the doomscrollwarning.
