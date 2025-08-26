# Install Chocolatey Package Manager
# Run this in an elevated PowerShell (Run as Administrator)

Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

Write-Host "Chocolatey installed! Close and reopen PowerShell as Administrator, then run:"
Write-Host "choco install postgresql --params '/Password:YourSecurePassword'"
