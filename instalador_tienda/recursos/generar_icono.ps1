Add-Type -AssemblyName System.Drawing

$icoPath = Join-Path $PSScriptRoot "llanomio.ico"

$bmp = New-Object System.Drawing.Bitmap 128, 128
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

# Fondo redondeado azul corporativo
$rect = New-Object System.Drawing.Rectangle 4, 4, 120, 120
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$g.FillEllipse($brush, $rect)

# Borde dorado suave
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 245, 158, 11)), 6
$g.DrawEllipse($pen, 7, 7, 114, 114)

# Texto POS
$font = New-Object System.Drawing.Font "Arial", 32, ([System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("POS", $font, $textBrush, (New-Object System.Drawing.RectangleF 0, 0, 128, 128), $sf)

$g.Dispose()

# Guardar como archivo de icono .ico
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$bmp.Dispose()
Write-Output "Icono generado en: $icoPath"

