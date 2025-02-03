(() => {

// use env for browser-apis, that are same for chrome and firefox
var env = (chrome !== undefined) ? chrome : browser;

// only execute the script once
if (!window.hasOwnProperty("contentscriptsAdded")) {
  window.contentscriptsAdded = 1;
}
else {
  window.contentscriptsAdded += 1;
}

console.log("contentscripts added: ", window.contentscriptsAdded);

if (window.contentscriptsAdded > 1) {
  // only execute the script once
  return false;
}
var divWarning = undefined;
var txtDoomMinutes = undefined;
var btnDoomMinutes = undefined;

// make the type-number-input scrollable. Scrolling will not go past min / max attribute boundaries
// input: type-number-input-element
// scrollIncrement: number to increase/decrease the value by
// parent: optional element where the scroll should be detected. If undefined is set to input
function makeNumberInputScrollable(input, scrollIncrement, scrollRegion) {
  if (input === undefined || scrollIncrement === undefined) {
    return;
  }
  if (scrollRegion === undefined) {
    scrollRegion = input;
  }
  scrollRegion.addEventListener("wheel", (e) => {
    try {
      input.value = (Number.isNaN(Number(input.value)) ? 0 : Number(input.value)) + ((e.deltaY > 0 ? -1 : 1) * (Number.isNaN(Number(scrollIncrement)) ? 0 : Number(scrollIncrement)));
      input.value = input.hasAttribute("min") && !Number.isNaN(Number(input.min)) ? Math.max(input.value, Number(input.min)) : input.value;
      input.value = input.hasAttribute("max") && !Number.isNaN(Number(input.min)) ? Math.min(input.value, Number(input.max)) : input.value;
      e.stopImmediatePropagation();
      e.preventDefault();
    }
    catch { }
  });
}

function disableButtonForDuration(btn, nmrSeconds) {
  btn.style.animationDuration = nmrSeconds.toString() + "s";
  btn.disabled = true;
  setTimeout(()=>{
    btn.disabled = false;
    btn.style.animationDuration = "";
  }, nmrSeconds*1000);
}


function getCurrentURL() {
  return (new URL(window.location));
}

function storageSiteString(urlObj) {
  var strSite = urlObj.hostname + urlObj.pathname;
  if (!strSite.endsWith("/")) {
    strSite += "/";
  }
  return strSite;
}

function onClickBtnDoomMinutes(e) {
  env.runtime.sendMessage(
    {
      action: "timeIncrement",
      urlString: storageSiteString(getCurrentURL()),
      increment: Number(txtDoomMinutes.value)
    }
  )
    .catch(() => {
      console.log("onClickBtnDoomMinutes couldnt sendMessage to backgroud.");
    });

  hideDoomWarning();
}

var firstShowWarning = true;
function showDoomWarning(nmrIncrement, nmrEnterPageButtonDelay) {
  if (firstShowWarning) {
    firstShowWarning = false;
    fetch(env.runtime.getURL('/contentscript.html'))
      .then(r => r.text())
      .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        divWarning = document.getElementById("doomscrollPagewarning");
        txtDoomMinutes = document.getElementById("txtDoomMinutes");
        btnDoomMinutes = document.getElementById("btnDoomMinutes");

        makeNumberInputScrollable(txtDoomMinutes, 1, txtDoomMinutes.parentElement);
        btnDoomMinutes.addEventListener("click", onClickBtnDoomMinutes);
        txtDoomMinutes.value = nmrIncrement;
        divWarning["showingDisplayValue"] = window.getComputedStyle(divWarning).getPropertyValue("display");
        disableButtonForDuration(btnDoomMinutes, nmrEnterPageButtonDelay);
      });
  }
  else {
    divWarning.style.display = divWarning["showingDisplayValue"];
    txtDoomMinutes.value = nmrIncrement;
    disableButtonForDuration(btnDoomMinutes, nmrEnterPageButtonDelay);
  }
}

function hideDoomWarning() {
  try {
    divWarning.style.display = "none";
  }
  catch { }
}

function updateWarningDisplay() {
  var objURL;
  try {
    objURL = getCurrentURL();
  }
  catch (error) {
    return;
  }

  //console.log("updateWarningDisplay: ", objURL);

  // check if warnfree-time for a doomURL is up. Display warning if it is wait with timeout if it is not
  env.runtime.sendMessage({ action: "updateWarningDisplay", urlString: storageSiteString(objURL) })
    .then((response) => {
      if (response.showWarning) {
        showDoomWarning(response.increment, response.enterPageButtonDelay);
      }
      else {
        hideDoomWarning();
      }
    });
}

function onRuntimeMessage(request) {
  if (request.action === "doUpdateWarningDisplay") {
    updateWarningDisplay();
  }
}


// url change detection is surprisingly problematic. see: https://stackoverflow.com/questions/6390341/how-to-detect-if-url-has-changed-after-hash-in-javascript
// unfortunately checking with an interval is the simplest, reliable method. mutation observer works too, but much more config and much less performant.
// anything else does not work reliable when testet for youtube/shorts. 
// keep an eye on navigation api. not supported in Firefox right now, but once it is it should be the sollution.
// https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
var prevURL = location.href;
function detectURLChange() {
  if (prevURL !== location.href) {
    prevURL = location.href;
    updateWarningDisplay();
  }
}
setInterval(detectURLChange, 1000);

env.runtime.onMessage.addListener(onRuntimeMessage);
updateWarningDisplay();

})();