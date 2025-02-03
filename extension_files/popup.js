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

// clears siteList, and then fills it with the sites in storage.sync.sites
function displayStorageData() {
	var nmrListScrollTop = 0;
	try {
		nmrListScrollTop = divSiteList.scrollTop;
		divSiteList.innerHTML = ""; // Clear existing list
	} catch (error) {
		console.error("Error creating site list", error);
	}

	env.storage.sync.get({ sites: {}, enterPageButtonDelay: 5 })
		.then((storageSync) => {
			txtEnterPageButtonDelay.value = storageSync.enterPageButtonDelay;
			Object.keys(storageSync.sites).forEach((siteHostname, hostnameIndex) => {

				Object.keys(storageSync.sites[siteHostname]).forEach((sitePathname, pathnameIndex) => {
					let li = document.createElement("li");
					li.textContent = siteHostname + sitePathname;
					li.classList.add("doomscroll");

					let removeBtn = document.createElement("button");
					removeBtn.innerHTML = "X"; // Using 'X' for delete, could use an icon here
					removeBtn.style.marginLeft = "10px";
					removeBtn.classList.add("doomscroll");
					removeBtn.addEventListener("click", onclickRemoveSite.bind(null, siteHostname, sitePathname));

					li.appendChild(removeBtn);
					divSiteList.appendChild(li);
				});
			});
			divSiteList.scrollTop = nmrListScrollTop;
		});
}

function onclickAddSite(event) {
	var objURL = undefined;

	try {
		objURL = parseUrlStringToURL(txtAddSite.value.trim().toLowerCase());
		if (objURL === undefined) {
			throw new Error("Invalid URL");
		}
	}
	catch (e) {
		alert("Please enter a valid domain.");
		return;
	}

	env.runtime.sendMessage({ action: "urlAdded", url: storageSiteString(objURL) })
		.then(displayStorageData)
		.catch(error => {
			console.error("Error adding site:", error);
		});
}

function onclickRemoveSite(siteHostname, sitePathname, event) {
	var objURL = parseUrlStringToURL(siteHostname + sitePathname);

	env.runtime.sendMessage({ action: "urlRemoved", url: storageSiteString(objURL) })
		.then(displayStorageData)
		.catch(error => {
			console.error("Error removing site:", error);
		});
}

function onclickSettings() {
	if(divPopupContent.style.display === "block") {
		divPopupContent.style.display = "none";
		divPopupSettings.style.display = "block";
	}
	else {
		divPopupContent.style.display = "block";
		divPopupSettings.style.display = "none";
	}
}

function onclickEnterPageButtonDelay() {
	var nmrDelay = Number(txtEnterPageButtonDelay.value);
	if(!Number.isNaN(nmrDelay) && nmrDelay >= 0) {
		env.storage.sync.set({ enterPageButtonDelay: nmrDelay });
	}
}


function onStart() {
	var txtAddSite = document.getElementById("txtAddSite");
	var btnAddSite = document.getElementById("btnAddSite");
	var divSiteList = document.getElementById("divSiteList");
	var divPopupContent = document.getElementById("divPopupContent");
	var btnSettings = document.getElementById("btnSettings");
	var divPopupSettings = document.getElementById("divPopupSettings");
	var txtEnterPageButtonDelay = document.getElementById("txtEnterPageButtonDelay");
	var btnEnterPageButtonDelay = document.getElementById("btnEnterPageButtonDelay");	

	btnAddSite.addEventListener("click", onclickAddSite);
	btnSettings.addEventListener("click", onclickSettings);
	btnEnterPageButtonDelay.addEventListener("click", onclickEnterPageButtonDelay);
	
	makeNumberInputScrollable(txtEnterPageButtonDelay, 1, txtEnterPageButtonDelay.parentElement);
	
	displayStorageData();

	// set txtAddSite text to current url
	env.tabs.query({ active: true }).then((tabs) => {
		try {
			txtAddSite.value = storageSiteString(new URL(tabs[0].url));
		}
		catch {
			console.warn("couldnt parse current tabs url into txtAddSite")
		}
	});
}

document.onreadystatechange = function () {
	console.log(document.readyState)
	if (document.readyState === 'interactive') {
		onStart();
	} 
};