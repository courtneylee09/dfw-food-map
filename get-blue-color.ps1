Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile((Resolve-Path 'assets\logo.png'))
$bmp = New-Object System.Drawing.Bitmap $img

# Sample multiple pixels to find the blue color (look for darker blues)
$bluePixels = @()
for ($y = 0; $y -lt $bmp.Height; $y += 1) {
    for ($x = 0; $x -lt $bmp.Width; $x += 1) {
        $c = $bmp.GetPixel($x, $y)
        # Look for any pixel where blue component is significantly higher than red and green
        if ($c.B -gt ($c.R + 20) -and $c.B -gt ($c.G + 20)) {
            $bluePixels += $c
        }
    }
}

if ($bluePixels.Count -gt 0) {
    # Get the most common blue
    $grouped = $bluePixels | Group-Object -Property R,G,B | Sort-Object Count -Descending | Select-Object -First 1
    $color = $grouped.Group[0]
    Write-Output "Blue found: R=$($color.R) G=$($color.G) B=$($color.B)"
    $hex = "#$([Convert]::ToString($color.R,16).PadLeft(2,'0'))$([Convert]::ToString($color.G,16).PadLeft(2,'0'))$([Convert]::ToString($color.B,16).PadLeft(2,'0'))"
    Write-Output "HEX: $hex"
} else {
    Write-Output "No blue pixels found"
}

$img.Dispose()
$bmp.Dispose()
