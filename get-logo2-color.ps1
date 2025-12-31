# Load the image
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile("$PSScriptRoot\assets\logo2.png")
$bitmap = New-Object System.Drawing.Bitmap($image)

# Sample pixels from corners and edges to find background color
$width = $bitmap.Width
$height = $bitmap.Height

$colors = @()
# Sample corners
$colors += $bitmap.GetPixel(5, 5)
$colors += $bitmap.GetPixel($width - 5, 5)
$colors += $bitmap.GetPixel(5, $height - 5)
$colors += $bitmap.GetPixel($width - 5, $height - 5)
# Sample edges
$colors += $bitmap.GetPixel([int]($width/2), 5)
$colors += $bitmap.GetPixel([int]($width/2), $height - 5)
$colors += $bitmap.GetPixel(5, [int]($height/2))
$colors += $bitmap.GetPixel($width - 5, [int]($height/2))

# Find most common color (background)
$colorGroups = $colors | Group-Object { "$($_.R),$($_.G),$($_.B)" } | Sort-Object Count -Descending
$bgColor = $colorGroups[0].Group[0]

Write-Host "Logo2 Background Color:"
Write-Host "RGB: $($bgColor.R), $($bgColor.G), $($bgColor.B)"
Write-Host "Hex: #$("{0:X2}{1:X2}{2:X2}" -f $bgColor.R, $bgColor.G, $bgColor.B)"

# Convert to HSL approximation
$r = $bgColor.R / 255
$g = $bgColor.G / 255
$b = $bgColor.B / 255
$max = [Math]::Max($r, [Math]::Max($g, $b))
$min = [Math]::Min($r, [Math]::Min($g, $b))
$l = ($max + $min) / 2

if ($max -eq $min) {
    $h = 0
    $s = 0
} else {
    $d = $max - $min
    $s = if ($l -gt 0.5) { $d / (2 - $max - $min) } else { $d / ($max + $min) }
    
    if ($max -eq $r) {
        $h = ($g - $b) / $d + (if ($g -lt $b) { 6 } else { 0 })
    } elseif ($max -eq $g) {
        $h = ($b - $r) / $d + 2
    } else {
        $h = ($r - $g) / $d + 4
    }
    $h = $h / 6
}

$hDeg = [Math]::Round($h * 360)
$sPercent = [Math]::Round($s * 100)
$lPercent = [Math]::Round($l * 100)

Write-Host "HSL: hsl($hDeg, $sPercent%, $lPercent%)"

$bitmap.Dispose()
$image.Dispose()
