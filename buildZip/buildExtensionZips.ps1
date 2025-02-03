$fullmanifest = (Get-Content -path "..\extension_files\manifest.json" -Raw)
$firefoxmanifest = $fullmanifest.Replace("`"service_worker`": `"backgroundscript.js`",","")

Out-File -FilePath ".\manifest.json" -InputObject $firefoxmanifest -Encoding utf8

$compress = @{
  Path = "..\extension_files\*.js", "..\extension_files\*.css", "..\extension_files\*.html", "..\extension_files\*.png", ".\manifest.json"
  DestinationPath = ".\FirefoxDoomscrollControl.zip"
  Force = $True
}
Compress-Archive @compress

$chromemanifest = $fullmanifest.Replace("`"service_worker`": `"backgroundscript.js`",", "`"service_worker`": `"backgroundscript.js`"")
$chromemanifest = $chromemanifest.Replace("`"scripts`": [`"backgroundscript.js`"]", "")

Out-File -FilePath ".\manifest.json" -InputObject $chromemanifest -Encoding utf8

$compress = @{
  Path = "..\extension_files\*.js", "..\extension_files\*.css", "..\extension_files\*.html", "..\extension_files\*.png", ".\manifest.json"
  DestinationPath = ".\ChromeDoomscrollControl.zip"
  Force = $True
}
Compress-Archive @compress

Remove-Item ".\manifest.json"