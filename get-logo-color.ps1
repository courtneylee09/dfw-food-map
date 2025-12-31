Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Resolve-Path 'assets\logo.png'))
$bmp = New-Object System.Drawing.Bitmap $img
$c1 = $bmp.GetPixel(0,0)
$c2 = $bmp.GetPixel($bmp.Width-1, 0)
$c3 = $bmp.GetPixel(0, $bmp.Height-1)
$c4 = $bmp.GetPixel($bmp.Width-1, $bmp.Height-1)
Write-Output "Corner1: R=$($c1.R) G=$($c1.G) B=$($c1.B)"
Write-Output "Corner2: R=$($c2.R) G=$($c2.G) B=$($c2.B)"
Write-Output "Corner3: R=$($c3.R) G=$($c3.G) B=$($c3.B)"
Write-Output "Corner4: R=$($c4.R) G=$($c4.G) B=$($c4.B)"
$hex = "#$([Convert]::ToString($c1.R,16).PadLeft(2,'0'))$([Convert]::ToString($c1.G,16).PadLeft(2,'0'))$([Convert]::ToString($c1.B,16).PadLeft(2,'0'))"
Write-Output "HEX: $hex"
$img.Dispose()
$bmp.Dispose()
