# SwitchVault local static server (zero dependencies — uses built-in .NET HttpListener)
# Invoked by SwitchVault.bat as a fallback when Python is not available.
param([int]$Port = 8731)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.ico'  = 'image/x-icon'
  '.webmanifest' = 'application/manifest+json'
  '.txt'  = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  $listener.Start()
} catch {
  Write-Host ""
  Write-Host "  Could not start the server on port $Port." -ForegroundColor Red
  Write-Host "  Something may already be using it. Close it and try again," -ForegroundColor Red
  Write-Host "  or edit the PORT in SwitchVault.bat." -ForegroundColor Red
  Write-Host ""
  Read-Host "  Press Enter to close"
  exit 1
}

$url = "http://localhost:$Port/index.html"
Write-Host ""
Write-Host "  SwitchVault is running." -ForegroundColor Green
Write-Host "  $url" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Keep this window open while you use the app." -ForegroundColor DarkGray
Write-Host "  Close it (or press Ctrl+C) to stop the server." -ForegroundColor DarkGray
Write-Host ""

Start-Process $url

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $rel = [System.Uri]::UnescapeDataString($req.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $rel = $rel -replace '/', '\'

    # Resolve and confirm the target stays inside the app folder (no path traversal)
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
    $rootFull = [System.IO.Path]::GetFullPath($root)

    if ($full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] }
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.OutputStream.Close()
  }
} finally {
  $listener.Stop()
}
